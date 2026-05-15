"""allow_guest_support

Revision ID: cc385af9a5a9
Revises: 8afcd733b141
Create Date: 2026-01-08 17:49:00.059560

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc385af9a5a9'
down_revision: Union[str, Sequence[str], None] = '8afcd733b141'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Allow guest tickets by making user_id nullable
    op.alter_column('support_ticket', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=True)
    # Add guest_session_id to identify anonymous users
    op.add_column('support_ticket', sa.Column('guest_session_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_support_ticket_guest_session_id'), 'support_ticket', ['guest_session_id'], unique=False)
    
    # Allow guest messages by making sender_id nullable
    op.alter_column('ticket_message', 'sender_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('ticket_message', 'sender_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.drop_index(op.f('ix_support_ticket_guest_session_id'), table_name='support_ticket')
    op.drop_column('support_ticket', 'guest_session_id')
    op.alter_column('support_ticket', 'user_id',
               existing_type=sa.INTEGER(),
               nullable=False)
