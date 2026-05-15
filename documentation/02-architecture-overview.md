# 2. Architecture Overview

This document provides a high-level map of the Balaka MIS project. It explains *why* the system is structured the way it is and how the different parts fit together.

## 2.1 The Monorepo Philosophy

The entire project lives in a single Git repository, but it is composed of several independent packages. This is known as a **monorepo**.

```
/
├── backend/             # The FastAPI API
├── documentation/       # Project documentation (you are here)
└── frontend/            # The Next.js/React Frontend
    ├── apps/
    │   ├── balaka-client/ # Modularized customer site
    │   └── balaka-admin/  # Modularized admin dashboard
    └── packages/
        ├── core/          # Shared Business Logic (Hooks, API, Types)
        └── ui/            # Modularized UI Component Library
```

---

## 2.2 Backend Architecture: A Layered Approach

The backend is built with FastAPI and follows a clean, layered architecture to ensure separation of concerns.

```
backend/app/
├── api/       # The Controller Layer (Standardized ListResponse)
├── core/      # Config, security, background maintenance, and global hubs
├── services/  # NEW: Complex business workflows (WorkflowService)
├── crud/      # The Repository Layer (Standardized CRUD)
├── db/        # Database session management
├── models/    # The Data Layer (SQLAlchemy)
└── schemas/   # The Validation Layer (Pydantic)
```

1.  **Service Layer (`services/`)**: (NEW) Handles complex multi-model operations, such as request status transitions that involve financial triggers and automated vendor transactions.
2.  **Core Layer (`core/`)**: (EXPANDED) Beyond configuration and security, now orchestrates automated background tasks like daily backups and the 7-day personal data purge. It also manages **advanced security hardening**, including transparent data encryption (TDE) for sensitive PII and global error masking.
3.  **API Layer (`api/`)**: Standardized to return `ListResponse` envelopes for all collections. It should contain no business logic itself.
3.  **CRUD Layer (`crud/`)**: Standardized to support `get_multi_with_count` and native `order_by` logic for high-performance pagination.

3.  **Models Layer (`models/`)**: These are Python classes that map directly to database tables. They define the *structure* of our data (e.g., a `User` model has an `id`, `email`, and `hashed_password` column).
4.  **Schemas Layer (`schemas/`)**: These are Pydantic classes that define the *shape* of data for API requests and responses. For example, a `UserCreate` schema requires an `email` and `password`, but a `User` response schema will *omit* the password for security. This layer acts as a powerful validation and security guard.

## 2.3 Frontend Architecture: Domain-Driven Modules

The frontend uses Next.js and is organized into semantic feature domains to improve discoverability:

-   **`apps/`**: Standalone runnable Next.js applications.
-   **`packages/core/`**: Shared business logic, including:
    *   `useRequestFinancials`: Unified hook for all financial math.
    *   `fetchClient`: Standardized API client with auth injection.
-   **`packages/ui/`**: Modularized component library:
    *   `layout/`: Standardized containers and the `GoniaPageShell`.
    *   `finance/`, `requests/`, `users/`, `support/`: Domain-specific components.
    *   `shared/`: Generic UI helpers like `SecureImage` and `PhoneInput`.

This structure allows us to maintain a consistent user experience while keeping application logic encapsulated and maintainable as the service catalog scales.

---

## 2.4 Core Principle: The Dynamic Service Engine

One of the most important architectural decisions in this project is the **Dynamic Service & Form Engine**.

Instead of creating new database tables for every service type (e.g., `passport_applications`, `visa_applications`), the system is designed to be a flexible "framework." Administrators can define new services, required documents, and form fields directly from the Admin Panel **without needing to write new code or run database migrations**.

## 2.5 Core Principle: Dynamic Financial Breakdown

We have moved beyond simple "Cost Price" tracking to a robust **Job Costing** model.
*   **Template (`financial_schema`)**: Defined per service (e.g., "Air Cargo" always has "Freight Cost" and "Packaging Fee").
*   **Actuals (`financial_breakdown`)**: Recorded per request. Tracks exactly where every dollar came from (Client, Staff) and went to (Vendor, Internal).
*   **Automated Ledger**: The system parses this breakdown to automatically generate debt records (`VendorTransaction`) for any line item marked as a Vendor Expense.
