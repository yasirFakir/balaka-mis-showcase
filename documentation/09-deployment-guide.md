# Deployment Guide: Balaka MIS

This guide provides a comprehensive, step-by-step walkthrough for deploying the Balaka MIS application on a VPS (Virtual Private Server). We use **Hetzner** for infrastructure and **Dokploy** for application management.

---

## 1. Initial Server Preparation

### 1.1 Secure SSH Access
Before doing anything, ensure you can access your server securely using SSH keys instead of passwords.

1.  **Generate a Key (Local Machine):**
    `ssh-keygen -t ed25519 -C "your_email@example.com"`
2.  **Add Key to VPS:**
    Copy the contents of `~/.ssh/id_ed25519.pub` into the `/root/.ssh/authorized_keys` file on your server.
3.  **Login:**
    `ssh root@your-server-ip`

### 1.2 Configure Swap Space
Modern applications (especially Next.js) require significant RAM during the build/compilation phase. If your server has 4GB RAM or less, a **Swap file** is mandatory to prevent crashes.

```bash
# Create a 2GB Swap file
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Make it permanent across reboots
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

---

## 2. Installing Dokploy

Dokploy is a lightweight, self-hosted alternative to Vercel/Heroku. It manages Docker containers, SSL certificates (via Traefik), and databases through a beautiful web UI.

### 2.1 One-Command Installation
Run this on your VPS as the root user:
```bash
curl -sSL https://dokploy.com/install.sh | sh
```

### 2.2 Initial Setup
1.  Navigate to `http://your-server-ip:3000`.
2.  Create your administrative account.
3.  **Configure Panel Domain:**
    *   In Cloudflare, point `panel.yourdomain.com` to your server IP (DNS Only / Grey Cloud).
    *   In Dokploy: **Settings** -> **Server** -> **Domain**.
    *   Enter `panel.yourdomain.com` and your email for Let's Encrypt.
    *   Wait for the page to refresh to HTTPS.

### 2.3 Connect GitHub
1.  In Dokploy: **Settings** -> **Git**.
2.  Copy the **SSH Public Key** displayed.
3.  In GitHub: **Settings** -> **SSH and GPG keys** -> **New SSH Key**.
4.  Paste the key and name it "Dokploy Server".

---

## 3. Deploying the Stack

### 3.1 Create a Project
In the Dokploy dashboard, click **Projects** -> **Create Project** -> Name it "Air Balaka".

### 3.2 Setup the Database (PostgreSQL)
1.  Inside your project, click **Create Service** -> **Database**.
2.  Select **PostgreSQL**. Name it `balaka-db`.
3.  **Deploy it first.**
4.  Once running, go to the **Environment** tab.
5.  Copy the **Internal Connection URL**. It looks like:
    `postgresql://postgres:password@balaka-db:5432/postgres`

### 3.3 Deploy the Backend (FastAPI)
1.  Click **Create Service** -> **Application**.
2.  Select your GitHub Repository.
3.  **General Tab:**
    *   **Context Path:** `/backend`
    *   **Build Type:** `Dockerfile`
    *   **Dockerfile Path:** `./Dockerfile`
4.  **Environment Tab:**
    > **⚠️ Crucial Detail:** If your database password contains special characters (like `@`, `#`, `!`), do **NOT** use a single `DATABASE_URL`. Instead, use individual variables to avoid manual URL encoding errors.
    *   `POSTGRES_SERVER`: (The hostname of your database container)
    *   `POSTGRES_USER`: `postgres`
    *   `POSTGRES_PASSWORD`: (Your raw password)
    *   `POSTGRES_DB`: `balaka_mis`
    *   `SECRET_KEY`: Generate one using `openssl rand -hex 32` on your local PC.
    *   `FIRST_SUPERUSER`: `admin@yourdomain.com`
    *   `FIRST_SUPERUSER_PASSWORD`: (A very strong password)
    *   `FRONTEND_HOST`: `https://yourdomain.com` (Root URL of the client portal)
    *   `BACKEND_CORS_ORIGINS`: (See Formats below)

#### `BACKEND_CORS_ORIGINS` Formats
> **⚠️ Critical Formatting:** If you get a `pydantic_settings.exceptions.SettingsError`, your formatting is incorrect. Use one of these two options:

**Option A: The Simple Format (Recommended)**
List your domains separated by commas with NO quotes or brackets.
```env
BACKEND_CORS_ORIGINS=https://airbalakatravel.com,https://admin.airbalakatravel.com
```

