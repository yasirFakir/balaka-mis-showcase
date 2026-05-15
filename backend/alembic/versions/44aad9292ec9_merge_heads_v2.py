"""merge heads v2

Revision ID: 44aad9292ec9
Revises: 2e7639f2b837, 5f08b3b7f830
Create Date: 2026-01-13 07:38:41.700704

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '44aad9292ec9'
down_revision: Union[str, Sequence[str], None] = ('2e7639f2b837', '5f08b3b7f830')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
