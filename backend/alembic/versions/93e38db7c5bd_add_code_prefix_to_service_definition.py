"""add code_prefix to service_definition

Revision ID: 93e38db7c5bd
Revises: 01e7b65ed295
Create Date: 2026-02-05 19:34:09.832578

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93e38db7c5bd'
down_revision: Union[str, Sequence[str], None] = '01e7b65ed295'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('service_definition', sa.Column('code_prefix', sa.String(length=10), nullable=True))

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('service_definition', 'code_prefix')
