# 📊 Enterprise Asset Monitoring & Management System (AMS)

A modern, enterprise-ready, multi-tenant **Asset Monitoring and Management System** built with React 19, TypeScript, Express, and MySQL. This system enables organizations to track asset lifecycles, maintain employee directories, manage parent-child asset relationships, generate QR codes, execute encrypted multi-destination database backups, and receive automated scheduling reports via email.

---

## 🚀 Key Features

* 🏢 **Multi-Tenant Architecture**: Dynamic isolation of tenant data using partitioned table schemas (`users_{tenantId}`, `assets_{tenantId}`, `employees_{tenantId}`, `taggings_{tenantId}`, `history_{tenantId}`, `child_assets_{tenantId}`, `backup_log_{tenantId}`).
* 💻 **Interactive Dashboard**: High-level visual statistics, status breakdowns, and asset metrics powered by **Recharts** and smooth **Framer Motion** micro-interactions.
* 📦 **Asset Lifecycle & Hierarchy Management**:
  * Track asset details including Type, Serial Number, Model Number, Location, Status, and Custom Remarks.
  * **Parent-Child Asset Mapping**: Associate subcomponents, accessories, or secondary hardware to primary parent assets with tracking for link/unlink actions.
  * **Disposed Asset Management**: Dedicated tracking and audit trail for decommissioned and disposed assets.
* 👥 **Employee Directory & Allocation**:
  * Maintain employee records (Employee Code, Name, Department/Status).
  * Support for bulk data imports via **CSV**.
  * Complete asset allocation & detagging transactions with real-time assignment history logs.
* 🔐 **Encrypted Backups & Restoration**:
  * **Custom AES Encrypted Backups (`.ams`)**: Database dumps are automatically encrypted into custom `.ams` format before storage.
  * **Dual Destination Support**: Direct local backup storage and automated upload to remote server shares (UNC network paths over SMB).
  * **Resilient Retry Mechanism**: Configurable backup retry counts and intervals with automated email alerts on failure.
  * **Password-Protected Restoration**: Secure database restoration from uploaded `.ams` backup files requiring admin authentication.
  * **Backup Management UI**: Paginated backup logs, network vs. local storage breakdown, manual backup trigger, file downloads, and date-range batch deletion.
* 🏷️ **QR Code & PDF Integration**: Generate and export downloadable QR codes for physical asset tagging and inventory scanning.
* ⏰ **Automated Schedulers & Email Alerts**: `node-cron` scheduled jobs for asset expiration/warranty notifications, submission alerts, and daily email summaries.
* 🛡️ **Role-Based Access Control (RBAC)**: JWT authentication with HTTP-only cookies, password hashing with `bcrypt`, configurable user roles (Admin / User), and password reset functionality.

---

## 🛠️ Technology Stack

### **Frontend**
* **Framework**: React 19 (TypeScript), Vite 7
* **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
* **UI Components**: Radix UI Primitives (Dialog, Select, Tabs, Popover, ScrollArea, Label, Slot)
* **Data Visualization**: Recharts 3
* **Utilities**: Axios, PapaParse, Date-fns, React Hot Toast, Timepicker UI

### **Backend**
* **Runtime**: Node.js (v16+), Express 5
* **Database**: MySQL 8 (using `mysql2/promise` connection pooling)
* **Bundler**: Webpack 5 (Node production bundle execution)
* **Security & Crypto**: JSON Web Tokens (JWT), Cookie-Parser, Bcrypt, AES File Encryption
* **Utilities**: Node-cron, Nodemailer, PDFKit, QRCode, Multer, Archiver, CSV Parser / Fast-CSV

---

## 📁 Project Directory Structure

```text
├── backend/                  # Node.js + Express backend service
│   ├── controllers/          # Business logic handlers (asset, backup, employee, mail, tagging, users, config)
│   ├── routes/               # API route definitions
│   ├── utils/                # Database pool connection, table initializers, AES encryption, CSV upload & helper functions
│   ├── templates/            # Dynamic EJS email & PDF document templates
│   ├── backup.js             # Encrypted local & network database backup / restore worker logic
│   ├── index.js              # Express server entrypoint
│   └── webpack.config.js     # Webpack build configuration for backend compilation
│
├── frontend/                 # React 19 + TypeScript + Vite frontend application
│   ├── src/
│   │   ├── components/       # Reusable UI components & modal dialogs
│   │   ├── pages/            # Main application views (Dashboard, AssetList, AddAsset, AllocationList, BackupLogs, QrCode, etc.)
│   │   ├── lib/              # Helper functions & utility hooks
│   │   └── index.css         # Tailwind v4 styling entry point
│   ├── vite.config.ts        # Vite client configuration
│   └── package.json          # Frontend dependencies
│
├── dist/                     # Self-contained compiled production distribution bundle (generated via build.bat)
├── build.bat                 # Automated Windows build script (Frontend Vite + Backend Webpack packaging)
├── package.json              # Root concurrent scripts
└── README.md                 # Project documentation
```

