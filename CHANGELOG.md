# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-06-05

### Added
- Share config via link: "แชร์ค่านี้" button in the header (and a matching copy in the
  results section) encodes full calculator state (deposit, dates, interest type/apply,
  tiers, transactions) as base64 JSON in the URL hash (`#cfg=…`). Opening a shared link
  pre-fills the form and auto-calculates.
- "ล้างค่า" (Reset) button next to Calculate, with a 3-second inline-confirm window
  ("ล้างค่าทั้งหมด? (คลิกอีกครั้ง)" with destructive red treatment) so an accidental click
  can't wipe a long session.

### Changed
- Layout pass: spacing scale (4pt), type scale (1.2 ratio), and color tokens centralized as
  CSS custom properties in `src/style.css`. Body is now flat off-white; the sky gradient is
  reserved for the header band. Result-card "highlight" emphasis now uses weight + scale
  (ink fill, white text, extra-bold) rather than color tint. Thai-first font stack
  (`Sarabun` / `Noto Sans Thai` / system). Visible focus ring (3px sky-300 outline) and a
  `prefers-reduced-motion` block were added. All inputs, buttons, and table headers now sit
  on 1px hairline rules instead of 2px borders.
- Copy pass: "การ Apply ดอกเบี้ย" label renamed to "รอบการจ่ายดอกเบี้ย"; accrued-interest
  card label simplified to "ดอกเบี้ยค้างจ่าย"; monthly-breakdown status column now reads
  "✓ นำเข้าแล้ว" / "รอนำเข้า" (was "✓ Applied" / "รอ Apply"); transactions empty state
  reads "ยังไม่มีรายการฝาก/ถอน กดปุ่มด้านล่างเพื่อเพิ่ม" (was "—" separator). Deposit-amount
  error gained a concrete example ("เช่น 100,000 บาท"). Both share buttons now share the
  same "แชร์ค่านี้" idle label.
- Motion pass: live recompute (250ms debounce) on any form input after the first
  Calculate; the Calculate button label flips to "🔄 คำนวณอีกครั้ง" while in recalc
  mode. Result cards reveal with a 60ms-staggered fade-and-rise (320ms, ease-out-quart)
  on the first show only; live recompute updates values in place without re-firing the
  entrance. Validation errors trigger a brief 180ms input-shake. Tier and transaction
  listeners moved from `change` to `input` so state updates on each keystroke and the
  live recompute sees the latest value. All motion is bounded by an explicit
  `prefers-reduced-motion: reduce` block.
- Polish pass: focus ring on form-group and tier-item inputs bumped from `--sky-100`
  to `--sky-300` (the same color as the universal `:focus-visible` outline) so the
  ring is visible on white. Error-state focus ring opacity raised from 0.12 to 0.35.
  Result-card `.value` switched from `word-break: break-word` to `white-space: nowrap`
  with `font-variant-numeric: tabular-nums` so baht totals stay on a single line
  and digits align across cards. Empty-transactions message moved from inline
  `color:#999` to a token-driven `.empty-state` class (ink-4). Added
  `<meta name="description">` to `index.html` for shared-link previews.
- Harden pass (a11y + edge cases):
  - All `<th>` in the three result tables now have `scope="col"`; each table
    has a visually-hidden `<caption>` describing its content.
  - Dynamic tier and transaction rows: the `.tier-label` divs are real
    `<label for="tier-i-field">` elements with matching input IDs, so screen
    readers announce the field name when each control is focused.
  - The transaction `<select>` and per-row "ลบ" buttons have explicit
    `aria-label`s with the row index for unambiguous announcement.
  - Top-level inputs carry `aria-describedby` pointing at their error div;
    `aria-invalid="true"` is set on submit when the field fails validation,
    and both are cleared on the next submit. All 5 `.error` divs are
    `role="alert"` so they're announced when they appear.
  - `#results` is a polite live region (`aria-live="polite"`,
    `aria-atomic="true"`) so SR users hear when a calculation completes.
  - `Reset` now also restores `interestType` to `simple` and `interestApply`
    to `daily` (the HTML defaults); previously only the form values were
    cleared.
  - Validation rejects non-numeric deposit amounts (e.g. "abc") via
    `isNaN` checks on deposit, tier rate, and transaction amount.
  - Clipboard writes fall back to `document.execCommand('copy')` for
    non-HTTPS origins and denied permissions; if both paths fail, the
    share button shows an amber "⚠ คัดลอกไม่สำเร็จ (เลือก URL แล้วกด
    Ctrl+C)" warning instead of the misleading green success.
- Optimize pass: the day-by-day table (up to 1,945 rows on a 5-year term)
  is now behind a `<details>` disclosure, collapsed by default. First
  calculate dropped from 97ms → 51ms; 5-year live recompute dropped from
  382ms → 281ms (no daily table rebuild until the user opens the
  disclosure). On first open, the build is cached by an inputs
  fingerprint — subsequent opens are instant unless an input changes.
  Terms longer than a year show a "กำลังสร้างตารางรายวัน…" skeleton
  with a one-frame `requestAnimationFrame` defer; short terms skip the
  defer since the build fits in one frame anyway. The daily table's ~30
  inline `style="…"` attributes were replaced with class modifiers
  (`.tx-row`, `.tier-header`, `.monthly-totals`, `.monthly-grand-total`,
  `.day-cell--empty`) for token-driven theming.

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
