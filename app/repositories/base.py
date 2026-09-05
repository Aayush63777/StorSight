"""Base repository implementation."""

from typing import Generic, TypeVar

from app.extensions import db

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """Provides common CRUD operations for SQLAlchemy models."""

    model = None

    def __init__(self, model=None):
        self.model = model or self.model

    def get_by_id(self, record_id: int):
        """Return a record by primary key."""
        if record_id is None:
            return None

        return db.session.get(self.model, record_id)

    def get_all(self):
        """Return all records."""
        return self.model.query.all()

    def count(self) -> int:
        """Return total number of records."""
        return self.model.query.count()

    def add(self, entity: ModelType) -> ModelType:
        """Add an entity to the current session."""
        db.session.add(entity)
        return entity

    def add_all(self, entities):
        """Add multiple entities to the current session."""
        db.session.add_all(entities)
        return entities

    def delete(self, entity: ModelType) -> None:
        """Delete an entity from the current session."""
        db.session.delete(entity)

    def commit(self) -> None:
        """Commit the current transaction."""
        db.session.commit()

    def rollback(self) -> None:
        """Rollback the current transaction."""
        db.session.rollback()

    def flush(self) -> None:
        """Flush pending changes to the database."""
        db.session.flush()
