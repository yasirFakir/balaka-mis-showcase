"""merge profile and service migrations

Revision ID: de8dd966c735
Revises: fef79fa7235b, e8b4f76618de
Create Date: 2026-01-03 09:54:09.582379

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'de8dd966c735'
down_revision: Union[str, Sequence[str], None] = ('fef79fa7235b', 'e8b4f76618de')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
