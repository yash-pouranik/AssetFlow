<div align="center">
  
# 🚀 AssetFlow
### *Enterprise Asset & Resource Management System*

![AssetFlow](https://img.shields.io/badge/AssetFlow-ERP-4f46e5?style=for-the-badge&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

The vision for **AssetFlow** is to simplify and digitize how organizations track, allocate, and maintain their physical assets and shared resources through a centralized ERP platform. Built for scale, clarity, and performance.

[Explore Features](#-core-features) • [Tech Stack](#%EF%B8%8F-tech-stack) • [Installation](#-getting-started) • [API Overview](#-api-architecture)
</div>

---

## 📖 Table of Contents
- [About The Project](#about-the-project)
- [✨ Core Features](#-core-features)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [📦 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [👥 Role-Based Access (RBAC)](#-role-based-access-rbac)
- [🔐 Demo Accounts](#-demo-credentials)

---

## About The Project

AssetFlow eliminates the chaos of manual tracking (spreadsheets, paper logs) by enabling structured asset lifecycles, centralized resource booking, and real-time visibility into who holds what, where it is, and its condition. Designed with a clean architecture, role-based workflows, and a scalable module design, it handles the core complexities of enterprise resource management seamlessly.

---

## ✨ Core Features

* **🔐 Role-Based Access Control (RBAC)**: Deep authorization mapping spanning across **Admin**, **Asset Manager**, **Department Head**, and **Employee** roles.
* **📦 Asset Directory & Registration**: Track assets through a flexible lifecycle (Available, Allocated, Reserved, Maintenance, Lost, Retired). 
* **🤝 Allocations & Transfers**: Smart conflict handling prevents double-allocation. Employees can request peer-to-peer transfers!
* **📅 Resource Booking**: Conflict-preventing time-slot booking system for shared resources like conference rooms or specialized equipment.
* **🔧 Maintenance Workflows**: Structured approval routing (Pending → Approved → Technician Assigned → Resolved).
* **🛡️ Audit Cycles**: Run scheduled physical audit cycles with assigned auditors and auto-generated discrepancy reports.
* **📊 Dashboards & Analytics**: Live KPI charts, overdue alerts, and utilization heatmaps powered by `Recharts`.

---

## 🛠️ Tech Stack

### Frontend (Client-side)
* **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
* **Language**: TypeScript
* **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
* **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) (Persisted)
* **Data Fetching**: [TanStack React Query](https://tanstack.com/query/latest)
* **Forms & Validation**: React Hook Form + Zod
* **Data Visualization**: Recharts

### Backend (Server-side)
* **Framework**: [Node.js](https://nodejs.org/) & Express
* **Database**: MySQL
* **ORM**: [Prisma](https://www.prisma.io/)
* **Authentication**: JWT (Access & Refresh Tokens)
* **Architecture**: Modular Controller-Service-Repository pattern with Event-driven (EventBus) hooks.

---

## 📦 Project Structure

This is a Monorepo powered by `pnpm` workspaces.

```text
AssetFlow/
├── apps/
│   ├── api/                 # Express backend (Prisma, JWT, REST APIs)
│   │   ├── prisma/          # Database schema & migrations
│   │   └── src/
│   │       ├── modules/     # Domain-driven modules (auth, assets, bookings, etc.)
│   │       └── shared/      # Middleware, AppError, EventBus, Utils
│   └── web/                 # Next.js frontend (Tailwind, shadcn, Zustand)
│       └── src/
│           ├── app/         # App Router (Pages & Layouts)
│           ├── components/  # Reusable UI components
│           ├── lib/         # Axios interceptors & utilities
│           └── store/       # Zustand state management
└── package.json             # Workspace config
```

---

## 🚀 Getting Started

Follow these instructions to set up the project locally on your machine.

### Prerequisites
* **Node.js**: `v18.x` or higher
* **pnpm**: `v8.x` or higher (`npm install -g pnpm`)
* **MySQL**: A running local or remote instance

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/AssetFlow.git
   cd AssetFlow
   ```

2. **Install Workspace Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   * Set up your `apps/api/.env` (Database URL, JWT Secrets, Port)
   * Set up your `apps/web/.env.local` (Next.js public API URL)

4. **Initialize Database**
   Run the Prisma migrations and seed the database with demo data.
   ```bash
   cd apps/api
   npx prisma generate
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

   > [!TIP]
   > If you encounter seeding issues, verify MySQL server connection details and run `npx prisma db seed` directly to pre-populate dummy assets and user roles.

5. **Start the Development Servers**
   Open two terminal tabs/windows:

   *Terminal 1 (Backend API):*
   ```bash
   cd apps/api
   pnpm run dev
   # Server runs on http://localhost:5000
   ```

   *Terminal 2 (Frontend Web):*
   ```bash
   cd apps/web
   pnpm run dev
   # App runs on http://localhost:3000
   ```

---

## 👥 Role-Based Access (RBAC)

AssetFlow employs a strict hierarchy for permissions:

| Role | Capabilities |
| :--- | :--- |
| **Admin** | Full system access. Manages Organization setup (Departments, Categories, Roles). |
| **Asset Manager** | Registers/Allocates assets. Approves transfers, maintenance, and audit cycles. |
| **Department Head** | Views department assets. Approves intra-department transfers. Books resources. |
| **Employee** | Views assigned assets. Books shared resources. Raises maintenance requests. |

---

## 🔐 Demo Credentials

Use these seeded accounts to instantly test out different RBAC capabilities:

* **👑 Admin:** `admin@assetflow.com` (Pass: `Admin@123`)
* **💼 Asset Manager:** `manager@assetflow.com` (Pass: `Employee@123`)
* **🏢 Dept Head:** `depthead@assetflow.com` (Pass: `Employee@123`)
* **👤 Employee:** `raj@assetflow.com` (Pass: `Employee@123`)

---

<div align="center">
  <p>Built with 💡 and ☕ for the Hackathon</p>
</div>
