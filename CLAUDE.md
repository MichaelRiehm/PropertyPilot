# CLAUDE.md

Context for an AI agent (Claude Code, Cursor, Copilot Workspace, aider, etc.) or a new human contributor working in this repo. Read the whole file before making changes — most of what you need is here.

---

## What this project is

**PropertyPilot** is a full-stack property management app for small residential landlords (1–10 units). It tracks properties, units, tenants, leases, transactions, and maintenance tickets, and generates four standard reports plus a 12-month cash flow forecast per property.

The user-facing story is in [`README.md`](README.md). This file is the engineering handbook.

---

## Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind + React Router 7 + React Hook Form + Zod + recharts + lucide-react
- **Backend:** Node 20 + Express 5 + TypeScript + Prisma 6 + PostgreSQL 16 + bcrypt + jsonwebtoken + Zod + helmet + cors + express-rate-limit + dotenv
- **Testing:** Vitest 4 in both workspaces (backend has 209 tests; frontend suite is a target for Phase 4+)
- **Local dev DB:** PostgreSQL 16 via `docker-compose` (not installed natively)
- **Deploy:** Render (managed Postgres + Docker web service + static site)

Adding a dependency **not** on this list requires human approval. Reach for a stack-native solution first.

---

## Repository layout

```
/
├── backend/
│   ├── src/
│   │   ├── domain/          Domain classes, abstract Entity, mappers
│   │   ├── repositories/    Repository pattern, wraps Prisma; owner-scoped
│   │   ├── controllers/     HTTP controllers, depend on repositories
│   │   ├── routes/          Express route wiring
│   │   ├── middleware/      Auth, error handling
│   │   ├── schemas/         Server-side Zod validation (source of truth)
│   │   ├── reports/         Report classes extending abstract Report
│   │   ├── forecast/        CashFlowForecaster
│   │   ├── services/        AuthService (JWT + bcrypt)
│   │   └── app.ts           Express bootstrap
│   └── prisma/
│       ├── schema.prisma    Prisma models
│       ├── migrations/      Versioned SQL migrations
│       └── seed.ts          Idempotent dev fixture data
├── frontend/
│   ├── src/
│   │   ├── pages/           Top-level route components
│   │   ├── components/      Reusable UI + modal forms
│   │   ├── context/         AuthContext
│   │   ├── lib/             apiClient, helpers, per-entity API modules
│   │   ├── schemas/         Client-side Zod schemas (mirror server)
│   │   └── App.tsx
│   └── public/
│       └── _redirects       Render Static Site rewrite rules
├── docs/
│   ├── diagrams/            Mermaid sources + rendered PNGs
│   └── screenshots/         README screenshots
├── .github/                 Issue/PR templates + CI workflows
├── docker-compose.yml       Local Postgres + optional full stack
├── package.json             npm workspaces root
└── README.md
```

---

## How to run

Prereqs: Node 20+, Docker Desktop running, PowerShell (Windows-first — commands use PowerShell syntax).

```powershell
# One-time
Copy-Item .env.example .env
npm install

# Boot everything (postgres + migrate + seed + both dev servers)
npm run demo

# Or step by step
npm run db:up             # Docker Postgres in the background
npm run db:migrate        # Apply Prisma migrations
npm run db:seed           # Populate fixture data (idempotent)
npm run dev               # Backend :4000, frontend :5173

# Tests
npm run test              # Both workspaces
npm run test -w backend   # Backend only (209 tests, fast)

# Prod-parity via Docker
docker compose up -d      # Full 3-service stack
```

Dev credentials (from the seed):

- Email: `dev@propertypilot.local`
- Password: `dev1234`

---

## Non-negotiable architecture rules

Break these and you break the codebase's identity. Ask a human before deviating.

### 1. Layered backend

```
routes → auth middleware → controllers → repositories → Prisma
                                      ↘ reports / forecast
```

- Controllers **never** touch Prisma directly. If you find yourself importing `PrismaClient` in a controller, stop and add a repository method instead.
- Repositories **always** take `ownerId` and bake it into every `where` clause (direct or via join). The test suite pins this contract in a "scopes through …" case for every repository. Owner scoping is how we prevent cross-tenant data leaks.
- Domain classes carry the behavior — validation, mutators like `Lease.terminate()`, computed properties like `Transaction.signedAmount()`. Don't inline these into controllers.

### 2. Zod schemas on both sides, server is authoritative

- Server-side schemas in `backend/src/schemas/` are the source of truth.
- Client-side schemas in `frontend/src/schemas/` mirror them so the UI gets instant feedback.
- If you change validation rules, change **both** files. The client copy exists for UX, not correctness.

