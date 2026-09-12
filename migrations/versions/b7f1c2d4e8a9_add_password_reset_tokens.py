"""add user session versions

Revision ID: b7f1c2d4e8a9
Revises: b7c2d9e1f4a6
"""
from alembic import op
import sqlalchemy as sa


revision = "b7f1c2d4e8a9"
down_revision = "b7c2d9e1f4a6"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("session_version", sa.Integer(), nullable=False, server_default="0")
        )

def downgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("session_version")
