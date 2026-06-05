import Decimal from 'decimal.js'
import './style.css'

// ใช้ Decimal.js สำหรับความแม่นยำสูง
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP })

// ---------- Types ----------
interface Tier {
  min: string
  max: string
  rate: string
}

interface Transaction {
  date: string
  type: 'in' | 'out'
  amount: string
}

interface TierSlice {
  min: string
  max: string
  rate: string
  amount: string
}

interface TierResult {
  min: string
  max: string
  rate: string
  amount: string
  interest: string
}

interface TxEvent {
  date: string
  type: 'in' | 'out'
  amount: string
  balanceBefore: string
  balanceAfter: string
}

interface BreakdownRow {
  date: string
  days: number
  balance: string
  interest: string
  cumulative: string
  accrued: string
  applied: boolean
  appliedAmount?: string
  transactions: TxEvent[]
}

interface MonthInfo {
  monthStart: Date
  monthEnd: Date
  displayMonth: string
}

interface CalcResult {
  totalInterest: string
  finalAmount: string
  accruedInterest: string
  breakdown: BreakdownRow[]
}

// ---------- DOM helper ----------
function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id)
  if (!node) throw new Error(`#${id} not found`)
  return node as T
}

// ---------- State ----------
// ข้อมูลชั้นอัตราดอกเบี้ยเริ่มต้น
let tiers: Tier[] = [
  { min: '0.00', max: '1000000.00', rate: '2.00' },
  { min: '1000000.01', max: '2000000.00', rate: '1.50' },
  { min: '2000000.01', max: '', rate: '0.50' },
]

// รายการฝาก/ถอนเพิ่มเติม
let transactions: Transaction[] = []

// เริ่มต้นแอปพลิเคชัน
function init(): void {
  renderTiers()
  renderTransactions()
  setDefaultDates()
}

// ตั้งค่าวันที่เริ่มต้น
function setDefaultDates(): void {
  const today = new Date()
  const oneYearLater = new Date(today)
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)

  byId<HTMLInputElement>('startDate').value = toLocalDateString(today)
  byId<HTMLInputElement>('endDate').value = toLocalDateString(oneYearLater)
}

// แสดงชั้นอัตราดอกเบี้ย
function renderTiers(): void {
  const container = byId('tiersContainer')
  container.innerHTML = ''

  tiers.forEach((tier, index) => {
    const tierDiv = document.createElement('div')
    tierDiv.className = 'tier-container'
    tierDiv.innerHTML = `
      <div class="tier-item">
          <div>
              <div class="tier-label">จำนวนเงินขั้นต่ำ (บาท)</div>
              <input type="text"
                     value="${formatNumber(tier.min)}"
                     inputmode="decimal"
                     placeholder="0.00"
                     data-index="${index}" data-field="min" data-format="comma">
          </div>
          <div>
              <div class="tier-label">จำนวนเงินสูงสุด (บาท)</div>
              <input type="text"
                     value="${tier.max ? formatNumber(tier.max) : ''}"
                     inputmode="decimal"
                     placeholder="ไม่จำกัด"
                     data-index="${index}" data-field="max" data-format="comma">
          </div>
          <div>
              <div class="tier-label">อัตราดอกเบี้ย (% ต่อปี)</div>
              <input type="text"
                     value="${tier.rate}"
                     inputmode="decimal"
                     placeholder="0.00"
                     data-index="${index}" data-field="rate">
          </div>
          <div>
              ${tiers.length > 1 ? `<button class="btn btn-danger" data-action="removeTier" data-index="${index}">ลบ</button>` : ''}
          </div>
      </div>
    `
    container.appendChild(tierDiv)
  })
}

// อัพเดทชั้นอัตราดอกเบี้ย
function updateTier(index: number, field: keyof Tier, value: string): void {
  if (field === 'max' && value === '') {
    tiers[index][field] = ''
  } else if (value !== '') {
    tiers[index][field] = value
  } else if (field === 'min' || field === 'rate') {
    // สำหรับ min และ rate ถ้าเป็นค่าว่าง ให้ใส่ 0
    tiers[index][field] = '0.00'
  }
}

// เพิ่มชั้นอัตราดอกเบี้ย
function addTier(): void {
  const lastTier = tiers[tiers.length - 1]
  let newMin = '0.00'

  // ถ้ามีชั้นก่อนหน้า ให้เริ่มจากค่าสูงสุดของชั้นก่อน + 0.01
  if (lastTier && lastTier.max) {
    newMin = (parseFloat(lastTier.max) + 0.01).toFixed(2)
  } else if (lastTier && lastTier.min) {
    newMin = (parseFloat(lastTier.min) + 1000000).toFixed(2)
    // อัพเดท max ของชั้นก่อนหน้า เนื่องจากไม่ใช่ชั้นสุดท้ายแล้ว
    lastTier.max = (parseFloat(newMin) - 0.01).toFixed(2)
  }

  tiers.push({ min: newMin, max: '', rate: '0.00' })
  renderTiers()
}

// ลบชั้นอัตราดอกเบี้ย
function removeTier(index: number): void {
  if (tiers.length > 1) {
    tiers.splice(index, 1)
    renderTiers()
  }
}

