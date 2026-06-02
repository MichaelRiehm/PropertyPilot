# PropertyPilot — Unit Test Plan

**Project:** PropertyPilot (WGU D424 Capstone)
**Author:** Michael Riehm
**Last updated:** 2026-06-01
**Test framework:** Vitest 4.1.x
**Scope:** Backend unit tests (domain, mappers, repositories, controllers, middleware, reports, forecast)

---

## 1. Scope and Objectives

### 1.1 Scope

This test plan covers automated unit tests for the PropertyPilot backend. The suite verifies the building blocks the rest of the system depends on:

- **Domain classes** — validation rules, business invariants, and mutator behavior on `Property`, `Unit`, `Tenant`, `Lease`, `Transaction`, and `MaintenanceTicket`.
- **Mappers** — round-trip conversion between Prisma rows and domain instances.
- **Repositories** — CRUD with owner scoping, paginated list filters, and the search short-circuit.
- **Controllers** — HTTP request handling (success paths, 404 / ownership / validation error paths).
- **Auth middleware** — JWT bearer-token enforcement.
- **Reports** — `RentRoll`, `Profit & Loss`, `Occupancy`, and `Maintenance Aging` row generation.
- **Forecast** — 12-month cash flow projection driven by active leases and trailing expenses.

End-to-end browser flows, deployment pipeline tests, and database integration tests are **out of scope** for this plan — they will be covered manually in the user-guide walkthrough and the deployment screencast.

### 1.2 Objectives

1. Catch regressions in the core domain rules before they reach the HTTP layer.
2. Confirm that every repository query is scoped to the authenticated owner so that one user can never see or mutate another user's data.
3. Confirm that every controller success path returns the expected payload and that every error path throws the correct error class (so the central error middleware maps it to the right HTTP status).
4. Verify the auth middleware blocks every variant of a missing or malformed `Authorization` header.
5. Confirm that report and forecast aggregations match worked-out expected values from hand-built fixtures.
6. Make the test run reproducible: one command, no external services, no network calls.

### 1.3 Success criteria

- All test files run green (`npm run test -w backend`) on a clean checkout.
- Every repository CRUD method has at least one success-path test and at least one error-path test.
- Every controller method has at least one success-path test and at least one error-path test.
- The auth middleware has tests for valid token, missing header, malformed header, empty token, and verification failure.

---

## 2. Test Approach

### 2.1 Framework and tooling

- **Vitest 4.1** — fast TypeScript-native test runner, drop-in compatible with Jest assertions but better Vite/TS integration.
- **`vi.fn()` mocks** — used to stand in for Prisma client tables, the auth service, and Express `Request`/`Response` objects.
- **No real database** — every Prisma method is mocked. Tests run in milliseconds and do not require a Postgres container or schema migration.
- **`vi.useFakeTimers()` / `vi.setSystemTime()`** — used in date-sensitive forecast tests so that the projection window is deterministic regardless of the wall clock.

### 2.2 Style and conventions

- Tests live next to the source file as `<filename>.test.ts`. The production `tsconfig.build.json` excludes them from the compiled output.
- Each repository test file builds a tiny `tableMock()` helper that returns the subset of Prisma methods the repository actually calls; the whole mocked client is cast via `as unknown as PrismaClient` so the type checker stays happy without us having to mock the full Prisma surface.
- Each controller test file builds a `makeReq()` / `makeRes()` helper. `req.user` is pre-populated with `{ id: 'owner-1', email: 'owner@example.com' }` to simulate the value the auth middleware would attach.
- Domain entity factories use the static `Entity.create({...})` factory for valid cases and the raw constructor for known-invalid cases that need to bypass the factory's auto-validation.

### 2.3 Coverage strategy

Coverage was driven by the rubric (D.2 specifically calls out repositories, controllers, and auth middleware) plus the OOP requirements from Task 3.B.1 (which puts the domain class hierarchy at the center of the system). The suite therefore stacks four layers of unit tests:

1. Domain — proves the business rules in isolation.
2. Mappers / Repositories — proves the persistence boundary.
3. Controllers — proves the HTTP boundary with the layers below mocked out.
4. Middleware — proves the auth gate that wraps every protected route.

The reports and forecast suites then exercise the higher-level aggregations the dashboard and reporting pages depend on.

### 2.4 How to run

