"""Metric repository."""

from app.models.metric import Metric
from app.repositories.base import BaseRepository


class MetricRepository(BaseRepository[Metric]):
    """Data access operations for metrics."""

    def __init__(self):
        super().__init__(Metric)

    def get_by_resource_id(self, resource_id: int, limit: int | None = None):
        """Return metrics for a resource."""
        query = (
            self.model.query
            .filter_by(resource_id=resource_id)
            .order_by(self.model.recorded_at.desc())
        )
        if limit is not None:
            query = query.limit(limit)
        return query.all()

    def get_by_name(self, metric_name: str, limit: int | None = None):
        """Return metrics by metric name."""
        query = self.model.query.filter_by(metric_name=metric_name).order_by(
            self.model.recorded_at.desc()
        )
        return query.limit(limit).all() if limit else query.all()

    def page(self, resource_id=None, metric_name=None, start=None, end=None, page=1, page_size=50):
        query = self.model.query
        if resource_id is not None:
            query = query.filter_by(resource_id=resource_id)
        if metric_name:
            query = query.filter(self.model.metric_name.ilike(f"%{metric_name}%"))
        if start is not None:
            query = query.filter(self.model.recorded_at >= start)
        if end is not None:
            query = query.filter(self.model.recorded_at < end)
        total = query.order_by(None).count()
        items = (
            query.order_by(self.model.recorded_at.desc(), self.model.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total