// แสดงรายการฝาก/ถอน
function renderTransactions(): void {
  const container = byId('transactionsContainer')
  container.innerHTML = ''

  if (transactions.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:10px;">ยังไม่มีรายการฝาก/ถอน — กดปุ่มด้านล่างเพื่อเพิ่ม</p>'
    return
  }

  transactions.forEach((tx, index) => {
    const txDiv = document.createElement('div')
    txDiv.className = 'tier-container'
    txDiv.innerHTML = `
      <div class="tier-item">
          <div>
              <div class="tier-label">วันที่ทำรายการ</div>
              <input type="date"
                     value="${tx.date}"
                     data-index="${index}" data-field="date">
          </div>
          <div>
              <div class="tier-label">ประเภท</div>
              <select data-index="${index}" data-field="type"
                      style="padding:10px;border:2px solid #e0e0e0;border-radius:6px;font-size:0.9rem;width:100%;">
                  <option value="in"  ${tx.type === 'in' ? 'selected' : ''}>💰 ฝากเพิ่ม (Fund In)</option>
                  <option value="out" ${tx.type === 'out' ? 'selected' : ''}>💸 ถอน (Fund Out)</option>
              </select>
          </div>
          <div>
              <div class="tier-label">จำนวนเงิน (บาท)</div>
              <input type="text"
                     value="${formatNumber(tx.amount)}"
                     inputmode="decimal"
                     placeholder="0.00"
                     data-index="${index}" data-field="amount" data-format="comma">
          </div>
          <div>
              <button class="btn btn-danger" data-action="removeTransaction" data-index="${index}">ลบ</button>
          </div>
      </div>
    `
    container.appendChild(txDiv)
  })
}

// เพิ่มรายการฝาก/ถอน
function addTransaction(): void {
  const startDate = byId<HTMLInputElement>('startDate').value
  transactions.push({ date: startDate || toLocalDateString(new Date()), type: 'in', amount: '0.00' })
  renderTransactions()
}

// ลบรายการฝาก/ถอน
function removeTransaction(index: number): void {
  transactions.splice(index, 1)
  renderTransactions()
}

// อัพเดทรายการฝาก/ถอน
function updateTransaction(index: number, field: keyof Transaction, value: string): void {
  const finalVal = field === 'amount' && !value ? '0.00' : value
  if (field === 'type') {
    transactions[index].type = finalVal === 'out' ? 'out' : 'in'
  } else {
    transactions[index][field] = finalVal
  }
}

// Format input field ด้วย comma
function formatInputWithComma(input: HTMLInputElement): void {
  const value = input.value.replace(/,/g, '')
  if (value && !isNaN(Number(value))) {
    const parts = parseFloat(value).toFixed(2).split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    input.value = parts.join('.')
  }
}

// ลบ comma จาก input เพื่อใช้ในการคำนวณ
function parseInputValue(value: string): string {
  return value.replace(/,/g, '')
}

// แปลง Date object เป็น string รูปแบบ YYYY-MM-DD โดยใช้ local time (ป้องกัน timezone shift)
function toLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// นับจำนวนวันจาก dateStrA (inclusive) ถึง dateStrB (exclusive)
function daysBetween(dateStrA: string, dateStrB: string): number {
  return (new Date(dateStrB).getTime() - new Date(dateStrA).getTime()) / 86400000
}

// จัดรูปแบบตัวเลขพร้อมคอมม่า
function formatNumber(value: Decimal.Value, decimals: number = 2): string {
  const parts = new Decimal(value).toFixed(decimals).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

// ตรวจสอบความถูกต้องของข้อมูล
function validateInputs(): boolean {
  let isValid = true

  // ล้างข้อผิดพลาดก่อนหน้า
  document.querySelectorAll('.error').forEach((el) => el.classList.remove('show'))
  document.querySelectorAll('input').forEach((el) => el.classList.remove('input-error'))
  byId('tierError').textContent = 'กรุณาตั้งค่าอัตราดอกเบี้ยอย่างน้อย 1 ชั้น'

  // ตรวจสอบจำนวนเงินฝาก
  const depositAmount = parseInputValue(byId<HTMLInputElement>('depositAmount').value)
  if (!depositAmount || parseFloat(depositAmount) <= 0) {
    byId('depositError').classList.add('show')
    byId('depositAmount').classList.add('input-error')
    isValid = false
  }

  // ตรวจสอบวันที่
  const startDate = byId<HTMLInputElement>('startDate').value
  const endDate = byId<HTMLInputElement>('endDate').value

  if (!startDate) {
    byId('startDateError').classList.add('show')
    byId('startDate').classList.add('input-error')
    isValid = false
  }

  if (!endDate) {
    byId('endDateError').classList.add('show')
    byId('endDate').classList.add('input-error')
    isValid = false
  } else if (startDate && new Date(endDate) <= new Date(startDate)) {
    byId('endDateError').classList.add('show')
    byId('endDate').classList.add('input-error')
    isValid = false
  }

  // ตรวจสอบชั้นอัตราดอกเบี้ย
  if (tiers.length === 0) {
    byId('tierError').classList.add('show')
    isValid = false
  } else {
    for (const tier of tiers) {
      if (!tier.min || !tier.rate || parseFloat(tier.rate) < 0) {
        byId('tierError').textContent = 'กรุณากรอกข้อมูลชั้นอัตราดอกเบี้ยให้ครบถ้วน'
        byId('tierError').classList.add('show')
        isValid = false
        break
      }
    }
  }

  // ตรวจสอบรายการฝาก/ถอน
  if (transactions.length > 0 && startDate && endDate) {
    for (const tx of transactions) {
      const txInvalid = !tx.date || tx.date < startDate || tx.date > endDate || parseFloat(tx.amount) <= 0
      if (txInvalid) {
        byId('transactionError').classList.add('show')
        isValid = false
        break
      }
    }
  }

  return isValid
}

// ตรวจสอบว่าเป็นปีอธิกสุรทิน (Leap year)
function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

// หาจำนวนวันในปี
function getDaysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365
}

// คำนวณจำนวนวันระหว่างสองวันที่ (รวมทั้งวันแรกและวันสุดท้าย) ตามปฏิทินจริง
function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  let totalDays = 0
  const currentDate = new Date(start)

  // วนลูปนับวันแต่ละวัน (รวมทั้งวันแรกและวันสุดท้าย)
  while (currentDate <= end) {
    totalDays++
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return totalDays
}