```powershell
# Run the suite once
npm run test -w backend

# Watch mode (re-runs on change)
npm run test:watch -w backend

# Verbose per-test listing (used for the screenshot in section 4)
npm run test -w backend -- --run --reporter=verbose
```

---

## 3. Test Cases

Each table below lists the individual cases in one test file. IDs are stable within a file (`TC-<file-key>-NN`). All cases share the same expected high-level outcome — the assertion passes — so the "Expected output" column captures the specific behavior being asserted.

### 3.1 Domain layer — `backend/src/domain/`

#### `Property.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-PROP-01 | Validation passes for a fully populated property | Valid `Property` instance | `validate()` returns `{ ok: true }` |
| TC-PROP-02 | Validation passes when `addressLine2` is null | Property with `addressLine2: null` | `validate()` returns `{ ok: true }` |
| TC-PROP-03 | Fails when name is blank | `name: ''` | `validate().ok === false` |
| TC-PROP-04 | Fails when name exceeds 120 characters | `name` over 120 chars | `validate().ok === false` |
| TC-PROP-05 | Fails when `addressLine1` is blank | `addressLine1: ''` | `validate().ok === false` |
| TC-PROP-06 | Fails when city is blank | `city: ''` | `validate().ok === false` |
| TC-PROP-07 | Fails when state is lowercase | `state: 'wi'` | `validate().ok === false` |
| TC-PROP-08 | Fails when state is too long | `state: 'WIS'` | `validate().ok === false` |
| TC-PROP-09 | Fails when postal code is malformed | `postalCode: 'abc'` | `validate().ok === false` |
| TC-PROP-10 | Accepts ZIP+4 format | `postalCode: '53703-1234'` | `validate()` returns `{ ok: true }` |
| TC-PROP-11 | Aggregates multiple errors at once | Multiple invalid fields | `errors` array contains every offender |
| TC-PROP-12 | `rename()` updates name and bumps `updatedAt` | `rename('New Name')` | name updated, timestamp advances |
| TC-PROP-13 | `fullAddress()` combines parts with optional line 2 | Property with line 2 | Joined address string |

#### `Unit.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-UNIT-01 | Validation passes for a typical unit | Valid unit | `{ ok: true }` |
| TC-UNIT-02 | Passes with null `squareFeet` | `squareFeet: null` | `{ ok: true }` |
| TC-UNIT-03 | Fails when label is blank | `label: ''` | `{ ok: false }` |
| TC-UNIT-04 | Fails when bedrooms is negative | `bedrooms: -1` | `{ ok: false }` |
| TC-UNIT-05 | Fails when bedrooms is fractional | `bedrooms: 2.5` | `{ ok: false }` |
| TC-UNIT-06 | Fails when bathrooms is negative | `bathrooms: -1` | `{ ok: false }` |
| TC-UNIT-07 | Fails when `marketRent` is negative | `marketRent: -100` | `{ ok: false }` |
| TC-UNIT-08 | Fails when `squareFeet` is negative | `squareFeet: -10` | `{ ok: false }` |
| TC-UNIT-09 | Fails when `propertyId` is empty | `propertyId: ''` | `{ ok: false }` |
| TC-UNIT-10 | `setMarketRent` updates value and bumps `updatedAt` | `setMarketRent(1500)` | new rent + timestamp advance |

#### `Tenant.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-TEN-01 | Validation passes for a typical tenant | Valid tenant | `{ ok: true }` |
| TC-TEN-02 | Passes with null phone | `phone: null` | `{ ok: true }` |
| TC-TEN-03 | Fails when `firstName` is blank | `firstName: ''` | `{ ok: false }` |
| TC-TEN-04 | Fails when `lastName` is blank | `lastName: ''` | `{ ok: false }` |
| TC-TEN-05 | Fails when email is invalid | `email: 'not-an-email'` | `{ ok: false }` |
| TC-TEN-06 | Fails when phone has too few digits | `phone: '123'` | `{ ok: false }` |
| TC-TEN-07 | Accepts phone with formatting characters | `phone: '(608) 555-1234'` | `{ ok: true }` |
| TC-TEN-08 | `fullName()` joins first and last with a space | Avery + Lee | `'Avery Lee'` |

