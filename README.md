# Workspace — Karan Rental & Accounts Application

A rental/business operations + personal wealth tracker for Projector Solutions.
Runs as a static site (GitHub Pages, free) with a real multi-user database and
role-based access control on the backend (Supabase, free tier).

## What's working right now
- Dashboard with live KPIs (revenue, expenses, active bookings, equipment available)
- Full add / edit / delete for 19 modules: Customers, Vendors, Staff, Bookings,
  Equipment Inventory, Invoices, Payments, Expenses, Bank Accounts, FD/RD, Credit
  Cards, Gift Cards & Wallets, Investments, Assets & Liabilities, Recurring Bills
  & Utilities, Other Income, Insurance, Document Vault, Family Notes
- Reports, Net Worth Dashboard, Invoice Generator (printable), Settings
- **Real per-user login** (Supabase Auth) — no more single shared password
- **Role-based access control** — Owner / Manager / Staff / Family / Viewer, each
  seeing only what they should (enforced at the database level, not just hidden
  in the UI)
- **Team & Access** management screen — add roles, reset passwords, all from
  inside the app, no SQL needed for day-to-day use
- Personal vs Corporate expense split — Manager/Staff/Viewer never see Personal
  expenses, even via direct API access
- Optional Google Sheets sync (separate from login) and live US/Indian stock
  price fetching
- Mobile-first responsive layout, Lucide icons, grouped sidebar (CRM, Rental
  Operations, Billing, Finance & Wealth, Reports, Family & Documents, System)

## File structure
```
index.html
css/style.css
js/store.js              — localStorage cache layer (source the UI reads from)
js/supabase-client.js    — Supabase project connection (URL + anon key)
js/supabase-auth.js      — login/logout/session/profile helpers
js/supabase-sync.js      — push/pull between localStorage and Supabase
js/sheets-api.js         — optional Google Sheets sync + stock price proxy
js/helpers.js            — shared formatting/date/hash helpers
js/modules-data.js       — the 19 modules' field/column definitions
js/module-table.js       — generic list/table view shared by every module
js/dashboard-router.js   — navigation + Dashboard
js/reports.js            — Reports, Net Worth, stock price refresh
js/invoice-generator.js  — printable invoice/quotation builder
js/settings.js           — Settings page (sync, security, Team & Access)
js/views-custom.js       — combined/custom view registry
js/modal.js              — Add/Edit form modal
js/boot.js               — login flow, role-based nav, app startup
backend/Code.gs           — Apps Script backend (Sheets sync + stock prices + Drive backup)
```

Load order matters (some files use functions defined in others at the top
level) — `index.html` already has the `<script>` tags in the right order.
Don't rename or drop any of them.

## Part 1 — Host it for free on GitHub Pages
1. Create a GitHub repository, public or private.
2. Upload every file above, keeping the same folder structure.
3. Repo → **Settings → Pages → Source → Deploy from branch → main / root**.
4. GitHub gives a free URL like `https://yourusername.github.io/reponame/`.