// แบ่งเงินฝากตามชั้นอัตราดอกเบี้ย
function splitAmountByTiers(amount: Decimal.Value, tiers: Tier[]): TierSlice[] {
  const result: TierSlice[] = []
  const totalAmount = new Decimal(amount)
  let processedAmount = new Decimal(0)

  // เรียงชั้นตามจำนวนเงินขั้นต่ำ
  const sortedTiers = [...tiers].sort((a, b) => parseFloat(a.min) - parseFloat(b.min))

  for (let i = 0; i < sortedTiers.length; i++) {
    const tier = sortedTiers[i]
    const tierMin = new Decimal(tier.min)
    const tierMax = tier.max ? new Decimal(tier.max) : null

    // ถ้าประมวลผลครบแล้ว ให้หยุด
    if (processedAmount.gte(totalAmount)) {
      break
    }

    // ถ้าเงินฝากไม่ถึงขั้นต่ำของชั้นนี้ ข้ามไป
    if (totalAmount.lt(tierMin)) {
      continue
    }

    let tierAmount = new Decimal(0)

    if (tierMax) {
      // ชั้นที่มีค่าสูงสุด
      const remainingAmount = totalAmount.minus(processedAmount)
      // ความจุของชั้นนี้ = max - min (คิดจาก boundary ของชั้น ไม่ใช่ processedAmount)
      const tierCapacity = tierMax.minus(tierMin)
      // เลือกจำนวนที่น้อยกว่าระหว่างความจุชั้นและเงินที่เหลือ
      tierAmount = Decimal.min(tierCapacity, remainingAmount)
    } else {
      // ชั้นสุดท้ายที่ไม่จำกัด
      if (totalAmount.gte(tierMin)) {
        tierAmount = totalAmount.minus(processedAmount)
      }
    }

    if (tierAmount.gt(0)) {
      result.push({
        min: tier.min,
        max: tier.max,
        rate: tier.rate,
        amount: tierAmount.toString(),
      })
      processedAmount = processedAmount.plus(tierAmount)
    }
  }

  return result
}

// คำนวณดอกเบี้ยแบบธรรมดา
function calculateSimpleInterest(principal: Decimal.Value, rate: Decimal.Value, days: Decimal.Value, yearDays: number = 365): Decimal {
  const P = new Decimal(principal)
  const R = new Decimal(rate).div(100)
  const D = new Decimal(days)

  // I = P × R × (D / yearDays)
  return P.times(R).times(D.div(yearDays))
}

// คำนวณดอกเบี้ยทบต้นรายปี
function calculateCompoundInterest(principal: Decimal.Value, rate: Decimal.Value, days: Decimal.Value, yearDays: number = 365): Decimal {
  const P = new Decimal(principal)
  const R = new Decimal(rate).div(100)
  const years = new Decimal(days).div(yearDays)

  // A = P × (1 + R)^years ; I = A - P
  const A = P.times(Decimal.pow(new Decimal(1).plus(R), years))
  return A.minus(P)
}