#### `Lease.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-LEASE-01 | Validation passes for a typical lease | 12-month active lease | `{ ok: true }` |
| TC-LEASE-02 | Fails when start equals end | Same date both fields | `{ ok: false }` |
| TC-LEASE-03 | Fails when start is after end | Reversed dates | `{ ok: false }` |
| TC-LEASE-04 | Fails when `monthlyRent` is zero | `monthlyRent: 0` | `{ ok: false }` |
| TC-LEASE-05 | Fails when `securityDeposit` is negative | `securityDeposit: -1` | `{ ok: false }` |
| TC-LEASE-06 | Fails when `unitId` or `tenantId` is blank | Either id `''` | `{ ok: false }` |
| TC-LEASE-07 | `isActiveOn` true within window when ACTIVE | Date inside range | `true` |
| TC-LEASE-08 | `isActiveOn` false outside window | Date outside range | `false` |
| TC-LEASE-09 | `isActiveOn` false when status is PENDING | Status `'PENDING'` | `false` |
| TC-LEASE-10 | `termInMonths` approximates length | 1-year lease | ~12 |
| TC-LEASE-11 | `terminate()` flips status and bumps `updatedAt` | `terminate()` | status TERMINATED + new timestamp |

#### `Transaction.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-TX-01 | Validation passes for a typical expense | Valid `EXPENSE` | `{ ok: true }` |
| TC-TX-02 | Fails when amount is zero | `amount: 0` | `{ ok: false }` |
| TC-TX-03 | Fails when description is blank | `description: ''` | `{ ok: false }` |
| TC-TX-04 | Fails when `propertyId` is blank | `propertyId: ''` | `{ ok: false }` |
| TC-TX-05 | Fails when `RENT_INCOME` has no `leaseId` | Rent w/o lease | `{ ok: false }` |
| TC-TX-06 | Passes when `RENT_INCOME` has a `leaseId` | Rent + lease | `{ ok: true }` |
| TC-TX-07 | `isIncome` true for income types | `RENT_INCOME` / `DEPOSIT_INCOME` / `OTHER_INCOME` | `true` |
| TC-TX-08 | `isIncome` false for expense and refund | `EXPENSE` / `REFUND` | `false` |
| TC-TX-09 | `signedAmount` positive for income, negative otherwise | Mixed types | Correct sign |

#### `MaintenanceTicket.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-MT-01 | Validation passes for an open ticket | Open ticket | `{ ok: true }` |
| TC-MT-02 | Passes for a closed ticket with `resolvedAt` | Closed + resolvedAt | `{ ok: true }` |
| TC-MT-03 | Fails when closed without `resolvedAt` | `CLOSED`, `resolvedAt: null` | `{ ok: false }` |
| TC-MT-04 | Fails when title is blank | `title: ''` | `{ ok: false }` |
| TC-MT-05 | Fails when description is blank | `description: ' '` | `{ ok: false }` |
| TC-MT-06 | Fails when `resolvedAt` is before `reportedAt` | Out-of-order dates | `{ ok: false }` |
| TC-MT-07 | `isOpen` true for OPEN / IN_PROGRESS, false otherwise | All four statuses | Correct booleans |
| TC-MT-08 | `ageInDays` measures from `reportedAt` to as-of | 10-day window | `10` |
| TC-MT-09 | `close()` sets status and `resolvedAt` | `close(date)` | status `CLOSED`, `resolvedAt` set |

### 3.2 Mappers — `backend/src/domain/mappers.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-MAP-01 | Property round-trip preserves every field | Domain → Prisma input → back | Equal field-by-field |
| TC-MAP-02 | Property mapper preserves null `addressLine2` | line 2 `null` | line 2 stays `null` |
| TC-MAP-03 | Unit round-trips numeric fields cleanly | Decimal rent, sqft | No rounding drift |
| TC-MAP-04 | Unit preserves null `squareFeet` | sqft `null` | stays `null` |
| TC-MAP-05 | Tenant round-trips name, email, phone | All three fields | Equal |
| TC-MAP-06 | Lease round-trips dates and currency | start/end + amounts | Equal |
| TC-MAP-07 | Rent transaction round-trips with lease/unit links | Income tx | Equal |
| TC-MAP-08 | Expense round-trips without unit/lease | Expense tx | Equal w/ nulls preserved |
| TC-MAP-09 | Maintenance ticket round-trips with null `resolvedAt` | Open ticket | Equal |
| TC-MAP-10 | Maintenance ticket round-trips closed with `resolvedAt` | Closed ticket | Equal |

### 3.3 Repository layer — `backend/src/repositories/`

