# Product

## Register

product

## Users

Thai-speaking individuals and small-business operators who manage term deposits at one or more
Thai banks and want to verify what their interest will actually be. They are not professional
quants, but they understand baht, percentage points, and the difference between simple and
compound interest. They often need to model "what if I top up on this date" or "what if rates
change at the new bracket" without having to call the bank. They arrive with a concrete deposit
scenario in mind and expect to enter it, see the answer, and leave with a shareable link they can
send to a partner or advisor.

The app runs entirely client-side and is hosted on GitHub Pages; users land on it from a chat
message, a search result, or a link someone shared.

## Product Purpose

A precise, fast, single-page calculator that computes Thai baht deposit interest across tiered
rate brackets, with support for daily/monthly/biannual/annual apply schedules and mid-term
deposits/withdrawals. Success looks like:

- A user enters a scenario, hits calculate, and trusts the number to the satang.
- A user can share a scenario as a URL and the recipient sees the exact same numbers without
  signing up or installing anything.
- The math stays correct when the user pushes it: 10 tiers, 20 transactions, 5-year terms, leap
  years.

It is not a marketing surface, not a product tour, not a feature comparison. The page exists to
do one job and be visibly correct while doing it.

## Brand Personality

**Precise. Trustworthy. Clear.**

The page reads like a well-set accounting worksheet, not a fintech brochure. Numbers are
prominent, terminology is in Thai without translation decoration, and every visual choice is in
service of legibility. There is no warmth theater and no cleverness for its own sake.

Voice in the UI: direct Thai, present-tense, second-person where it appears at all. No emojis
as data, no playful metaphors. A few emoji are used as cheap category icons in section headers
and transaction rows only because that is the existing convention; this is not a license to keep
adding them.

## Anti-references

Three lanes to actively avoid:

- **SaaS / playful / gradient-heavy.** No glassmorphism, no gradient-clipped headline text, no
  rainbow accent palette, no oversized emoji, no "supercharge your savings" copy. The page is
  a tool, not a launch.
- **Legacy bank-stiff.** No dense chrome, no 12px gray-on-gray table grids, no corporate navy
  branding, no corporate-stock-photo hero. Modern enough to feel current, calm enough to feel
  permanent.
- **Overdesigned / startup-pitch.** No testimonial blocks, no "trusted by N savers" counter, no
  feature comparison grid, no pricing, no customer logos, no founder headshot. The deposit
  inputs and the resulting number are the product.

## Design Principles

1. **Numbers first.** The result cards and the breakdown tables are the primary content. Form
   chrome, headers, and decoration exist to support them, never the other way around.
2. **Quiet confidence.** A restrained palette (committed sky/blue brand color + white surface +
   near-black ink) and a single sans-serif family. No competing accents, no decorative
   gradients, no animated flourishes on first load.
3. **Show the work.** The per-tier breakdown, the per-month apply table, and the day-by-day
   table all exist so a user can verify the total, not just trust it. Scaffolding earns its
   pixels by being auditable.
4. **Domestic clarity.** Thai language, baht units, Buddhist-era awareness in date pickers, and
   `th-TH` number formatting are first-class, not bolted on. No English fallback in the primary
   flow.
5. **Share-as-state, not screenshot.** Every meaningful input is encoded in the URL so the
   result is reproducible from a single link. Visual polish on the result is secondary to
   sharability.

## Accessibility & Inclusion

Target: **WCAG 2.1 AA** as a floor, not a ceiling.

- 4.5:1 contrast for body text; 3:1 for large text and meaningful non-text elements.
- Every form field has a visible label (no placeholder-only labels).
- Errors are announced next to the field and are screen-reader-friendly.
- Keyboard navigation must reach every interactive element; focus indicators must be visible.
- Tables for the breakdown need proper `<th scope>` semantics; the day-by-day table needs
  captioning.
- Respect `prefers-reduced-motion` for any non-essential animation.
- Thai-script rendering tested on at least one common Thai font stack; numbers must not break
  across lines.
