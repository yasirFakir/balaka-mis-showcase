"""create service_vendors association table

Revision ID: bfb95eedccf0
Revises: 93e38db7c5bd
Create Date: 2026-02-05 21:17:09.147252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bfb95eedccf0'
down_revision: Union[str, Sequence[str], None] = '93e38db7c5bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'service_vendors',
        sa.Column('service_id', sa.Integer(), nullable=False),
        sa.Column('vendor_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['service_id'], ['service_definition.id'], ),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ),
        sa.PrimaryKeyConstraint('service_id', 'vendor_id')
    )

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('service_vendors')