### 3. Auth is applied at the route level

All routes under `/api` **except** `/api/auth/login` and `/api/auth/register` go through `authMiddleware` (see `backend/src/routes/index.ts`). The middleware verifies the JWT, populates `req.user`, and rejects anything malformed with a 401. `req.user` is guaranteed non-null in every protected controller — don't null-check it defensively; the type reflects the invariant.

### 4. Security invariants

- Passwords: bcrypt cost 12. Never store plaintext, never return the hash in an API response.
- Secrets from env vars only. Nothing hardcoded, no defaults in code. `JWT_SECRET` must be 16+ chars or the app refuses to start.
- SQL: Prisma only. No raw queries.

### 5. OO story in the domain layer

The domain classes exist to demonstrate inheritance, polymorphism, and encapsulation on top of Prisma. Don't collapse them into POJOs. Don't put Prisma-shaped anemic types on the domain layer's public surface.

- Inheritance: `Property`, `Unit`, `Tenant`, `Lease`, `Transaction`, `MaintenanceTicket` all extend `Entity`.
- Polymorphism: `Entity.validate()` is abstract; `Reportable.toReportRow()` is implemented per class; the `Report` hierarchy in `backend/src/reports/` is the second polymorphism axis.
- Encapsulation: state is private; access via getters; mutation via named intention-revealing methods (`Property.rename()`, `Lease.terminate()`, etc.) that call the protected `Entity.touch()` to keep `updatedAt` correct.

---

## Coding conventions

### General

- **TypeScript strict mode.** No `any` unless it's genuinely unavoidable. Prefer `unknown` and narrow it.
- **No comments describing what code does** — well-named symbols do that. Comments explain **why** something non-obvious is true (a hidden constraint, a subtle invariant, a workaround with a link).
- **No end-of-file summary comments.** No banner comments. No `// ---` decorative separators.
- **Keep functions small.** If a function does two things, split it. If it needs a big comment block, refactor.
- **No `console.log` for anything but genuine server startup / shutdown lifecycle logs.** For debug output, delete before commit.
- **Prefer editing existing files** over creating new ones. Don't add a new file if a sibling file already covers the same concern.

### Backend specifics

- All new endpoints follow the repository pattern. Controller signature: `(req, res) => Promise<void>`, throws domain errors that the central `errorHandler` (`backend/src/middleware/errorHandler.ts`) converts to HTTP.
- Error classes are in `backend/src/errors.ts` — reach for `NotFoundError`, `ConflictError`, or `HttpError` before inventing a new one.
- `req.user.id` is the `ownerId` for every scoped query — pass it explicitly to repository methods; don't reach into `req` inside repositories.
- Validation happens in the controller via `<schema>.parse(req.body)` before any repository call. The central error handler maps `ZodError` to a structured 400 response with a `fields` map.

### Frontend specifics

- Every page component lives in `frontend/src/pages/` as a default-exported function component.
- Every network call goes through `frontend/src/lib/apiClient.ts` — don't call `fetch` directly.
- Forms use `react-hook-form` + `@hookform/resolvers/zod`. Never build a controlled-input form by hand.
- API response types live in `frontend/src/lib/<entity>.ts` next to the fetcher function. Types are derived from the actual API shape, not hand-copied from Prisma.
- Tailwind only. No CSS modules, no styled-components, no `<style>` blocks.

---

## Testing conventions

- **Vitest only.** No Jest, no Mocha.
- Tests live **next to the source file** as `<name>.test.ts`. Production `tsconfig` excludes them from the build via `"exclude": ["src/**/*.test.ts"]`.
- Backend tests **do not touch a real database.** They mock the Prisma client with `vi.fn()`. Repository tests assert on the exact `where` clause sent to Prisma — that's how the owner-scoping contract stays honest.
- Controller tests use hand-rolled `makeReq()` / `makeRes()` helpers and mock the repositories with `vi.fn()`. No supertest; the tests exercise the controller function directly.
- Date-sensitive tests (forecast, aging report) use `vi.setSystemTime()` for determinism.
- Run the full backend suite in <2s. If a new test takes longer, mock something.

Coverage target: every new controller method and every new repository method needs at least one success-path test and one error-path test. Domain class methods get validation and behavior tests.

---

## Database and migrations

- Schema is authoritative in `backend/prisma/schema.prisma`.
- Changes flow: edit schema → `npm run prisma:migrate -w backend` → Prisma generates a named migration in `backend/prisma/migrations/` → commit the migration folder with the schema change.
- **Never** hand-edit a migration after it's committed. Create a new migration to fix a mistake.
- Migrations run automatically on container start in production (see `backend/Dockerfile` CMD).
- The seed is idempotent (all fixtures use `dev-*` prefixed IDs with `upsert`). Re-run it any time.
- `npm run db:reset` drops the database and reseeds — destructive, asks for confirmation. Use it when the schema has drifted locally.

