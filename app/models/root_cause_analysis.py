"""Root-cause analysis model."""

from datetime import datetime, timezone

from app.extensions import db


class RootCauseAnalysis(db.Model):
    """Stores an explainable root-cause analysis result."""

    __tablename__ = "root_cause_analyses"

    id = db.Column(db.Integer, primary_key=True)
    incident_id = db.Column(
        db.Integer,
        db.ForeignKey("incidents.id"),
        nullable=False,
        index=True,
    )
    root_cause_category = db.Column(db.String(100), nullable=False)
    confidence_score = db.Column(db.Float, nullable=False, default=0.0)
    explanation = db.Column(db.Text, nullable=False)
    rule_name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    incident = db.relationship(
        "Incident",
        back_populates="root_cause_analyses",
    )
