from app.core.security import get_password_hash, verify_password, pwd_context

def test_password_hashing_algorithm():
    password = "secure_password_123"
    hashed = get_password_hash(password)
    
    # Verify it starts with bcrypt identifier
    assert hashed.startswith("$2b$") or hashed.startswith("$2a$"), "Hash should be bcrypt"
    
    # Verify validity
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)

def test_hashing_context_configuration():
    # Ensure only bcrypt is in the schemes
    assert pwd_context.schemes() == ("bcrypt",), "Only bcrypt should be allowed for new hashes"
