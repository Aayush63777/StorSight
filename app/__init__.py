"""StorSight Flask application package."""

import logging

from flask import Flask, jsonify

from app.config import CONFIG_BY_ENVIRONMENT
from app.extensions import cors, db, migrate
from app.routes import (
    actions_bp,
    alerts_bp,
    auth_bp,
    audit_logs_bp,
    events_bp,
    health_bp,
    incident_events_bp,
    incidents_bp,
    metrics_bp,
    rca_bp,
    recommendations_bp,
    risk_bp,
    roles_bp,
    storage_resources_bp,
    users_bp,
)
import app.models


def create_app(config_name: str = "development") -> Flask:
    """Create and configure a StorSight Flask application."""

    if config_name not in CONFIG_BY_ENVIRONMENT:
        raise ValueError(
            f"Unknown configuration environment: {config_name}"
        )

    app = Flask(__name__)

    config_class = CONFIG_BY_ENVIRONMENT[config_name]
    app.config.from_object(config_class)

    _init_extensions(app)
    _configure_logging(app)
    _register_blueprints(app)
    _register_error_handlers(app)

    return app


def _init_extensions(app: Flask) -> None:
    """Initialise Flask extensions."""

    db.init_app(app)
    migrate.init_app(app, db)

    frontend_origin = app.config.get("FRONTEND_ORIGIN", "http://localhost:4200")

    # Only configure CORS when a non-empty origin is provided.
    # SameSite=Lax + same-host localhost works without SameSite=None,
    # so we enable credentials unconditionally for allowed origins.
    if frontend_origin:
        cors.init_app(
            app,
            resources={r"/api/*": {"origins": frontend_origin}},
            supports_credentials=True,
            allow_headers=["Content-Type", "Accept"],
            methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
            expose_headers=["Content-Type"],
        )


def _configure_logging(app: Flask) -> None:
    """Configure basic application logging."""

    if not app.logger.handlers:
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        )


def _register_blueprints(app: Flask) -> None:
    """Register application blueprints."""

    app.register_blueprint(health_bp)
    app.register_blueprint(roles_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(storage_resources_bp)
    app.register_blueprint(metrics_bp)
    app.register_blueprint(events_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(incidents_bp)
    app.register_blueprint(incident_events_bp)
    app.register_blueprint(rca_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(actions_bp)
    app.register_blueprint(audit_logs_bp)


def _register_error_handlers(app: Flask) -> None:
    """Register minimal centralized HTTP error handlers."""

    @app.errorhandler(404)
    def handle_not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def handle_internal_error(error):
        app.logger.error("Internal server error")
        return jsonify({"error": "Internal server error"}), 500
