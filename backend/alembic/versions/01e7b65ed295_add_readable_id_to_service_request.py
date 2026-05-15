"""add readable_id to service_request

Revision ID: 01e7b65ed295
Revises: 71dd7167718a
Create Date: 2026-02-05 19:28:57.024411

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '01e7b65ed295'
down_revision: Union[str, Sequence[str], None] = '71dd7167718a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('service_request', sa.Column('readable_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_service_request_readable_id'), 'service_request', ['readable_id'], unique=True)
    
    # Backfill existing records with a default prefix
    op.execute("UPDATE service_request SET readable_id = 'REQ-' || LPAD(id::text, 4, '0') WHERE readable_id IS NULL")

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_service_request_readable_id'), table_name='service_request')
    op.drop_column('service_request', 'readable_id')
