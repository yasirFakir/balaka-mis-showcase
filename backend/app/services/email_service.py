import logging
from pathlib import Path
from typing import Any, Dict, Optional
import emails
from emails.template import JinjaTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)

# Directory where email templates are stored
EMAIL_TEMPLATES_DIR = Path(__file__).parent.parent / "templates" / "email"

class EmailService:
    def __init__(self):
        # Zoho supports 465 (SSL) and 587 (TLS/STARTTLS)
        use_ssl = settings.SMTP_PORT == 465
        use_tls = settings.SMTP_PORT == 587 or (not use_ssl and settings.SMTP_TLS)
        
        self.smtp_options = {
            "host": settings.SMTP_HOST,
            "port": settings.SMTP_PORT,
            "ssl": use_ssl,
            "tls": use_tls,
            "user": settings.SMTP_USER,
            "password": settings.SMTP_PASSWORD,
        }

    def _send_email(
        self,
        email_to: str,
        subject_template: str,
        html_template: str,
        template_data: Dict[str, Any],
    ) -> None:
        """
        Internal method to send an email.
        """
        if not all([settings.SMTP_USER, settings.SMTP_PASSWORD, settings.EMAILS_FROM_EMAIL]):
            logger.warning("SMTP credentials or sender email not fully configured. Skipping email.")
            return

        message = emails.Message(
            subject=JinjaTemplate(subject_template),
            html=JinjaTemplate(html_template),
            mail_from=(settings.EMAILS_FROM_NAME, settings.EMAILS_FROM_EMAIL),
        )

        try:
            response = message.send(
                to=email_to,
                render=template_data,
                smtp=self.smtp_options,
            )
            if response.status_code not in [250, 200]:
                logger.error(f"Zoho SMTP Error: {response.status_code} - {response.error}")
            else:
                logger.info(f"Email sent successfully to {email_to}")
        except Exception as e:
            logger.error(f"Critical error sending email to {email_to}: {str(e)}")

    def send_password_reset_email(self, email_to: str, name: str, token: str, is_admin: bool = False) -> None:
        """
        Send a password reset email with the recovery link.
        """
        subject = f"{settings.EMAILS_FROM_NAME} - Password Recovery Request"
        # Link points to the frontend reset page
        if is_admin:
            link = f"{settings.ADMIN_FRONTEND_HOST}/auth/reset-password?token={token}"
        else:
            link = f"{settings.FRONTEND_HOST}/bn/auth/reset-password?token={token}"
        
        template_path = EMAIL_TEMPLATES_DIR / "password_reset.html"
        if not template_path.exists():
            logger.error(f"Template not found: {template_path}")
            return

        with open(template_path, "r") as f:
            template_str = f.read()

        self._send_email(
            email_to=email_to,
            subject_template=subject,
            html_template=template_str,
            template_data={
                "name": name,
                "link": link,
            },
        )

    def send_welcome_email(self, email_to: str, name: str) -> None:
        """
        Send a welcome email to new users.
        """
        subject = f"Welcome to {settings.EMAILS_FROM_NAME}"
        link = f"{settings.FRONTEND_HOST}/bn/auth"
        
        template_path = EMAIL_TEMPLATES_DIR / "welcome.html"
        if not template_path.exists():
            logger.error(f"Template not found: {template_path}")
            return

        with open(template_path, "r") as f:
            template_str = f.read()

        self._send_email(
            email_to=email_to,
            subject_template=subject,
            html_template=template_str,
            template_data={
                "name": name,
                "email": email_to,
                "link": link,
            },
        )

    def send_activation_email(self, email_to: str, name: str, token: str) -> None:
        """
        Send an account activation email.
        """
        subject = f"Verify your {settings.EMAILS_FROM_NAME} account"
        # Explicitly include the default locale to avoid 404s with 'localePrefix: always'
        link = f"{settings.FRONTEND_HOST}/bn/auth/activate?token={token}"
        
        template_path = EMAIL_TEMPLATES_DIR / "activate_account.html"
        if not template_path.exists():
            logger.error(f"Template not found: {template_path}")
            return

        with open(template_path, "r") as f:
            template_str = f.read()

        self._send_email(
            email_to=email_to,
            subject_template=subject,
            html_template=template_str,
            template_data={
                "name": name,
                "link": link,
            },
        )

    def send_new_staff_credentials_email(self, email_to: str, name: str, password: str) -> None:
        """
        Send welcome email with temporary credentials to new staff.
        """
        subject = f"Your Staff Account - {settings.EMAILS_FROM_NAME}"
        link = f"{settings.ADMIN_FRONTEND_HOST}/auth"
        
        template_path = EMAIL_TEMPLATES_DIR / "staff_welcome.html"
        if not template_path.exists():
            # Fallback to general welcome if specific one missing
            template_path = EMAIL_TEMPLATES_DIR / "welcome.html"

        with open(template_path, "r") as f:
            template_str = f.read()

        self._send_email(
            email_to=email_to,
            subject_template=subject,
            html_template=template_str,
            template_data={
                "name": name,
                "email": email_to,
                "password": password,
                "link": link,
            },
        )

    def send_payment_receipt_email(self, email_to: str, name: str, transaction_id: str, amount: float, currency: str, date: str, method: str, ref_id: str = None) -> None:
        """
        Send a payment receipt email.
        """
        subject = f"Payment Receipt - {transaction_id}"
        
        template_path = EMAIL_TEMPLATES_DIR / "payment_receipt.html"
        if not template_path.exists():
            logger.error(f"Template not found: {template_path}")
            return

        with open(template_path, "r") as f:
            template_str = f.read()

        self._send_email(
            email_to=email_to,
            subject_template=subject,
            html_template=template_str,
            template_data={
                "name": name,
                "transaction_id": transaction_id,
                "amount": f"{amount:,.2f}",
                "currency": currency,
                "date": date,
                "method": method,
                "ref_id": ref_id or "OFFICE-CASH"
            },
        )

email_service = EmailService()
