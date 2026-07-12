# AssetFlow — Enterprise Asset & Resource Management System

![AssetFlow](https://img.shields.io/badge/AssetFlow-ERP-4f46e5?style=for-the-badge)

A modern, role-based ERP designed to track, allocate, and maintain enterprise assets with a beautiful Next.js frontend and a robust Express backend. Built for scalability, transparency, and ease of use.

## Features

- 🔐 **Role-Based Access Control (RBAC):** Distinct views and permissions for Admins, Asset Managers, Department Heads, and Employees.
- 📦 **Asset Directory & Registration:** Track assets with auto-generated tags, QR code readiness, and condition logs.
- 🤝 **Allocations & Transfers:** Conflict-free allocation with a built-in peer-to-peer transfer request workflow.
- 📅 **Resource Booking:** Conflict-preventing booking system for shared resources like conference rooms and vehicles.
- 🔧 **Maintenance Tracking:** Full lifecycle tracking from raising a request to technician resolution.
- 🛡️ **Audit Cycles:** Create physical audits, assign auditors, and generate discrepancy reports.
- 📊 **Dashboards & Analytics:** Live KPIs and charts for utilization and maintenance frequency.

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React, TypeScript
- Tailwind CSS & shadcn/ui
- Zustand (State Management)
- React Query (Data Fetching)
- Recharts (Data Visualization)

**Backend:**
- Node.js & Express
- TypeScript
- Prisma ORM
- MySQL
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (v8+)
- MySQL server running locally

### Installation

1. Install dependencies at the root workspace:
   ```bash
   pnpm install
   ```

2. Setup the database:
   Update the `DATABASE_URL` in `apps/api/.env` if necessary.
   ```bash
   cd apps/api
   npx prisma@5 migrate dev --name init
   npx prisma@5 db seed
   ```

3. Run the Backend API:
   ```bash
   cd apps/api
   pnpm run dev
   ```
   *(API runs on http://localhost:5000)*

4. Run the Frontend App:
   ```bash
   cd apps/web
   pnpm run dev
   ```
   *(Web runs on http://localhost:3000)*

## Demo Credentials

The database seeder automatically creates the following demo accounts:
- **Admin:** `admin@assetflow.com` / `Admin@123`
- **Asset Manager:** `manager@assetflow.com` / `Employee@123`
- **Dept Head:** `depthead@assetflow.com` / `Employee@123`
- **Employee:** `raj@assetflow.com` / `Employee@123`

---
*Built with ❤️ during the Hackathon.*
