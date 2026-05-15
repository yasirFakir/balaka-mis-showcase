# 3. Backend Deep Dive

This document is a comprehensive guide for backend developers. It explores the core business logic, data models, and security mechanisms of the FastAPI application.

## 3.1 Authentication & Authorization (PBAC)

The system has evolved from simple role checks (`is_superuser`) to a granular **Permission-Based Access Control (PBAC)** system. This provides fine-grained control over what users can see and do.

### Core Models
-   `User`: Represents an individual account.
-   `Role`: A named group of permissions (e.g., "Manager", "Finance Staff").
-   `Permission`: A single, specific action (e.g., `users.edit`, `finance.refund`).
-   `user_roles` (Association Table): Links Users to Roles (Many-to-Many).
-   `role_permissions` (Association Table): Links Roles to Permissions (Many-to-Many).

### The Authentication Flow (JWT)
1.  A user submits their email and password to `POST /api/v1/login/access-token`.
2.  The system verifies the credentials using **strictly enforced `bcrypt`** hashing (via `passlib`). Deprecated hashing schemes and automatic migration have been disabled to ensure maximum security.
3.  A **JSON Web Token (JWT)** is generated. The token's payload contains the `user_id` (as `sub`) and an `exp` (expiration timestamp).
4.  This token is sent back to the client, who must include it in the `Authorization: Bearer <token>` header for all subsequent requests.

### Public Registration
To support growth, the system allows guests to create their own accounts via `POST /api/v1/users/register`.
- **Automatic Role Assignment**: New registrations are automatically assigned the "Client" role.
- **Validation**: Enforces unique email and phone number constraints.

### Account Lockout Policy (Brute-Force Protection)
The system implements a per-account lockout mechanism to prevent brute-force attacks:
- **Trigger**: 5 consecutive failed login attempts.
- **Penalty**: The account is locked for **5 minutes**.
- **User Feedback**: The API returns a `403 Forbidden` error with a countdown (e.g., "Account locked. Please try again in 4 minutes").
- **Shared IP Isolation**: Lockouts are strictly applied to the individual account, ensuring that other users on the same network (e.g., an office) remain unaffected.

### The Authorization Flow (The `require_permission` Dependency)
This is the heart of our security model. Routes are protected using a custom dependency.

**Example: Protecting an Endpoint**
```python
# In app/api/endpoints/users.py
from app.api.dependencies import require_permission

@router.get("/")
def get_all_users(
    # This dependency will automatically handle validation
    current_user: models.User = Depends(require_permission("users.view_all"))
):
    # This code only runs if the user has the required permission
    ...
```

**How `require_permission` Works:**
1.  It first calls the `get_current_active_user` dependency, which validates the JWT and fetches the user from the database, including their assigned roles.
2.  It then traverses the user's roles and the permissions associated with those roles.
3.  It checks if the required permission slug (e.g., `"users.manage"`) exists in the user's collected set of permissions.
4.  If the permission is not found, it raises a `403 Forbidden` HTTPException, immediately stopping the request.

### Simplified Permission Matrix (Access Levels)
Instead of granular actions (create, edit, delete), permissions are grouped into Access Levels to reduce complexity:
*   **View**: Read-only access to a module.
*   **Manage**: Full CRUD capabilities (Create, Edit, Delete).
*   **Approve** (Requests only): Authority to change status to Approved/Rejected.
*   **Finance** (Requests only): Authority to record payments/refunds.

This approach allows administrators to create new roles and dynamically adjust permissions via the Admin Panel without requiring any code changes.

### Global Session Expiry Handling
The system implements a global listener for token expiration to improve UX:
1.  **Backend Signal**: When a token expires, the backend API returns a standard `401 Unauthorized` response.
2.  **API Client Interception**: The frontend `fetchClient` intercepts any `401` status code and dispatches a global browser event: `auth:session-expired`.
3.  **Auth Context Listener**: The `AuthProvider` in both Admin and Client apps listens for this event. When triggered, it:
    *   Displays a "Session expired" toast notification.
    *   Executes a clean `logout()`, removing the token and redirecting the user to the login screen.

---

