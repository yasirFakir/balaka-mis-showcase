from app.core.security import encrypt_message, decrypt_message

def test_encryption_decryption():
    original_text = "This is a secret message"
    encrypted = encrypt_message(original_text)
    
    assert encrypted != original_text
    assert " " not in encrypted # Base64/Fernet shouldn't have spaces usually
    
    decrypted = decrypt_message(encrypted)
    assert decrypted == original_text

def test_legacy_message_fallback():
    # If decryption fails (e.g. legacy plain text), it should return the original
    legacy_text = "Old plain message"
    # This shouldn't match Fernet format or be decryptable with current key
    result = decrypt_message(legacy_text)
    assert result == legacy_text
