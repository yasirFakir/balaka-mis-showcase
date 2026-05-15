# 4. Frontend Deep Dive

This document is a comprehensive guide for frontend developers working on the Balaka MIS Next.js applications. It covers the monorepo structure, state management, and key features of both the client and admin applications.

## 4.1 The Monorepo in Practice

The `frontend/` directory is a monorepo managed by `npm` workspaces. This architecture is crucial for sharing code and maintaining a consistent UI.

### How It Works
1.  **Workspaces**: The root `frontend/package.json` defines workspaces, linking `packages/core` and `packages/ui` as local libraries.
2.  **Logic Package (`packages/core`)**: (NEW) This is the "brain" of the frontend.
    *   **Hooks**: `useRequestFinancials` (the single source of truth for all ledger math), `useGoniaDirectory` (standardized collection fetching).
    *   **API**: `fetchClient` handles global 401 interception and auth injection.
3.  **Shared UI (`packages/ui`)**: Modularized component library organized by domain:
    *   `base/`: Core primitives (Button, Badge).
    *   `layout/`: Standardized structural wrappers (GoniaPageShell, GoniaContainer).
    *   `complex/`: Logic-heavy UI blocks (GoniaDataTable, GoniaFinancialSummary).
4.  **Path Aliases (`tsconfig.json`)**:
    ```json
    "paths": {
      "@/ui/*": ["../../packages/ui/*"],
      "@/core/*": ["../../packages/core/*"]
    }
    ```

---

## 4.2 Modular Domain Structure
Both Admin and Client applications follow a domain-driven component organization:
*   `layout/`: Persistent app shell components.
*   `finance/`: Ledger and analytic views.
*   `requests/`: Operational manifest and status controls.
*   `users/`: Identity and access management.
*   `shared/`: Generic helpers (SecureImage, PhoneInput).

---

## 4.3 The Client App (`apps/balaka-client`)
...

### Key Features & Components

#### Authentication (`lib/auth-context.tsx`)
A global React Context that provides the current user's state (`user`, `isAuthenticated`, `isLoading`) to all components. It also exposes methods like `login()` and `logout()`.

#### Protected Routes (`components/protected-route.tsx`)
A Higher-Order Component (HOC) that wraps pages requiring authentication. It handles loading states and automatically redirects unauthenticated users to the `/auth` page.

#### The Dynamic Form Engine (`packages/ui/complex/gonia-dynamic-form.tsx`)
This is the heart of the service application process, used across both client and admin apps.
1.  **JSON-Driven**: Renders a complete UI based on a `form_schema` JSON.
2.  **Advanced Field Types**:
    *   **List Type**: Allows users to add/remove multiple entries (e.g., passenger names).
    *   **Auto-Counts**: Programmatically synchronizes the length of list fields to read-only count fields (`*_count`).
    *   **Checkboxes**: Support for boolean flags.
3.  **Conditional UI Logic**: Implements a dependency engine where fields can be hidden or disabled based on the value of another field (e.g., 'Return Date' becomes active only when 'Return Trip' is checked).
4.  **Submission**: Sends collected `form_data` to the backend for validation.

#### Gonia Request Details (`packages/ui/complex/gonia-request-details.tsx`)
A standardized component used to display a summary of any `ServiceRequest`.
-   **Formatted Data**: Detects ISO date strings and formats them for human readability (e.g., "Jan 31st, 2026").
-   **Badge Lists**: Renders array data (from `list` fields) as a collection of clean, professional badges.
-   **Boolean Badges**: Displays YES/NO labels for checkbox values.
-   **Robust Fallbacks**: Ensures every field has a structured layout, using `—` for empty optional fields.

#### Service Editor Optimization
The Service Editor (`apps/balaka-admin/app/(dashboard)/services/[id]/edit/page.tsx`) uses a **Dynamic Full-Width Layout**:
-   **Context-Aware**: Displays the "Final Pricing Preview" sidebar only in the Overview and Finance tabs.
-   **Maximized Real Estate**: In logic-heavy tabs (Form Builder, Products), the sidebar is omitted, and the main form automatically expands to **col-span-12** to prevent wasted space.

#### Secure Payment Submission
The **`ConfirmPaymentDialog`** includes an **initialization guard** that disables the "Pay" button until the request's locked exchange rate and currency are fully synchronized from the backend. This prevents race conditions and ensures BDT amounts are recorded with the correct conversion factors.

#### Service Variant Selection
-   If a service has multiple variants, the page displays them as selectable "packages."
-   The UI dynamically shows a `quantity` input if the selected variant has a `PER_UNIT` pricing model.
-   The total price is calculated and displayed in real-time on the client side before submission.

#### Support Module
The support module is fully internationalized and allows clients to:
- Create tickets with specific categories (`Information Update`, `File Issue`).
- Link tickets to existing service requests for better context.
- Engage in real-time chat with support staff.

#### User Profile Management (`app/[locale]/profile/page.tsx`)
A comprehensive self-service area for users to manage their identity.
- **Tabbed Interface**: Organized into Personal, Address, Passport, and Iqama sections using Radix Tabs.
- **Real-time Previews**: Profile pictures show an instant preview upon upload.
- **State Integration**: Uses `refreshUser()` from `AuthContext` to update the global user state (and navbar avatar) immediately after a successful update.
- **Intuitive Inputs**: Utilizes `DatePicker` for all expiry dates and an optimized `PhoneInput` with localized flag rendering.

---

## 4.3 The Global Notification System

