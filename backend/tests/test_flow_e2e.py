import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from tests.e2e.helpers import log_step, log_success, ENDC, YELLOW, BOLD, GREEN
from tests.e2e.test_users import test_user_management_and_rbac
from tests.e2e.test_services import test_service_catalog_and_validation
from tests.e2e.test_currency import test_multi_currency_and_bound_rates
from tests.e2e.test_finance import test_finance_lifecycle_and_safeguards
from tests.e2e.test_system import test_system_ops_and_maintenance

def test_comprehensive_system_audit(client: TestClient, admin_token_headers: dict, user_token_headers: dict, db: Session):
    """
    Main Entry Point: Orchestrates all modular E2E tests.
    """
    print(f"\n{YELLOW}{BOLD}{'='*60}\n🚀 STARTING MODULAR SYSTEM AUDIT\n{'='*60}{ENDC}")

    # 1. Identity & Security
    test_user_management_and_rbac(client, admin_token_headers, db)

    # 2. Service Catalog & Constraints
    test_service_catalog_and_validation(client, admin_token_headers, user_token_headers)

    # 3. Multi-Currency & Bound Rates
    test_multi_currency_and_bound_rates(client, admin_token_headers, user_token_headers, db)

    # 4. Financial Safeguards
    test_finance_lifecycle_and_safeguards(client, admin_token_headers, user_token_headers, db)

    # 5. System Operations
    test_system_ops_and_maintenance(client, admin_token_headers, user_token_headers, db)

    print(f"\n{GREEN}{BOLD}{'='*60}\n✅ ALL MODULAR CONTROLS VERIFIED\n{'='*60}{ENDC}\n")