### 3.2 Standardized Collection Responses (`ListResponse`)
To support high-performance frontends and consistent data handling, all collection endpoints (e.g., `/users/`, `/service-requests/`) return a standardized envelope:
```json
{
  "items": [],
  "total": 100,
  "summary": {} // Optional domain-specific stats
}
```
This enables the frontend `useGoniaDirectory` hook to handle pagination and summary analysis without knowing the internal model structure.

### 3.3 The Service Layer (`app/services/`)
While CRUD handles basic DB operations, the `services/` layer orchestrates complex business workflows:
*   **`WorkflowService`**: Standardizes status transitions. Prevents state regression and triggers automated financial records (e.g., creating `VendorTransaction` when a request enters the lifecycle).
*   **`FinanceService`**: Located in `app/core/finance.py`, it acts as the single source of truth for all revenue, cost, and profit calculations system-wide.

---

## 3.4 The Service & Commerce Engine

### The Data Model Hierarchy
1.  **`ServiceDefinition`**: The top-level container.
    *   `form_schema`: The input form structure.
    *   `financial_schema` (New): A template for standard income/expense items (e.g., "Freight Cost", "Packaging Fee").
2.  **`ServiceVariant`**: A specific product SKU (e.g., "23 KG Box"). Defines the `Selling Price` exposed to the client.
3.  **`ServiceRequest`**: The actual order.
    *   `financial_breakdown` (New): The finalized list of Income and Expenses. Used to calculate `Profit`.

### Dynamic Form Intelligence
The system uses a JSON-driven form engine that supports advanced field types and behaviors:
-   **List Types**: Allows dynamic addition/removal of multiple items (e.g., passenger names, cargo contents).
-   **Auto-Count Persistence**: Programmatically synchronizes list lengths to `${key}_count` fields in the database.
-   **Conditional UI Logic**: Fields can be enabled/disabled or hidden based on the values of other fields (e.g., disabling 'Return Date' if 'Return Trip' is false).

### The Order Fulfillment & Financial Workflow
1.  **Client Places Order**: Selects a Variant. `Selling Price` is locked.
2.  **Admin Processes Request**:
    *   Opens the **Fulfillment Dialog**.
    *   The system loads the `financial_schema` and pre-fills standard costs.
    *   Admin adjusts amounts (e.g., specific packaging cost) and assigns Vendors to specific line items.
3.  **Profit & Debt Automation**:
    *   **Profit**: Calculated as `Total Income - Total Expenses`.
    *   **Vendor Debt**: The system iterates through the breakdown. For every item of type `EXPENSE` or `PAYMENT` linked to a `Vendor`, it creates a `VendorTransaction` (Purchase), increasing our debt to them.
    *   **Direct Entry Auto-Settlement**: For office walk-ins, staff can create "Direct Completed" requests. The backend automatically generates a verified payment transaction for the full amount, instantly balancing the ledger.
    *   **Sync**: If the breakdown is updated later, the system smartly reverses the impact of old transactions and recreates them to ensure the ledger remains accurate.

### 3.2.1 Unified Vendor & Internal Accounts
The system manages both external suppliers and internal cost centers using a unified `Vendor` model:
*   **External Vendors (`type="EXTERNAL"`)**: Airlines, Visa Agencies, etc. Positive balance = Payable Debt.
*   **Internal Accounts (`type="INTERNAL"`)**: Petty Cash, Delivery Teams, Office Expenses. Used to track internal cost allocations.
*   This allows a single financial ledger to track *all* outflows, whether it's paying a supplier or reimbursing a driver.

### 3.2.2 Service Categorization & Asset Management
Services are organized using a dual categorization system to ensure a structured catalog:
*   **`category`**: A primary grouping string (e.g., "Ticket Service").
*   **`tags`**: A JSON list allowing multiple labels (e.g., `["Passport & Visa", "Documents"]`). This enables a service to appear in multiple filtered views in the client catalog.

---

## 3.3 The Dynamic Notification Hub

The system implements a centralized `NotificationManager` (`app/core/notifications.py`) to handle real-time communication.

### Dynamic Staff Routing
Unlike traditional hardcoded alerts, the system dynamically identifies staff members to notify based on:
1.  **Global Permission**: Checks if the user has the required action slug (e.g., `requests.view_all`).
2.  **Service Scope**: Filters by the user's `allowed_service_ids`.
This ensures that a "Cargo Agent" only receives alerts for new Cargo requests, while an "Admin" receives everything.