// คำนวณดอกเบี้ยแบบ apply ตามรอบที่ระบุ (รองรับรายการฝาก/ถอนกลางทาง)
function calculateInterestWithApply(
  startDate: string,
  endDate: string,
  depositAmount: Decimal.Value,
  tiers: Tier[],
  interestType: string,
  applyType: string,
  transactions: Transaction[] = [],
): CalcResult {
  // เรียงและกรอง transaction ที่ถูกต้อง
  const sortedTxs = [...transactions]
    .filter((tx) => tx.date >= startDate && tx.date <= endDate && parseFloat(tx.amount) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const breakdown: BreakdownRow[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  let currentBalance = new Decimal(depositAmount)
  let cumulativeInterest = new Decimal(0)
  let accruedInterest = new Decimal(0)

  // สร้างรายการเดือนให้ครบทุกเดือน
  const monthlyData: MonthInfo[] = []
  const tempDate = new Date(start.getFullYear(), start.getMonth(), 1)

  while (tempDate <= end) {
    const monthStart = new Date(tempDate)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    // ใช้วันที่จริงของ startDate สำหรับเดือนแรก
    const actualStart = monthStart < start ? new Date(start) : new Date(monthStart)
    const actualEnd = monthEnd > end ? new Date(end) : new Date(monthEnd)

    monthlyData.push({
      monthStart: actualStart,
      monthEnd: actualEnd,
      displayMonth: monthStart.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' }),
    })

    tempDate.setMonth(tempDate.getMonth() + 1)
  }

  // ประมวลผลแต่ละเดือน
  let monthIndex = 0
  for (const monthInfo of monthlyData) {
    const monthStart = monthInfo.monthStart
    const monthEnd = monthInfo.monthEnd
    const monthStartStr = toLocalDateString(monthStart)
    const monthEndStr = toLocalDateString(monthEnd)

    const daysInMonth = calculateDays(monthStartStr, monthEndStr)

    // รายการ tx ในเดือนนี้
    const monthTxs = sortedTxs.filter((tx) => tx.date > monthStartStr && tx.date <= monthEndStr)
    const txDates = [...new Set(monthTxs.map((tx) => tx.date))].sort()
    const nextMonthStartStr = toLocalDateString(new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 1))
    // breakpoints: [monthStart, txDate1, ..., nextMonthStart]
    const breakpoints = [monthStartStr, ...txDates, nextMonthStartStr]

    let monthInterest = new Decimal(0)
    const txEvents: TxEvent[] = []

    if (applyType === 'daily') {
      // คำนวณแบบ compound ทุกวัน: apply tx ก่อนคิดดอกเบี้ยของวันนั้น
      const dayDate = new Date(monthStart)
      while (dayDate <= monthEnd) {
        const dayStr = toLocalDateString(dayDate)
        for (const tx of sortedTxs.filter((t) => t.date === dayStr)) {
          const txAmt = new Decimal(tx.amount)
          const before = new Decimal(currentBalance)
          currentBalance = tx.type === 'in'
            ? currentBalance.plus(txAmt)
            : Decimal.max(new Decimal(0), currentBalance.minus(txAmt))
          txEvents.push({
            date: dayStr, type: tx.type, amount: txAmt.toString(),
            balanceBefore: before.toString(), balanceAfter: currentBalance.toString(),
          })
        }
        const dayYear = getDaysInYear(dayDate.getFullYear())
        const dayTierSplit = splitAmountByTiers(currentBalance.toString(), tiers)
        let dayInterest = new Decimal(0)
        for (const tierData of dayTierSplit) {
          const dailyRate = new Decimal(tierData.rate).div(dayYear).div(100)
          dayInterest = dayInterest.plus(new Decimal(tierData.amount).times(dailyRate))
        }
        currentBalance = currentBalance.plus(dayInterest)
        monthInterest = monthInterest.plus(dayInterest)
        cumulativeInterest = cumulativeInterest.plus(dayInterest)
        dayDate.setDate(dayDate.getDate() + 1)
      }

      breakdown.push({
        date: monthInfo.displayMonth,
        days: daysInMonth,
        balance: currentBalance.toString(),
        interest: monthInterest.toString(),
        cumulative: cumulativeInterest.toString(),
        accrued: '0.00',
        applied: true,
        appliedAmount: monthInterest.toString(),
        transactions: txEvents,
      })
      monthIndex++
      continue
    }

    // Transactions exactly on monthStartStr are excluded from monthTxs (> filter) to avoid
    // degenerate 0-day breakpoints that the sub-period loop skips. Apply them here first.
    for (const tx of sortedTxs.filter((t) => t.date === monthStartStr)) {
      const txAmt = new Decimal(tx.amount)
      const before = new Decimal(currentBalance)
      currentBalance = tx.type === 'in'
        ? currentBalance.plus(txAmt)
        : Decimal.max(new Decimal(0), currentBalance.minus(txAmt))
      txEvents.push({
        date: monthStartStr, type: tx.type, amount: txAmt.toString(),
        balanceBefore: before.toString(), balanceAfter: currentBalance.toString(),
      })
    }

    // Non-daily: คำนวณดอกเบี้ยแต่ละ sub-period ระหว่าง breakpoints
    for (let i = 0; i < breakpoints.length - 1; i++) {
      const subStart = breakpoints[i]
      const subEndExcl = breakpoints[i + 1]
      const subDays = daysBetween(subStart, subEndExcl)
      if (subDays <= 0) continue

      const yearDays = getDaysInYear(new Date(subStart).getFullYear())
      const tierSplit = splitAmountByTiers(currentBalance.toString(), tiers)
      for (const tierData of tierSplit) {
        let interest: Decimal
        if (interestType === 'simple') {
          interest = calculateSimpleInterest(tierData.amount, tierData.rate, subDays, yearDays)
        } else {
          interest = calculateCompoundInterest(tierData.amount, tierData.rate, subDays, yearDays)
        }
        monthInterest = monthInterest.plus(interest)
      }

      // Apply transactions ที่จุดเปลี่ยน (ก่อนเข้า sub-period ถัดไป)
      if (i < breakpoints.length - 2) {
        const txDate = breakpoints[i + 1]
        for (const tx of sortedTxs.filter((t) => t.date === txDate)) {
          const txAmt = new Decimal(tx.amount)
          const before = new Decimal(currentBalance)
          currentBalance = tx.type === 'in'
            ? currentBalance.plus(txAmt)
            : Decimal.max(new Decimal(0), currentBalance.minus(txAmt))
          txEvents.push({
            date: txDate, type: tx.type, amount: txAmt.toString(),
            balanceBefore: before.toString(), balanceAfter: currentBalance.toString(),
          })
        }
      }
    }

    // ตรวจสอบว่าต้อง apply ดอกเบี้ยในเดือนนี้หรือไม่
    let shouldApply = false
    if (applyType === 'monthly') {
      const nextMonthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 1)
      shouldApply = nextMonthStart <= end
    } else if (applyType === 'biannually') {
      shouldApply = (monthIndex + 1) % 6 === 0
    } else if (applyType === 'annually') {
      shouldApply = (monthIndex + 1) % 12 === 0
    }

    if (shouldApply) {
      const totalApplyInterest = accruedInterest.plus(monthInterest)
      cumulativeInterest = cumulativeInterest.plus(totalApplyInterest)
      currentBalance = currentBalance.plus(totalApplyInterest)
      accruedInterest = new Decimal(0)

      breakdown.push({
        date: monthInfo.displayMonth,
        days: daysInMonth,
        balance: currentBalance.toString(),
        interest: monthInterest.toString(),
        cumulative: cumulativeInterest.toString(),
        accrued: '0.00',
        applied: true,
        appliedAmount: totalApplyInterest.toString(),
        transactions: txEvents,
      })
    } else {
      accruedInterest = accruedInterest.plus(monthInterest)

      breakdown.push({
        date: monthInfo.displayMonth,
        days: daysInMonth,
        balance: currentBalance.toString(),
        interest: monthInterest.toString(),
        cumulative: cumulativeInterest.plus(accruedInterest).toString(),
        accrued: accruedInterest.toString(),
        applied: false,
        transactions: txEvents,
      })
    }
    monthIndex++
  }

  return {
    totalInterest: cumulativeInterest.plus(accruedInterest).toString(),
    finalAmount: currentBalance.plus(accruedInterest).toString(),
    accruedInterest: accruedInterest.toString(),
    breakdown,
  }
}

// คำนวณดอกเบี้ย
function calculate(): void {
  if (!validateInputs()) {
    return
  }

  // รับค่าจากฟอร์ม
  const depositAmount = parseInputValue(byId<HTMLInputElement>('depositAmount').value)
  const startDate = byId<HTMLInputElement>('startDate').value
  const endDate = byId<HTMLInputElement>('endDate').value
  const interestType = byId<HTMLSelectElement>('interestType').value
  const applyType = byId<HTMLSelectElement>('interestApply').value

  // คำนวณจำนวนวัน
  const totalDays = calculateDays(startDate, endDate)

  // คำนวณดอกเบี้ยแบบมี apply
  const result = calculateInterestWithApply(startDate, endDate, depositAmount, tiers, interestType, applyType, transactions)

  // คำนวณแบบเดิมเพื่อแสดงรายละเอียดตามชั้น
  const tierSplit = splitAmountByTiers(depositAmount, tiers)
  const tierResults: TierResult[] = []

  for (const tierData of tierSplit) {
    let interest: Decimal
    if (interestType === 'simple') {
      interest = calculateSimpleInterest(tierData.amount, tierData.rate, totalDays)
    } else {
      interest = calculateCompoundInterest(tierData.amount, tierData.rate, totalDays)
    }

    tierResults.push({
      min: tierData.min,
      max: tierData.max,
      rate: tierData.rate,
      amount: tierData.amount,
      interest: interest.toString(),
    })
  }

  // แสดงผลลัพธ์
  displayResults(totalDays, result.totalInterest, result.finalAmount, result.accruedInterest, tierResults, result.breakdown)
}

