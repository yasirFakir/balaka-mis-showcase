"""merge_heads_v3

Revision ID: ab7180f2355f
Revises: 3deb38b50813, 925bccc81b8e
Create Date: 2026-01-15 06:39:33.724482

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab7180f2355f'
down_revision: Union[str, Sequence[str], None] = ('3deb38b50813', '925bccc81b8e')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
