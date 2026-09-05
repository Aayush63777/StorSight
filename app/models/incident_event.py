"""Incident-event association model."""

from datetime import datetime, timezone

from app.extensions import db


class IncidentEvent(db.Model):
    """Associates an event with an incident."""

    __tablename__ = "incident_events"

    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(
        db.Integer,
        db.ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    event_id = db.Column(
        db.Integer,
        db.ForeignKey("events.id"),
        nullable=False,
        index=True,
    )
    relationship_type = db.Column(
        db.String(50),
        nullable=False,
        default="related",
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    incident = db.relationship("Incident", back_populates="event_links")
    event = db.relationship("Event", back_populates="incident_links")

    __table_args__ = (
        db.UniqueConstraint(
            "incident_id",
            "event_id",
            name="uq_incident_event",
        ),
    )
