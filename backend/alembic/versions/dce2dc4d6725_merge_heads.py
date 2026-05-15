"""merge heads

Revision ID: dce2dc4d6725
Revises: 45b25c523507, d6aa45d89cb2
Create Date: 2026-01-09 01:34:14.510415

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dce2dc4d6725'
down_revision: Union[str, Sequence[str], None] = ('45b25c523507', 'd6aa45d89cb2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
