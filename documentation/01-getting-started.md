# 1. Getting Started with Balaka MIS

Welcome to the Balaka Travel Agency Management System! This guide is the single source of truth for setting up your development environment, from a fresh clone to a fully running application.

## 1.1 Core Technologies

This is a modern, full-stack web application built on industry-standard tools. Understanding them is key to contributing effectively.

| Area      | Technology          | Why We Use It                                                                                                                             |
| :-------- | :------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend** | **Python & FastAPI** | For its high performance, automatic API documentation, and robust data validation with Pydantic.                                          |
|           | **SQLAlchemy**      | Provides a safe, object-oriented way to interact with the database, preventing common security flaws like SQL injection.                      |
|           | **PostgreSQL**      | A powerful, open-source relational database that supports advanced data types like `JSONB`.                                               |
|           | **Alembic**         | Manages database schema migrations, allowing for safe and version-controlled updates to the database structure.                           |
| **Frontend** | **TypeScript & Next.js**| For type-safe code and a best-in-class React framework that handles routing, rendering, and optimization.                           |
|           | **Tailwind CSS**    | A utility-first CSS framework that enables rapid and consistent UI development.                                                           |
|           | **Shadcn/UI**       | A component library built on Radix UI that provides accessible, unstyled primitives for building a consistent design system.                |
| **Architecture** | **Monorepo** | Both frontend apps (`client` and `admin`) share a single `packages/ui` library, ensuring UI consistency and reducing code duplication. |

---

## 1.2 Full Project Setup

Follow these steps to get the entire platform running locally.

### Step 1: Clone the Repository
Start by cloning the project to your local machine.

```bash
git clone <your-repository-url>
cd balaka-mis
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root by copying the example. This file stores all your secrets and local configuration.

```bash
cp .env.example .env
```
**You must edit this `.env` file** to match your local database credentials.

### Step 3: Backend Setup (FastAPI)

The backend powers the API and connects to the database.

```bash
# Navigate to the backend directory
cd backend

# Create an isolated Python virtual environment
python3 -m venv .venv

# Activate the environment
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install all required Python packages
pip install -r requirements.txt
```

### Step 4: Frontend Setup (Next.js)

The frontend contains both the client and admin applications.

```bash
# Navigate to the frontend directory
cd frontend

# Install all JavaScript dependencies
npm install
```

### Step 5: Database Initialization (PostgreSQL)

This is a critical step. Your local PostgreSQL server must be running.

1.  **Create the Database & User**:
    Follow the detailed instructions in the official [PostgreSQL Documentation](https://www.postgresql.org/docs/current/user-manag.html) or use a GUI tool like DBeaver. You need to:
    *   Create a user (e.g., `balaka_user`).
    *   Create a database (e.g., `balaka_db`) owned by that user.
    *   Ensure the credentials match your `.env` file.

2.  **Run Database Migrations**:
    This creates all the necessary tables in your new database.

    ```bash
    # From the backend/ directory (with .venv active)
    alembic upgrade head
    ```

3.  **Seed the Database**:
    This populates the database with essential data (roles, admin user, services, etc.).

    ```bash
    # From the backend/ directory
    # Run all seed scripts in order
    python seed_roles.py && \
    python seed_permissions.py && \
    python seed_admin.py && \
    python seed_client.py && \
    python seed_services.py
    ```

### Step 6: Run the Application

You need two separate terminals to run the backend and frontend servers simultaneously.

**Terminal 1: Start Backend Server**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8008
```
> ✅ **Backend should be running at `http://127.0.0.1:8008`**.
> You can view the interactive API docs at `http://127.0.0.1:8008/docs`.

**Terminal 2: Start Frontend Server**
```bash
cd frontend
npm run dev:client
```
> ✅ **Frontend should be running at `http://localhost:3000`**.
> You can now access the application in your browser.

**Default Login Credentials:**
*   **Admin:** `admin@airbalakatravel.com` / `admin`
*   **Client:** `client@example.com` / `clientpassword` (Standard Developer account)