Both applications share a robust notification infrastructure managed by the `NotificationProvider` (`packages/ui/lib/notification-context.tsx`).

### Real-Time Sonar Alerts
The system uses a "Sonar" design for high-priority alerts:
- **`NotificationToast`**: A floating component that slides in from the top-right. It expands horizontally to show the title and vertically on hover to reveal the full message.
- **Interaction**: Users can swipe the toast to the right to dismiss it or click "Mark & View" to navigate directly to the relevant record.
- **`NotificationBell`**: A centralized counter and list accessible in the dashboard and main navigation.

---

## 4.4 The Admin App (`apps/balaka-admin`)

This is the internal dashboard for managing the entire system.

### Layout and Navigation
The admin panel uses a persistent sidebar layout for navigation.
-   **`app/(dashboard)/layout.tsx`**: This Next.js layout wraps all authenticated pages, providing the `AdminSidebar` and `AdminHeader`.
-   **`app/auth/page.tsx`**: This page is intentionally kept outside the main layout group to provide a clean, focused login screen.

### Key Features & Components

#### Data Tables (`tanstack/react-table`)
Most of the admin panel is composed of powerful data tables for viewing and managing users, requests, and finances. Key features include client-side filtering, sorting, and pagination.
*   **Unified Pagination**: All financial logs (Revenue, History, Expenses) use server-side pagination managed by the `useGoniaDirectory` hook, ensuring high performance even with large datasets.
*   **Integrated Search**: Search bars are embedded directly into Gonia component headers to maintain a clean, boxy aesthetic while supporting debounced, server-side queries.

#### The Service Schema Builder (`components/form-builder.tsx`)
A "no-code" GUI that allows administrators to visually build the JSON `form_schema` for a service. It uses a **stateless controlled component** pattern to avoid state sync issues.

#### The Financial Template Builder (`components/financial-schema-builder.tsx`)
Located in the "Financial Template" tab of the Service Editor. This component allows admins to define standard Income and Expense items (e.g., "Packaging Fee", "Airline Cost") that act as a blueprint for every new request. It supports auto-generating system keys and defining default values.

#### Service Assets & Categorization
The Service Editor's "General" tab has been redesigned into a precision 3-column layout to manage metadata and assets:
*   **Multi-Tag System**: Replaced the single category dropdown with a checkbox grid, allowing services to be associated with multiple tags (e.g., `["Ticket Service", "Documents"]`).
*   **High-Fidelity Image Upload**: Features a tactile upload zone with hover states (Replace/Remove), backdrop blurring, and immediate visual feedback.
*   **Staged Commitment**: To ensure data integrity, the UI uses a `-tmp.webp` staging strategy. New images are uploaded immediately for preview but are only finalized on the server when the user clicks "Commit All Changes". The frontend uses timestamp-based cache busting (`?t=...`) to ensure the preview is always current.

#### Dialog-Based Workflows
Most administrative actions (e.g., "Create Staff," "Reject Request," "Process Fulfillment") are handled inside modal dialogs.
*   **`ProcessRequestDialog`**: Now includes a full **Financial Breakdown** editor, allowing staff to adjust costs and assign vendors line-by-line during fulfillment.

#### Finance Dashboard
The `/finance` page serves as the central hub for all monetary data. It features:
-   **Interactive KPI Cards**: Drill down into detailed views by clicking on "Total Revenue" or "Outstanding Debt".
-   **Tabs System**: Separate views for **Revenue** (Client Sales), **Expenses** (Vendor Payments), **Profit Analysis**, and a consolidated **Transaction History**.
-   **Pending Verifications**: Optimized view using **Service ID** (`#ID` format) as the primary key and integrated **Payment Method** filters.
-   **Deep-Linking**: Staff notifications link directly to the relevant view and automatically filter for the specific request via the `search` URL parameter.
-   **Advanced Export**: Supports "Whole Year" export and generates multi-tab Excel reports styled with the Gonia invoice theme.
#### Support Ticket Interface
The admin panel also includes a full-featured help desk interface where staff can view and reply to user-submitted support tickets in a chat-like view.

---

## 4.4 Internationalization (i18n)

The client app is fully bilingual (English and Bengali) using the `next-intl` library.

### Architecture
We use a **sub-path routing** strategy. The user's selected locale is part of the URL (e.g., `/en/services` or `/bn/services`).
-   **`proxy.ts`**: This file runs on every request at the network boundary. It checks for a locale in the URL. If none is present, it detects the user's browser language and redirects them to the appropriate sub-path (e.g., from `/` to `/en`).
-   **`messages/`**: This directory contains the JSON "dictionary" files (`en.json`, `bn.json`) where all translated strings are stored.
-   **`i18n/navigation.ts`**: This file provides wrapped versions of `Link` and `useRouter` from Next.js. **You must always import from here** to ensure that navigation works correctly with the locale prefixes.

### How to Use
1.  **Add a String**: Add the same key to both `messages/en.json` and `messages/bn.json`.
    ```json
    // en.json
    "HomePage": { "welcome": "Welcome to Balaka!" }
    // bn.json
    "HomePage": { "welcome": "বালাকাতে স্বাগতম!" }
    ```

2.  **Use in a Client Component (`"use client"`)**:
    ```tsx
    import { useTranslations } from 'next-intl';

    const t = useTranslations('HomePage');
    return <h1>{t('welcome')}</h1>;
    ```

3.  **Use in a Server Component**:
    ```tsx
    import { getTranslations } from 'next-intl/server';

    const t = await getTranslations('HomePage');
    return <h1>{t('welcome')}</h1>;
    ```
