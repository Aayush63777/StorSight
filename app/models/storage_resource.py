"""Storage resource model."""

from datetime import datetime, timezone

from app.extensions import db


class StorageResource(db.Model):
    """Represents a storage infrastructure resource."""

    __tablename__ = "storage_resources"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    resource_type = db.Column(db.String(50), nullable=False)
    adapter_type = db.Column(
        db.String(40), nullable=False, default="manual", index=True
    )
    endpoint_url = db.Column(db.String(500), nullable=True)
    credential_ref = db.Column(db.String(200), nullable=True)
    monitoring_enabled = db.Column(db.Boolean, nullable=False, default=False)
    poll_interval_seconds = db.Column(db.Integer, nullable=False, default=300)
    stale_after_seconds = db.Column(db.Integer, nullable=False, default=900)
    status = db.Column(db.String(30), nullable=False, default="healthy")
    capacity_total = db.Column(db.Float, nullable=True)
    capacity_used = db.Column(db.Float, nullable=True)
    capacity_total_bytes = db.Column(db.BigInteger, nullable=True)
    capacity_used_bytes = db.Column(db.BigInteger, nullable=True)
    health_status = db.Column(db.String(30), nullable=False, default="healthy")
    monitoring_state = db.Column(
        db.String(30), nullable=False, default="unconfigured", index=True
    )
    last_seen = db.Column(db.DateTime(timezone=True), nullable=True, index=True)
    last_metric_at = db.Column(
        db.DateTime(timezone=True), nullable=True, index=True
    )
    connection_tested_at = db.Column(db.DateTime(timezone=True), nullable=True)
    monitoring_error = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    metrics = db.relationship(
        "Metric", back_populates="resource", cascade="all, delete-orphan"
    )
    events = db.relationship(
        "Event", back_populates="resource", cascade="all, delete-orphan"
    )
    alerts = db.relationship(
        "Alert", back_populates="resource", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<StorageResource {self.name}>"

    @property
    def capacity_utilization_percent(self) -> float | None:
        """Return current capacity utilization as a bounded percentage."""
        total = self.authoritative_capacity_total_bytes
        used = self.authoritative_capacity_used_bytes
        if total is None or used is None or total <= 0:
            return None

        utilization = (used / total) * 100
        return round(min(max(utilization, 0), 100), 2)

    @property
    def raw_capacity_utilization_percent(self) -> float | None:
        total = self.authoritative_capacity_total_bytes
        used = self.authoritative_capacity_used_bytes
        if total is None or used is None or total <= 0:
            return None
        return min(max((used / total) * 100, 0), 100)

    @property
    def authoritative_capacity_total_bytes(self) -> int | None:
        if self.capacity_total_bytes is not None:
            return self.capacity_total_bytes
        if self.capacity_total is None:
            return None
        return round(self.capacity_total * 1024**3)

    @property
    def authoritative_capacity_used_bytes(self) -> int | None:
        if self.capacity_used_bytes is not None:
            return self.capacity_used_bytes
        if self.capacity_used is None:
            return None
        return round(self.capacity_used * 1024**3)

    @property
    def capacity_available(self) -> float | None:
        """Return available capacity in the legacy UI unit (GB)."""
        available_bytes = self.capacity_available_bytes
        if available_bytes is None:
            return None
        return available_bytes / 1024**3

    @property
    def capacity_available_bytes(self) -> int | None:
        """Return currently available capacity in bytes."""
        total = self.authoritative_capacity_total_bytes
        used = self.authoritative_capacity_used_bytes
        if total is None or used is None:
            return None
        return max(total - used, 0)

    @property
    def effective_health_status(self) -> str:
        """Elevate health when live capacity signals cross an alert threshold."""
        if self.status == "offline" or self.monitoring_state in {
            "offline", "stale", "error"
        }:
            return "unknown"
        if self.adapter_type != "manual" and self.monitoring_state != "online":
            return "unknown"
        if self.adapter_type == "manual" and self.monitoring_state == "unconfigured":
            return "unknown"

        severity = {"healthy": 0, "warning": 1, "critical": 2, "unknown": 0}
        health = self.health_status or "unknown"
        if self.status == "critical":
            health = "critical"
        utilization = self.raw_capacity_utilization_percent
        if utilization is not None:
            capacity_health = (
                "critical" if utilization >= 90
                else "warning" if utilization >= 75
                else "healthy"
            )
            if severity[capacity_health] > severity.get(health, 0):
                health = capacity_health
        return health

    @property
    def health_reason(self) -> str | None:
        """Explain the strongest currently known health signal."""
        if self.status == "offline":
            return "resource_offline"
        if self.monitoring_state == "stale":
            return "stale_metrics"
        if self.monitoring_state in {"offline", "error"}:
            return "connection_failure"
        if self.monitoring_state == "unconfigured" or (
            self.adapter_type != "manual" and self.monitoring_state != "online"
        ):
            return "unconfigured"
        if self.status == "critical":
            return "operational_critical"
        utilization = self.raw_capacity_utilization_percent
        if utilization is not None and utilization >= 90:
            return "capacity_threshold"
        if utilization is not None and utilization >= 75:
            return "capacity_threshold"
        return "healthy"
