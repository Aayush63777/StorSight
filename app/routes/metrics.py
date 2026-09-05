"""Metric API routes."""

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required
from app.services.metric_service import MetricService


metrics_bp = Blueprint(
    "metrics",
    __name__,
    url_prefix="/api/metrics",
)

service = MetricService()


def _serialize_metric(metric):
    """Serialize a metric for API responses."""
    return {
        "id": metric.id,
        "resource_id": metric.resource_id,
        "metric_name": metric.metric_name,
        "metric_value": metric.metric_value,
        "unit": metric.unit,
        "recorded_at": (
            metric.recorded_at.isoformat()
            if metric.recorded_at
            else None
        ),
    }


@metrics_bp.get("/")
@login_required
def list_metrics():
    """List metrics with optional resource or name filters."""
    resource_id = request.args.get("resource_id", type=int)
    metric_name = request.args.get("metric_name")

    try:
        if resource_id is not None:
            metrics = service.list_by_resource(resource_id)
        elif metric_name:
            metrics = service.list_by_name(metric_name)
        else:
            metrics = service.list_metrics()
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        [_serialize_metric(metric) for metric in metrics]
    ), 200


@metrics_bp.get("/<int:metric_id>")
@login_required
def get_metric(metric_id):
    """Return a metric by ID."""
    metric = service.get_by_id(metric_id)

    if metric is None:
        return jsonify({"error": "Metric not found"}), 404

    return jsonify(_serialize_metric(metric)), 200


@metrics_bp.post("/")
@login_required
def create_metric():
    """Record a new metric."""
    data = request.get_json(silent=True) or {}

    try:
        metric = service.record_metric(
            resource_id=data.get("resource_id"),
            metric_name=data.get("metric_name"),
            metric_value=data.get("metric_value"),
            unit=data.get("unit"),
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(_serialize_metric(metric)), 201
