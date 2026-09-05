"""Metric application service."""

from app.models.metric import Metric
from app.repositories.metric import MetricRepository
from app.repositories.storage_resource import StorageResourceRepository


class MetricService:
    """Application operations for metrics."""

    def __init__(self, repository=None, resource_repository=None):
        self.repository = repository or MetricRepository()
        self.resource_repository = (
            resource_repository or StorageResourceRepository()
        )

    def get_by_id(self, metric_id: int):
        return self.repository.get_by_id(metric_id)

    def list_metrics(self):
        return self.repository.get_all()

    def list_by_resource(self, resource_id: int):
        return self.repository.get_by_resource_id(resource_id)

    def list_by_name(self, metric_name: str):
        if not metric_name or not metric_name.strip():
            raise ValueError("Metric name is required.")

        return self.repository.get_by_name(metric_name.strip())

    def record_metric(
        self,
        resource_id: int,
        metric_name: str,
        metric_value: float,
        unit: str | None = None,
    ):
        self._validate_resource_id(resource_id)
        metric_name = self._validate_metric_name(metric_name)
        metric_value = self._validate_metric_value(metric_value)

        if not self.resource_repository.get_by_id(resource_id):
            raise ValueError("Storage resource not found.")

        metric = Metric(
            resource_id=resource_id,
            metric_name=metric_name,
            metric_value=metric_value,
            unit=unit.strip() if unit else None,
        )

        self.repository.add(metric)
        self.repository.commit()

        return metric

    @staticmethod
    def _validate_resource_id(resource_id: int) -> None:
        if resource_id is None or not isinstance(resource_id, int):
            raise ValueError("Resource ID is required.")

        if resource_id <= 0:
            raise ValueError("Resource ID must be positive.")

    @staticmethod
    def _validate_metric_name(metric_name: str) -> str:
        if not metric_name or not metric_name.strip():
            raise ValueError("Metric name is required.")

        return metric_name.strip()

    @staticmethod
    def _validate_metric_value(metric_value: float) -> float:
        if metric_value is None:
            raise ValueError("Metric value is required.")

        if isinstance(metric_value, bool):
            raise ValueError("Metric value must be numeric.")

        try:
            return float(metric_value)
        except (TypeError, ValueError):
            raise ValueError("Metric value must be numeric.")