### SSE Integration
Every notification created in the database is automatically broadcasted via the SSE `event_broadcaster`. The payload includes a `user_id` filter, allowing the frontend to trigger "flying" toast alerts only for the intended recipient.

---

## 3.4 The Financial Ledger & Reconciliation

To track client payments, we use a separate, immutable ledger system.

-   **`Transaction` Model**: Records every payment attempt, whether it's a client claim or a direct entry by staff.
-   **`status` Field**: A transaction is never deleted. It moves from `Pending` -> `Verified` or `Pending` -> `Flagged`.

### The Reconciliation Workflow
A key security feature is the "two-man rule" for verifying payments, especially those made via bank transfer.

1.  **Client Claim**: A client claims they have paid by submitting their bank reference ID (e.g., `TRF12345`).
    > `POST /api/v1/transactions/claim` -> Creates a `Pending` transaction with `client_reference_id = "TRF12345"`.

2.  **Admin Reconciliation**: A finance staff member looks at the company's bank statement and finds the corresponding transaction. They use the `reconcile` endpoint.
    > `PUT /api/v1/transactions/{id}/reconcile`

3.  **Strict ID Matching**: The API enforces that the `internal_reference_id` submitted by the admin **must exactly match** the `client_reference_id`.
    -   If the admin enters `"TRF12345"`, the transaction status is updated to `Verified`.
    -   If they enter anything else, the API returns a `400 Bad Request` with a "Mismatch" error, preventing incorrect or fraudulent verifications.