If a page shows "Failed to load resource... 404" for a specific `.js` file
after deploying, check: (a) the file was actually committed (GitHub → that
file's page → confirm it has real content, not the old version), and (b) it
still ends in `.js` — GitHub's upload UI has occasionally dropped the
extension when a filename is typed manually.

## Part 2 — Login & the database (Supabase)

Login is **real, per-person email + password** (Supabase Auth) — every team
member gets their own account, no shared password.

### One-time project setup
1. Create a free project at [supabase.com](https://supabase.com).
2. Project Settings → API → copy the **Project URL** and **anon public** key
   into `js/supabase-client.js`. (The anon key is safe to embed — it can't
   bypass Row Level Security. Never put the **service_role** key anywhere in
   this repo or any client-side file.)
3. Run the SQL migration files, **in order**, in Supabase → SQL Editor → New
   query → paste → Run:
   - `01-supabase-schema.sql` — creates `workspaces`, `profiles`, `records`
     tables + base security
   - `02-add-local-id-column.sql` — lets local app IDs match Supabase rows
   - `03-rbac-policies.sql` — role-based read/write rules
   - `04-owner-manage-team.sql` — lets the Owner see/edit everyone's role
   - `05-add-profile-email.sql` — shows email instead of raw user IDs in
     Team & Access
   - `06-hide-personal-expenses.sql` — hides Personal-tagged expenses from
     non-Owner roles
4. Set your own account to Owner (replace the email):
   ```sql
   update public.profiles set role = 'owner'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

### Adding team members
1. Supabase → Authentication → Users → **Add user** (turn on "Auto Confirm
   User" so they can log in immediately without an email link).
2. In the app → **Settings → Team & Access**, set their role from the
   dropdown (Owner/Manager/Staff/Family/Viewer). No SQL needed for this step.
3. If someone forgets their password, **Settings → Team & Access → Reset
   password** does it from inside the app (Owner only) — see "Password reset
   Edge Function" below for the one-time setup this depends on.

### Role access

| Role | Business (Customers, Bookings, Equipment, Invoices, Payments, Expenses, Vendors, Staff) | Finance & Wealth | Documents & Family Notes |
|---|---|---|---|
| Owner | Full | Full | Full |
| Manager | Full (incl. delete) | — | — |
| Staff | Add/edit only | — | — |
| Family | — | View/edit | View/edit |
| Viewer | View only | — | — |

Personal-tagged expenses are additionally hidden from everyone except Owner,
regardless of role.

### Migrating existing local data
The very first time (per device/browser) you want your existing data pushed
up: **Settings → Sync with Supabase → "Migrate / push all local data to
Supabase."** After that, every login pulls the latest from Supabase and every
save pushes back automatically — this is a one-time step, not a routine one.

### Password reset Edge Function (one-time setup)
In-app password reset (Settings → Team & Access → Reset password) needs a
small server-side function, since resetting *someone else's* password
requires an admin key that can never be embedded in the website itself.

1. Supabase Dashboard → **Edge Functions → Deploy a new function → Via Editor**.
2. Name it anything (the app currently calls it by whatever name you deployed
   under — check `js/settings.js` for the exact name in the
   `functions.invoke('...')` call and keep them matching).
3. Delete the default template code, paste in `reset-user-password-edge-function.ts`.
4. Deploy. `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   are provided automatically — no secrets to configure manually.

## Part 3 — Google Sheets sync (optional, separate from login)

Sheets sync is independent of login/Supabase — it's an extra backup/mirror,
and is what powers live stock price fetching.

1. Create a Google Sheet, Extensions → Apps Script, paste in `backend/Code.gs`.
2. Deploy → New deployment → Web app — Execute as **Me**, Who has access
   **Anyone** → Deploy → copy the Web App URL into `SHEETS_WEB_APP_URL` in
   `js/sheets-api.js`.
3. In the app → **Settings → Sync with Google Sheets → "Set up / reset Sheets
   sync token"** — pick a password, generate its hash.
4. In `Code.gs`, find `setAppPassword()`, put the **plain password** (not the
   hash) in place of `CHANGE_ME`, run it once from the function dropdown,
   then change it back to `CHANGE_ME` and save.
5. Paste the **hash** from step 3 into `SHEETS_SYNC_TOKEN` in `js/sheets-api.js`.

This token is unrelated to anyone's login password — it only authenticates
this app's requests to your Apps Script backend.

### Live stock prices
1. Free API key from [twelvedata.com](https://twelvedata.com).
2. In `Code.gs`, `setStockApiKey()` — paste the key, run once, then restore
   the placeholder text and save.
3. Investments module → add a stock with Type = US Stock + Ticker (e.g.
   `AAPL`) → **↻ Refresh Prices**. Indian stocks use exchange-suffixed
   symbols (e.g. `RELIANCE:NSE`), already in ₹, no conversion needed.

### Google Drive backup
`backend/Code.gs` can also back up to Google Drive (`saveBackupToDrive()`).
The first time you use it, Apps Script needs to be re-authorized to include
Drive access — if you get a permission error, revoke this project's access at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions)
and re-run any function in the Apps Script editor to trigger a fresh,
complete authorization prompt.

## What's next (ideas)
- Full relational tables for high-volume modules (Invoices, Bookings) instead
  of the current JSONB `records` table, if reporting needs grow
- PWA support (installable app icon, offline caching)
- PDF invoice generation, WhatsApp share link
- Multi-workspace support (the `workspaces` table is already there, ready for
  a second business/entity if ever needed)

## Notes
- Nothing here requires npm or a build step — every file is plain HTML/CSS/JS,
  served as-is by GitHub Pages.
- Supabase's free tier (500MB database, 50k monthly active users) is far more
  than this app's scale needs — no cost expected.
