# PropertyPilot — End-User Guide

**For:** Landlords managing 1–10 residential units.
**Last updated:** 2026-06-02
**Application:** PropertyPilot web app (browser-based; no install required).

---

## 1. What PropertyPilot Does

PropertyPilot replaces the spreadsheet that small landlords usually keep. In one screen you can:

- Track every **property** you own, the **units** inside it, and the **tenants** who live there.
- Record **leases** with start/end dates, monthly rent, and security deposit.
- Log **rent payments** and **operating expenses** as they happen.
- Run four standard **reports** — Rent Roll, Year-to-Date Profit & Loss, Occupancy, and Maintenance Aging.
- Project a **12-month cash flow forecast** per property.

Everything you enter is scoped to your own account. Other landlords using the same instance cannot see your data.

---

## 2. Logging In and Registering

### 2.1 First-time registration

1. Open the application URL in your browser.
2. On the **Sign in** page, click **Create one** at the bottom.
3. Fill in:
   - **Email** — any valid email format. This is your username going forward.
   - **Password** — at least 8 characters.
   - **Confirm password** — must match the one above.
4. Click **Create account**. You will land on the **Dashboard** automatically.

> Screenshot: `docs/screenshots/register.png`

If the email is already registered the form will tell you so under the email field. Use **Sign in** on the login page instead, or pick a different email.

### 2.2 Signing in

1. Go to the same URL.
2. Enter your email and password.
3. Click **Sign in**.

If your password is wrong the form shows **"Invalid email or password."** Reset by re-registering with a fresh email — self-service password reset is not part of this release.

> Screenshot: `docs/screenshots/login.png`

### 2.3 Signing out

The **Log out** button is in the top-right corner of every page. Clicking it clears your session and sends you back to the sign-in page.

---

## 3. The App Shell

After signing in you see the same top navigation everywhere:

