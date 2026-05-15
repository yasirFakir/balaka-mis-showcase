"""add_system_setting_model

Revision ID: d6aa45d89cb2
Revises: 3d16584ba1ea
Create Date: 2026-01-08 19:16:26.714487

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd6aa45d89cb2'
down_revision: Union[str, Sequence[str], None] = '3d16584ba1ea'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('system_setting',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value_str', sa.String(), nullable=True),
        sa.Column('value_bool', sa.Boolean(), nullable=True),
        sa.Column('value_float', sa.Float(), nullable=True),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_system_setting_id'), 'system_setting', ['id'], unique=False)
    op.create_index(op.f('ix_system_setting_key'), 'system_setting', ['key'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_system_setting_key'), table_name='system_setting')
    op.drop_index(op.f('ix_system_setting_id'), table_name='system_setting')
    op.drop_table('system_setting')
