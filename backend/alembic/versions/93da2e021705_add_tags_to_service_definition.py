"""add tags to service_definition

Revision ID: 93da2e021705
Revises: 5f8a1c690455
Create Date: 2026-01-05 15:15:22.002460

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93da2e021705'
down_revision: Union[str, Sequence[str], None] = '5f8a1c690455'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


import json

def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('service_definition', sa.Column('tags', sa.JSON(), nullable=True))
    
    # Simple migration: wrap existing category in a list
    connection = op.get_bind()
    results = connection.execute(sa.text("SELECT id, category FROM service_definition")).fetchall()
    for row in results:
        if row.category:
            tags_json = json.dumps([row.category])
            connection.execute(
                sa.text("UPDATE service_definition SET tags = :tags WHERE id = :id"),
                {"tags": tags_json, "id": row.id}
            )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('service_definition', 'tags')
