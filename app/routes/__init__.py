"""Application route blueprints."""

from app.routes.actions import actions_bp
from app.routes.alerts import alerts_bp
from app.routes.audit_logs import audit_logs_bp
from app.routes.auth import auth_bp
from app.routes.events import events_bp
from app.routes.health import health_bp
from app.routes.incident_events import incident_events_bp
from app.routes.incidents import incidents_bp
from app.routes.metrics import metrics_bp
from app.routes.rca import rca_bp
from app.routes.recommendations import recommendations_bp
from app.routes.risk import risk_bp
from app.routes.roles import roles_bp
from app.routes.storage_resources import storage_resources_bp
from app.routes.users import users_bp

__all__ = [
    "actions_bp",
    "alerts_bp",
    "audit_logs_bp",
    "auth_bp",
    "events_bp",
    "health_bp",
    "incident_events_bp",
    "incidents_bp",
    "metrics_bp",
    "rca_bp",
    "recommendations_bp",
    "risk_bp",
    "roles_bp",
    "storage_resources_bp",
    "users_bp",
]
