import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'http://127.0.0.1:4173/deposit-interest/'
const OUT = 'doc/images'
mkdirSync(OUT, { recursive: true })

// Wide-amount layout regression for the results section.
// Fixture: 100,000,000,000 baht at 2.5% (override tier 3 rate) for 1 year.
// Resulting interest is ~2.5 billion baht (12 digits) — every summary
// card (deposit, interest, final) has 12+ digits, so each gets
// `result-card--wide` and breaks out of the auto-fit grid.
// Spec: docs/superpowers/specs/2026-06-05-results-large-amount-redesign-design.md

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.fill('#depositAmount', '100000000000')
await page.fill('input[data-field="rate"][data-index="2"]', '2.5')
await page.fill('input[data-field="min"][data-index="2"]', '0.00')
await page.fill('input[data-field="max"][data-index="2"]', '')
await page.fill('#startDate', '2026-01-01')
await page.fill('#endDate', '2026-12-31')
await page.click('#calculateBtn')
await page.waitForSelector('#results.show')
await page.waitForTimeout(400)
await page.evaluate(() => document.getElementById('results').scrollIntoView({ block: 'start' }))
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/screenshot-results-wide-desktop.png`, fullPage: false })
console.log('✓ wide results (1280x900)')

// Same fixture at mobile width — wide-card value drops to 18px and
// the layout switches to column (label above value) so the longest
// value fits without clipping.
await page.setViewportSize({ width: 390, height: 844 })
await page.evaluate(() => document.getElementById('results').scrollIntoView({ block: 'start' }))
await page.waitForTimeout(200)
await page.screenshot({ path: `${OUT}/screenshot-results-wide-mobile.png`, fullPage: false })
console.log('✓ wide results mobile (390x844)')

await browser.close()