#### `PropertyRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-PROP-01 | `findById` returns null when no row matches owner scope | id + ownerId, no match | `null`, where clause includes ownerId |
| TC-RP-PROP-02 | `findById` returns Property instance when row exists | id + ownerId, match | `Property` instance |
| TC-RP-PROP-03 | `list` returns paginated result with defaults | ownerId only | page 1, pageSize 20, total 1 |
| TC-RP-PROP-04 | `list` honors custom page and pageSize | `page: 3, pageSize: 10` | `take: 10, skip: 20` |
| TC-RP-PROP-05 | `create` persists entity and returns mapped instance | Valid Property | Prisma create called, instance returned |
| TC-RP-PROP-06 | `create` throws `DomainValidationError` on invalid entity | Invalid Property | Throws, Prisma not called |
| TC-RP-PROP-07 | `update` throws `NotFoundError` when no rows updated | count 0 | Throws `NotFoundError` |
| TC-RP-PROP-08 | `update` re-reads and returns updated row | count 1 | Updated entity returned |
| TC-RP-PROP-09 | `delete` throws `NotFoundError` when no rows match | count 0 | Throws `NotFoundError` |
| TC-RP-PROP-10 | `delete` succeeds when a row is deleted | count 1 | Resolves with `undefined` |
| TC-RP-PROP-11 | `search` runs case-insensitive OR across name, addressLine1, city | `'maple'` | 3-clause OR, ownerId scoped |
| TC-RP-PROP-12 | `search` returns empty for blank query without hitting Prisma | `'   '` | `[]`, Prisma not called |

#### `UnitRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-UNIT-01 | `findById` scopes through `property.ownerId` | id + ownerId | Join clause includes `property: { ownerId }` |
| TC-RP-UNIT-02 | `findById` returns null when nothing matches | No row | `null` |
| TC-RP-UNIT-03 | `list` joins through property for owner scoping and filters by propertyId | ownerId + propertyId | Both filters applied |
| TC-RP-UNIT-04 | `create` persists the entity | Valid Unit | Prisma create called |
| TC-RP-UNIT-05 | `update` throws `NotFoundError` when count is zero | count 0 | Throws |
| TC-RP-UNIT-06 | `update` re-reads and returns when count is one | count 1 | Updated unit |
| TC-RP-UNIT-07 | `delete` throws `NotFoundError` when count is zero | count 0 | Throws |

#### `TenantRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-TEN-01 | `findById` scopes directly by `ownerId` | id + ownerId | Where includes ownerId |
| TC-RP-TEN-02 | `findById` returns null when missing | No row | `null` |
| TC-RP-TEN-03 | `list` returns `PaginatedResult` with totals + pageSize | ownerId | Correct paged response |
| TC-RP-TEN-04 | `update` throws `NotFoundError` when no rows match | count 0 | Throws |
| TC-RP-TEN-05 | `delete` succeeds when count is one | count 1 | Resolves |
| TC-RP-TEN-06 | `search` runs OR across name and email fields | `'avery'` | OR with 3 fields |
| TC-RP-TEN-07 | `search` short-circuits on blank query | `''` | `[]`, no Prisma call |

#### `LeaseRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-LEASE-01 | `findById` scopes through `unit.property.ownerId` | id + ownerId | Two-level join in where clause |
| TC-RP-LEASE-02 | `list` passes through unitId, tenantId, status filters | All three | All applied |
| TC-RP-LEASE-03 | `update` throws `NotFoundError` when no rows match owner | count 0 | Throws |
| TC-RP-LEASE-04 | `update` re-reads and returns when count is one | count 1 | Updated lease |
| TC-RP-LEASE-05 | `delete` throws `NotFoundError` when no rows match | count 0 | Throws |

#### `TransactionRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-TX-01 | `findById` scopes through `property.ownerId` | id + ownerId | Join clause includes ownerId |
| TC-RP-TX-02 | `findById` returns null when not found | No row | `null` |
| TC-RP-TX-03 | `list` applies propertyId, unitId, leaseId, type, and date range | All filters | All applied in where |
| TC-RP-TX-04 | `list` omits date filter when no range provided | No dates | `where.date` undefined |
| TC-RP-TX-05 | `update` throws `NotFoundError` when no rows match | count 0 | Throws |
| TC-RP-TX-06 | `update` re-reads and returns when count is one | count 1 | Updated transaction |
| TC-RP-TX-07 | `delete` throws `NotFoundError` when no rows match | count 0 | Throws |
| TC-RP-TX-08 | `search` returns empty for blank query without hitting Prisma | `'   '` | `[]`, no Prisma call |
| TC-RP-TX-09 | `search` runs case-insensitive `contains` on description | `'rent'` | `contains` clause, ownerId scoped |

