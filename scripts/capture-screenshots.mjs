import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const URL = 'https://ohmrefresh.github.io/interest/'
mkdirSync('doc/images', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto(URL, { waitUntil: 'networkidle' })

await page.screenshot({ path: 'doc/images/screenshot-form.png', fullPage: false })
console.log('✓ screenshot-form.png')

await page.fill('#depositAmount', '1500000')
await page.fill('#startDate', '2026-01-01')
await page.fill('#endDate', '2026-12-31')
await page.selectOption('#interestType', 'simple')
await page.selectOption('#interestApply', 'monthly')
await page.click('#calculateBtn')
await page.waitForSelector('#results.show')
await page.evaluate(() => window.scrollTo(0, 0))
await page.screenshot({ path: 'doc/images/screenshot-results.png', fullPage: false })
console.log('✓ screenshot-results.png')

await browser.close()
