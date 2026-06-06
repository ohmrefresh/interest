# Redesign: ผลการคำนวณ section for very large amounts

**Date:** 2026-06-05
**Branch:** feature/harden
**Status:** Approved — implementation in progress

---

## Context

The Thai tiered deposit interest calculator renders summary cards (จำนวนเงินฝาก, ดอกเบี้ยทั้งหมด, ยอดรวมทั้งสิ้น, plus optional ดอกเบี้ยค้างจ่าย) in an auto-fit grid with `minmax(220px, 1fr)`. A recent polish pass changed the value display from `word-break: break-word` to `white-space: nowrap` with `font-variant-numeric: tabular-nums` so baht totals stay on a single line and digits align across cards.

The polish pass's CHANGELOG note (`CHANGELOG.md:41-48`) explicitly justifies this:

> "The grid track grows to fit the widest value, which is fine — the longest result is the headline number anyway."

That assumption breaks at large amounts. The deposit input has no `max` attribute (`index.html:28-29`), validation only checks `> 0` (`main.ts:307-312`), and the formatter (`formatNumber()` at `main.ts:288-292`) is a pure function of the input digits. A user typing `1,000,000,000,000.00` for the deposit produces interest values that exceed the 220px card width at the 30px (regular) and 36px (highlight) font sizes — pushing the grid track wider and squeezing the rest of the row out of shape.

**Goal:** when any individual card's value would overflow its grid track, that specific card breaks out to a full-width row. Layout stays clean at any input size, from `1,000,000` (7 digits) to a 15-digit institutional deposit.

---

## Design

### Visual decisions (confirmed via 5-round visual brainstorming, 2026-06-05)

1. **Layout transform:** switch from auto-fit grid cell to a full-width row, label-left + value-right with `flex-wrap: wrap`.
2. **Highlight card treatment:** "inline row, sky accent" — white background, `var(--sky-700)` border, sky-700 value text (replaces the current dark ink hero). User-confirmed; this is a small visible departure from the existing look.
3. **Trigger rule:** per-card judgment. If any single card's value (after formatting) has more than 11 digits, that card gets the modifier class. Other cards stay in the grid.
4. **Mobile font sizing:** two-tier breakpoint at 640px. Wide-card value renders at 28px above 640px, 22px below. Slots into the existing `@media (max-width: 640px)` block.
5. **Detection method:** digit-count check on the formatted string. `formatted.replace(/\D/g, '').length > 11`. Determined by implementation approach A from the round-3 question.

### CSS changes (`src/style.css`)

Add a modifier class + one 640px breakpoint line, near the existing `.result-card` block (`style.css:498-525`):

```css
.result-card--wide {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
}
.result-card--wide .value { font-size: 28px; }
.result-card--wide.highlight .value { color: var(--sky-700); }

@media (max-width: 640px) {
  .result-card--wide .value { font-size: 22px; }
}
```

- The modifier uses `grid-column: 1 / -1` to span the full width of the auto-fit grid (which stays in place for non-wide cards).
- The highlight card's color shifts from the current dark `var(--ink)` background to sky-700 text on white. The `.highlight--warning` variant (accrued interest) keeps its warning color and is also eligible for `--wide` (uses the same `grid-column: 1 / -1` rule).
- The 28px→22px breakpoint at 640px keeps a 13-digit value on one line at 320px viewport. Pairs with the existing form-layout breakpoint at `style.css:181,272,331,468`.
- Include a 60ms `ease` transition on `grid-column` and `font-size` to smooth the layout jump on live recompute. Uses the existing `--ease-out-quart` token.

### TypeScript changes (`src/main.ts`)

Add a small helper next to `formatNumber()` at `main.ts:288-292`:

```ts
const shouldRenderWide = (formatted: string): boolean =>
  formatted.replace(/\D/g, '').length > 11;
```

In `displayResults()` at `main.ts:754-783`, evaluate `shouldRenderWide` on each formatted value, then build the class string with a `cardClass` helper:

```ts
const cardClass = (base: string, wide: boolean) =>
  wide ? `${base} result-card--wide` : base;

// Example for the interest card:
const interestStr = formatNumber(totalInterest);
const interestWide = shouldRenderWide(interestStr);
const interestClass = cardClass('result-card highlight', interestWide);
```

Apply to all four summary cards: จำนวนเงินฝาก, จำนวนวันทั้งหมด, ดอกเบี้ยทั้งหมด, ดอกเบี้ยค้างจ่าย (if rendered), ยอดรวมทั้งสิ้น.

The existing `style="--i: N"` stagger index is unchanged. The `data-reveal="1"` animation at `main.ts:748,750` still fires — wide cards animate in at their `--i` slot, just spanning full width.

### What stays the same

- Auto-fit grid: `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` at `style.css:493`.
- `formatNumber()` formatter: Decimal.js + comma regex.
- `aria-live="polite" aria-atomic="true"` on `#results` at `index.html:89`.
- `tabular-nums` and `white-space: nowrap` on `.value`.
- Day-by-day table overflow handling (`.daily-month-body` already `overflow-x: auto`).
- Tier breakdown + monthly breakdown tables (already inside `.table-scroll` with `overflow-x: auto`).
- Validation: still `parseFloat > 0`, no upper bound.
- Currency: hard-coded `฿` (U+0E3F) at the end of each value.
- The 220px minimum grid track (no need to touch; wide modifier works alongside it).

