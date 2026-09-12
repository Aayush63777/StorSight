"""Backend storage monitoring orchestration."""

from datetime import datetime, timezone

from app.extensions import db
from app.integrations.storage.base import StorageAdapterError
from app.integrations.storage.factory import StorageAdapterFactory
from app.models.alert import Alert
from app.models.event import Event
from app.models.metric import Metric
from app.repositories.storage_resource import StorageResourceRepository


class MonitoringService:
    """Collect resources independently so one provider cannot stop a cycle."""

    def __init__(self, repository=None, adapter_factory=None):
        self.repository = repository or StorageResourceRepository()
        self.adapter_factory = adapter_factory or StorageAdapterFactory

    def test_connection(self, resource):
        adapter = self.adapter_factory.create(resource)
        adapter.test_connection()
        resource.connection_tested_at = datetime.now(timezone.utc)
        resource.monitoring_state = "online"
        resource.monitoring_error = None
        db.session.commit()

    def discover(self, resource) -> dict:
        adapter = self.adapter_factory.create(resource)
        return adapter.discover()

    def collect_resource(self, resource) -> bool:
        """Collect one resource, recording controlled failures and alerts."""
        try:
            snapshot = self.adapter_factory.create(resource).collect_capacity()
            self._validate_snapshot(snapshot)
            self._persist_snapshot(resource, snapshot)
            return True
        except Exception as exc:
            db.session.rollback()
            self._record_failure(resource, self._safe_error(exc))
            return False

    def run_once(self) -> dict:
        """Run a best-effort collection cycle and return aggregate results."""
        now = datetime.now(timezone.utc)
        resources = [
            resource
            for resource in self.repository.list_monitoring_enabled()
            if self._due_for_collection(resource, now)
        ]
        succeeded = 0
        failed = 0
        for resource in resources:
            if self.collect_resource(resource):
                succeeded += 1
            else:
                failed += 1
        self.mark_stale()
        return {"total": len(resources), "succeeded": succeeded, "failed": failed}

    @staticmethod
    def _due_for_collection(resource, now) -> bool:
        if resource.last_metric_at is None:
            return True
        last_metric_at = MonitoringService._as_utc(resource.last_metric_at)
        return (now - last_metric_at).total_seconds() >= resource.poll_interval_seconds

    def mark_stale(self) -> int:
        """Mark resources stale after their configured freshness window."""
        now = datetime.now(timezone.utc)
        changed = 0
        for resource in self.repository.list_monitoring_enabled():
            freshness_time = (
                resource.last_metric_at
                or resource.connection_tested_at
                or resource.created_at
            )
            if not freshness_time:
                continue
            last_metric_at = self._as_utc(freshness_time)
            age = (now - last_metric_at).total_seconds()
            if age > resource.stale_after_seconds and resource.monitoring_state != "stale":
                resource.monitoring_state = "stale"
                self._upsert_alert(
                    resource, "Stale metrics", "warning", "No fresh metrics were collected."
                )
                changed += 1
        if changed:
            db.session.commit()
        return changed

    def _persist_snapshot(self, resource, snapshot) -> None:
        now = snapshot.collected_at
        resource.capacity_total_bytes = snapshot.total_bytes
        resource.capacity_used_bytes = snapshot.used_bytes
        resource.capacity_total = snapshot.total_bytes / 1024**3
        resource.capacity_used = snapshot.used_bytes / 1024**3
        resource.last_seen = now
        resource.last_metric_at = now
        resource.monitoring_state = "online"
        resource.monitoring_error = None

        db.session.add_all(
            [
                Metric(
                    resource_id=resource.id,
                    metric_name="capacity_total_bytes",
                    metric_value=snapshot.total_bytes,
                    unit="bytes",
                    source=resource.adapter_type,
                    recorded_at=now,
                ),
                Metric(
                    resource_id=resource.id,
                    metric_name="capacity_used_bytes",
                    metric_value=snapshot.used_bytes,
                    unit="bytes",
                    source=resource.adapter_type,
                    recorded_at=now,
                ),
                Metric(
                    resource_id=resource.id,
                    metric_name="capacity_utilization_percent",
                    metric_value=snapshot.utilization_percent,
                    unit="percent",
                    source=resource.adapter_type,
                    recorded_at=now,
                ),
            ]
        )

        if snapshot.utilization_percent >= 90:
            created = self._upsert_alert(
                resource,
                "Capacity critical",
                "critical",
                "Capacity utilization is at or above 90%.",
            )
            if created:
                self._record_event(resource, "capacity_critical", "critical", "Capacity utilization is at or above 90%.")
            self._resolve_alert(resource, "Capacity warning")
        elif snapshot.utilization_percent >= 75:
            created = self._upsert_alert(
                resource,
                "Capacity warning",
                "warning",
                "Capacity utilization is at or above 75%.",
            )
            if created:
                self._record_event(resource, "capacity_warning", "warning", "Capacity utilization is at or above 75%.")
            self._resolve_alert(resource, "Capacity critical")
        else:
            self._resolve_alert(resource, "Capacity warning")
            self._resolve_alert(resource, "Capacity critical")

        self._resolve_alert(resource, "Stale metrics")
        self._resolve_alert(resource, "Monitoring failure")
        db.session.commit()

    def _record_failure(self, resource, message: str) -> None:
        was_error = resource.monitoring_state == "error"
        resource.monitoring_state = "error"
        resource.monitoring_error = message
        created = self._upsert_alert(resource, "Monitoring failure", "critical", message)
        if created and not was_error:
            self._record_event(resource, "monitoring_failure", "critical", message)
        db.session.commit()

    @staticmethod
    def _validate_snapshot(snapshot) -> None:
        if snapshot.total_bytes <= 0 or snapshot.used_bytes < 0:
            raise StorageAdapterError("Storage adapter returned invalid capacity.")
        if snapshot.used_bytes > snapshot.total_bytes:
            raise StorageAdapterError("Storage adapter returned invalid capacity.")

    @staticmethod
    def _safe_error(error: Exception) -> str:
        if isinstance(error, StorageAdapterError):
            return str(error)
        return "Storage monitoring failed."

    @staticmethod
    def _as_utc(value):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    @staticmethod
    def _upsert_alert(resource, title: str, severity: str, message: str) -> bool:
        active = Alert.query.filter_by(
            resource_id=resource.id, title=title, status="active"
        ).first()
        if active is None:
            db.session.add(
                Alert(
                    resource_id=resource.id,
                    title=title,
                    severity=severity,
                    message=message,
                )
            )
            return True
        return False

    @staticmethod
    def _record_event(resource, event_type: str, severity: str, message: str) -> None:
        db.session.add(
            Event(
                resource_id=resource.id,
                event_type=event_type,
                severity=severity,
                message=message,
            )
        )

    @staticmethod
    def _resolve_alert(resource, title: str) -> None:
        now = datetime.now(timezone.utc)
        Alert.query.filter_by(
            resource_id=resource.id, title=title, status="active"
        ).update({"status": "resolved", "resolved_at": now})