// แสดงผลลัพธ์
function displayResults(
  totalDays: number,
  totalInterest: string,
  finalAmount: string,
  accruedInterest: string,
  tierResults: TierResult[],
  monthlyBreakdown: BreakdownRow[],
): void {
  const depositAmount = parseInputValue(byId<HTMLInputElement>('depositAmount').value)
  const interestType = byId<HTMLSelectElement>('interestType').value

  // แสดงสรุปผล
  let summaryHTML = `
    <div class="result-card">
        <div class="label">จำนวนเงินฝาก</div>
        <div class="value">${formatNumber(depositAmount)} ฿</div>
    </div>
    <div class="result-card">
        <div class="label">จำนวนวันทั้งหมด</div>
        <div class="value">${totalDays}</div>
    </div>
    <div class="result-card highlight">
        <div class="label">ดอกเบี้ยทั้งหมด</div>
        <div class="value">${formatNumber(totalInterest)} ฿</div>
    </div>`

  // เพิ่มแสดง Interest Accrued ถ้ามี
  if (accruedInterest && parseFloat(accruedInterest) > 0) {
    summaryHTML += `
    <div class="result-card">
        <div class="label">ดอกเบี้ยค้างจ่าย (ยังไม่ apply)</div>
        <div class="value" style="color: #ff9800; font-weight: bold;">${formatNumber(accruedInterest)} ฿</div>
    </div>`
  }

  summaryHTML += `
    <div class="result-card highlight">
        <div class="label">ยอดรวมทั้งสิ้น</div>
        <div class="value">${formatNumber(finalAmount)} ฿</div>
    </div>
  `
  byId('resultSummary').innerHTML = summaryHTML
  byId('shareContainer').innerHTML = '<button id="shareBtn" class="btn btn-share">🔗 Copy share link</button>'

  // แสดงตารางแบ่งตามชั้น
  let tierTableHTML = `
    <thead>
        <tr>
            <th>ช่วงจำนวนเงิน (บาท)</th>
            <th class="text-right">อัตราดอกเบี้ย (%)</th>
            <th class="text-right">จำนวนเงินในชั้น (บาท)</th>
            <th class="text-right">ดอกเบี้ย (บาท)</th>
        </tr>
    </thead>
    <tbody>
  `

  tierResults.forEach((tier) => {
    const range = tier.max
      ? `${formatNumber(tier.min)} - ${formatNumber(tier.max)}`
      : `${formatNumber(tier.min)} ขึ้นไป`

    tierTableHTML += `
        <tr>
            <td>${range}</td>
            <td class="text-right">${formatNumber(tier.rate, 2)}</td>
            <td class="text-right">${formatNumber(tier.amount)}</td>
            <td class="text-right">${formatNumber(tier.interest, 10)}</td>
        </tr>
    `
  })

  tierTableHTML += '</tbody>'
  byId('tierBreakdownTable').innerHTML = tierTableHTML

  // แสดงตารางรายละเอียดดอกเบี้ยรายวันของแต่ละชั้น แบ่งตามเดือน
  const depositStartDate = byId<HTMLInputElement>('startDate').value
  const depositEndDate = byId<HTMLInputElement>('endDate').value
  const depositApplyType = byId<HTMLSelectElement>('interestApply').value

  const start = new Date(depositStartDate)
  const end = new Date(depositEndDate)
  let currentBalance = new Decimal(depositAmount)

  // สร้างตารางรายวันแบ่งตามเดือน
  const dailyDetailSection = document.createElement('div')
  dailyDetailSection.className = 'section'
  let sectionHTML = `<h3 style="color: #333; margin-bottom: 15px;">รายละเอียดการคิดดอกเบี้ยรายวันของแต่ละชั้น (แบ่งตามเดือน)</h3>`

  // เตรียม validDisplayTxs สำหรับใช้ในทุกเดือน
  const validDisplayTxs = [...transactions]
    .filter((tx) => tx.date >= depositStartDate && tx.date <= depositEndDate && parseFloat(tx.amount) > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // วนลูปแต่ละเดือน
  const tempDate = new Date(start.getFullYear(), start.getMonth(), 1)
  let monthCount = 0

  while (tempDate <= end) {
    const monthStart = new Date(tempDate)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
    // ใช้วันที่จริงของ startDate สำหรับเดือนแรก
    const actualMonthStart = monthStart < start ? new Date(start) : new Date(monthStart)
    const actualEnd = monthEnd > end ? new Date(end) : new Date(monthEnd)

    const monthDisplay = monthStart.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })

    // คำนวณ interest ของเดือนนี้เพื่อตรวจสอบว่าต้อง apply หรือไม่
    const monthDaysInMonth = calculateDays(toLocalDateString(actualMonthStart), toLocalDateString(actualEnd))
    const yearDaysForDisplayMonth = getDaysInYear(actualMonthStart.getFullYear())

    let monthInterest = new Decimal(0)

    if (depositApplyType !== 'daily') {
      const monthTierSplit = splitAmountByTiers(currentBalance.toString(), tiers)
      for (const tierData of monthTierSplit) {
        const tierAmount = new Decimal(tierData.amount)
        let interest: Decimal
        if (interestType === 'simple') {
          interest = calculateSimpleInterest(tierAmount.toString(), tierData.rate, monthDaysInMonth, yearDaysForDisplayMonth)
        } else {
          interest = calculateCompoundInterest(tierAmount.toString(), tierData.rate, monthDaysInMonth, yearDaysForDisplayMonth)
        }
        monthInterest = monthInterest.plus(interest)
      }
    }

    // ตรวจสอบว่าต้อง apply ดอกเบี้ยในเดือนนี้หรือไม่
    const nextMonthStart = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 1)
    let shouldApplyThisMonth = false

    if (nextMonthStart <= end) {
      if (depositApplyType === 'daily') {
        shouldApplyThisMonth = true
      } else if (depositApplyType === 'monthly') {
        shouldApplyThisMonth = true
      } else if (depositApplyType === 'biannually') {
        // Apply ทุก 6 เดือนนับจากวันเริ่มต้น
        shouldApplyThisMonth = (monthCount + 1) % 6 === 0
      } else if (depositApplyType === 'annually') {
        // Apply ทุก 12 เดือนนับจากวันเริ่มต้น
        shouldApplyThisMonth = (monthCount + 1) % 12 === 0
      }
    }

    const balanceBeforeApply = new Decimal(currentBalance)
    // สำหรับ non-daily: apply ดอกเบี้ยเดือนนี้ และ apply transactions ของเดือนนี้
    if (depositApplyType !== 'daily') {
      const monthTxsForBalance = validDisplayTxs.filter((tx) => {
        const ms = toLocalDateString(actualMonthStart)
        const me = toLocalDateString(actualEnd)
        return tx.date >= ms && tx.date <= me
      })
      for (const tx of monthTxsForBalance) {
        const txAmt = new Decimal(tx.amount)
        currentBalance = tx.type === 'in'
          ? currentBalance.plus(txAmt)
          : Decimal.max(new Decimal(0), currentBalance.minus(txAmt))
      }
      if (shouldApplyThisMonth) {
        currentBalance = currentBalance.plus(monthInterest)
      }
    }

    // สร้างตารางรายวันสำหรับเดือนนี้
    let dailyDetailHTML = `
        <div style="margin-bottom: 20px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px;">
        <h4 style="color: #0369a1; margin-bottom: 10px;">${monthDisplay} [${actualMonthStart.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${actualEnd.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}] (Start Balance: ${formatNumber(balanceBeforeApply.toString())} ฿, End Balance: ${depositApplyType !== 'daily' ? formatNumber(currentBalance.toString()) : '__END_BAL__'} ฿)</h4>
        <div style="overflow-x: auto; max-height: 400px; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; background: white; font-size: 0.9rem;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="padding: 8px; border: 1px solid #ddd;">วันที่</th>
    `

    // เพิ่ม header สำหรับแต่ละชั้น — ใช้ทุก tier ที่กำหนด
    const allSortedTiers = [...tiers].sort((a, b) => parseFloat(a.min) - parseFloat(b.min))
    allSortedTiers.forEach((tier) => {
      const range = tier.max
        ? `${formatNumber(tier.min)}-${formatNumber(tier.max)}`
        : `${formatNumber(tier.min)}+`
      dailyDetailHTML += `<th style="padding: 8px; border: 1px solid #7dd3fc; text-align: right; background: #0284c7; color: white;">${range}<br>${formatNumber(tier.rate, 2)}%</th>`
    })

    dailyDetailHTML += `</tr></thead><tbody>`

    // วนลูปแต่ละวันในเดือน
    let dayBalanceInMonth = new Decimal(balanceBeforeApply)
    const currentDate = new Date(actualMonthStart)
    // สะสมดอกเบี้ยรวมของแต่ละชั้นในเดือนนี้ (ทุก tier)
    const tierMonthlyTotals = allSortedTiers.map(() => new Decimal(0))

    while (currentDate <= actualEnd) {
      const dateStr = currentDate.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })
      const dateStrISO = toLocalDateString(currentDate)

      // Apply transactions ของวันนี้ก่อนคิดดอกเบี้ย (แสดง transaction row)
      const txsToday = validDisplayTxs.filter((tx) => tx.date === dateStrISO)
      for (const tx of txsToday) {
        const txAmt = new Decimal(tx.amount)
        dayBalanceInMonth = tx.type === 'in'
          ? dayBalanceInMonth.plus(txAmt)
          : Decimal.max(new Decimal(0), dayBalanceInMonth.minus(txAmt))
        const txLabel = tx.type === 'in' ? '💰 Fund In' : '💸 Fund Out'
        const txBg = tx.type === 'in' ? '#e8f5e9' : '#fce4ec'
        const txTc = tx.type === 'in' ? '#2e7d32' : '#c62828'
        dailyDetailHTML += `<tr style="background:${txBg};font-weight:600;">
            <td style="padding:6px 8px;border:1px solid #ddd;color:${txTc};">${dateStr} ${txLabel}</td>`
        allSortedTiers.forEach(() => {
          dailyDetailHTML += `<td style="padding:6px 8px;border:1px solid #ddd;text-align:right;color:${txTc};">
                ${tx.type === 'in' ? '+' : '-'}${formatNumber(tx.amount)} ฿ → ${formatNumber(dayBalanceInMonth.toString())} ฿</td>`
        })
        dailyDetailHTML += `</tr>`
      }

      // แถวดอกเบี้ยรายวัน
      dailyDetailHTML += `<tr><td style="padding: 8px; border: 1px solid #ddd;">${dateStr}</td>`

      // คิดดอกเบี้ยรายวันของแต่ละชั้น โดยใช้จำนวนวันจริงของปี และ balance ปัจจุบัน
      const year = currentDate.getFullYear()
      const daysInYear = getDaysInYear(year)

      // แบ่งยอด balance ตามชั้น
      const tierSplitForDay = splitAmountByTiers(dayBalanceInMonth.toString(), tiers)

      // แสดงดอกเบี้ยรายวันของทุก tier (ถ้า balance ไม่ถึง tier นั้น แสดง 0)
      allSortedTiers.forEach((tier, tierIndex) => {
        // จับคู่ด้วย min เพื่อรองรับ tier ที่มี rate เท่ากัน
        const tierDataForDay = tierSplitForDay.find((t) => t.min === tier.min)
        let dailyInterest = new Decimal(0)

        if (tierDataForDay) {
          const dailyRate = new Decimal(tier.rate).div(daysInYear).div(100)
          dailyInterest = new Decimal(tierDataForDay.amount).times(dailyRate)
        }

        tierMonthlyTotals[tierIndex] = tierMonthlyTotals[tierIndex].plus(dailyInterest)
        const cellStyle = tierDataForDay
          ? `padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 0.85rem;`
          : `padding: 8px; border: 1px solid #ddd; text-align: right; font-size: 0.85rem; color: #bbb;`
        dailyDetailHTML += `<td style="${cellStyle}">${formatNumber(dailyInterest.toString(), 10)}</td>`
      })

      dailyDetailHTML += `</tr>`

      // สำหรับ Daily apply type ให้ apply ดอกเบี้ยทุกวัน
      if (depositApplyType === 'daily') {
        const tierSplitForDay2 = splitAmountByTiers(dayBalanceInMonth.toString(), tiers)
        let dayInterest = new Decimal(0)

        for (const tierDataForDay of tierSplitForDay2) {
          const y = currentDate.getFullYear()
          const diy = getDaysInYear(y)
          const dailyRate = new Decimal(tierDataForDay.rate).div(diy).div(100)
          dayInterest = dayInterest.plus(new Decimal(tierDataForDay.amount).times(dailyRate))
        }

        dayBalanceInMonth = dayBalanceInMonth.plus(dayInterest)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    // แถวสรุปดอกเบี้ยรวมแต่ละชั้นของเดือนนี้
    const grandTotalMonth = tierMonthlyTotals.reduce((sum, t) => sum.plus(t), new Decimal(0))

    // สำหรับ daily: อัพเดท currentBalance จาก dayBalanceInMonth ที่ compound แล้ว
    if (depositApplyType === 'daily') {
      currentBalance = new Decimal(dayBalanceInMonth)
      dailyDetailHTML = dailyDetailHTML.replace('__END_BAL__', formatNumber(currentBalance.toString()))
    }
    dailyDetailHTML += `<tr style="font-weight: bold; border-top: 2px solid #7dd3fc;">`
    dailyDetailHTML += `<td style="padding: 8px; border: 1px solid #bae6fd; background: #e0f2fe; color: #0369a1;">รวมดอกเบี้ยแต่ละชั้น</td>`
    tierMonthlyTotals.forEach((total) => {
      dailyDetailHTML += `<td style="padding: 8px; border: 1px solid #bae6fd; background: #e0f2fe; text-align: right; color: #0369a1;">${formatNumber(total.toString(), 10)}</td>`
    })
    dailyDetailHTML += `</tr>`

    // แถวสรุปดอกเบี้ยรวมทั้งหมดของเดือนนี้
    dailyDetailHTML += `<tr style="font-weight: bold;">`
    dailyDetailHTML += `<td style="padding: 10px 8px; border: 1px solid #0369a1; background: #0284c7; color: #fff;">รวมดอกเบี้ยเดือนนี้</td>`
    tierMonthlyTotals.forEach((_, idx) => {
      if (idx === tierMonthlyTotals.length - 1) {
        dailyDetailHTML += `<td style="padding: 10px 8px; border: 1px solid #0369a1; background: #0284c7; text-align: right; color: #fff; font-size: 1rem;">${formatNumber(grandTotalMonth.toString(), 10)}</td>`
      } else {
        dailyDetailHTML += `<td style="padding: 10px 8px; border: 1px solid #0369a1; background: #0284c7;"></td>`
      }
    })
    dailyDetailHTML += `</tr>`

    dailyDetailHTML += `</tbody></table></div></div>`
    sectionHTML += dailyDetailHTML

    tempDate.setMonth(tempDate.getMonth() + 1)
    monthCount++
  }

  dailyDetailSection.innerHTML = sectionHTML

  // แทรกตารางใหม่หลังตารางชั้นอัตราเดิม
  const tierBreakdownTable = document.getElementById('tierBreakdownTable')
  if (tierBreakdownTable) {
    const tierSection = tierBreakdownTable.closest('.section')
    if (tierSection && tierSection.parentElement) {
      const parent = tierSection.parentElement
      // ลบตารางเก่าถ้ามี
      const oldDailySection = parent.querySelector('[data-daily-detail]')
      if (oldDailySection) {
        oldDailySection.remove()
      }
      // เพิ่ม data attribute เพื่อระบุตารางนี้
      dailyDetailSection.setAttribute('data-daily-detail', 'true')
      parent.insertBefore(dailyDetailSection, tierSection.nextSibling)
    }
  }

  // แสดงตารางตามการ apply ดอกเบี้ย
  let applyTableHTML = `
    <thead>
        <tr>
            <th>วันที่ / ช่วงเวลา</th>
            <th class="text-right">จำนวนวัน</th>
            <th class="text-right">ยอดคงเหลือ (บาท)</th>
            <th class="text-right">ดอกเบี้ย (บาท)</th>
            <th class="text-right">ดอกเบี้ยค้างจ่าย (บาท)</th>
            <th class="text-right">ดอกเบี้ยสะสม (บาท)</th>
            <th>สถานะ</th>
        </tr>
    </thead>
    <tbody>
  `

  monthlyBreakdown.forEach((entry) => {
    const dateDisplay = entry.date
    const status = entry.applied ? '✓ Applied' : 'รอ Apply'
    const statusColor = entry.applied ? 'color: #28a745;' : 'color: #ff9800;'

    // แสดงแถว transaction (Fund In / Fund Out) ก่อนแถวสรุปเดือน
    if (entry.transactions && entry.transactions.length > 0) {
      entry.transactions.forEach((tx) => {
        const txColor = tx.type === 'in' ? '#e8f5e9' : '#fce4ec'
        const txLabel = tx.type === 'in' ? '💰 Fund In' : '💸 Fund Out'
        const txTextColor = tx.type === 'in' ? '#2e7d32' : '#c62828'
        applyTableHTML += `
            <tr style="background:${txColor};">
                <td style="color:${txTextColor};font-weight:600;">${tx.date}</td>
                <td class="text-right" style="color:${txTextColor};font-weight:600;" colspan="2">${txLabel}: ${formatNumber(tx.amount)} ฿</td>
                <td class="text-right" colspan="3" style="color:#555;">ยอดก่อน: ${formatNumber(tx.balanceBefore)} ฿ → ยอดหลัง: <strong>${formatNumber(tx.balanceAfter)} ฿</strong></td>
                <td style="color:${txTextColor};">— รายการ —</td>
            </tr>
        `
      })
    }

    applyTableHTML += `
        <tr>
            <td>${dateDisplay}</td>
            <td class="text-right">${entry.days}</td>
            <td class="text-right">${formatNumber(entry.balance)}</td>
            <td class="text-right">${formatNumber(entry.interest, 10)}</td>
            <td class="text-right"><strong>${formatNumber(entry.accrued || '0', 10)}</strong></td>
            <td class="text-right">${formatNumber(entry.cumulative, 10)}</td>
            <td style="${statusColor}"><strong>${status}</strong></td>
        </tr>
    `
  })

  applyTableHTML += '</tbody>'
  byId('monthlyBreakdownTable').innerHTML = applyTableHTML

  // แสดงส่วนผลลัพธ์
  byId('results').classList.add('show')

  // เลื่อนไปยังผลลัพธ์
  byId('results').scrollIntoView({ behavior: 'smooth' })
}

