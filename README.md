# คำนวณดอกเบี้ยเงินฝาก — Tiered Deposit Interest Calculator

A Thai-language web app that calculates deposit interest using **tiered interest rates**, with
full monthly and per-day breakdowns and support for mid-term deposits/withdrawals (Fund In / Fund
Out). Built with Vite + TypeScript and deployed to GitHub Pages.

**Live:** https://ohmrefresh.github.io/interest/

## Features

- **Tiered interest rates** — define any number of balance brackets, each with its own rate
  (e.g. 0–1M @ 2%, 1M–2M @ 1.5%, 2M+ @ 0.5%).
- **Two interest models** — simple interest and yearly compound interest.
- **Flexible apply schedule** — daily, monthly, biannually, or annually.
- **Fund In / Fund Out** — add deposits or withdrawals at any date during the term; interest
  recomputes per sub-period around each transaction.
- **Detailed output** — summary cards, per-tier breakdown, a per-month apply table, and an
  expandable day-by-day, tier-by-tier interest table.
- **High precision** — all money math uses [decimal.js](https://github.com/MikeMcl/decimal.js)
  (50-digit precision, `ROUND_HALF_UP`); real-calendar day counts with leap-year handling.

## Tech stack

| | |
|---|---|
| Bundler | [Vite](https://vite.dev) 6 |
| Language | TypeScript 5 (strict) |
| Math | decimal.js |
| Hosting | GitHub Pages (`gh-pages` branch) |
| CI/CD | GitHub Actions |

## Getting started

Requires Node.js 18+ (CI uses 20).

```bash
npm install      # install dependencies
npm run dev      # start the dev server (HMR)
```

### Scripts

| Script | Action |
|---|---|
| `npm run dev` | Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc`) then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only, no emit |

The `build` script is **type-gated**: `tsc` runs first and a build fails on any type error.

## Project structure

```
.
├── index.html              # App entry (Vite root); loads /src/main.ts
├── src/
│   ├── main.ts             # All app logic: state, math, rendering, event wiring
│   ├── style.css           # Styles
│   └── vite-env.d.ts       # Vite client type reference
├── vite.config.ts          # base: '/interest/' for GitHub Pages
├── tsconfig.json           # strict, modern browser target
├── .github/workflows/
│   └── deploy.yml          # Build + publish dist/ to gh-pages on push to main
└── doc/index.html          # Original single-file prototype (reference only, not built)
```

`src/main.ts` uses event delegation (no inline `on*` handlers, nothing attached to `window`), so
the calculator works correctly as an ES module under Vite.

## Deployment

Every push to `main` triggers `.github/workflows/deploy.yml`, which builds the app and publishes
`dist/` to the `gh-pages` branch via
[`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages). GitHub Pages serves
that branch at https://ohmrefresh.github.io/interest/.

> **Base path:** `vite.config.ts` sets `base: '/interest/'` so assets resolve under the project
> sub-path. If the repository is renamed, update this value to match.

### First-time Pages setup

Pages is already enabled for this repo (source: `gh-pages` branch, `/` root). For a fresh fork:
push to `main`, let the workflow create the `gh-pages` branch, then enable Pages under
**Settings → Pages → Deploy from a branch → `gh-pages` / `(root)`**.

## License

No license specified.
