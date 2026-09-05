"""Storage resource model."""

from datetime import datetime, timezone

from app.extensions import db


class StorageResource(db.Model):
    """Represents a storage infrastructure resource."""

    __tablename__ = "storage_resources"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False, unique=True)
    resource_type = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="healthy")
    capacity_total = db.Column(db.Float, nullable=True)
    capacity_used = db.Column(db.Float, nullable=True)
    health_status = db.Column(db.String(30), nullable=False, default="healthy")
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
