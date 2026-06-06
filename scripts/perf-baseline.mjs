import { chromium } from 'playwright'

const URL = 'http://localhost:4173/deposit-interest/'
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 900 })

// ---------- Load ----------
const t0 = Date.now()
await page.goto(URL, { waitUntil: 'networkidle' })
const loadMs = Date.now() - t0
console.log(`load: ${loadMs}ms`)

// ---------- 1st calculate (disclosure closed by default) ----------
await page.fill('#depositAmount', '1500000')
await page.fill('#startDate', '2026-01-01')
await page.fill('#endDate', '2026-12-31')
const t1 = Date.now()
await page.click('#calculateBtn')
await page.waitForSelector('#results.show')
// The day-by-day table is NOT built on first calculate because the
// disclosure is closed. Verify it's not in the DOM yet.
const dailyBuiltOnFirstCalc = await page.evaluate(
  () => document.querySelectorAll('#dailyDetailContent tbody tr').length,
)
const firstCalcMs = Date.now() - t1
console.log(`1st calculate (disclosure closed): ${firstCalcMs}ms, daily rows in DOM: ${dailyBuiltOnFirstCalc}`)

// ---------- Live recompute (disclosure still closed → should be fast) ----------
const beforeTotal = await page.textContent('.result-card.highlight .value')
const t2 = Date.now()
await page.fill('input[data-field="rate"][data-index="0"]', '2.50')
await page.waitForFunction(
  (prev) => {
    const el = document.querySelector('.result-card.highlight .value')
    return el && el.textContent !== prev
  },
  beforeTotal,
  { timeout: 5000 },
)
const recomputeMs = Date.now() - t2
console.log(`live recompute (closed): ${recomputeMs}ms`)

// ---------- Open the disclosure → builds on first open ----------
const t3 = Date.now()
await page.click('#dailyDetails > summary')
await page.waitForFunction(
  () => document.querySelectorAll('#dailyDetailContent tbody tr').length > 100,
  { timeout: 10000 },
)
const openBuildMs = Date.now() - t3
const dailyRowCount = await page.evaluate(
  () => document.querySelectorAll('#dailyDetailContent tbody tr').length,
)
console.log(`1st open (1yr): ${openBuildMs}ms, daily rows: ${dailyRowCount}`)

// ---------- Live recompute while disclosure is open ----------
const t4 = Date.now()
const prevHigh = await page.textContent('.result-card.highlight .value')
await page.fill('input[data-field="rate"][data-index="0"]', '2.10')
await page.waitForFunction(
  (prev) => {
    const el = document.querySelector('.result-card.highlight .value')
    return el && el.textContent !== prev
  },
  prevHigh,
  { timeout: 5000 },
)
const openRecomputeMs = Date.now() - t4
console.log(`live recompute (open): ${openRecomputeMs}ms`)

// ---------- 5-year term stress test ----------
const t5 = Date.now()
await page.fill('#endDate', '2030-12-31')
// Wait for the rebuild triggered by the live recompute
await page.waitForFunction(
  () => document.querySelectorAll('#dailyDetailContent tbody tr').length > 700,
  { timeout: 15000 },
)
const longTermMs = Date.now() - t5
const longRowCount = await page.evaluate(
  () => document.querySelectorAll('#dailyDetailContent tbody tr').length,
)
console.log(`5yr rebuild: ${longTermMs}ms, daily rows: ${longRowCount}`)

// ---------- 5yr live recompute (the original worst case) ----------
const t6 = Date.now()
const prevHigh5 = await page.textContent('.result-card.highlight .value')
await page.fill('input[data-field="rate"][data-index="0"]', '2.20')
await page.waitForFunction(
  (prev) => {
    const el = document.querySelector('.result-card.highlight .value')
    return el && el.textContent !== prev
  },
  prevHigh5,
  { timeout: 5000 },
)
const longRecomputeMs = Date.now() - t6
console.log(`5yr live recompute: ${longRecomputeMs}ms`)

// ---------- DOM size ----------
const dom = await page.evaluate(() => {
  return {
    docSize: document.documentElement.outerHTML.length,
    rowCount: document.querySelectorAll('#dailyDetailContent tbody tr').length,
  }
})
console.log(`DOM: ${dom.docSize} bytes, ${dom.rowCount} daily rows`)

await browser.close()
