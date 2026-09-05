"""Metric repository."""

from app.models.metric import Metric
from app.repositories.base import BaseRepository


class MetricRepository(BaseRepository[Metric]):
    """Data access operations for metrics."""

    def __init__(self):
        super().__init__(Metric)

    def get_by_resource_id(self, resource_id: int):
        """Return metrics for a resource."""
        return (
            self.model.query
            .filter_by(resource_id=resource_id)
            .order_by(self.model.recorded_at.desc())
            .all()
        )

    def get_by_name(self, metric_name: str):
        """Return metrics by metric name."""
        return self.model.query.filter_by(metric_name=metric_name).all()
