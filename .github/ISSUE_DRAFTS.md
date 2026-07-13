# Issue drafts

Not yet created on GitHub. Once you approve, we'll create them with:

```powershell
# Requires: gh CLI installed and authenticated (`gh auth login`)
gh issue create --title "<title>" --body-file .github/issue-drafts/<file>.md --label <label>
```

I've numbered them so you can pick which to create (or all). The **demo PR** issue (#7) is what the follow-up PR closes — it's the smallest, most self-contained one, chosen so the resulting PR is a clean example of the workflow.

---

## 1. feat: Maintenance ticket CRUD UI

**Labels:** `type:feature`, `area:frontend`, `area:backend`

**Problem.** Maintenance tickets exist in the domain layer (dashboard chip counts, aging report), but users can't create or edit them from the UI. Currently the only way to add tickets is via `npm run db:seed` or a raw SQL INSERT.

**Proposal.** Add a full Maintenance tickets CRUD flow mirroring the pattern used by Properties/Units/Tenants/Leases/Transactions:

- Backend controller with list/get/create/update/delete methods, Zod schemas for the request bodies, tests
- Frontend page at `/maintenance` with a paginated list, per-row edit/delete, and an "Add ticket" modal
- Nav link in the top bar, sitting between Transactions and Reports

**Acceptance criteria**
- [ ] `GET|POST|PATCH|DELETE /api/maintenance-tickets` endpoints with owner-scoping and Zod validation
- [ ] Backend tests cover success + 404 + validation error paths
- [ ] Frontend `MaintenancePage` with pagination and modal form (`MaintenanceTicketFormModal`)
- [ ] Nav link added, protected by auth like the others
- [ ] Dashboard chip counts still work as before

**Scope.** Backend + frontend + tests. No new dependencies. Mirror the existing patterns exactly — five other CRUD flows already exist to copy from.

**Non-goals.** Real-time notifications when a ticket is created. File attachments. Assigning tickets to a contractor. All future work.

**AI-agent notes.** Start by reading `TransactionController` and `TransactionsPage` — the shape is the closest match (has both propertyId and unitId). Copy the pattern; do not invent a new one.

---

## 2. feat: Lease document upload

**Labels:** `type:feature`, `area:backend`, `area:frontend`

**Problem.** The `Lease` model has a `documentLink` field that stores an external URL (Google Drive, Dropbox). This works but relies on users manually hosting their lease PDFs elsewhere.

**Proposal.** Add file upload backed by Render's object storage or S3. Replace the `documentLink` text input with an "Upload lease PDF" button. Store the file, return a signed URL for viewing.

**Acceptance criteria**
- [ ] Backend accepts multipart uploads on `POST /api/leases/:id/document`
- [ ] File size cap (10MB) and content-type check (application/pdf only)
- [ ] Signed URL returned for `GET /api/leases/:id/document`
- [ ] Frontend lease modal has the upload button + signed-URL viewer
- [ ] Old external-URL leases still work (backwards compatible)

**Scope.** Storage integration + backend routes + frontend upload UI. Env vars: `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`.

**Non-goals.** Multiple documents per lease. Version history. Text-extraction / OCR.

---

## 3. feat: Email notifications

**Labels:** `type:feature`, `area:backend`

**Problem.** Users have to remember to check the dashboard for lease renewals, overdue rent, and open maintenance tickets. No proactive reminders.

**Proposal.** Add email notifications for three events, using a BullMQ queue backed by Redis so the API stays fast. Provider: Resend (simplest, has generous free tier).

- Rent-due reminder (5 days before)
- Ticket-status changes (owner is notified when a ticket transitions)
- Lease-renewal warning (60 days before end date)

**Acceptance criteria**
- [ ] Queue infrastructure set up (Redis in compose, BullMQ integrated)
- [ ] Three job producers hooked into the appropriate transaction sites
- [ ] Three email templates (transactional, not marketing)
- [ ] User can opt in/out per event type in a new `/settings` page
- [ ] All notifications are idempotent — re-running a job doesn't double-send

