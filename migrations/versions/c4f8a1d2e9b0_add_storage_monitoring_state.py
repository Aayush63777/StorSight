"""add storage integration and monitoring state

Revision ID: c4f8a1d2e9b0
Revises: b7f1c2d4e8a9
"""
from alembic import op
import sqlalchemy as sa


revision = "c4f8a1d2e9b0"
down_revision = "b7f1c2d4e8a9"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("storage_resources", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("adapter_type", sa.String(length=40), nullable=True)
        )
        batch_op.add_column(
            sa.Column("endpoint_url", sa.String(length=500), nullable=True)
        )
        batch_op.add_column(
            sa.Column("credential_ref", sa.String(length=200), nullable=True)
        )
        batch_op.add_column(
            sa.Column("monitoring_enabled", sa.Boolean(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("poll_interval_seconds", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("stale_after_seconds", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("capacity_total_bytes", sa.BigInteger(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("capacity_used_bytes", sa.BigInteger(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("monitoring_state", sa.String(length=30), nullable=True)
        )
        batch_op.add_column(
            sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("last_metric_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column("connection_tested_at", sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(sa.Column("monitoring_error", sa.Text(), nullable=True))
        batch_op.create_index("ix_storage_resources_adapter_type", ["adapter_type"])
        batch_op.create_index("ix_storage_resources_monitoring_state", ["monitoring_state"])
        batch_op.create_index("ix_storage_resources_last_seen", ["last_seen"])
        batch_op.create_index("ix_storage_resources_last_metric_at", ["last_metric_at"])

    op.execute(
        "UPDATE storage_resources SET adapter_type='manual', "
        "monitoring_enabled=FALSE, poll_interval_seconds=300, "
        "stale_after_seconds=900, monitoring_state='unconfigured' "
        "WHERE adapter_type IS NULL"
    )

    with op.batch_alter_table("storage_resources", schema=None) as batch_op:
        batch_op.alter_column(
            "adapter_type", existing_type=sa.String(length=40), nullable=False
        )
        batch_op.alter_column(
            "monitoring_enabled", existing_type=sa.Boolean(), nullable=False
        )
        batch_op.alter_column(
            "poll_interval_seconds", existing_type=sa.Integer(), nullable=False
        )
        batch_op.alter_column(
            "stale_after_seconds", existing_type=sa.Integer(), nullable=False
        )
        batch_op.alter_column(
            "monitoring_state", existing_type=sa.String(length=30), nullable=False
        )

    op.create_index(
        "ix_metrics_resource_recorded_at",
        "metrics",
        ["resource_id", "recorded_at"],
    )
    with op.batch_alter_table("metrics", schema=None) as batch_op:
        batch_op.add_column(sa.Column("source", sa.String(length=40), nullable=True))
    op.execute("UPDATE metrics SET source='manual' WHERE source IS NULL")
    with op.batch_alter_table("metrics", schema=None) as batch_op:
        batch_op.alter_column("source", existing_type=sa.String(length=40), nullable=False)
    op.create_index(
        "ix_alerts_resource_title_status",
        "alerts",
        ["resource_id", "title", "status"],
    )


def downgrade():
    op.drop_index("ix_alerts_resource_title_status", table_name="alerts")
    op.drop_index("ix_metrics_resource_recorded_at", table_name="metrics")
    with op.batch_alter_table("metrics", schema=None) as batch_op:
        batch_op.drop_column("source")
    with op.batch_alter_table("storage_resources", schema=None) as batch_op:
        batch_op.drop_index("ix_storage_resources_last_metric_at")
        batch_op.drop_index("ix_storage_resources_last_seen")
        batch_op.drop_index("ix_storage_resources_monitoring_state")
        batch_op.drop_index("ix_storage_resources_adapter_type")
        batch_op.drop_column("monitoring_error")
        batch_op.drop_column("connection_tested_at")
        batch_op.drop_column("last_metric_at")
        batch_op.drop_column("last_seen")
        batch_op.drop_column("monitoring_state")
        batch_op.drop_column("capacity_used_bytes")
        batch_op.drop_column("capacity_total_bytes")
        batch_op.drop_column("stale_after_seconds")
        batch_op.drop_column("poll_interval_seconds")
        batch_op.drop_column("monitoring_enabled")
        batch_op.drop_column("credential_ref")
        batch_op.drop_column("endpoint_url")
        batch_op.drop_column("adapter_type")
