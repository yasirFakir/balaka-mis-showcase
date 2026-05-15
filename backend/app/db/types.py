from sqlalchemy import TypeDecorator, String
from app.core.security import encrypt_message, decrypt_message

class EncryptedString(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that automatically encrypts data before saving to the DB
    and decrypts it when reading from the DB.
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            return encrypt_message(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return decrypt_message(value)
        return value
