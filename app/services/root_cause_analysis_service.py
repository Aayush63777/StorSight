"""Root-cause analysis application service."""

from app.models.root_cause_analysis import RootCauseAnalysis
from app.repositories.incident import IncidentRepository
from app.repositories.root_cause_analysis import RootCauseAnalysisRepository


class RootCauseAnalysisService:
    """Application operations for root-cause analyses."""

    def __init__(self, repository=None, incident_repository=None):
        self.repository = repository or RootCauseAnalysisRepository()
        self.incident_repository = (
            incident_repository or IncidentRepository()
        )

    # --- retrieval ---

    def get_by_id(self, analysis_id: int):
        return self.repository.get_by_id(analysis_id)

    def list_by_incident(self, incident_id: int):
        return self.repository.get_by_incident_id(incident_id)

    def list_by_category(self, category: str):
        if not category or not category.strip():
            raise ValueError("Category is required.")
        return self.repository.get_by_category(category.strip())

    # --- creation ---

    def create_analysis(
        self,
        incident_id: int,
        root_cause_category: str,
        confidence_score: float,
        explanation: str,
        rule_name: str,
    ):
        if not self.incident_repository.get_by_id(incident_id):
            raise ValueError("Incident not found.")

        if not root_cause_category or not root_cause_category.strip():
            raise ValueError("Root-cause category is required.")

        if not explanation or not explanation.strip():
            raise ValueError("Root-cause explanation is required.")

        if not rule_name or not rule_name.strip():
            raise ValueError("Rule name is required.")

        if not isinstance(confidence_score, (int, float)) or isinstance(
            confidence_score, bool
        ):
            raise ValueError("Confidence score must be a number.")

        if not 0.0 <= float(confidence_score) <= 1.0:
            raise ValueError("Confidence score must be between 0 and 1.")

        analysis = RootCauseAnalysis(
            incident_id=incident_id,
            root_cause_category=root_cause_category.strip(),
            confidence_score=float(confidence_score),
            explanation=explanation.strip(),
            rule_name=rule_name.strip(),
        )

        self.repository.add(analysis)
        self.repository.commit()
        return analysis
