<strong>**DO NOT DISTRIBUTE OR PUBLICLY POST SOLUTIONS TO THESE LABS. MAKE ALL FORKS OF THIS REPOSITORY WITH SOLUTION CODE PRIVATE. PLEASE REFER TO THE STUDENT CODE OF CONDUCT AND ETHICAL EXPECTATIONS FOR COLLEGE OF INFORMATION TECHNOLOGY STUDENTS FOR SPECIFICS. **</strong>

# PropertyPilot

A full-stack property management web application for small residential landlords (1–10 units). Tracks properties, units, tenants, leases, rent transactions, maintenance requests, and a 12-month cash flow forecast.

Built as the WGU **D424 Software Engineering Capstone** project by Michael Riehm.

## Status

**Live deployment:** <https://propertypilot-frontend.onrender.com>

**Part B — Application requirements: complete.** All eight rubric sub-bullets have shipped:

| # | Requirement | Status |
| --- | --- | --- |
| B.1 | Inheritance, polymorphism, encapsulation in the domain layer | ✅ Complete |
| B.2 | Search with multi-row results across entities | ✅ Complete |
| B.3 | Secure database CRUD for properties, units, tenants, leases, and transactions | ✅ Complete |
| B.4 | Report generation: Rent Roll, YTD Profit & Loss, Occupancy, Maintenance Aging | ✅ Complete |
| B.5 | Input validation, client and server, with Zod | ✅ Complete |
| B.6 | Industry-appropriate security: JWT, bcrypt, helmet, CORS, auth rate limiting | ✅ Complete |
| B.7 | Scalability: pagination, database indexes, stateless backend | ✅ Complete |
| B.8 | User-friendly functional GUI: dashboard, list pages, forms, reports, forecast | ✅ Complete |

**Part C — Documentation: complete.**

| # | Deliverable | Status |
| --- | --- | --- |
| C.1 | Design document with class and architecture diagrams | ✅ Complete — see [`docs/design-document.md`](docs/design-document.md) |
| C.2 | Deployed application URL | ✅ Complete — <https://propertypilot-frontend.onrender.com> |
| C.3 | GitLab repository URL with version tag | ✅ Complete — tagged `v1.0.0` |
| C.4 | Maintenance / setup user guide | ✅ Complete — see [`docs/maintenance-guide.md`](docs/maintenance-guide.md) |
| C.5 | End-user guide | ✅ Complete — see [`docs/user-guide.md`](docs/user-guide.md) |

**Part D — Testing: complete.** 209 unit tests across 30 files, all green. See [`docs/test-plan.md`](docs/test-plan.md) and [`docs/test-results.md`](docs/test-results.md).

Part E (Panopto video) and Task 4 (deployment scripts and provider justification) are next.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + React Router + React Hook Form + Zod
- **Backend:** Node.js 20 + Express + TypeScript + Prisma + Zod + bcrypt + JWT
- **Database:** PostgreSQL 16 (Docker locally, managed Postgres in production)
- **Testing:** Vitest
- **Containerization:** Docker + docker-compose

## Repository Layout

```
/
├── backend/      # Express API, Prisma schema, domain layer
├── frontend/     # Vite + React app
├── docker-compose.yml
├── package.json  # npm workspace root
└── README.md
```

## Prerequisites

- **Node.js 20+** and **npm 10+** — https://nodejs.org/
- **Docker Desktop** (running) — https://www.docker.com/products/docker-desktop/
- **Git**

Verify:

```powershell
node --version
npm --version
docker --version
docker compose version
```

## Setup

### 1. Clone

```powershell
git clone https://gitlab.com/wgu-gitlab-environment/student-repos/mriehm1/d424-software-engineering-capstone.git propertypilot
cd propertypilot
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
```

The default values in `.env.example` match the Docker Compose Postgres settings, so the file works out of the box for local development. Update `JWT_SECRET` to anything other than the placeholder before deploying.

### 3. Start PostgreSQL

```powershell
docker compose up -d
```

This starts a single `postgres:16-alpine` container exposed on `localhost:5432` with database `propertypilot`. Data persists in a named Docker volume (`propertypilot_pgdata`).

### 4. Install dependencies

```powershell
npm install
```

This installs root, backend, and frontend dependencies via npm workspaces.

### 5. Run the initial Prisma migration

```powershell
npm run prisma:migrate -w backend
```

### 6. Start the dev servers

```powershell
npm run dev
```

This launches both servers in parallel:

- Backend API: http://localhost:4000 (health check at `/api/health`)
- Frontend: http://localhost:5173

## Useful Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start backend and frontend dev servers concurrently |
| `npm run build` | Type-check and build both workspaces |
| `npm run test` | Run vitest in both workspaces |
| `docker compose up -d` | Start PostgreSQL in the background |
| `docker compose down` | Stop PostgreSQL (data persists in the named volume) |
| `docker compose down -v` | Stop PostgreSQL **and** delete the data volume |
| `npm run prisma:migrate -w backend` | Apply Prisma migrations to the local database |
| `npm run prisma:studio -w backend` | Open Prisma Studio against the local database |