### Edge cases

- **Accrued-interest card** (`.highlight--warning`, `main.ts:769-775`): same `shouldRenderWide` check; warning color preserved.
- **Empty/zero accrued**: `accrued > 0` guard already in place; the wide check only runs when the card renders.
- **Thai baht sign `฿`**: stripped by `\D` regex, no false digit count.
- **Live recompute**: `displayResults()` rebuilds `#resultSummary` innerHTML on every call; wide class re-evaluates each recompute. A value crossing 12 digits cleanly transitions grid → full-width on the next render.
- **Stagger animation**: index-based via `--i`, layout-independent; a wide card animates in at its slot, just spanning the row instead of a 220px cell.
- **Day-by-day disclosure**: not affected. The disclosure gate + build logic + `.daily-month-body` overflow-x are untouched.
- **Mobile existing behavior**: at 320px the auto-fit grid already collapses to 1 column (`minmax(220px, 1fr)` falls below the 220px min in a 320px container). The full-width modifier just guarantees long values never get squeezed in that single column.

---

## Critical files

- `src/style.css` — add `.result-card--wide` block (≈10 lines) + one line inside the existing `@media (max-width: 640px)` block.
- `src/main.ts` — add `shouldRenderWide` helper at `main.ts:288`; update class string assembly in `displayResults()` at `main.ts:754-783` (≈10 lines touched).
- `scripts/screenshot-polish.mjs` — extend with two new screenshot cases (desktop wide + mobile wide) and a fixture that produces 13-digit interest.

No HTML change, no new dependencies, no new files.

---

## Verification

### Build
- `npm run build` must pass.
- `npx tsc --noEmit` must pass — new helper + new variable usage typecheck cleanly.

### Screenshot regression

Extend `scripts/screenshot-polish.mjs` with:
- `screenshot-results-wide-desktop.png` — fixture: `deposit=100000000000, rate=2.5, term=1y, apply=monthly`. At 2.5% annual on 100B baht × 1 year, monthly-compounded interest ≈ 2,531,000,000,000.00 ฿ (13 digits). Captures all 3 wide cards simultaneously. 1280×900.
- `screenshot-results-wide-mobile.png` — same fixture at 390×844.

Existing small-fixture screenshots (`screenshot-results.png`, `screenshot-results-settled.png`, `screenshot-stagger-mid.png`, `screenshot-recompute.png`) remain valid — values under 12 digits still render in the grid with no class.

### Manual smoke

At `npm run preview` (http://127.0.0.1:4173/deposit-interest/):
- Small amount (1,000,000) — no wide class, identical to current screenshots.
- Threshold cross (999,999,999 → 1,000,000,000) — ยอดรวมทั้งสิ้น card pops to full-width.
- 13-digit interest — ดอกเบี้ยทั้งหมด + ยอดรวมทั้งสิ้น both wide, จำนวนเงินฝาก stays in grid.
- Live recompute: edit deposit from 7 → 12 digits, observe transition (no flicker if CSS transition is in).
- Mobile 320px: wide-card value drops from 28px → 22px, stays on one line.

### Accessibility
- Tab order unchanged (DOM order preserved).
- `aria-live="polite" aria-atomic="true"` re-announces the full region on every update; text content identical regardless of wide class.
- Screen reader text (e.g., "ดอกเบี้ยทั้งหมด 2,500,000,000.00 บาท") unchanged.
- No new focus traps, no new keyboard interactions.

### Rollback

Single PR. If the wide modifier causes issues, revert the commit — all changes are isolated to `src/style.css` and `src/main.ts`. No HTML change, no new dependencies, no migration.

---

## Out of scope (YAGNI)

- **Compact notation (K/M/B)**: user explicitly rejected in round 1 (option B from overflow-options). Full precision preserved at all times.
- **Manual "show full" / compact toggle**: no UX request for it.
- **Input `max` attribute**: deposits are a real product; institutional amounts are legitimate. Layout handles any size.
- **Day-by-day table changes**: already overflow-safe via `.daily-month-body { overflow-x: auto }` at `style.css:790-791`.
- **Tier/monthly table changes**: already inside `.table-scroll { overflow-x: auto }` at `style.css:591-628`.
- **Animation rework**: stagger index + `data-reveal` work unchanged for wide cards.
- **Token additions**: no new design tokens. Uses existing `--sky-700`, `--radius-md`, `--shadow-sm`, `--space-*` (all already defined at `style.css:39-83`).

---

## Open questions

None — all design decisions confirmed in brainstorming (2026-06-05, 5 visual rounds + 1 implementation approach selection).

---

## Implementation sequence

1. Add `shouldRenderWide` helper in `src/main.ts` (line 288).
2. Update `displayResults()` card-class assembly (lines 754-783).
3. Add `.result-card--wide` CSS block to `src/style.css` (near line 525).
4. Add the 640px breakpoint line inside the existing `@media` block in `src/style.css`.
5. Add fixture + two new screenshot cases to `scripts/screenshot-polish.mjs`.
6. Run `npm run build` and `npx tsc --noEmit`.
7. Run all four screenshot scripts; visually compare wide + small fixtures.
8. Manual smoke at preview URL.
9. CHANGELOG entry under a new "Results wide-amount layout" heading.
10. Commit + push branch.
