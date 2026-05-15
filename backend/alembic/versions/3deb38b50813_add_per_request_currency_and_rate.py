"""add_per_request_currency_and_rate

Revision ID: 3deb38b50813
Revises: c758bc9f4e68
Create Date: 2026-01-14 20:49:58.435963

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3deb38b50813'
down_revision: Union[str, Sequence[str], None] = 'c758bc9f4e68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns as nullable first
    op.add_column('service_definition', sa.Column('currency', sa.String(), nullable=True))
    op.add_column('service_request', sa.Column('currency', sa.String(), nullable=True))
    op.add_column('service_request', sa.Column('exchange_rate', sa.Float(), nullable=True))
    
    # Update existing records with default values
    op.execute("UPDATE service_definition SET currency = 'SAR'")
    op.execute("UPDATE service_request SET currency = 'SAR', exchange_rate = 1.0")
    
    # Set columns to non-nullable
    op.alter_column('service_definition', 'currency', nullable=False)
    op.alter_column('service_request', 'currency', nullable=False)
    op.alter_column('service_request', 'exchange_rate', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('service_request', 'exchange_rate')
    op.drop_column('service_request', 'currency')
    op.drop_column('service_definition', 'currency')