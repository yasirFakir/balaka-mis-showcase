"""add_currency_fields_to_transaction

Revision ID: 45b25c523507
Revises: 1c464deaf082
Create Date: 2026-01-08 23:05:31.120711

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = '45b25c523507'
down_revision: Union[str, Sequence[str], None] = '1c464deaf082'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('transaction')]

    # 1. Add columns as nullable first
    if 'exchange_rate' not in columns:
        op.add_column('transaction', sa.Column('exchange_rate', sa.Float(), nullable=True))
    
    if 'claimed_amount' not in columns:
        op.add_column('transaction', sa.Column('claimed_amount', sa.Float(), nullable=True))
        
    if 'claimed_currency' not in columns:
        op.add_column('transaction', sa.Column('claimed_currency', sa.String(), nullable=True))
    
    # 2. Update existing rows with defaults
    op.execute("UPDATE transaction SET exchange_rate = 1.0 WHERE exchange_rate IS NULL")
    op.execute("UPDATE transaction SET claimed_currency = 'SAR' WHERE claimed_currency IS NULL")
    
    # 3. Alter columns to be non-nullable
    # Only verify non-nullability, don't re-add constraints blindly if data might be inconsistent
    op.alter_column('transaction', 'exchange_rate', nullable=False)
    op.alter_column('transaction', 'claimed_currency', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('transaction', 'claimed_currency')
    op.drop_column('transaction', 'claimed_amount')
    op.drop_column('transaction', 'exchange_rate')