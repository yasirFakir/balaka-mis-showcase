# Balaka MIS (Travel Agency Management System)

A modern, full-stack web application for managing a travel agency's operations, built with **FastAPI**, **Next.js**, and a **Monorepo** architecture.

## 📚 Documentation

This project is documented in a "Developer Handbook" style. All documentation resides in the `documentation/` folder:

*   **[01. Getting Started](./documentation/01-getting-started.md)**: Dev environment setup.
*   **[02. Architecture Overview](./documentation/02-architecture-overview.md)**: High-level map of the system.
*   **[03. Backend Deep Dive](./documentation/03-backend-deep-dive.md)**: FastAPI, Auth, Commerce Engine, and Ledger details.
*   **[04. Frontend Deep Dive](./documentation/04-frontend-deep-dive.md)**: Next.js, monorepo logic, and Dynamic Form Engine.
*   **[05. Design Principles](./documentation/05-design-principles.md)**: Gonia v1.5 visual standards.

---

## 🚀 Quick Start

### 1. Backend (FastAPI)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run Migrations
alembic upgrade head

# Start Server
uvicorn app.main:app --reload --port 8008
```

## 🛠️ Data Seeding & Initialization

To initialize a fresh database with all necessary roles, permissions, and the service catalog (including Ticket, Cargo, and Umrah), use the production seed.

```bash
cd backend
# This command runs roles, permissions, admin, and the comprehensive service catalog
bash bash_scripts/seed.sh
```

---

## 🎨 Design System: Gonia v1.5

Balaka MIS uses the **Gonia v1.5** design system:
- **Geometry**: Strictly `0rem` border radius for a technical feel.
- **Palette (Deep Horizon)**: Abyss Blue, Midnight Violet, and Horizon Teal.
- **Typography**: Geist Sans (Body) and Geist Sans Black (Headers).

---

## 🏗️ Project Structure

```
/
├── backend/             # FastAPI Application (API, DB, Auth)
├── frontend/            # Monorepo Root
│   ├── apps/
│   │   ├── balaka-client/ # Customer-facing App
│   │   └── balaka-admin/  # Internal Admin Panel
│   └── packages/
│       ├── core/          # Shared hooks, types, and api client
│       └── ui/            # Modular Gonia UI Component Library
└── documentation/       # Developer Guides & Architecture Docs
```
