"""add category to service_definition

Revision ID: 5f8a1c690455
Revises: 27142167bced
Create Date: 2026-01-05 14:55:36.616804

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f8a1c690455'
down_revision: Union[str, Sequence[str], None] = '27142167bced'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('service_definition', sa.Column('category', sa.String(), nullable=True))
    op.execute("UPDATE service_definition SET category = 'General Service'")
    op.create_index(op.f('ix_service_definition_category'), 'service_definition', ['category'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_service_definition_category'), table_name='service_definition')
    op.drop_column('service_definition', 'category')
