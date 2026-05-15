from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

def test_user_me_persistence(client: TestClient, user_token_headers: dict):
    """
    Verifies that the /users/me endpoint returns the user data correctly 
    with a valid token, simulating the initial load after a page refresh.
    """
    response = client.get("/api/v1/users/me", headers=user_token_headers)
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "is_active" in data
    assert data["is_active"] is True

def test_user_me_invalid_token(client: TestClient):
    """
    Verifies that /users/me returns 401 for an invalid token.
    The frontend should only clear the token on this specific error.
    """
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/v1/users/me", headers=headers)
    assert response.status_code == 401
    assert response.json()["detail"] == "Could not validate credentials"
