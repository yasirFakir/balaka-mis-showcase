# AI Context & Architecture Rules for Balaka MIS

**SYSTEM PROMPT FOR AI ASSISTANTS:**
When generating code for this project, you **MUST** strictly adhere to the following architectural patterns and constraints. Read this entire file before proposing changes.

---

## tech_stack_overview
*   **Backend:** Python 3.10+, FastAPI, SQLAlchemy (2.0+), Alembic, Pydantic (v2).
*   **Frontend:** TypeScript, Next.js 15+, Tailwind CSS v4, Shadcn UI, Framer Motion.
*   **Architecture:** Monorepo (npm workspaces) for frontend; Layered architecture for backend.
*   **Database:** PostgreSQL (Active), SQLite (Fallback/Testing).

---

## design_system (Gonia v2.0)

Gonia v2.0 introduces a **Dynamic Theme Engine** supporting interchangeable visual skins via `localStorage`.

### Theme Profiles
*   **Classic (Deep Horizon)**: Geometric, zero-radius (`0rem`), solid borders, high-contrast forest colors. Professional and precise.
*   **Candy (Experimental)**: Soft geometry (`rounded-xl`), glow-based depth, translucent glassmorphism (`backdrop-blur`), and vibrant indigo/pink palette.

### Architectural Rules
*   **Abstraction**: Never hardcode colors/radii. Always use `gonia.radius`, `gonia.colors.forest`, etc.
*   **Typography**: **Geist Sans** for all body/data text. **Courier Bold** for technical financial data.

---

## business_logic_rules

### The Service Lifecycle
`Pending` -> `Processing` -> `Completed`.
*   **Financial Guard**: The "Completed" status is programmatically locked until balance is $0.00.
*   **Direct Entry**: Staff can create "Direct Completed" requests which auto-settle the full payment.
*   **Service-Vendor Bounding**: Vendors are strictly associated with specific services. Financial breakdowns only allow selection of bounded suppliers.

---

# Project State Snapshot

<state_snapshot>
    <overall_goal>
        Build a professional, service-centric Travel Agency MIS with modular vertical workspaces, a dynamic theme engine, and a strictly auditable financial ledger.
    </overall_goal>

    <key_knowledge>
        - **Service-Centric UI**: Navigation is organized by business verticals (Ticket, Cargo, Umrah, etc.) rather than technical functions.
        - **Dynamic Theme Engine**: Swappable UI skins controlled via `packages/ui/lib/themes`.
        - **Vertical Workspaces**: Dedicated pages for each service category combining stats, request lists, payment verification, and vendor settlement.
        - **Modular ID Patterns**: Human-readable request IDs (e.g., TKT-0001, CRG-0002) generated based on service-specific prefixes from seed data.
    </key_knowledge>

    <recent_actions>
        - **UI Overhaul (v2.0)**: Replaced functional sidebar with service-centric navigation and implemented vertical-aware dashboard filtering.
        - **Integrated Financial Ops**: Added direct payment verification and vendor settlement tabs within each service workspace.
        - **Service-Vendor Bounding**: Implemented Many-to-Many association between services and vendors to filter financial breakdowns and liabilities.
        - **Dynamic Theme Engine**: Launched "Candy Mode" experimental theme with glassmorphism and rounded geometry.
        - **Automated Email Receipts**: Integrated instant email notification system with branded receipts upon payment verification.
        - **Professional PDF Redesign**: Refactored PDF engine for high-clarity, single-page professional invoices with WhatsApp QR integration.
        - **Vertical Analytics**: Enhanced backend to support category and public/private filtering for all financial and workload metrics.
    </recent_actions>

    <technical_achievements_legacy>
        - **Security Hardening**: Implemented Transparent Encryption at Rest (AES-128) for PII (Passport, NID, etc.) and global error masking to prevent detail leaks.
        - **Audit & Compliance**: Conducted full SQLi/XSS/SSRF audit (#166) and implemented automated security scanners.
        - **Real-time Architecture**: Refactored SSE to use Authorization Headers and implemented background heartbeats for proxy resilience.
        - **Data Privacy**: Automated 7-day document purge policy for completed requests and orphaned asset cleanup.
        - **Theme Infrastructure**: Established multi-profile CSS variable architecture and replaced 100+ hardcoded hex values with semantic variables.
        - **Financial Integrity**: Resolved BDT payment corruption bugs (#220) and implemented multi-currency ledger exports (Excel/PDF).
        - **Operational Core**: Implemented staff revenue attribution, identity-aware rate limiting, and account-based security lockout.
    </technical_achievements_legacy>
</state_snapshot>

# Active Development Focus
- **Ledger Auditability**: Refining the unified transaction history for 100% audit accuracy.
- **Service Performance**: Expanding per-service profitability tracking.
- **Deployment Resilience**: Stabilizing production environments with 24hr session continuity.