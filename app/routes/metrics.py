"""Metric API routes."""

from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

from app.auth.decorators import login_required, operational_write_required
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
        "source": metric.source,
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
    limit = min(max(request.args.get("limit", 100, type=int), 1), 500)

    paginated = request.args.get("page") is not None or request.args.get("page_size") is not None
    if paginated:
        try:
            page = int(request.args.get("page", 1))
            page_size = min(max(int(request.args.get("page_size", 50)), 1), 200)
            start = _parse_timestamp(request.args.get("from"))
            end = _parse_timestamp(request.args.get("to"))
            if page < 1 or (start and end and start >= end):
                raise ValueError
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid page, page_size, from, or to parameter."}), 400

        metrics, total = service.page(
            resource_id=resource_id,
            metric_name=metric_name,
            start=start,
            end=end,
            page=page,
            page_size=page_size,
        )
        return jsonify({
            "items": [_serialize_metric(metric) for metric in metrics],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "total_pages": (total + page_size - 1) // page_size,
            },
        }), 200

    try:
        if resource_id is not None:
            metrics = service.list_by_resource(resource_id, limit=limit)
        elif metric_name:
            metrics = service.list_by_name(metric_name, limit=limit)
        else:
            metrics = service.list_metrics(limit=limit)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(
        [_serialize_metric(metric) for metric in metrics]
    ), 200


def _parse_timestamp(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError
    return parsed.astimezone(timezone.utc)


@metrics_bp.get("/<int:metric_id>")
@login_required
def get_metric(metric_id):
    """Return a metric by ID."""
    metric = service.get_by_id(metric_id)

    if metric is None:
        return jsonify({"error": "Metric not found"}), 404

    return jsonify(_serialize_metric(metric)), 200


@metrics_bp.post("/")
@operational_write_required
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
