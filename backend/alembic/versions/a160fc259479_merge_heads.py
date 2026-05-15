"""merge heads

Revision ID: a160fc259479
Revises: 711fec08b04e, 947e5f4c4e6f
Create Date: 2026-01-13 04:08:45.222417

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a160fc259479'
down_revision: Union[str, Sequence[str], None] = ('711fec08b04e', '947e5f4c4e6f')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
