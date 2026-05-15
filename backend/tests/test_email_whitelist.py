import pytest
from app.schemas.user import UserCreate, UserUpdate, UserUpdateMe

def test_user_create_email_whitelist():
    # Valid domains
    valid_emails = ["user@gmail.com", "admin@airbalakatravel.com", "test@example.com"]
    for email in valid_emails:
        user_in = UserCreate(
            email=email,
            password="password123",
            full_name="Test User"
        )
        assert user_in.email == email

    # Invalid domains
    invalid_emails = ["user@mailinator.com", "hacker@temp-mail.org", "spam@unknown-domain.xyz"]
    for email in invalid_emails:
        with pytest.raises(ValueError) as excinfo:
            UserCreate(
                email=email,
                password="password123",
                full_name="Test User"
            )
        assert "is not allowed" in str(excinfo.value)

def test_user_update_email_whitelist():
    # Valid
    u = UserUpdate(email="valid@gmail.com")
    assert u.email == "valid@gmail.com"
    
    # Invalid
    with pytest.raises(ValueError):
        UserUpdate(email="invalid@spam.com")

def test_user_update_me_email_whitelist():
    # Valid
    u = UserUpdateMe(email="valid@outlook.com")
    assert u.email == "valid@outlook.com"
    
    # Invalid
    with pytest.raises(ValueError):
        UserUpdateMe(email="invalid@temp.com")

def test_user_create_staff_fields():
    # Verify that UserCreate now has is_active and is_superuser and work_office
    user_in = UserCreate(
        email="staff@gmail.com",
        password="password123",
        full_name="Staff Member",
        work_office="Dhaka",
        is_active=True,
        is_superuser=False
    )
    assert user_in.work_office == "Dhaka"
    assert user_in.is_active is True
    assert user_in.is_superuser is False