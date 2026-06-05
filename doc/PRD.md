# Product Requirements Document
## คำนวณดอกเบี้ยเงินฝาก — Tiered Deposit Interest Calculator

| | |
|---|---|
| **Product** | Web-based Thai-language deposit interest calculator |
| **Live URL** | https://ohmrefresh.github.io/deposit-interest/ |
| **Document owner** | Product |
| **Status** | Shipped (v1) — share-link enhancement in progress |
| **Last updated** | 2026-06-05 |

---

## 1. Background and problem

Thai retail and small-business customers hold tiered-rate time deposits (เงินฝากประจำ) that pay different rates on each balance bracket — for example 2.00% on the first 1,000,000 THB, 1.50% on the next million, 0.50% above 2,000,000. Existing bank calculators and spreadsheets either:

- treat the whole balance as one rate, or
- cannot model mid-term **Fund In / Fund Out** transactions correctly across the term, or
- do not show a transparent, auditable per-day breakdown that a customer can trust.

The product solves this with a single-page calculator that mirrors the bank’s published tier table, supports deposits and withdrawals on any date inside the term, and shows an itemized day-by-day interest computation.

## 2. Goals and non-goals

### Goals
- Let a customer compute **exactly** the interest a tiered deposit would earn, given the bank’s tier table and the customer’s deposit/withdrawal schedule.
- Show the calculation transparently — per-tier, per-month, and per-day.
- Produce a result the customer can **share with a partner, advisor, or bank officer** via a single link.
- Run entirely in the browser. No account, no server, no data leaves the device unless the user clicks *Copy share link*.

### Non-goals
- Tax calculation (withholding tax on interest is out of scope).
- Connecting to a bank’s live rate feed.
- Multi-currency support. THB only.
- Mobile native apps. The web app is responsive but optimised for desktop and tablet.

## 3. Target users

| Persona | Need |
|---|---|
| **Retail depositor** planning a 6- or 12-month fix | Compare simple vs compound, see real payout |
| **Small-business owner** with seasonal cash flow | Model multiple mid-term deposits/withdrawals |
| **Bank front-office staff** | Show a customer an auditable breakdown that matches the bank’s published tier table |
| **Financial advisor / family member** | Receive a shared link, see the same numbers the customer saw |

## 4. User stories

1. As a depositor, I can enter my deposit amount, term dates, and the bank’s tier table so I can see my expected interest.
2. As a depositor, I can add multiple mid-term Fund In (ฝากเพิ่ม) and Fund Out (ถอน) entries, each with its own date and amount.
3. As a depositor, I can choose between **simple interest** and **yearly compound interest**.
4. As a depositor, I can choose how often interest is **applied** (added to principal) — daily, monthly, biannually, or annually.
5. As a depositor, I can see a **summary** of total interest, accrued (not-yet-applied) interest, and final payout.
6. As a depositor, I can see a **per-tier breakdown** showing the rate, the balance in that tier, and the interest earned.
7. As a depositor, I can see a **per-month apply table** showing when interest is added to the principal.
8. As a depositor, I can see a **per-day, per-tier** interest table grouped by month — every baht of interest is traceable.
9. As a depositor, I can copy a **shareable link** that re-opens the calculator with my inputs pre-filled and auto-calculated.
10. As a depositor, my data is safe — the calculator never sends inputs to a server.

## 5. Functional requirements

### 5.1 Inputs
- **Deposit amount** — positive number, comma-formatted on blur (e.g. `1,500,000.00`).
- **Start date / end date** — required; end must be strictly after start. Default to today and one year later.
- **Interest type** — `simple` or `compound` (yearly compounding).
- **Apply schedule** — `daily` | `monthly` | `biannually` | `annually`.
- **Tier table** — one or more brackets. Each bracket has `min`, optional `max` (leave blank for "no upper bound"), and `rate` (% per year). At least one tier required; all tier amounts and rates validated.
- **Fund In / Fund Out** — zero or more transactions. Each has `date` (must be within `[startDate, endDate]`, inclusive), `type` (`in` | `out`), and `amount` > 0. New transactions default to the start date and amount `0.00`.

### 5.2 Calculation rules
- **Tier splitting.** The current balance is split across tiers in ascending `min` order, up to each tier’s capacity. The top tier has no `max` and absorbs the remainder.
- **Simple interest** per sub-period: `I = P × R × (days / yearDays)`, where `yearDays` is **365 or 366** depending on whether the sub-period starts in a leap year.
- **Compound interest** per sub-period: `A = P × (1 + R)^(days / yearDays)`, then `I = A − P`.
- **Day count** is real-calendar (leap-year aware), inclusive of both endpoints.
- **Daily apply** — interest for day *D* compounds into the balance at the end of day *D*; same-day transactions are applied **before** that day’s interest.
- **Monthly / biannual / annual apply** — interest accrues; on the apply boundary (end of month 1, end of month 6, end of month 12, …) the accrued interest is added to the principal.
- **Mid-term Fund In / Fund Out** — splits the current month into sub-periods at each transaction date. Interest is computed per sub-period on the balance in effect during that sub-period. Withdrawals are floored at zero (cannot make the balance negative).
- **All money math** uses `decimal.js` with 50-digit precision and `ROUND_HALF_UP`. No native `Number` arithmetic for amounts.

