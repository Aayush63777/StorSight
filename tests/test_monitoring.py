"""Tests for provider-backed storage monitoring."""

from datetime import datetime, timezone

import pytest

from app.extensions import db
from app.integrations.storage.base import CapacitySnapshot, StorageAdapterError
from app.models.alert import Alert
from app.models.event import Event
from app.models.metric import Metric
from app.models.storage_resource import StorageResource
from app.services.monitoring_service import MonitoringService


class FakeAdapter:
    def __init__(self, snapshot=None, error=None):
        self.snapshot = snapshot
        self.error = error

    def test_connection(self):
        if self.error:
            raise self.error

    def discover(self):
        return {"name": "test-storage", "capabilities": ["capacity"]}

    def collect_capacity(self):
        if self.error:
            raise self.error
        return self.snapshot


class FakeFactory:
    adapter = None

    @classmethod
    def create(cls, _resource):
        return cls.adapter


@pytest.fixture
def monitoring_resource(app):
    with app.app_context():
        db.drop_all()
        db.create_all()
        resource = StorageResource(
            name="monitored-san-01",
            resource_type="SAN",
            adapter_type="http_json",
            endpoint_url="https://storage.example.test/capacity",
            monitoring_enabled=True,
            monitoring_state="pending",
        )
        db.session.add(resource)
        db.session.commit()
        yield resource.id
        db.session.remove()
        db.drop_all()


@pytest.mark.parametrize(
    ("used", "expected_health"),
    [
        (74.99, "healthy"),
        (75.0, "warning"),
        (89.99, "warning"),
        (90.0, "critical"),
        (95.0, "critical"),
        (100.0, "critical"),
    ],
)
def test_monitoring_derives_threshold_health(app, monitoring_resource, used, expected_health):
    total = 100_000_000
    snapshot = CapacitySnapshot(
        total_bytes=total,
        used_bytes=round(total * used / 100),
        collected_at=datetime.now(timezone.utc),
    )
    FakeFactory.adapter = FakeAdapter(snapshot=snapshot)

    with app.app_context():
        resource = db.session.get(StorageResource, monitoring_resource)
        assert MonitoringService(adapter_factory=FakeFactory).collect_resource(resource)
        db.session.refresh(resource)
        assert resource.effective_health_status == expected_health
        assert resource.monitoring_state == "online"
        assert resource.last_seen is not None
        assert resource.last_metric_at is not None
        assert Metric.query.filter_by(resource_id=resource.id).count() == 3


def test_monitoring_failure_is_isolated_and_recorded(app, monitoring_resource):
    FakeFactory.adapter = FakeAdapter(error=StorageAdapterError("provider unavailable"))

    with app.app_context():
        resource = db.session.get(StorageResource, monitoring_resource)
        assert not MonitoringService(adapter_factory=FakeFactory).collect_resource(resource)
        db.session.refresh(resource)
        assert resource.monitoring_state == "error"
        assert resource.monitoring_error == "provider unavailable"
        alert = Alert.query.filter_by(
            resource_id=resource.id, title="Monitoring failure", status="active"
        ).first()
        assert alert is not None


def test_never_collected_resource_becomes_stale(app, monitoring_resource):
    with app.app_context():
        resource = db.session.get(StorageResource, monitoring_resource)
        resource.created_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
        resource.stale_after_seconds = 60
        db.session.commit()
        assert MonitoringService().mark_stale() == 1
        db.session.refresh(resource)
        assert resource.monitoring_state == "stale"


def test_monitoring_emits_event_once_for_new_capacity_condition(app, monitoring_resource):
    snapshot = CapacitySnapshot(
        total_bytes=100_000_000,
        used_bytes=95_000_000,
        collected_at=datetime.now(timezone.utc),
    )
    FakeFactory.adapter = FakeAdapter(snapshot=snapshot)
    with app.app_context():
        resource = db.session.get(StorageResource, monitoring_resource)
        service = MonitoringService(adapter_factory=FakeFactory)
        assert service.collect_resource(resource)
        assert service.collect_resource(resource)
        assert Event.query.filter_by(
            resource_id=resource.id, event_type="capacity_critical"
        ).count() == 1


def test_monitoring_respects_resource_poll_interval(app, monitoring_resource):
    FakeFactory.adapter = FakeAdapter(
        snapshot=CapacitySnapshot(
            total_bytes=100_000_000,
            used_bytes=10_000_000,
            collected_at=datetime.now(timezone.utc),
        )
    )
    with app.app_context():
        resource = db.session.get(StorageResource, monitoring_resource)
        resource.poll_interval_seconds = 3600
        resource.last_metric_at = datetime.now(timezone.utc)
        db.session.commit()
        result = MonitoringService(adapter_factory=FakeFactory).run_once()
        assert result == {"total": 0, "succeeded": 0, "failed": 0}
