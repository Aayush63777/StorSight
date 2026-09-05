"""Incident model."""

from datetime import datetime, timezone

from app.extensions import db


class Incident(db.Model):
    """Represents an operational incident."""

    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(30), nullable=False, default="medium")
    status = db.Column(db.String(30), nullable=False, default="open")
    assignee_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    resolved_at = db.Column(db.DateTime(timezone=True), nullable=True)

    assignee = db.relationship("User", back_populates="incidents")
    event_links = db.relationship(
        "IncidentEvent",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    root_cause_analyses = db.relationship(
        "RootCauseAnalysis",
        back_populates="incident",
        cascade="all, delete-orphan",
    )
    recommendations = db.relationship(
        "Recommendation",
        back_populates="incident",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<Incident {self.title}>"
