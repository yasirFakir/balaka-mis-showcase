import pytest
import time
from fastapi.testclient import TestClient
from tests.e2e.helpers import log_step, log_success

def test_service_catalog_and_validation(client: TestClient, admin_token_headers: dict, user_token_headers: dict):
    # ... (skipping some lines for brevity)
    # 3. Test Service Creation (Admin)
    unique_slug = f"e2e-test-{int(time.time())}"
    new_svc = {
        "name": "E2E Test Service",
        "slug": unique_slug,
        "base_price": 99.99,
        "category": "Test",
        "is_public": True,
        "form_schema": {"sections": []}
    }
    r = client.post("/api/v1/services/", json=new_svc, headers=admin_token_headers)
    assert r.status_code == 200
    created = r.json()
    log_success(f"Admin created new service: {created['slug']}")