// ---------- Event wiring (delegation; survives re-renders) ----------
function wireEvents(): void {
  byId('addTierBtn').addEventListener('click', addTier)
  byId('addTransactionBtn').addEventListener('click', addTransaction)
  byId('calculateBtn').addEventListener('click', calculate)

  byId<HTMLInputElement>('depositAmount').addEventListener('blur', (e) => {
    formatInputWithComma(e.target as HTMLInputElement)
  })

  const tiersC = byId('tiersContainer')
  tiersC.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement
    const field = t.dataset.field
    if (field === 'min' || field === 'max' || field === 'rate') {
      updateTier(Number(t.dataset.index), field, parseInputValue(t.value))
    }
  })
  // blur ไม่ bubble → ใช้ focusout สำหรับ delegated formatting
  tiersC.addEventListener('focusout', (e) => {
    const t = e.target as HTMLInputElement
    if (t.dataset.format === 'comma') formatInputWithComma(t)
  })
  tiersC.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="removeTier"]')
    if (btn) removeTier(Number(btn.dataset.index))
  })

  const txC = byId('transactionsContainer')
  txC.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement | HTMLSelectElement
    const field = t.dataset.field
    if (field === 'date' || field === 'type' || field === 'amount') {
      const val = field === 'amount' ? parseInputValue(t.value) : t.value
      updateTransaction(Number(t.dataset.index), field, val)
    }
  })
  txC.addEventListener('focusout', (e) => {
    const t = e.target as HTMLInputElement
    if (t.dataset.format === 'comma') formatInputWithComma(t)
  })
  txC.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-action="removeTransaction"]')
    if (btn) removeTransaction(Number(btn.dataset.index))
  })

  byId('results').addEventListener('click', (e) => {
    if ((e.target as HTMLElement).id === 'shareBtn') copyShareLink()
  })
}

