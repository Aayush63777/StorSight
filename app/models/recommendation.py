"""Recommendation model."""

from datetime import datetime, timezone

from app.extensions import db


class Recommendation(db.Model):
    """Stores an operational recommendation."""

    __tablename__ = "recommendations"

    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(
        db.Integer,
        db.ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(30), nullable=False, default="medium")
    reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    incident = db.relationship(
        "Incident",
        back_populates="recommendations",
    )
