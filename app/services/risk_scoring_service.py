"""Risk scoring application service.

Deterministic, explainable, reproducible.

Scoring inputs
    ↓
Risk calculation
    ↓
Risk score  (0–100, integer)
    ↓
Risk classification
"""

from app.repositories.alert import AlertRepository
from app.repositories.incident import IncidentRepository
from app.repositories.incident_event import IncidentEventRepository
from app.repositories.event import EventRepository


class RiskScoringService:
    """Calculate a deterministic operational risk score for an incident.

    Score range : 0 – 100
    Classification thresholds:
        0  – 24  → low
        25 – 49  → medium
        50 – 74  → high
        75 – 100 → critical
    """

    # Incident-severity base scores
    SEVERITY_BASE = {
        "low": 10,
        "medium": 25,
        "high": 50,
        "critical": 75,
    }

    # Per-event-severity contribution (capped at MAX_EVENT_CONTRIBUTION)
    EVENT_SEVERITY_WEIGHT = {
        "info": 1,
        "warning": 3,
        "error": 5,
        "critical": 8,
    }
    MAX_EVENT_CONTRIBUTION = 20

    # Per-active-alert contribution (capped at MAX_ALERT_CONTRIBUTION)
    ALERT_SEVERITY_WEIGHT = {
        "info": 1,
        "warning": 2,
        "critical": 4,
    }
    MAX_ALERT_CONTRIBUTION = 15

    # Classification boundaries (inclusive lower bound)
    CLASSIFICATIONS = [
        (75, "critical"),
        (50, "high"),
        (25, "medium"),
        (0,  "low"),
    ]

    def __init__(
        self,
        incident_repository=None,
        incident_event_repository=None,
        event_repository=None,
        alert_repository=None,
    ):
        self.incident_repository = (
            incident_repository or IncidentRepository()
        )
        self.incident_event_repository = (
            incident_event_repository or IncidentEventRepository()
        )
        self.event_repository = event_repository or EventRepository()
        self.alert_repository = alert_repository or AlertRepository()

    def calculate(self, incident_id: int) -> dict:
        """Return a risk score dict for the given incident.

        Returns:
            {
                "incident_id": int,
                "score": int,           # 0–100
                "classification": str,  # low / medium / high / critical
                "factors": {
                    "incident_severity": str,
                    "base_score": int,
                    "event_contribution": int,
                    "alert_contribution": int,
                    "correlated_event_count": int,
                    "active_alert_count": int,
                }
            }

        Raises:
            ValueError: if the incident does not exist.
        """
        incident = self.incident_repository.get_by_id(incident_id)
        if incident is None:
            raise ValueError("Incident not found.")

        # --- base score from incident severity ---
        base_score = self.SEVERITY_BASE.get(incident.severity, 25)

        # --- event contribution ---
        links = self.incident_event_repository.get_by_incident_id(incident_id)
        event_contribution = 0
        for link in links:
            event = self.event_repository.get_by_id(link.event_id)
            if event:
                event_contribution += self.EVENT_SEVERITY_WEIGHT.get(
                    event.severity, 1
                )
        event_contribution = min(event_contribution, self.MAX_EVENT_CONTRIBUTION)

        # --- alert contribution from resource alerts ---
        # collect all resource_ids referenced by correlated events
        resource_ids = set()
        for link in links:
            event = self.event_repository.get_by_id(link.event_id)
            if event:
                resource_ids.add(event.resource_id)

        alert_contribution = 0
        active_alert_count = 0
        for resource_id in resource_ids:
            alerts = self.alert_repository.get_by_resource_id(resource_id)
            active_alerts = [a for a in alerts if a.status == "active"]
            active_alert_count += len(active_alerts)
            for alert in active_alerts:
                alert_contribution += self.ALERT_SEVERITY_WEIGHT.get(
                    alert.severity, 1
                )
        alert_contribution = min(alert_contribution, self.MAX_ALERT_CONTRIBUTION)

        # --- final score ---
        raw_score = base_score + event_contribution + alert_contribution
        score = min(max(raw_score, 0), 100)

        classification = self._classify(score)

        return {
            "incident_id": incident_id,
            "score": score,
            "classification": classification,
            "factors": {
                "incident_severity": incident.severity,
                "base_score": base_score,
                "event_contribution": event_contribution,
                "alert_contribution": alert_contribution,
                "correlated_event_count": len(links),
                "active_alert_count": active_alert_count,
            },
        }

    def _classify(self, score: int) -> str:
        """Return the risk classification for a score."""
        for threshold, label in self.CLASSIFICATIONS:
            if score >= threshold:
                return label
        return "low"