4.  **Corruption Auto-Fix (#220)**: The reconciliation endpoint automatically detects and repairs BDT records where the `claimed_amount` was incorrectly saved as the SAR base value. It restores the correct BDT amount based on the locked exchange rate before verification.

### Professional Financial Exports
The system supports high-fidelity data exports for auditing and accounting.

- **PDF Receipts**: Uses `reportlab` to generate branded receipts with Gonia Deep Horizon styling.
- **Ledger Export**: Supports both Excel and PDF formats via `POST /api/v1/transactions/export-ledger`.
    - **Multi-Tab Excel**: Splits data into Summary, Transaction Log, and Vendor Payments.
    - **Invoice-Themed PDF**: Applies signature Abyss Blue and Midnight Violet aesthetics.
    - **Automated Totals**: Every section includes a sum row for instant financial auditing.
    - **Precision**: All numeric values are strictly rounded to 2 decimal places.

### Professional Currency Management
To handle currency volatility and ensure testing stability, the system includes a manual override mechanism for the SAR/BDT exchange rate.
- **Manual Control**: Administrators can enable `currency_manual_enabled` in the System Settings.
- **Precedence**: When enabled, the `currency_manual_rate` is used system-wide, bypassing external provider feeds and the 1-hour cache.
- **Precision**: Rates are rounded to 2 decimal places to maintain consistent ledger precision.

---

## 3.4 The User Profile System

The system allows users to maintain a comprehensive profile including personal details, addresses, and identity documents (Passport, Visa, Iqama).

### Data Storage & Security
- **Model Extensions**: The `User` model includes over 15 additional fields for profile management.
- **Privacy**: Only the user themselves or an administrator with `users.manage` can view/edit these sensitive fields.
- **Validation**: The system performs duplicate checks for `email` and `phone_number` updates at the API level.

### Image Optimization & File Security
The `POST /api/v1/files/upload` endpoint includes an automated image processing pipeline using **Pillow**:
1. **Detection**: It checks the file extension to identify images (JPG, PNG, WebP).
2. **Normalization**: RGBA images are converted to RGB.
3. **Resizing**: Images are proportionally resized to a maximum of **1600x1600 pixels**.
4. **Conversion**: Images are converted to **WebP** format to optimize delivery.

#### Secure File Serving
Files uploaded to the `static/uploads` directory are served via the `/api/v1/files/secure/{filename}` endpoint.
- **Flexible Authentication**: The endpoint supports both `Authorization: Bearer <token>` headers and a `token` query parameter, allowing secure images to be rendered in standard HTML `<img>` tags.
- **Support Chat Isolation**: Files prefixed with `support__` are strictly isolated. A user can only access them if:
    - They are the original uploader (matched by ID in the filename).
    - They have an active Guest Session matching the file's identifier.
    - They are an Admin or Staff member with appropriate management permissions.
- **Guest Support**: Secure file access is extended to guest users via `guest_session_id` validation, ensuring a seamless support experience without requiring a full account.

---

## 3.5 The Support Ticket System

To handle user inquiries and disputes, the application includes an integrated help desk system.

### Core Models (`ticket.py`)
-   **`SupportTicket`**: The main container for a conversation, which can be linked to a specific `ServiceRequest`. It tracks metadata like `status` (`Open`, `In Progress`, `Resolved`) and `priority`.
-   **`TicketMessage`**: An individual message within a ticket, linked to a sender (either a client or an admin).

### Automated Ticket Generation
The system is designed to create tickets automatically for certain events. For example, when a finance manager uses the "Flag Transaction" feature, the backend automatically generates a high-priority support ticket and pre-fills it with the details of the dispute. This ensures that critical issues are formally tracked and resolved.

### 3.9 Data Privacy & Automated Cleanup

To ensure strict data privacy and optimize server storage, the system includes an automated cleanup mechanism for sensitive user documents and orphaned assets.

#### 1. The 7-Day Purge Policy (PII)
When a `ServiceRequest` is marked as **Completed**, it enters a 7-day accessibility window. During this time, staff and clients can still view the uploaded documents (Passports, Visas, etc.).

1.  **Background Task**: An automated maintenance job (`app/core/maintenance.py`) runs daily at **3:00 AM BD Time**.
2.  **Identification**: The task identifies all requests that have been in `Completed` status for more than 7 days.
3.  **Physical Deletion**: The actual file blobs are securely deleted from the `static/uploads` directory.
4.  **Record Masking**: The database `form_data` is updated to replace the file URLs with a placeholder: `[File Deleted for Privacy / ব্যক্তিগত ফাইল মুছে ফেলা হয়েছে]`.

#### 2. The 24-Hour Thumbnail Cleanup (Orphaned Assets)
To keep the `frontend` assets directory lean, the system automatically purges temporary service images that were never finalized.

1.  **Trigger**: Concurrently with the privacy purge (3:00 AM BD Time).
2.  **Detection**: Scans the `frontend/packages/assets/images/services` directory for files ending in `-tmp.webp`.
3.  **Logic**: Deletes any temporary file where the last modification time is older than 24 hours. This ensures that current active editing sessions are not affected while cleaning up abandoned uploads.

This ensures that while the business transaction remains auditable for legal and financial reasons, the sensitive personal data of the client and unnecessary server bloat are kept to a minimum.

---

## 3.11 Security Audit & Vulnerability Mitigations

A comprehensive security scan (Audit #166) has been performed to verify protection against common web vulnerabilities.

### 3.11.1 SQL Injection (SQLi)
**Risk**: Unauthorized database access via manipulated queries.
**Mitigation**:
- **Parameterized Queries**: The system rigorously uses SQLAlchemy's ORM and `text()` constructs with bound parameters.
- **Input Validation**: All search queries and filters are passed through Pydantic schemas and SQLAlchemy's `ilike` or `in_` operators, which automatically handle escaping.
- **Audit Findings**: No raw string formatting (`f-strings` or `%`) was found in database execution contexts.

### 3.11.2 Cross-Site Scripting (XSS)
**Risk**: Execution of malicious scripts in the user's browser.
**Mitigation**:
- **Automatic Escaping**: The frontend (Next.js/React) automatically escapes all data rendered in JSX.
- **Protocol Whitelisting**: Key data rendering components (like `InternalOperationDetailPage`) include checks to ensure URLs start with `http` or `/static`, preventing `javascript:` protocol injection.
- **No `dangerouslySetInnerHTML`**: The codebase was scanned and confirmed to avoid unsafe HTML rendering.

### 3.11.3 Server-Side Request Forgery (SSRF)
**Risk**: The server making unauthorized requests to internal or external resources.
**Mitigation**:
- **URL Hardcoding**: Outbound requests (e.g., fetching currency rates) use hardcoded, trusted URLs.
- **Path Sanitization**: Filename parts in the `files/upload` endpoint are strictly sanitized to remove dots (`.`), preventing Path Traversal and Arbitrary File Deletion.
- **Audit Findings**: A potential path traversal vulnerability in `files.py` was identified and patched during Audit #166.

### 3.11.4 Data Integrity
- **Non-Negative Constraints**: Financial fields are enforced at both the Pydantic schema and database level to prevent ledger corruption.
- **Audit Trail**: Every administrative change is logged and generates a notification for the affected user, ensuring transparency.

---

## 3.13 Advanced Security Hardening

To maintain compliance with high-security standards (Issue #168), the system includes advanced cryptographic and error-handling mechanisms.

### 3.13.1 Transparent Data Encryption (TDE)
The system implements **Transparent Encryption at Rest** for all Personally Identifiable Information (PII) and sensitive financial identifiers.

- **Mechanism**: A custom SQLAlchemy `TypeDecorator` called `EncryptedString` (`app/db/types.py`) intercepts data before it reaches the database.
- **Cryptography**: Uses **Fernet (Symmetric Encryption)** with a key derived from the system's `SECRET_KEY`.
- **Encrypted Fields**:
    - **User**: `nid_number`, `passport_number`, `visa_number`, `iqama_number`.
    - **Transaction**: `client_reference_id`, `internal_reference_id`, `notes`.
- **Developer Impact**: Encryption is invisible to the application logic. When fetching a `User` model, the `nid_number` property automatically returns the decrypted string.

### 3.13.2 Global Error Masking & Selective Transparency
To prevent information leakage (e.g., database schema details or stack traces) during system failures, a dual-layer exception handling strategy is implemented in `app/main.py`.

- **Production Behavior**: Any unhandled exception is caught by the `@app.exception_handler(Exception)` decorator. The system logs the full traceback securely to the server logs and returns a generic `500 Internal Server Error` (`"Internal Server Error. Please contact support."`) to the client.
- **Selective Transparency**: To avoid masking valid application logic errors, an explicit `@app.exception_handler(StarletteHTTPException)` is registered. This ensures that intentional `HTTPException` calls (e.g., 400 Bad Request for failed logins, 403 Forbidden, 404 Not Found) are preserved and returned with their intended status codes and detail messages.
- **Audit Verification (#166)**: This architecture was stress-tested during Audit #166. It was confirmed that malicious SQLi payloads are now correctly intercepted and rejected with a `400 Bad Request` instead of causing a system crash or returning a generic 500 error.

---

## 3.12 Database and Data Integrity

-   **SQLAlchemy**: We use SQLAlchemy as our Object-Relational Mapper (ORM). All database table definitions are located in `app/models/`.
-   **Alembic**: Database migrations are handled by Alembic. When you make a change to a model (e.g., add a new column), you must generate a migration script:
    ```bash
    # From the backend/ directory
    alembic revision --autogenerate -m "Add new_column_to_user_model"
    ```
    This creates a new file in `alembic/versions/`. To apply the changes to the database, you run:
    ```bash
    alembic upgrade head
    ```
-   **Data Integrity**: By centralizing database logic in the `crud/` layer and using Pydantic `schemas/` for validation, we ensure that no malformed data can enter the database. All business rules (like calculating profit or updating vendor debt) are enforced in the backend, independent of the frontend client.


---

## 3.8 Administrative Audit Trail

The system implements a robust accountability mechanism to track "Who did what". This is crucial for a professional MIS handling financial and personal data.

### Core Audit Columns
Every business-critical model (`ServiceRequest`, `Transaction`, `SupportTicket`, `ServiceDefinition`) includes standard audit columns:
-   **`created_by_id`**: The ID of the staff member who initialized the record. For client-submitted requests, this matches the `user_id`.
-   **`updated_by_id`**: The ID of the last actor to modify the record.

### Automated Data Auditing (Change Detection)
Beyond simple timestamps, the system actively monitors for administrative corrections to client data.

1.  **Workflow Detection**: In the `WorkflowService.process_update`, the system compares the incoming `form_data` with the existing record.
2.  **Audit Ticket Generation**: If an admin (not the client) modifies application details, the backend automatically:
    *   Generates a **Support Ticket** detailing the specific changes (e.g., `- Phone Number: '123' -> '456'`).
    *   Sends a **Permanent Notification** to the client with a direct link to this audit ticket.
3.  **Profile Auditing**: Similar logic is enforced in the User Profile endpoints. If an admin edits a client's profile, a formal record is created.

This ensures that "silent" edits are impossible, providing clients with full transparency and protecting the agency from disputes over data integrity.