### 5.3 Outputs
- **Summary cards** — deposit amount, total days, total interest, accrued (not-yet-applied) interest when > 0, and final amount.
- **Tier breakdown table** — one row per tier with the range, rate, balance in tier, and interest earned.
- **Monthly apply table** — one row per month with days, balance, interest for the month, accrued, cumulative interest, applied/pending status, plus interleaved Fund In / Fund Out rows showing before/after balance.
- **Daily detail table(s)** — grouped by month, one row per day showing the daily interest in each tier, plus a per-tier monthly subtotal and a month grand total. Same-day transactions appear as their own row above the day’s interest row.

### 5.4 Shareable link
- After a successful calculation, a **Copy share link** button appears.
- Clicking it writes a URL of the form `https://<host>/<path>#cfg=<base64(JSON)>` to the clipboard, encoding all current inputs.
- The button briefly shows *✓ Link copied!* for 2 seconds.
- Opening such a link re-hydrates the form, re-renders the tier and transaction tables, and **auto-calculates** on page load.
- The clipboard write is best-effort; if the browser blocks the API, the user still sees the success indicator.

### 5.5 Validation
- Deposit amount must be > 0.
- Start date and end date required; end > start.
- Each tier must have a non-empty `min` and `rate ≥ 0`.
- Each transaction must have a date inside `[startDate, endDate]` and an amount > 0.
- All errors are surfaced inline next to the offending field and a top-level error message in the relevant section.

## 6. Non-functional requirements

| Area | Requirement |
|---|---|
| **Precision** | All monetary computation in 50-digit decimal arithmetic; no floating-point drift |
| **Performance** | Sub-second calculation for terms up to 10 years with up to ~50 mid-term transactions |
| **Privacy** | Zero network calls during input or calculation. Only the share-link click triggers a clipboard write |
| **Accessibility** | Labels on every input, native `<input type="date">`, error messages tied to fields via `id` |
| **Browser support** | Modern evergreen browsers (ES2020+); module scripts only |
| **Deployment** | Static build to `dist/`, published to GitHub Pages on push to `main` |
| **Availability** | Served via GitHub Pages — no SLA, but a public CDN-backed static site |

## 7. UX flow

1. **Open the app** — the form loads with default tiers (0–1M @ 2%, 1M–2M @ 1.5%, 2M+ @ 0.5%), today’s date, and one year later.
2. **Enter deposit details** — amount, start/end dates, interest type, apply schedule.
3. **Edit the tier table** — add, remove, or change brackets to match the bank’s published rates. Removing a bracket requires keeping at least one.
4. **Add mid-term transactions** — Fund In or Fund Out with date and amount. Each shows in the result as its own row.
5. **Click Calculate** — scroll smoothly to the results section.
6. **Inspect the results** — summary → tier table → monthly table → daily tables.
7. **(Optional) Copy share link** — send the URL to a partner or bank officer. They see the same numbers.

## 8. Out-of-scope / future ideas

- **Withholding tax** deduction at source.
- **Variable rates** that change mid-term (rate-reset events).
- **Export** to PDF or Excel.
- **Multi-currency** (USD, JPY, etc.).
- **Account login** and saved scenarios.
- **Bank rate feed** integration for live tier tables.
- **Comparison mode** — two scenarios side by side.

## 9. Acceptance criteria (current build)

- [x] User can set deposit amount, dates, interest type, and apply schedule.
- [x] User can add/remove tier brackets and Fund In/Out rows.
- [x] Calculator returns correct simple and compound interest with tiered rates and mid-term transactions.
- [x] All four apply schedules (daily, monthly, biannually, annually) produce internally consistent totals.
- [x] Summary, tier breakdown, monthly table, and daily detail tables all render with real numbers.
- [x] Validation errors block calculation and are visible to the user.
- [x] Daily detail table shows per-day interest in every tier, plus a per-tier monthly subtotal and a month grand total.
- [x] Copy share link produces a URL that, when opened, re-hydrates the form and auto-calculates.
- [x] No network calls during calculation.
- [x] App is live at https://ohmrefresh.github.io/deposit-interest/.

## 10. Glossary

| Term | Meaning |
|---|---|
| **Tier** | A balance bracket with its own interest rate (e.g. 0–1M @ 2%) |
| **Fund In** | An additional deposit made during the term (ฝากเพิ่ม) |
| **Fund Out** | A withdrawal made during the term (ถอน) |
| **Apply** | The moment accrued interest is added to the principal and starts earning interest itself |
| **Accrued interest** | Interest earned but not yet applied (e.g. on a monthly-apply account mid-month) |
| **Sub-period** | A span of days between two consecutive breakpoints: month start, transaction date, or next month start |
