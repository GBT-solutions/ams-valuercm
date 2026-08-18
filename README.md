# 📊 Asset Monitoring & Management System

A robust, enterprise-ready, multi-tenant **Asset Monitoring and Management System** built with a modern web stack. This application enables organizations to track asset lifecycles, manage employee allocations, generate QR codes, handle database backups, and receive automated scheduling reports via email.

---

## 🚀 Key Features

*   **Multi-Tenant Architecture**: Automatically spins up isolated database tables (`users_{tenantId}`, `assets_{tenantId}`, `taggings_{tenantId}`, etc.) dynamically for each tenant.
*   **Interactive Dashboard**: High-level visual statistics, graphs, and asset status updates built with **Recharts** and **Framer Motion**.
*   **Asset Lifecycle Management**: 
    *   Add, update, and manage details such as Type, Serial Number, Model, Location, Status, and Remarks.
    *   Support for **Parent-Child Assets** relationships (subcomponents or attachments linked to parent assets).
    *   Disposed asset tracking.
*   **Employee Directory**: Maintain records of employee codes, names, and activity statuses. Support for bulk CSV uploads.
*   **Asset Allocation & Tagging**: Assign/detag assets to employees, with full transaction/allocation history tracking.
*   **QR Code Integration**: Generate and display QR codes for each asset to facilitate easy scanning and physical tracking.
*   **Automated Scheduling & Backups**: Custom cron jobs configured for periodic automated email notifications (such as asset expiration dates) and database backups.
*   **Role-Based Security**: JWT-based user authentication and cookie tracking with flexible user/admin roles.

---

## 🛠️ Technology Stack

### **Frontend**
*   **Core**: React 19 (TypeScript), Vite
*   **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion
*   **Components**: Radix UI primitives (Dialog, Select, Tabs, Popover, ScrollArea)
*   **Data Visualization**: Recharts
*   **Utilities**: Axios, PapaParse, Date-fns, React Hot Toast

### **Backend**
*   **Core**: Node.js, Express
*   **Database**: MySQL (using `mysql2/promise` pool connection)
*   **Bundler**: Webpack 5 (Node compilation)
*   **Utilities**: Node-cron, Nodemailer, JSON Web Tokens (JWT), Cookie-parser, PDFKit, QRCode, Multer, Archiver

---

## 📁 Project Directory Structure

```text
├── backend/                  # Node.js + Express backend service
│   ├── controllers/          # Business logic handlers (assets, employees, mails, etc.)
│   ├── routes/               # API endpoint router mappings
│   ├── utils/                # Helper functions, DB connection, and table creators
│   ├── templates/            # Dynamic EJS templates
│   ├── index.js              # Backend entrypoint
│   └── webpack.config.js     # Production Webpack bundler config
│
├── frontend/                 # React + TypeScript + Vite frontend client
│   ├── src/
│   │   ├── components/       # Reusable UI component blocks
│   │   ├── pages/            # View pages (Dashboard, Asset List, Signin, QrCode, etc.)
│   │   ├── lib/              # UI library hooks and utility mappings
│   │   └── index.css         # Styling system
│   └── vite.config.ts        # Vite config
│
├── dist/                     # Self-contained compiled production bundle (generated)
├── build.bat                 # Windows automated build script
├── package.json              # Main concurrent script definitions
└── README.md                 # Project documentation
```

---

## 🗄️ Database Design (Multi-Tenant Schema)

The database dynamically creates the following tables for each `tenantId` to ensure logical isolation:

| Table Name | Description | Key Fields |
| :--- | :--- | :--- |
| **`users_{tenantId}`** | System administrators & users | `id`, `name`, `username`, `password`, `email`, `role` (`admin`/`user`) |
| **`employees_{tenantId}`** | Staff members eligible for allocations | `id`, `emp_code`, `name`, `status` (`active`/`inactive`) |
| **`assets_{tenantId}`** | Main inventory of hardware/software assets | `id`, `asset_id`, `serial`, `type`, `model_no`, `status` |
| **`taggings_{tenantId}`** | Current active asset assignments | `id`, `asset_id` (Unique), `employee_id` (Unique), `assigned_at` |
| **`history_{tenantId}`** | Complete log of historical allocations | `id`, `asset_id`, `employee_id`, `assigned_at`, `detagged_at` |
| **`child_assets_{tenantId}`**| Parent-child mapping for subcomponents | `id`, `asset_id`, `child_asset_id`, `created_at`, `remove_at` |

---

## 💻 Getting Started

### **1. Prerequisites**
Ensure you have the following installed on your system:
*   [Node.js](https://nodejs.org/) (v16+)
*   [MySQL Server](https://www.mysql.com/)

### **2. Setup Database & Configurations**
1.  Create a MySQL database (e.g., `asset_rcm`).
2.  Navigate to the `backend/` directory and rename `.env.example` to `.env`.
3.  Update the values inside `.env`:
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
    ```

### **3. Running the App in Development Mode**

From the root directory of the project, run:
```bash
# Install dependencies in root, frontend, and backend
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# Run both Frontend and Backend concurrently
npm run dev
```
*   **Backend Server**: Runs on `http://localhost:7777`
*   **Frontend client**: Runs on `http://localhost:5173` (with Vite HMR)

---

## 📦 Building for Production

To compile both frontend and backend and package them into a single, clean directory for production:

1.  Open Command Prompt (Windows).
2.  Run the automated build script in the project root:
    ```cmd
    build.bat
    ```

### **What the Build Script Does:**
1.  Compiles the **Frontend** using Vite to create static assets in `frontend/dist`.
2.  Bundles the **Backend** using Webpack into a single execution bundle (`main.bundle.js`).
3.  Organizes everything inside a root `/dist` folder:
    *   Front-end build is placed in `/dist/build/`.
    *   Backend bundle is moved to `/dist/main.js`.
    *   Configuration and templates are copied into `/dist/`.
4.  Cleans up temporary files from source directories.

To run the production build:
```bash
cd dist
npm start # runs node main.js
```

---

## ⏰ Automated Tasks (Scheduler)

The backend runs automated jobs using `node-cron` scheduled on the `Asia/Kolkata` timezone:
*   **Asset Warranty/Expiration & Submission checks** (`0 6,18 * * *`): Runs twice a day at 6:00 AM and 6:00 PM to verify upcoming expiry dates and trigger backup pipelines.
*   **Daily Status Emails** (`0 5 * * *`): Runs daily at 5:00 AM to send emails to the configured notification recipients.
