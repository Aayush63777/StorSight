"""Metric model."""

from datetime import datetime, timezone

from app.extensions import db


class Metric(db.Model):
    """Represents a metric collected for a storage resource."""

    __tablename__ = "metrics"

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(
        db.Integer,
        db.ForeignKey("storage_resources.id"),
        nullable=False,
        index=True,
    )
    metric_name = db.Column(db.String(100), nullable=False)
    metric_value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(30), nullable=True)
    recorded_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    resource = db.relationship("StorageResource", back_populates="metrics")

    def __repr__(self):
        return f"<Metric {self.metric_name}={self.metric_value}>"