// ---------- Share via URL hash ----------

interface ShareState {
  depositAmount: string
  startDate: string
  endDate: string
  interestType: string
  interestApply: string
  tiers: Tier[]
  transactions: Transaction[]
}

function encodeState(): string {
  const state: ShareState = {
    depositAmount: parseInputValue(byId<HTMLInputElement>('depositAmount').value),
    startDate: byId<HTMLInputElement>('startDate').value,
    endDate: byId<HTMLInputElement>('endDate').value,
    interestType: byId<HTMLSelectElement>('interestType').value,
    interestApply: byId<HTMLSelectElement>('interestApply').value,
    tiers,
    transactions,
  }
  return btoa(JSON.stringify(state))
}

function decodeState(hash: string): ShareState | null {
  try {
    return JSON.parse(atob(hash.replace(/^#cfg=/, ''))) as ShareState
  } catch {
    return null
  }
}

function restoreFromHash(): void {
  const hash = window.location.hash
  if (!hash.startsWith('#cfg=')) return
  const s = decodeState(hash)
  if (!s) return
  byId<HTMLInputElement>('depositAmount').value = formatNumber(s.depositAmount)
  byId<HTMLInputElement>('startDate').value = s.startDate
  byId<HTMLInputElement>('endDate').value = s.endDate
  byId<HTMLSelectElement>('interestType').value = s.interestType
  byId<HTMLSelectElement>('interestApply').value = s.interestApply
  tiers = s.tiers
  transactions = s.transactions
  renderTiers()
  renderTransactions()
  calculate()
}

function copyShareLink(): void {
  const url = `${location.origin}${location.pathname}#cfg=${encodeState()}`
  navigator.clipboard.writeText(url).catch(() => {
    // clipboard API unavailable (non-HTTPS, non-localhost) — silently skip
  })
  const btn = byId<HTMLButtonElement>('shareBtn')
  btn.textContent = '✓ Link copied!'
  btn.classList.add('btn-share--copied')
  setTimeout(() => {
    btn.textContent = '🔗 Copy share link'
    btn.classList.remove('btn-share--copied')
  }, 2000)
}

// เริ่มต้นเมื่อโหลดหน้าเว็บ (module scripts ถูก defer → DOM พร้อมแล้ว)
init()
wireEvents()
restoreFromHash()
