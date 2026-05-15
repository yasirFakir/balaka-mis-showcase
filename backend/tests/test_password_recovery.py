import pytest
from app.core import security
from app.services.email_service import email_service
from unittest.mock import patch

def test_password_reset_token_logic():
    email = "test@example.com"
    token = security.generate_password_reset_token(email)
    assert token is not None
    
    verified_email = security.verify_password_reset_token(token)
    assert verified_email == email

def test_verify_invalid_token():
    assert security.verify_password_reset_token("invalid-token") is None

@patch("app.services.email_service.emails.Message.send")
@patch("app.services.email_service.settings")
def test_send_reset_email(mock_settings, mock_send):
    mock_settings.SMTP_USER = "user@test.com"
    mock_settings.SMTP_PASSWORD = "password"
    mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
    mock_settings.SMTP_HOST = "smtp.test.com"
    mock_settings.SMTP_PORT = 587
    mock_settings.SMTP_TLS = True
    
    mock_send.return_value.status_code = 250
    # This just verifies the service method runs and tries to send via the mocked 'emails' lib
    email_service.send_password_reset_email("test@example.com", "Test User", "dummy-token")
    assert mock_send.called
