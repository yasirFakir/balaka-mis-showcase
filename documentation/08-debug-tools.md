# 8. Debugging Tools & Techniques

This guide provides a comprehensive overview of the debugging tools available in the Balaka MIS project, covering both backend (FastAPI) and frontend (Next.js) environments.

## 8.1 Backend Debugging (FastAPI)

### Core Dependencies
Ensure these are installed in your `backend/requirements.txt`:
*   `debugpy`: For attaching a debugger (VS Code).
*   `ipython`: For an enhanced interactive shell.
*   `watchfiles`: For efficient file watching and reloading.

### 8.1.1 The Technical Terminal (Lab Mode)
We have built a custom "Lab Mode" that streams server logs directly to the Admin Dashboard.

**How to Use:**
1.  Navigate to **System > Maintenance** in the Admin Panel.
2.  Open the **Live Terminal** tab.
3.  This connects to `/api/v1/system/lab/logs` via SSE.
4.  You will see real-time logs for API requests, database queries, and background jobs.

**Code Reference:**
*   `backend/app/core/lab.py`: Handles the log streaming logic.
*   `backend/app/api/endpoints/system.py`: Exposes the SSE endpoint.

### 8.1.2 Interactive Shell (CLI)
You can interact with your database models and services directly using the custom CLI.

**Command:**
```bash
# From backend/ directory
python -m app.cli.main
```

**Common Tasks:**
*   `users list`: List all users.
*   `requests list --status Pending`: View pending requests.
*   `finance summary`: View current financial health.

### 8.1.3 Automated Security Scanner
A persistent tool for verifying the application's resilience against injection attacks.

**Command:**
```bash
# From project root
python3 backend/scripts/security_injection_scan.py
```

**What it tests:**
*   **SQL Injection (SQLi)**: Tests login and public endpoints with various bypass, union, and time-based payloads.
*   **Cross-Site Scripting (XSS)**: Checks for direct reflection of malicious script tags in API responses.
*   **Server-Side Request Forgery (SSRF)**: Verifies that headers and URL inputs cannot be used to probe internal network or cloud metadata services.

### 8.1.4 Identity & Access Control Auditor
A specialized script for testing AuthN/AuthZ, RBAC, and IDOR vulnerabilities.

**Command:**
```bash
# From project root
python3 backend/scripts/security_identity_audit.py
```

### 8.1.5 Performance Stress Seeder
A high-volume data generation tool for testing analytics performance and financial reporting.

**Command:**
```bash
# From backend/ directory
export PYTHONPATH=$PYTHONPATH:.
python3 app/seeds/mock/seed_performance.py
```

**Key Features:**
*   **Realistic Financials**: Generates mixed SAR and BDT requests/transactions with precision rounding (2 decimals).
*   **Ledger Compliance**: Automatically synchronizes vendor debts using the correct `PURCHASE` type and aligns with **Requirement #195** (Multi-currency vendor ledger).
*   **Internal Operations**: Includes specific mock data for private services like "Staff Settlement" and "Internal Trading".

---

### 8.1.6 VS Code Debugger
To attach a real debugger to the running FastAPI server:

1.  **Configuration**: Ensure your `.vscode/launch.json` has a configuration for Python: FastAPI.
    ```json
    {
        "name": "Python: FastAPI",
        "type": "python",
        "request": "launch",
        "module": "uvicorn",
        "args": [
            "app.main:app",
            "--reload",
            "--port",
            "8008"
        ],
        "jinja": true,
        "justMyCode": true
    }
    ```
2.  **Debug**: Press `F5` or go to the "Run and Debug" tab and select "Python: FastAPI".
3.  **Breakpoints**: Click in the gutter next to line numbers in your Python code (e.g., inside an endpoint function) to pause execution and inspect variables.

---

## 8.2 Frontend Debugging (Next.js)

### Core Dependencies
*   `react-devtools`: Browser extension (Chrome/Firefox).
*   `@next/bundle-analyzer`: For analyzing build output sizes (optional).

### 8.2.1 React DevTools
The standard and most powerful tool.
1.  Install the **React Developer Tools** extension for your browser.
2.  Open Developer Tools (F12) -> **Components** tab.
3.  **Inspect Props**: Select any component (e.g., `GoniaDataTable`) to see the data it received.
4.  **Debug Hooks**: View the state of `useState`, `useEffect`, and custom hooks like `useGoniaDirectory`.

### 8.2.2 The "Sonar" Notification Debugger
Our custom notification system has built-in logging.

**How to Use:**
1.  Open the browser console (F12 -> Console).
2.  Filter for `[Sonar]`.
3.  You will see logs for every notification dispatch, including the payload and target user logic.

**Code Reference:**
*   `frontend/packages/ui/lib/notification-context.tsx`: Manages the toast queue and loop protection logic.

### 8.2.3 Server-Side Rendering (SSR) Hydration Errors
If you see "Hydration failed" or "Text content does not match":
1.  **Check Layouts**: Ensure `<html>` and `<body>` tags are not nested incorrectly (e.g., a layout rendering another layout that both have `<html>`).
2.  **Date Formatting**: Ensure dates are formatted consistently between server and client. Use the safe pattern:
    ```tsx
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null; // or a skeleton
    ```
    *Alternatively*, use our standardized `format(new Date(...))` helpers which we have hardened against invalid inputs.

### 8.2.4 Network & API Debugging
1.  Open Developer Tools -> **Network** tab.
2.  Filter by `Fetch/XHR`.
3.  Look for requests to `localhost:8008`.
4.  **Inspect Response**: Click a request -> **Response** tab to see the raw JSON returned by the backend. This is crucial for debugging `ListResponse` structure issues (e.g., checking if `items` is an array).

---

## 8.3 Integration Testing (Playwright)

We use Playwright for End-to-End (E2E) "Smoke Tests". This is the ultimate debugger because it tests the system as a user.

### Setup
```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium firefox
```

### Running Tests
We have a unified script that starts the backend, starts the frontend, and runs the tests automatically.

```bash
# From project root
./run_smoke_test.sh
```

**What it catches:**
*   **Runtime Crashes**: Detects if a page throws a 500 error or blank screens.
*   **Console Errors**: Captures errors printed to the browser console during navigation.
*   **Network Failures**: Reports if API calls fail to complete.

**Customizing Tests:**
Edit `frontend/apps/balaka-admin/e2e/smoke.spec.ts` to add new routes or specific user interactions (e.g., clicking a "Submit" button and waiting for a success toast).