- **PropertyPilot** (left): jumps to the Dashboard.
- **Search box** (middle): cross-entity search — see [section 9](#9-using-search).
- **Email + Log out** (right).
- **Nav row**: Dashboard, Properties, Units, Tenants, Leases, Transactions, Reports, Forecast.

> Screenshot: `docs/screenshots/navbar.png`

The active page is highlighted in dark slate.

---

## 4. Adding a Property and Units

A **property** is a building or address you own. Each property holds one or more **units** — the rentable spaces inside it. A single-family home has one unit; a duplex has two; etc.

### 4.1 Add a property

1. In the top nav, click **Properties**.
2. Click **Add property** in the top-right.
3. Fill in the form:
   - **Name** — a short label like "Maple Court" or "128 Maple".
   - **Address line 1** — required.
   - **Address line 2** — optional (apartment number, suite, etc.).
   - **City**, **State** (two-letter, uppercase), **Postal code** (5 digits or ZIP+4).
   - **Property type** — Single family, Duplex, Triplex, Fourplex, Multi-family, Condo, Townhouse, or Other.
4. Click **Save**.

The list refreshes and your new property appears. Use the pencil icon to edit and the trash icon to delete.

> Screenshot: `docs/screenshots/property-form.png`
> Screenshot: `docs/screenshots/properties-list.png`

### 4.2 Add units to a property

1. Click **Units** in the top nav.
2. Click **Add unit**.
3. Fill in:
   - **Property** — pick from the dropdown. (If the list is empty, add a property first.)
   - **Label** — e.g. "A", "B", "Upstairs", "Unit 2".
   - **Bedrooms** and **Bathrooms** — whole numbers; half-baths are not modeled.
   - **Square feet** — optional.
   - **Market rent** — what you would advertise this unit for. This is used by the forecast as a fallback when the unit is vacant.
4. Click **Save**.

Repeat for every unit in the property. A duplex gets two unit rows, a fourplex gets four, etc.

> Screenshot: `docs/screenshots/unit-form.png`

---

## 5. Adding Tenants and Leases

### 5.1 Add a tenant

A **tenant** is a person. Tenants are not tied to a specific unit — they get linked to a unit through a **lease**. That way you keep their history when they move from one of your units to another.

1. Click **Tenants** in the top nav.
2. Click **Add tenant**.
3. Fill in:
   - **First name**, **Last name** — required.
   - **Email** — required, must be a valid email format.
   - **Phone** — optional. Spaces, dashes, and parentheses are allowed; the system only requires at least seven digits behind the formatting.
4. Click **Save**.

> Screenshot: `docs/screenshots/tenant-form.png`

### 5.2 Create a lease

A **lease** connects one tenant to one unit for a date range, with a monthly rent and a security deposit.

1. Click **Leases** in the top nav.
2. Click **Add lease**.
3. Fill in:
   - **Unit** — the rental unit. Filtered to units you own.
   - **Tenant** — the person on the lease. Filtered to your tenants.
   - **Start date** and **End date** — pick the lease term.
   - **Monthly rent** — what is due each month.
   - **Security deposit** — held but not income.
   - **Status** — `PENDING` (signed but not yet in effect), `ACTIVE` (currently in force), `EXPIRED` (past end date), or `TERMINATED` (ended early).
   - **Document link** — optional URL to a stored PDF lease (Drive, Dropbox, etc.). PropertyPilot does not host the document; it just keeps the link.
4. Click **Save**.

> Screenshot: `docs/screenshots/lease-form.png`

To end a lease early, edit it and change the status to `TERMINATED`. To renew, create a new lease with the same tenant + unit and new dates.

---

## 6. Recording Rent Payments and Expenses

The **Transactions** page is your money-in / money-out log. Each transaction has a **type** that controls how it is summed in reports:

| Type | Sign | What it represents |
|---|---|---|
| `RENT_INCOME` | + | A rent payment received under a lease |
| `DEPOSIT_INCOME` | + | A security deposit received |
| `OTHER_INCOME` | + | Anything else that came in (e.g. utility reimbursement) |
| `EXPENSE` | − | Money out: repairs, insurance, taxes, utilities, etc. |
| `REFUND` | − | A refund issued to a tenant (e.g. partial deposit return) |

### 6.1 Record a rent payment

1. Click **Transactions**.
2. Click **Add transaction**.
3. Fill in:
   - **Property** — required.
   - **Unit** — recommended for rent payments. Optional for whole-property expenses.
   - **Lease** — required when type is `RENT_INCOME`.
   - **Type** — `RENT_INCOME`.
   - **Amount** — the dollar amount received. Always positive; the sign is implied by the type.
   - **Date** — date received.
   - **Description** — short note like "May 2026 rent".
   - **Category** — optional free-text bucket (e.g. "rent", "repairs").
4. Click **Save**.

> Screenshot: `docs/screenshots/transaction-form-rent.png`

### 6.2 Record an expense

1. Click **Transactions** → **Add transaction**.
2. Fill in **Property** (and **Unit** if the expense is unit-specific).
3. **Type** = `EXPENSE`. Leave Lease blank.
4. Enter **Amount** (positive), **Date**, **Description** (e.g. "Plumber — bathroom"), and an optional **Category** (e.g. "Repairs").
5. Click **Save**.

> Screenshot: `docs/screenshots/transaction-form-expense.png`

### 6.3 Filter and edit

- The **All properties** dropdown at the top filters the table to one property.
- Click the pencil icon to edit, the trash icon to delete.
- The Amount column is colored green for income, red for expenses, with the sign applied automatically.

> Screenshot: `docs/screenshots/transactions-list.png`

---

## 7. The Dashboard

Click **Dashboard** (or the **PropertyPilot** logo) at any time to see a roll-up across everything you have entered.

You will see six summary cards:

| Card | What it shows |
|---|---|
| Total properties | Count of properties you own |
| Total units | Count of units across all properties |
| Occupied units | Units with an `ACTIVE` lease covering today's date, plus an occupancy percentage |
| Active leases | Count of leases currently in `ACTIVE` status |
| YTD rent collected | Sum of `RENT_INCOME` transactions year-to-date |
| YTD expenses | Sum of `EXPENSE` transactions year-to-date |

Below the cards are **Maintenance tickets by status** (a row of colored chips) and **Recent transactions** (the 10 most recent across all properties). Click any card to jump to the underlying list page.

> Screenshot: `docs/screenshots/dashboard.png`

---

## 8. Viewing Reports

The **Reports** page has four tabs along the top.

### 8.1 Rent Roll

Shows every lease, joined with its property, unit, and tenant. Columns: Property, Unit, Tenant, Lease start, Lease end, Monthly rent, Deposit, Status. Use this to confirm who is paying what.

### 8.2 Profit & Loss (YTD)

One row per calendar month from January through today, plus a Total row. Columns: Period, Income, Expenses, Net. Income and expenses come from the Transactions page; Net is income minus expenses.

### 8.3 Occupancy

One row per property, plus a Total row. Columns: Property, Total units, Occupied units, Vacant units, Occupancy %. "Occupied" means a unit has an ACTIVE lease whose start ≤ today ≤ end.

### 8.4 Maintenance Aging

One row per **open** maintenance ticket (`OPEN` or `IN_PROGRESS`). Columns: Property, Unit, Title, Priority, Reported, Age (days), Bucket. Buckets are 0–7 days, 8–30 days, 31–90 days, and 90+ days. Sorted oldest first within each bucket, then by priority (High → Medium → Low).

### 8.5 Common controls

Every report has:

- A **property** filter (or `All properties`).
- An **as-of date** picker on Rent Roll, Occupancy, and Maintenance Aging (defaults to today).
- A **date range** picker on Profit & Loss (defaults to year-to-date).
- A **Refresh** button to re-run the report.
- A **Download CSV** button — saves the visible report as a CSV file you can open in Excel or Google Sheets.

> Screenshot: `docs/screenshots/reports-rent-roll.png`
> Screenshot: `docs/screenshots/reports-pnl.png`
> Screenshot: `docs/screenshots/reports-occupancy.png`

---

## 9. Using Search

The **search box** in the top nav matches across three entity types at once:

- **Properties** — by name, address line 1, or city
- **Tenants** — by first name, last name, or email
- **Transactions** — by description

Type at least one character and hit Enter (or click a suggestion). The Search page groups results by type with a count per group. Click any result to jump to the relevant list page.

> Screenshot: `docs/screenshots/search-results.png`

Search is case-insensitive and returns up to 25 results per type.

---

## 10. Running the Cash Flow Forecast

The **Forecast** page projects 12 months of cash flow for one property at a time.

How the numbers are built:

- **Income** for a future month = the sum of `monthlyRent` for every `ACTIVE` lease that covers that month. Leases that end mid-window drop out after their end date; leases that start mid-window are zero until their start date.
- **Expenses** = a flat baseline equal to the average of your last six months of `EXPENSE` transactions on that property. The forecast assumes recurring costs continue at the historical pace.
- **Net** = Income − Expenses for each month.
- Months where projected expenses exceed projected income are flagged with a warning row.

### 10.1 Run a forecast

1. Click **Forecast** in the top nav.
2. If you have multiple properties, pick one from the **Property** dropdown. (The page defaults to your first property.)
3. The chart and table refresh automatically.

You will see:

- A **line chart** with three series — Income (green), Expenses (red), and Net (dashed black).
- A **monthly table** below the chart with Month, Income, Expenses, Net, and a Flag column.

> Screenshot: `docs/screenshots/forecast.png`

Click **Refresh** to re-run after recording new transactions or leases.

> The forecast is only as good as the data behind it. If you have not logged at least a few months of expenses, the baseline will be zero and the projection will look unrealistically rosy.

---

## 11. Tips and Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "Could not load..." red banner on a page | Network blip or the backend restarted | Click **Try again** on the banner |
| Login form says invalid credentials but the password is right | The email is registered under a different capitalization elsewhere; emails are case-insensitive | Use the same email you registered with (case does not matter) |
| Can't add a unit / lease / transaction — Add button is disabled | You have not added a property yet | Add a property first; the rest of the entities depend on it |
| Forecast shows zero expenses every month | No `EXPENSE` transactions in the last six months on that property | Record some expenses (utilities, repairs) — the next forecast will pick them up |
| Search returns nothing | Term is too short or doesn't match the indexed fields (name/address/email/description) | Try a different keyword; the engine matches partial words |

For technical operators (deploying, running migrations, env vars), see [`maintenance-guide.md`](maintenance-guide.md).