#### `MaintenanceTicketRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-MT-01 | `findById` scopes through `property.ownerId` | id + ownerId | Join clause includes ownerId |
| TC-RP-MT-02 | `list` applies propertyId and status filters | Both | Both applied |
| TC-RP-MT-03 | `list` with `openOnly` filters to OPEN or IN_PROGRESS | `openOnly: true` | `status: { in: [...] }` |
| TC-RP-MT-04 | `update` throws `NotFoundError` when no rows match | count 0 | Throws |
| TC-RP-MT-05 | `update` re-reads and returns when count is one | count 1 | Updated ticket |
| TC-RP-MT-06 | `delete` throws `NotFoundError` when no rows match | count 0 | Throws |

#### `UserRepository.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-RP-USER-01 | `findById` returns user record when found | id, row exists | `UserRecord` |
| TC-RP-USER-02 | `findById` returns null when not found | No row | `null` |
| TC-RP-USER-03 | `findByEmail` looks up by email field | email | Prisma called with `where: { email }` |
| TC-RP-USER-04 | `findByEmail` returns null when not found | No row | `null` |
| TC-RP-USER-05 | `create` passes email and passwordHash and returns the record | New user | Prisma create called, record returned |

### 3.4 Controllers — `backend/src/controllers/`

#### `propertyController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-PROP-01 | `list` returns paginated payload with serialized rows | Default query | `data` array w/ `fullAddress` |
| TC-CTL-PROP-02 | `get` returns serialized property when found | Existing id | JSON payload |
| TC-CTL-PROP-03 | `get` throws `NotFoundError` when missing | Missing id | Throws `NotFoundError` |
| TC-CTL-PROP-04 | `create` persists and returns 201 | Valid body | `res.status(201)`, payload |
| TC-CTL-PROP-05 | `create` throws on Zod validation failure | `name: ''` | Throws |
| TC-CTL-PROP-06 | `update` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-PROP-07 | `update` renames and returns updated payload | `{ name: 'Renamed' }` | Updated payload |
| TC-CTL-PROP-08 | `remove` returns 204 on success | Existing id | `res.status(204)` |

#### `unitController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-UNIT-01 | `get` returns unit when found | Existing id | JSON payload |
| TC-CTL-UNIT-02 | `get` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-UNIT-03 | `create` verifies parent property before creating | Valid body, owner owns property | 201 + property lookup |
| TC-CTL-UNIT-04 | `create` throws `NotFoundError` when parent property is not the user's | Foreign propertyId | Throws, `create` not called |
| TC-CTL-UNIT-05 | `create` rejects invalid body with Zod error | `label: ''` | Throws |
| TC-CTL-UNIT-06 | `update` throws `NotFoundError` when unit missing | Missing id | Throws |
| TC-CTL-UNIT-07 | `update` updates market rent and returns payload | `{ marketRent: 1500 }` | Updated payload |
| TC-CTL-UNIT-08 | `remove` returns 204 on success | Existing id | 204 |

#### `tenantController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-TEN-01 | `get` returns serialized tenant when found | Existing id | `fullName` included |
| TC-CTL-TEN-02 | `get` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-TEN-03 | `create` returns 201 on success | Valid body | 201 + payload |
| TC-CTL-TEN-04 | `create` rejects invalid email | `email: 'not-email'` | Throws |
| TC-CTL-TEN-05 | `update` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-TEN-06 | `update` updates name and returns payload | `{ firstName: 'Bee' }` | Updated payload |
| TC-CTL-TEN-07 | `remove` returns 204 | Existing id | 204 |

#### `leaseController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-LEASE-01 | `get` returns lease when found | Existing id | Payload |
| TC-CTL-LEASE-02 | `get` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-LEASE-03 | `create` verifies unit and tenant before creating | Valid body, owner owns both | 201 + 2 lookups |
| TC-CTL-LEASE-04 | `create` throws `NotFoundError` when unit not owned | Foreign unitId | Throws |
| TC-CTL-LEASE-05 | `create` throws `NotFoundError` when tenant not owned | Foreign tenantId | Throws |
| TC-CTL-LEASE-06 | `update` throws `NotFoundError` when lease missing | Missing id | Throws |
| TC-CTL-LEASE-07 | `update` terminates lease and returns payload | `{ status: 'TERMINATED' }` | Updated payload |
| TC-CTL-LEASE-08 | `remove` returns 204 | Existing id | 204 |