---

## 🗄️ Database Design (Multi-Tenant Schema)

The backend dynamically initializes isolated tables for each tenant (`tenantId`) to ensure data separation:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| **`users_{tenantId}`** | Administrators & system users | `id`, `name`, `username`, `password`, `email`, `role` (`admin`/`user`) |
| **`employees_{tenantId}`** | Organization staff eligible for asset allocation | `id`, `emp_code`, `name`, `status` (`active`/`inactive`) |
| **`assets_{tenantId}`** | Master asset & hardware inventory | `id`, `asset_id`, `serial`, `type`, `model_no`, `status` |
| **`taggings_{tenantId}`** | Active asset assignments to employees | `id`, `asset_id` (Unique), `employee_id`, `assigned_at` |
| **`history_{tenantId}`** | Audit history of past asset allocations | `id`, `asset_id`, `employee_id`, `assigned_at`, `detagged_at` |
| **`child_assets_{tenantId}`** | Parent-child subcomponent relationships | `id`, `asset_id`, `child_asset_id`, `created_at`, `remove_at` |
| **`backup_log_{tenantId}`** | Audit trail of created database backups | `id`, `file_name`, `file_size`, `location` (`local`/`server`), `created_at` |
| **`config_{tenantId}`** | Tenant configuration settings | `id`, `config_key`, `value` |

---

## 💻 Getting Started

### **1. Prerequisites**
* [Node.js](https://nodejs.org/) (v16 or higher)
* [MySQL Server](https://www.mysql.com/) (v8.0+)
* [MySQL Client Command Line Tools](https://dev.mysql.com/downloads/) (`mysqldump` and `mysql` binaries in system PATH or default MySQL directory)

### **2. Environment Setup**
1. Create a MySQL database (e.g., `asset_rcm`).
2. Navigate to `backend/` and verify or create `.env`:
   ```env
   PORT=7777
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=asset_rcm
   JWT_SECRET=your_jwt_secret_key
   JWT_EXPIRE=8h
   COOKIE_EXPIRE=8
   NODE_ENV="dev"
   MAIL_USER=abc@example.com
   ENCRYPTION_KEY=011016cbec477ff83237e060b07fac691dc913802ba912d1ab672dac0cb7cf2c
   ```

### **3. Installation & Development**

From the project root directory, install dependencies and launch the dev servers concurrently:

```bash
# Install dependencies across root, backend, and frontend
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Start both Frontend and Backend concurrently
npm run dev
```

* **Backend Server**: `http://localhost:7777`
* **Frontend Application**: `http://localhost:5173` (Vite dev server with HMR)

---

## 📦 Production Build & Deployment

To package both frontend and backend into a single, clean production-ready directory:

1. Open Command Prompt (Windows) in the project root.
2. Run the automated build script:
   ```cmd
   build.bat
   ```

### **Automated Build Steps (`build.bat`):**
1. Compiles the **Frontend** using Vite (`frontend/dist`).
2. Bundles the **Backend** into a single executable bundle (`main.bundle.js`) using Webpack 5.
3. Packages everything into the root `/dist` directory:
   * Frontend static assets -> `/dist/build/`
   * Backend bundle -> `/dist/main.js`
   * Backend configuration and templates -> `/dist/`
4. Cleans up temporary artifacts.

To start the production bundle:
```bash
cd dist
npm start
```

---

## ⏰ Automated Tasks & Schedulers

The backend service executes automated background tasks via `node-cron` set to the `Asia/Kolkata` timezone:
* **Asset Expiration & Warranty Check** (`0 6,18 * * *`): Runs daily at 6:00 AM and 6:00 PM to check asset status, flag upcoming expirations, and evaluate backup triggers.
* **Daily Digest Email** (`0 5 * * *`): Sent every morning at 5:00 AM to administrators with daily inventory summaries and operational status updates.
* **Automated Encrypted Backups**: Periodically executes automated backups, retries on network share connection failures, and emails system administrators if retries fail.

