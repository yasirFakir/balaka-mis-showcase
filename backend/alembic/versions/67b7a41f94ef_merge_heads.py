"""merge_heads

Revision ID: 67b7a41f94ef
Revises: 9fa1baf228d8, b4981e7177af
Create Date: 2026-01-02 05:25:24.401954

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '67b7a41f94ef'
down_revision: Union[str, Sequence[str], None] = ('9fa1baf228d8', 'b4981e7177af')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