**Scope.** Backend + minimal frontend for opt-in preferences. New deps require approval: `bullmq`, `ioredis`, `resend`. Redis service added to `docker-compose.yml`.

**Non-goals.** SMS. In-app inbox. Custom templates per user.

---

## 4. feat: Multi-user manager accounts

**Labels:** `type:feature`, `area:backend`, `area:frontend`

**Problem.** Every user is their own owner. A small property management company managing units for multiple owners can't use PropertyPilot as-is.

**Proposal.** Add a `Manager` role that can be granted read/write access to one or more owner accounts. Manager sees a portfolio picker in the nav to switch between owners.

**Acceptance criteria**
- [ ] New `Manager` and `ManagerAssignment` tables + migration
- [ ] Auth middleware supports the manager role and resolves the "effective ownerId" per request
- [ ] Owner scoping still holds — a manager can only see owners they're assigned to
- [ ] Frontend nav has a portfolio picker; switching updates all queries
- [ ] Owner CRUD for assigning/revoking managers

**Scope.** Big. Touches auth, every repository query, every frontend page. Break into sub-PRs during implementation.

**Non-goals.** Role permissions beyond "full access" (fine-grained ACLs are v2). Cross-owner reports.

---

## 5. chore: Mobile-friendly reports

**Labels:** `type:chore`, `area:frontend`

**What.** The Reports page tables are cramped below 768px viewport. Convert to responsive card layouts on narrow screens.

**Why.** Landlords check the app on their phones on the way to a property. Current mobile UX is unusable for reports.

**Scope**
- [x] Frontend
- [ ] Backend (no)
- [ ] Docs (nav docs mention responsive)

**Definition of done**
- [ ] Report views switch to stacked cards below 768px
- [ ] CSV export button remains visible and functional on mobile
- [ ] Screenshots on the README updated to include a mobile shot

---

## 6. chore: Playwright end-to-end tests

**Labels:** `type:chore`, `area:testing`

**What.** Add Playwright and cover the three critical flows: register + login, add property + record rent, view YTD P&L.

**Why.** Unit coverage is at 209 tests but there's no browser-level regression protection. A styling regression that breaks a form submission would slip past current tests.

**Scope**
- [x] Frontend
- [x] Backend (starts a real dev server for tests)
- [x] CI / tooling (new Playwright job in ci.yml)
- [x] Dependencies (`@playwright/test`)

**Definition of done**
- [ ] Three E2E specs covering: auth flow, CRUD-write flow, report-read flow
- [ ] Playwright job wired into GitHub Actions (headless Chromium)
- [ ] Runs in <2 min on CI
- [ ] Documented in README's testing section

---

## 7. feat: enrich /api/health response with uptime and version *(demo PR issue)*

**Labels:** `type:feature`, `area:backend`, `good-first-issue`

**Problem.** The current health endpoint returns `{ status: "ok" }` and nothing else. Uptime monitoring dashboards and internal operators can't tell how long the app has been running or what version is deployed. Every real service exposes at least these two.

**Proposal.** Extend `GET /api/health` (no new route) to include:

- `uptime` — seconds since process start (`process.uptime()`)
- `version` — the version from `package.json` at build time
- `nodeVersion` — the Node.js runtime version

Existing shape (`status: "ok"`) is preserved so any existing monitor continues to work.

**Acceptance criteria**
- [ ] `GET /api/health` returns `{ status, uptime, version, nodeVersion }`
- [ ] Existing behavior: `status: "ok"` unchanged
- [ ] Backend test covers the new fields
- [ ] No new dependencies

**Scope.** Backend only. One route change, one test. ~15 lines total.

**Non-goals.** Deep health check (DB reachability) — that's a separate follow-up. Prometheus metrics — different problem.

**AI-agent notes.** The health route is defined inline in `backend/src/routes/index.ts` (search for `/health`). Version can be read via `process.env.npm_package_version` — safest at runtime.
