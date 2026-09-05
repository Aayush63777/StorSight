"""Infrastructure event model."""

from datetime import datetime, timezone

from app.extensions import db


class Event(db.Model):
    """Represents an infrastructure event."""

    __tablename__ = "events"

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(
        db.Integer,
        db.ForeignKey("storage_resources.id"),
        nullable=False,
        index=True,
    )
    event_type = db.Column(db.String(50), nullable=False)
    severity = db.Column(db.String(30), nullable=False, default="info")
    message = db.Column(db.Text, nullable=False)
    occurred_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    resource = db.relationship("StorageResource", back_populates="events")
    incident_links = db.relationship(
        "IncidentEvent",
        back_populates="event",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Event {self.event_type}>"
