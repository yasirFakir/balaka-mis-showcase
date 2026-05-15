"""add_indexes_to_transaction

Revision ID: 925bccc81b8e
Revises: c758bc9f4e68
Create Date: 2026-01-14 21:47:14.779784

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '925bccc81b8e'
down_revision: Union[str, Sequence[str], None] = 'c758bc9f4e68'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_index(op.f('ix_transaction_transaction_type'), 'transaction', ['transaction_type'], unique=False)
    op.create_index(op.f('ix_transaction_payment_method'), 'transaction', ['payment_method'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_transaction_payment_method'), table_name='transaction')
    op.drop_index(op.f('ix_transaction_transaction_type'), table_name='transaction')