#### `transactionController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-TX-01 | `get` returns serialized transaction when found | Existing id | Payload with `isIncome` + `signedAmount` |
| TC-CTL-TX-02 | `get` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-TX-03 | `create` verifies property, unit, and lease before creating | Valid body | All 3 lookups + 201 |
| TC-CTL-TX-04 | `create` throws `NotFoundError` when property not owned | Foreign propertyId | Throws |
| TC-CTL-TX-05 | `create` throws `NotFoundError` when attached unit not owned | Foreign unitId | Throws |
| TC-CTL-TX-06 | `update` throws `NotFoundError` when missing | Missing id | Throws |
| TC-CTL-TX-07 | `update` updates amount and returns payload | `{ amount: 2000 }` | Updated payload |
| TC-CTL-TX-08 | `remove` returns 204 | Existing id | 204 |

#### `authController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-AUTH-01 | `register` creates a user, signs a token, returns 201 | Mixed-case email | 201, lowercased email, token, no password hash |
| TC-CTL-AUTH-02 | `register` maps Prisma P2002 to `ConflictError` | Duplicate email | Throws `ConflictError` |
| TC-CTL-AUTH-03 | `register` rejects invalid body | Bad email/short pw | Throws |
| TC-CTL-AUTH-04 | `login` returns token + user on valid credentials | Valid email + password | 200 + token |
| TC-CTL-AUTH-05 | `login` throws 401 when user not found | Unknown email | Throws `HttpError(401)` |
| TC-CTL-AUTH-06 | `login` throws 401 when password mismatch | Wrong password | Throws `HttpError(401)` |
| TC-CTL-AUTH-07 | `me` returns user without password hash | Valid `req.user` | Payload, no `passwordHash` |
| TC-CTL-AUTH-08 | `me` throws 401 when authenticated user no longer exists | User deleted | Throws `HttpError(401)` |

#### `dashboardController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-DASH-01 | `summary` aggregates property/unit counts, occupancy, YTD totals, ticket statuses | Fixture w/ 1 property, 2 units, 1 active lease, mixed txs and tickets | Correct totals + status counts |

#### `searchController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-SEARCH-01 | `search` returns combined hits across properties, tenants, transactions | `q: 'maple'` | 3 hits, correct counts, property names joined onto tx hits |
| TC-CTL-SEARCH-02 | `search` rejects empty query with Zod error | `q: ''` | Throws |

#### `reportsController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-REP-01 | `rentRoll` returns report JSON with `'Rent Roll'` title | Default | `title === 'Rent Roll'` |
| TC-CTL-REP-02 | `pnl` defaults `dateFrom`/`dateTo` to current YTD | Default | `title === 'Year-to-date Profit & Loss'` |
| TC-CTL-REP-03 | `occupancy` returns report JSON with `'Occupancy'` title | Default | `title === 'Occupancy'` |
| TC-CTL-REP-04 | `maintenanceAging` returns report JSON with `'Maintenance Aging'` title | Default | `title === 'Maintenance Aging'` |
| TC-CTL-REP-05 | `maintenanceAging` rejects invalid `asOf` date | `asOf: 'not-a-date'` | Throws Zod error |

#### `forecastController.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-CTL-FC-01 | `forecast` returns result for owned property | Existing propertyId | 12 projections, defaults applied |
| TC-CTL-FC-02 | `forecast` honors `monthsAhead` and `trailingMonths` overrides | `monthsAhead=6`, `trailingMonths=3` | 6 projections, fields echoed |
| TC-CTL-FC-03 | `forecast` throws `NotFoundError` when property not owned | Foreign propertyId | Throws |
| TC-CTL-FC-04 | `forecast` rejects `monthsAhead` out of range | `monthsAhead=999` | Throws Zod error |