**Option B: The JSON Array Format**
Use strict JSON syntax: square brackets and **double quotes**. Single quotes will cause a crash.
```env
BACKEND_CORS_ORIGINS=["https://airbalakatravel.com","https://admin.airbalakatravel.com"]
```

5.  **Domain Tab:**
    *   **Host:** `api.yourdomain.com`
    *   **Container Port:** `8000`
    *   **Paths:** Leave as `/` (Internal and External).
    *   Enable HTTPS / Let's Encrypt.
6.  **Deploy.**

### 3.4 Deploy the Frontend Applications
Since this is a monorepo, you will create **two** separate applications in Dokploy using the same repository.

#### A. Admin Dashboard (`admin.yourdomain.com`)
1.  **General Tab:**
    *   **Base Directory:** `/frontend`
    *   **Build Type:** `Dockerfile`
2.  **Build Tab (Build Arguments):**
    *   `APP_NAME`: `balaka-admin`
    *   `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com/api/v1`
3.  **Environment Tab:**
    *   `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com/api/v1`
4.  **Domain Tab:**
    *   **Host:** `admin.yourdomain.com`
    *   **Container Port:** `3000`
5.  **Deploy.**

#### B. Client Portal (`client.yourdomain.com`)
1.  **General Tab:**
    *   **Base Directory:** `/frontend`
    *   **Build Type:** `Dockerfile`
2.  **Build Tab (Build Arguments):**
    *   `APP_NAME`: `balaka-client`
    *   `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com/api/v1`
3.  **Environment Tab:**
    *   `NEXT_PUBLIC_API_URL`: `https://api.yourdomain.com/api/v1`
4.  **Domain Tab:**
    *   **Host:** `client.yourdomain.com`
    *   **Container Port:** `3000`
5.  **Deploy.**

---

## 4. Finalizing the Database (Migrations & Seeding)

Once the backend is running, you must initialize the tables and the service catalog.

1.  In Dokploy, go to your **Backend Application**.
2.  Click the **Terminal** tab.
3.  Run the following commands:
    ```bash
    # 1. Create/Update database tables
    export PYTHONPATH=$PYTHONPATH:. && python3 -m alembic upgrade head
    
    # 2. Seed initial data (Roles, Admin, Services)
    # Note: This command is idempotent and safe to run multiple times.
    export PYTHONPATH=$PYTHONPATH:. && python3 -m app.seeds.seed_all
    ```

### When to re-run seeds?
- When you add new services or variants to `backend/app/seeds/core/seed_services.py`.
- When you update the `permission_matrix` in `seed_permissions.py`.
- If you accidentally delete your admin account or core roles.

---

## 5. Cloudflare DNS Configuration

Add the following **A Records** in Cloudflare, all pointing to your VPS IP.

| Name | Proxy Status | Purpose |
| :--- | :--- | :--- |
| `@` | DNS Only (Initially) | Main Domain |
| `www` | DNS Only (Initially) | Redirects |
| `api` | DNS Only (Initially) | Backend API |
| `admin` | DNS Only (Initially) | Admin Dashboard |
| `client` | DNS Only (Initially) | Client Portal |
| `panel` | DNS Only (Initially) | Dokploy Panel |

**Post-Setup:** Once SSL is working (HTTPS is active), set all records to **Proxied (Orange Cloud)** for performance optimization in Bangladesh and Saudi Arabia. Ensure Cloudflare SSL mode is **Full (Strict)**.

---

## 6. Security Configuration & Verification

Before considering the deployment "Production Ready", perform the following verification steps.

### 6.1 Automated Audit
We have included a comprehensive audit script in the repository.

1.  **Access Backend Console:** Open the terminal for your running backend service in Dokploy.
2.  **Run the Audit:**
    ```bash
    ./scripts/security_infra_audit.sh
    ```
    This script verifies:
    *   **Security Headers:** Ensuring HSTS, X-Frame-Options, and X-Content-Type-Options are present.
    *   **CORS:** Confirming no wildcards or arbitrary origin reflections.
    *   **Secrets:** Checking for leaked .env or .git files.
    *   **Dependencies:** Scanning for known CVEs in Python and Node packages.

### 6.2 Manual Review Checklist
*   [ ] **Debug Mode:** Ensure `DEBUG=False` in environment variables.
*   [ ] **Docs Exposure:** The `/docs` and `/redoc` endpoints should be restricted or monitored in production.
*   [ ] **HTTPS Enforcement:** Ensure HSTS is active (verified by the audit script).
*   [ ] **Database Exposure:** Ensure port `5432` is NOT exposed to the public internet (Dokploy handles this by default via internal networking).