---

## Common tasks

### Add a new field to an existing entity

1. Edit `backend/prisma/schema.prisma`, add the field.
2. `npm run prisma:migrate -w backend` and give the migration a descriptive name.
3. Update the domain class in `backend/src/domain/<Entity>.ts` (private field, getter, mutator if applicable, validation rule).
4. Update the mapper functions in `backend/src/domain/mappers.ts`.
5. Update the Zod schemas in `backend/src/schemas/<entity>.ts` and the mirror in `frontend/src/schemas/<entity>.ts`.
6. Update the controller `serialize()` function and the frontend form/list components.
7. Add or update tests for the new field's behavior.

### Add a new endpoint

1. Add the Zod schema in `backend/src/schemas/<entity>.ts`.
2. Add the controller method in `backend/src/controllers/<entity>Controller.ts`.
3. Wire the route in `backend/src/routes/<entity>.ts`.
4. Write tests: success path, error path (404 / validation error / auth). Repository is mocked.
5. Add a corresponding fetcher in `frontend/src/lib/<entity>.ts` and use it from the relevant page.

### Add a new domain entity

Big change — probably requires human alignment first. But the shape is:

1. Prisma model + migration.
2. Domain class extending `Entity`, implementing `Reportable`.
3. Mappers.
4. Repository extending `BaseRepository`.
5. Zod schemas (both sides).
6. Controller + routes.
7. Frontend page + form modal + API module + nav link.
8. Test coverage for all layers.

---

## Known gotchas

- **Windows-first commands.** This repo's contributor runs Windows + PowerShell. Bash equivalents work but PowerShell is the reference. Docker Desktop must be running before `npm run db:up`.
- **Prisma CLI in Docker.** The runtime Dockerfile invokes prisma via the concrete path (`./node_modules/.bin/prisma`) rather than `npx prisma`. Using `npx` at runtime pulls the newest Prisma from the registry, which broke us once when Prisma 7 removed the `url = env("DATABASE_URL")` syntax our schema uses.
- **npm workspaces hoisting.** `npm ci` hoists most deps to the root `node_modules/`, but a few (notably the `prisma` CLI) stay in `backend/node_modules/`. The multi-stage Docker build copies **both** — dropping either breaks the image.
- **Render Static Site rewrites.** The `/api/*` proxy and SPA fallback live in `frontend/public/_redirects`. Render sometimes ignores this file on first deploy; if that happens, add the rules via the Render dashboard as a fallback.
- **Frontend `_redirects` in Docker.** The file is in `public/` so Vite copies it into the frontend build; the local nginx Dockerfile also gets it. It's harmless in the nginx image (nginx doesn't read it) so we don't gitignore it.

---

## How to submit changes

1. **Pick an issue.** Small, well-scoped items live in [GitHub Issues](https://github.com/MichaelRiehm/PropertyPilot/issues) and the [README roadmap](README.md#roadmap). If you have a new idea, open an issue first — don't drop unsolicited PRs.
2. **Branch from `main`.** Name the branch `<type>/<short-slug>` where `<type>` is `feat`, `fix`, `refactor`, `docs`, or `chore`. Example: `feat/maintenance-ticket-crud-ui`.
3. **Implement.** Follow the conventions above. Add or update tests. Keep the PR focused — one issue per PR.
4. **Open a PR.** The template asks for a short summary, the change scope, test evidence, and a checklist that covers "did you update Zod on both sides", "did you update the mapper", etc. Fill it out honestly.
5. **CI must pass.** The `.github/workflows/ci.yml` job runs lint, build, and the full test suite on every PR. Fix red before requesting review.
6. **AI review (optional but encouraged).** If you're using Claude Code, Cursor, or similar, run a review pass and address anything real before the human review.
7. **Human merges.** Merge to `main` uses squash by default so the history stays readable.

Commit messages follow conventional prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`. Keep the subject under 72 characters. Body is optional but explains **why** for anything non-obvious.

---

## When to stop and ask a human

- Adding a dependency not on the stack list above.
- Changing an architectural rule from the "Non-negotiable" section.
- Deleting or restructuring a domain class.
- Any migration that drops a column or changes a data type in a lossy way.
- Anything that touches auth, JWT signing, or password handling.
- Refactoring the workspace layout, the CI config, or the deployment story.

For everything else, follow the conventions, add tests, and open a PR.
