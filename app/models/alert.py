"""Alert model."""

from datetime import datetime, timezone

from app.extensions import db


class Alert(db.Model):
    """Represents an operational alert."""

    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(
        db.Integer,
        db.ForeignKey("storage_resources.id"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(200), nullable=False)
    severity = db.Column(db.String(30), nullable=False)
    status = db.Column(db.String(30), nullable=False, default="active")
    message = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    resource = db.relationship("StorageResource", back_populates="alerts")

    def __repr__(self):
        return f"<Alert {self.title}>"
