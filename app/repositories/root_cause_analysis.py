"""Root-cause analysis repository."""

from app.models.root_cause_analysis import RootCauseAnalysis
from app.repositories.base import BaseRepository


class RootCauseAnalysisRepository(BaseRepository[RootCauseAnalysis]):
    """Data access operations for root-cause analyses."""

    def __init__(self):
        super().__init__(RootCauseAnalysis)

    def get_all(self):
        """Return all analyses, newest first."""
        return (
            self.model.query
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_incident_id(self, incident_id: int):
        """Return analyses for an incident, newest first."""
        return (
            self.model.query
            .filter_by(incident_id=incident_id)
            .order_by(self.model.created_at.desc())
            .all()
        )

    def get_by_category(self, category: str):
        """Return analyses by root-cause category, newest first."""
        return (
            self.model.query
            .filter_by(root_cause_category=category)
            .order_by(self.model.created_at.desc())
            .all()
        )
