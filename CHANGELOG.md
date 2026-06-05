# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-06-05

Initial Vite + TypeScript scaffold and deployment of the tiered deposit interest calculator.

### Added

- Vite 6 + TypeScript 5 (strict) project scaffold with type-gated build (`tsc && vite build`).
- `src/main.ts` — the full calculator ported to a typed ES module: tiered rate splitting, simple
  and yearly-compound interest, daily/monthly/biannual/annual apply schedules, mid-term Fund In /
  Fund Out handling, and summary / per-tier / per-month / per-day result tables.
- `src/style.css` — styles extracted from the original prototype.
- GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds and publishes `dist/` to the
  `gh-pages` branch on every push to `main`.
- GitHub Pages deployment at https://ohmrefresh.github.io/interest/ (`base: '/interest/'`).
- `README.md` and this changelog.

### Changed

- Migrated the original single-file `doc/index.html` prototype into the Vite structure: markup
  moved to a root `index.html`, logic to `src/main.ts`, styles to `src/style.css`.
- Replaced inline `onclick`/`onchange`/`onblur` handlers with `addEventListener` and event
  delegation; no functions are exposed on `window` (required for correct behavior as an ES module).
- Replaced the decimal.js CDN `<script>` with the `decimal.js` npm dependency.

### Removed

- Dead helper functions `formatTHB` and `formatRate` (defined but never used).

### Notes

- `doc/index.html` is retained unchanged as the reference prototype; it is not part of the build.
- Calculation output verified identical to the original prototype across daily and monthly apply
  modes (e.g. 1,500,000 ฿ over one year: daily 27,706.71 ฿, monthly 29,678.33 ฿).

[Unreleased]: https://github.com/ohmrefresh/interest/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ohmrefresh/interest/releases/tag/v0.1.0