### 3.5 Middleware — `backend/src/middleware/auth.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-MW-AUTH-01 | Attaches `req.user` and calls `next()` on valid bearer token | `Bearer valid.jwt` | `req.user` set, `next()` called |
| TC-MW-AUTH-02 | Accepts case-insensitive `Bearer` prefix | `bearer abc...` | Works the same |
| TC-MW-AUTH-03 | Rejects with 401 when `Authorization` is missing | No header | `next(HttpError(401))` |
| TC-MW-AUTH-04 | Rejects with 401 when scheme is not Bearer | `Basic abc123` | `next(HttpError(401))` |
| TC-MW-AUTH-05 | Rejects with 401 when bearer token is empty | `Bearer ` | `next(HttpError(401))` |
| TC-MW-AUTH-06 | Rejects with 401 when token verification throws | `Bearer bad` | `next(HttpError(401))` |
| TC-MW-AUTH-07 | Does not leak verification error details to caller | Verifier throws containing secret | `err.message` does not include leaked text |

### 3.6 Reports — `backend/src/reports/`

#### `RentRollReport.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-REP-RR-01 | Produces one row per lease, joined with property/unit/tenant | Fixture w/ 2 leases | 2 rows, joined fields |
| TC-REP-RR-02 | Filters to a single property when `propertyId` is set | propertyId filter | Only matching rows |
| TC-REP-RR-03 | Respects `asOf` by excluding leases not covering that date | `asOf` outside one lease | Excluded |
| TC-REP-RR-04 | Sets title, `generatedAt`, and `toJSON` shape | Generated report | Title, timestamp, columns, rows |

#### `PnLReport.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-REP-PNL-01 | Groups income and expenses by month and adds a Total row | Mixed-month txs | One row per month + Total |
| TC-REP-PNL-02 | Returns empty rows array when there is no data | Empty txs | `rows: []` |
| TC-REP-PNL-03 | Reports negative net when expenses exceed income | Expense-heavy month | Net negative |
| TC-REP-PNL-04 | Sets YTD title | Generated | `'Year-to-date Profit & Loss'` |

#### `OccupancyReport.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-REP-OCC-01 | Counts occupied and vacant units per property and appends Total | Mixed occupancy | Per-property rows + Total |
| TC-REP-OCC-02 | Filters to a single property when `propertyId` is given | propertyId filter | Only that property |
| TC-REP-OCC-03 | Shows 0% when no leases overlap the `asOf` date | All leases ended | 0% rows |

#### `MaintenanceAgingReport.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-REP-MA-01 | Places each ticket in the correct aging bucket | Tickets of varying ages | Buckets correctly |
| TC-REP-MA-02 | Returns no rows when there are no open tickets | All closed | Empty rows |
| TC-REP-MA-03 | Sorts within the same age bucket by priority | Mixed priorities | High → Low order |

### 3.7 Forecast — `backend/src/forecast/CashFlowForecaster.test.ts`

| ID | Description | Input | Expected output |
|---|---|---|---|
| TC-FC-01 | Throws `NotFoundError` when property is not owned | Foreign propertyId | Throws |
| TC-FC-02 | Produces 12 monthly projections by default | Default options | 12 entries |
| TC-FC-03 | Keeps income constant when a lease covers every month | 12-month lease | Income flat |
| TC-FC-04 | Drops income to zero once the lease ends | Lease ends mid-window | Zero income after end |
| TC-FC-05 | Starts income at zero when lease begins mid-forecast | Lease starts later | Zero income before start |
| TC-FC-06 | Computes baseline expense as trailing average | Mixed expense history | Correct mean |
| TC-FC-07 | Flags months where expenses exceed income | Sparse income | `expensesExceedIncome: true` |
| TC-FC-08 | Ignores leases on units that do not belong to the target property | Mixed-property lease set | Only target-property leases included |

---

## 4. Test Run Evidence

The screenshots below are from the run captured on the day the suite was finalized. They are reproduced in `docs/test-results.md` alongside the pass/fail accounting.

### 4.1 Run summary

`npm run test -w backend`

![Vitest summary](test-screenshots/backend-vitest-summary.png)

### 4.2 Verbose per-test listing

`npm run test -w backend -- --run --reporter=verbose`

![Vitest verbose listing](test-screenshots/backend-vitest-verbose.png)

---

## 5. Maintenance

- New domain or repository code must ship with a matching `*.test.ts` next to the source file.
- Controller tests are required for any new HTTP route — at minimum one success path and one error path.
- The CI command is `npm run test -w backend`; it must finish green before any rubric-tagged commit.
