from fastapi.testclient import TestClient
from app.main import app

# raise_server_exceptions=False is CRITICAL to test exception handlers
client = TestClient(app, raise_server_exceptions=False)

# Inject a route that forces an error for testing purposes
# We'll use a dynamic route creation for the test context if possible, 
# or mock an existing endpoint to fail.
# However, modifying the running app fixture is tricky. 
# A cleaner way is to use a new router just for this test file.

from fastapi import APIRouter
error_test_router = APIRouter()

@error_test_router.get("/force-error")
def force_error():
    raise ValueError("This is a forced internal error")

app.include_router(error_test_router)

def test_global_exception_handler():
    response = client.get("/force-error")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal Server Error. Please contact support."}
