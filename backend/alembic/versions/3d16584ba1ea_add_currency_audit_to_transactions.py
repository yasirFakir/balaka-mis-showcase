"""add_currency_audit_to_transactions

Revision ID: 3d16584ba1ea
Revises: cc385af9a5a9
Create Date: 2026-01-08 18:58:59.640646

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '3d16584ba1ea'
down_revision: Union[str, Sequence[str], None] = 'cc385af9a5a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    bind = op.get_bind()
    inspector = Inspector.from_engine(bind)
    columns = [c['name'] for c in inspector.get_columns('transaction')]

    if 'claimed_amount' not in columns:
        op.add_column('transaction', sa.Column('claimed_amount', sa.Float(), nullable=True))
    
    if 'claimed_currency' not in columns:
        op.add_column('transaction', sa.Column('claimed_currency', sa.String(), nullable=True, server_default='SAR'))
        
    if 'exchange_rate' not in columns:
        op.add_column('transaction', sa.Column('exchange_rate', sa.Float(), nullable=True, server_default='1.0'))
    
    # Backfill existing data
    # Safe to run even if columns existed
    op.execute("UPDATE \"transaction\" SET claimed_amount = amount, claimed_currency = 'SAR', exchange_rate = 1.0 WHERE exchange_rate IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transaction', 'exchange_rate')
    op.drop_column('transaction', 'claimed_currency')
    op.drop_column('transaction', 'claimed_amount')