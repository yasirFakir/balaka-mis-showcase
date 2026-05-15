"""performance_indexing

Revision ID: 8afcd733b141
Revises: a6d3239e9a4f
Create Date: 2026-01-08 09:44:14.241494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8afcd733b141'
down_revision: Union[str, Sequence[str], None] = 'a6d3239e9a4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Performance Indexes for created_at (Sorting optimization)
    op.create_index(op.f('ix_service_request_created_at'), 'service_request', ['created_at'], unique=False)
    op.create_index(op.f('ix_transaction_created_at'), 'transaction', ['created_at'], unique=False)
    op.create_index(op.f('ix_vendor_transactions_created_at'), 'vendor_transactions', ['created_at'], unique=False)
    
    # 2. Add Index for Service Scope lookups
    op.create_index(op.f('ix_service_request_service_def_id'), 'service_request', ['service_def_id'], unique=False)
    
    # 3. Data Integrity: Force non-nullable transaction_id for vendor transactions (Hardening)
    # Note: We use execute to clean up any nulls first if they exist
    op.execute("UPDATE vendor_transactions SET transaction_id = 'LEGACY-' || id WHERE transaction_id IS NULL")
    op.alter_column('vendor_transactions', 'transaction_id', existing_type=sa.String(), nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('vendor_transactions', 'transaction_id', existing_type=sa.String(), nullable=True)
    op.drop_index(op.f('ix_service_request_service_def_id'), table_name='service_request')
    op.drop_index(op.f('ix_vendor_transactions_created_at'), table_name='vendor_transactions')
    op.drop_index(op.f('ix_transaction_created_at'), table_name='transaction')
    op.drop_index(op.f('ix_service_request_created_at'), table_name='service_request')
