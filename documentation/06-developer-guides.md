# 6. Developer Guides & How-Tos

This document provides practical, step-by-step guides for common developer tasks, from running tests to troubleshooting frequent issues.

## 6.1 How to Reset and Seed the Database

When you need to reset your local development database to a clean, known state, follow this precise order of operations.

**Prerequisite:** Ensure your Python virtual environment is active.
```bash
# Navigate to the backend directory if you are not already there
cd backend
source .venv/bin/activate
```

### The Process
1.  **Cleanup Database**: This script completely wipes all data and tables from the database specified in your `.env` file. **This is destructive and cannot be undone.**
    ```bash
    python scripts/cleanup_db.py
    ```

2.  **Run Migrations**: After wiping the database, you need to recreate the table structures. Alembic handles this by applying all migration scripts.
    ```bash
    alembic upgrade head
    ```

3.  **Run Seeders**: Execute the unified seeding script which is now part of the `app` package.
    ```bash
    # From the backend/ directory
    python -m app.seeds.seed_all
    ```

### Consolidated Command
For convenience, you can run the unified seeding script to perform all steps in the correct order:

```bash
# WARNING: Destructive operation!
python scripts/cleanup_db.py && \
alembic upgrade head && \
python -m app.seeds.seed_all
```

---

## 6.2 The Unified Audit Suite (Recommended)

The most robust way to verify the entire system (Backend + Frontend E2E) is using the unified audit script. This script orchestrates the backend test suite and the Playwright smoke tests for both the Client and Admin sites.

### Running the Full Audit
From the project root directory:
```bash
./run_full_audit.sh
```

**What it does:**
1.  **Backend Audit**: Executes all `pytest` suites (49+ tests) including security, financials, and lifecycle flows.
2.  **Frontend E2E Audit**: Runs Playwright smoke tests for both the Client (`:3000`) and Admin (`:3001`) portals.

*Note: Ensure your development servers are running before starting the audit.*

---

## 6.3 How to Run Automated Tests (Backend)

The project includes an extensive `pytest` suite for the backend that verifies core logic, edge cases, and bug regressions.

### Test Setup
The test suite runs against a **separate, dedicated PostgreSQL database** (`balaka_test`) to avoid interfering with your development data.

1.  **Create the Test Database**:
    ```bash
    # From the backend/ directory
    python scripts/create_test_db.py
    ```

### Running Backend Tests
```bash
cd backend
source .venv/bin/activate
PYTHONPATH=. pytest tests/ -v -s
```

A successful run confirms that all financial, authentication, and service management logic is stable.

---

## 6.5 How to Test Automated Maintenance Tasks

The system includes daily automated cleanup tasks to maintain performance, privacy, and filesystem hygiene.

### 1. Personal File Cleanup (Privacy Purge)
Runs at **3:00 AM BD Time**. Deletes PII files from requests completed more than 7 days ago.

### 2. Temporary Asset Cleanup (Orphaned Thumbnails)
Runs at **3:00 AM BD Time** (concurrently with privacy purge). Deletes temporary service thumbnails (`-tmp.webp`) older than 24 hours that were never finalized by the admin.

#### Testing the Logic
You can verify the maintenance logic using the dedicated test suite:
```bash
cd backend
PYTHONPATH=. pytest tests/test_maintenance.py tests/test_service_images.py -v -s
```

---

## 6.6 Request for Quote & Cancellation Workflow

The system now supports a "Quote" workflow for services where the price is not fixed upfront (e.g., Cargo, Custom Tours).

### Workflow Steps
1.  **Client Request**: When a client selects a service variant with a price of **0.00**, the system treats this as a "Quote Request".
    *   **UI**: Displays "Request Quote" instead of "$0.00".
    *   **Status**: Request is created as `Pending` with `selling_price = 0`.
    *   **Payment**: The "Pay Now" button is hidden and replaced with a "Quote Pending" badge.

2.  **Admin Review**: An admin reviews the request.
    *   **Action**: Admin uses the **Financial Template** builder to add income items (e.g., "Freight Cost", "Service Fee").
    *   **Price Update**: The backend automatically calculates the new `selling_price` as the sum of all INCOME items in the breakdown.
    *   **Unlock**: Once the price is > 0, the "Approve" button is unlocked.

3.  **Client Payment**:
    *   **Notification**: The client's UI updates in real-time (via SSE) to show the new price.
    *   **Action**: The "Pay Now" button becomes available.

4.  **Cancellation**:
    *   **Client Action**: A client can cancel their request at any time (unless it is already Completed/Rejected).
    *   **Ticket Prompt**: Upon cancellation, the system automatically asks if they want to open a support ticket (e.g., to discuss a refund).
    *   **Endpoint**: Use `PUT /api/v1/service-requests/{id}/cancel` (Owner only). This is distinct from the admin update endpoint.

---

## 6.7 Email Server Configuration (Zoho SMTP)

The Balaka MIS uses Zoho Mail for system-wide notifications, password recovery, and receipts. For security, you must use an **App-Specific Password** instead of your primary account password.

### Setup Instructions
1.  Log in to your **Zoho Mail** control panel.
2.  Navigate to **My Account** > **Security** > **App Passwords**.
3.  Generate a new password named "Balaka MIS".
4.  Copy the 16-character code and add it to your environment variables (Dokploy or `.env`).

### Environment Variables Explained

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `SMTP_HOST` | `smtp.zoho.com` | The address of the Zoho outgoing mail server. |
| `SMTP_PORT` | `587` | The port for secure TLS connections. |
| `SMTP_TLS` | `True` | Instructs the system to use Transport Layer Security. |
| `SMTP_USER` | `your@domain.com` | Your full Zoho email address. |
| `SMTP_PASSWORD` | `**** **** ****` | The 16-character App-Specific Password generated in Step 1. |
| `EMAILS_FROM_EMAIL`| `your@domain.com` | The address that will appear in the "From" field. Usually same as `SMTP_USER`. |
| `EMAILS_FROM_NAME` | `Balaka MIS` | The display name for outgoing emails (e.g., Balaka Travel & Logistics). |
| `FRONTEND_HOST` | `https://...` | The root URL of your client portal (used for password reset links). |

## 6.8 Remote Server Commands (PYTHONPATH)

When managing the backend on a remote server (e.g., via a terminal in Dokploy or SSH), you often need to run Python modules without having a virtual environment active in your shell. Use the `PYTHONPATH` prefix to ensure the interpreter can find the `app` package.

### Upgrade Database (Alembic)
Run this from the `backend/` directory to apply the latest schema changes:
```bash
export PYTHONPATH=$PYTHONPATH:. && python3 -m alembic upgrade head
```

### Seed System Data
Run this from the `backend/` directory to initialize roles, permissions, and services:
```bash
export PYTHONPATH=$PYTHONPATH:. && python3 -m app.seeds.seed_all
```

### Seed Performance Data
Generate 10,000+ mock records for stress testing:
```bash
export PYTHONPATH=$PYTHONPATH:. && python3 -m app.seeds.mock.seed_performance
```

---

## 6.9 Common Troubleshooting
... (rest of the file)
