import pytest
from unittest.mock import patch
from app.services.email_service import email_service

@patch("app.services.email_service.emails.Message.send")
@patch("app.services.email_service.settings")
def test_send_welcome_email(mock_settings, mock_send):
    mock_settings.SMTP_USER = "user@test.com"
    mock_settings.SMTP_PASSWORD = "password"
    mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
    mock_settings.SMTP_HOST = "smtp.test.com"
    mock_settings.SMTP_PORT = 587
    mock_settings.SMTP_TLS = True
    
    mock_send.return_value.status_code = 250
    
    email_service.send_welcome_email("newuser@example.com", "New User")
    assert mock_send.called

@patch("app.services.email_service.emails.Message.send")
@patch("app.services.email_service.settings")
def test_send_payment_receipt_email(mock_settings, mock_send):
    mock_settings.SMTP_USER = "user@test.com"
    mock_settings.SMTP_PASSWORD = "password"
    mock_settings.EMAILS_FROM_EMAIL = "from@test.com"
    mock_settings.SMTP_HOST = "smtp.test.com"
    mock_settings.SMTP_PORT = 587
    mock_settings.SMTP_TLS = True
    
    mock_send.return_value.status_code = 250
    
    email_service.send_payment_receipt_email(
        "client@example.com", 
        "Client Name", 
        "TXN-123456", 
        500.00, 
        "SAR", 
        "2026-01-12", 
        "Bank Transfer"
    )
    assert mock_send.called
