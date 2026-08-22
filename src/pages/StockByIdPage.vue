<template>
  <q-page class="stock-page">
    <!-- ═══ Hero Header ═══ -->
    <div class="hero-header">
      <div class="hero-decor hero-decor--blister"></div>
      <div class="hero-decor hero-decor--blister hero-decor--blister-2"></div>
      <div class="hero-decor hero-decor--cross"></div>

      <div class="hero-inner">
        <div class="hero-text">
          <div class="hero-eyebrow">
            <span class="hero-eyebrow__rx">℞</span>
            ระบบคลังยา
          </div>

          <div v-if="loading" class="hero-skeleton">
            <q-skeleton type="text" width="260px" height="34px" class="q-mb-xs" />
            <q-skeleton type="text" width="180px" />
          </div>

          <template v-else-if="drug">
            <div class="hero-title">{{ drug.name }}</div>
            <div class="hero-subtitle">{{ drug.strength }} · รหัสยา {{ drug.icode }}</div>
          </template>

          <template v-else>
            <div class="hero-title">ไม่พบข้อมูลยา</div>
            <div class="hero-subtitle">รหัสยา {{ icode }}</div>
          </template>
        </div>
      </div>

      <!-- Stat cards -->
      <div v-if="drug" class="card-row">
        <div
          v-for="(card, ci) in summaryCards"
          :key="card.key"
          class="stat-card"
          :class="{ 'stat-card--counting': card.animating }"
          :style="{ '--delay': ci * 0.12 + 's' }"
        >
          <div class="stat-card__shine"></div>
          <div
            class="stat-card__icon"
            :style="{ background: card.iconBg }"
            :class="{ 'stat-card__icon--pulse': card.animating }"
          >
            <q-icon :name="card.icon" size="24px" :style="{ color: card.color }" />
          </div>
          <div class="stat-card__body">
            <span class="stat-card__label">{{ card.label }}</span>
            <div class="stat-card__row">
              <span
                class="stat-card__value"
                :class="{ 'stat-card__value--counting': card.animating }"
                :style="{ color: card.color }"
              >
                <template v-if="loading">—</template>
                <template v-else>{{ card.display }}</template>
              </span>
              <span class="stat-card__unit">{{ card.unit }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="hero-tear"></div>
    </div>

    <!-- ═══ Content ═══ -->
    <div class="content-area">
      <q-btn
        flat
        dense
        no-caps
        icon="arrow_back"
        label="กลับไปหน้ารายการ"
        color="grey-7"
        class="back-btn q-mb-md"
        @click="router.back()"
      />

      <div v-if="hasError" class="q-mb-md">
        <q-banner class="error-banner" rounded>
          <template #avatar><q-icon name="error" color="negative" /></template>
          โหลดข้อมูลยาไม่สำเร็จ
          <template #action>
            <q-btn flat color="negative" label="ลองใหม่" @click="fetchDrugDetail" />
          </template>
        </q-banner>
      </div>

      <!-- Filter -->
      <div class="filter-bar">
        <div class="filter-bar__label">
          <q-icon name="tune" size="18px" color="grey-7" />
          <span>ตัวกรอง</span>
        </div>
        <div class="filter-bar__fields">
          <q-select
            v-model="fiscalYear"
            :options="filteredFiscalYearOptions"
            label="ปีงบประมาณ"
            outlined
            dense
            emit-value
            map-options
            use-input
            hide-selected
            fill-input
            input-debounce="0"
            class="filter-field fiscal-field"
            popup-content-class="filter-popup"
            @filter="filterFiscalYear"
            @clear="filteredFiscalYearOptions = fiscalYearOptions"
          >
            <template #no-option>
              <q-item>
                <q-item-section class="text-grey">ไม่พบปีงบประมาณ</q-item-section>
              </q-item>
            </template>
          </q-select>

          <q-select
            v-model="selectedMonth"
            :options="MONTH_OPTIONS"
            label="เดือน"
            outlined
            dense
            emit-value
            map-options
            clearable
            class="filter-field month-field"
            popup-content-class="filter-popup"
          />
        </div>
      </div>

      <div class="panel">
        <div class="panel__head">
          <div>
            <div class="panel__title">
              <q-icon name="inventory_2" size="20px" color="deep-orange-4" class="q-mr-xs" />
              รายละเอียดยา
            </div>
            <div class="panel__sub">ข้อมูลเวชภัณฑ์</div>
          </div>
        </div>

        <div v-if="loading" class="panel__state">
          <q-spinner-dots color="primary" size="36px" />
          <div class="panel__state-text">กำลังโหลดข้อมูล...</div>
        </div>
        <div v-else-if="hasError" class="panel__state">
          <q-icon name="error_outline" size="32px" color="negative" />
          <div class="panel__state-text">โหลดข้อมูลไม่สำเร็จ</div>
          <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchDrugDetail" />
        </div>
        <div v-else-if="!drug" class="panel__state">
          <q-icon name="inventory_2" size="32px" color="grey-5" />
          <div class="panel__state-text">ไม่พบข้อมูลยารหัส {{ icode }}</div>
        </div>

        <div v-else class="info-grid" :key="'info-' + animKey">
          <div
            v-for="(item, i) in infoItems"
            :key="item.label"
            class="info-item anim-fade-in"
            :style="{ '--delay': i * 0.05 + 's' }"
          >
            <div class="info-label">{{ item.label }}</div>
            <div class="info-value">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <!-- ═══ เปรียบเทียบจำนวนยกมา นำเข้า และคงเหลือรายเดือน ═══ -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <div class="panel__title">
              <q-icon name="bar_chart" size="20px" color="teal-7" class="q-mr-xs" />
              เปรียบเทียบจำนวนยกมา นำเข้า และคงเหลือรายเดือน
            </div>
            <div class="panel__sub">{{ compareSubLabel }} · หน่วย</div>
          </div>
        </div>

        <div v-if="compareLoading" class="panel__state">
          <q-spinner-dots color="primary" size="36px" />
          <div class="panel__state-text">กำลังโหลดข้อมูล...</div>
        </div>
        <div v-else-if="compareHasError" class="panel__state">
          <q-icon name="error_outline" size="32px" color="negative" />
          <div class="panel__state-text">โหลดข้อมูลไม่สำเร็จ</div>
          <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchCompare" />
        </div>
        <div v-else-if="!compareLabels.length" class="panel__state">
          <q-icon name="inbox" size="32px" color="grey-5" />
          <div class="panel__state-text">ไม่มีข้อมูลในช่วงเวลานี้</div>
        </div>

        <div v-else class="panel__canvas panel__canvas--compare">
          <canvas ref="compareQtyChartRef"></canvas>
        </div>
      </div>

      <!-- ═══ แนวโน้มจำนวนจ่ายออกรายเดือน (tr) — เทียบกับ HOSXP / HOSXP PCU ═══ -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <div class="panel__title">
              <q-icon name="show_chart" size="20px" color="teal-7" class="q-mr-xs" />
              แนวโน้มจำนวนจ่ายออกรายเดือน (tr) เทียบกับ HOSXP / HOSXP PCU
            </div>
            <div class="panel__sub">{{ compareSubLabel }} · หน่วย {{ drug?.units || '' }}</div>
          </div>
        </div>

        <div v-if="exportLoading" class="panel__state">
          <q-spinner-dots color="primary" size="36px" />
          <div class="panel__state-text">กำลังโหลดข้อมูล...</div>
        </div>
        <div v-else-if="exportHasError" class="panel__state">
          <q-icon name="error_outline" size="32px" color="negative" />
          <div class="panel__state-text">โหลดข้อมูลไม่สำเร็จ</div>
          <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchExport" />
        </div>
        <div v-else-if="!exportLabels.length" class="panel__state">
          <q-icon name="inbox" size="32px" color="grey-5" />
          <div class="panel__state-text">ไม่มีข้อมูลในช่วงเวลานี้</div>
        </div>

        <div v-else class="panel__canvas panel__canvas--compare">
          <canvas ref="exportChartRef"></canvas>
        </div>
        <div v-if="exportHosxpHasError" class="hosxp-warning">
          <q-icon name="warning" size="14px" color="warning" />
          ไม่สามารถโหลดข้อมูล HOSXP เพื่อเปรียบเทียบได้ (แสดงเฉพาะข้อมูลระบบ)
        </div>
        <div v-if="exportHosxpPCUHasError" class="hosxp-warning">
          <q-icon name="warning" size="14px" color="warning" />
          ไม่สามารถโหลดข้อมูล HOSXP PCU เพื่อเปรียบเทียบได้
        </div>
      </div>
    </div>

    <div class="dash-footer">ระบบคลังยา · อัปเดตล่าสุด {{ lastUpdated }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/boot/axios'
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js'

Chart.register(
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
)

interface DrugDetail {
  icode: string
  invcode: string
  mpack: number
  unit: string
  name: string
  strength: string
  units: string
  ttr: number
  bal_value: number
}

interface FiscalYearOption {
  label: string
  value: number
}

interface ImportMonthlyItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  tr: number
  rvalue: number
}

interface CarryMonthlyItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  tremain: number
  remainvalue: number
}

interface BalanceMonthlyItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  ttr: number
  rvalue: number
}

/** ข้อมูลจาก /backoffice/dashboard/export */
interface ExportMonthlyItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  tr: number
  rvalue: number
}

/** ข้อมูลจาก /backoffice/dashboard/exportHosxp — ใช้เปรียบเทียบ tr กับระบบ HOSXP */
interface ExportHosxpItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  tr: number
  rvalue: number
}

/** ข้อมูลจาก /backoffice/dashboard/exportHosxpPCU — ใช้เปรียบเทียบ tr กับระบบ HOSXP PCU */
interface ExportHosxpPCUItem {
  yearmonth: string
  'ปีงบประมาณ': number
  'เดือน': string
  'จำนวนรายการ': number
  tr: number
  rvalue: number
}

const MONTH_OPTIONS = [
  { label: 'ตุลาคม', value: 10 },
  { label: 'พฤศจิกายน', value: 11 },
  { label: 'ธันวาคม', value: 12 },
  { label: 'มกราคม', value: 1 },
  { label: 'กุมภาพันธ์', value: 2 },
  { label: 'มีนาคม', value: 3 },
  { label: 'เมษายน', value: 4 },
  { label: 'พฤษภาคม', value: 5 },
  { label: 'มิถุนายน', value: 6 },
  { label: 'กรกฎาคม', value: 7 },
  { label: 'สิงหาคม', value: 8 },
  { label: 'กันยายน', value: 9 }
] as const

const START_BE_YEAR = 2564 // พ.ศ. เริ่มต้นตัวเลือกปีงบประมาณ

function toBuddhistYear(gYear: number): number {
  return gYear + 543
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('th-TH').format(n ?? 0)
}

function formatAxisValue(val: number): string {
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(val) >= 1_000) return Math.round(val / 1_000) + 'K'
  return formatNumber(val)
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 599
}

const CHART_FONT = { family: "'IBM Plex Sans Thai','Inter',sans-serif", size: 12 } as const
const GRID_COLOR = 'rgba(67, 13, 22, 0.05)'
const TICK_COLOR = 'rgba(42, 19, 21, 0.55)'
const TOOLTIP_BG = '#430d16'

function updateTimestamp(): void {
  lastUpdated.value = new Date().toLocaleString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

/* ════════════════════════════════════════════════
   Animated count-up (same pattern as dashboard-page)
   ════════════════════════════════════════════════ */

function useCountUp(source: Ref<number>, opts: { duration?: number } = {}) {
  const { duration = 1400 } = opts
  const display = ref(0)
  const isAnimating = ref(false)
  let raf = 0

  function easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  watch(
    source,
    (to, from) => {
      const start = from ?? 0
      const delta = to - start
      if (delta === 0) {
        display.value = to
        return
      }

      cancelAnimationFrame(raf)
      isAnimating.value = true
      const t0 = performance.now()

      function tick(t: number) {
        const elapsed = t - t0
        const progress = Math.min(elapsed / duration, 1)
        display.value = Math.round(start + delta * easeOutExpo(progress))

        if (progress < 1) {
          raf = requestAnimationFrame(tick)
        } else {
          display.value = to
          isAnimating.value = false
        }
      }

      raf = requestAnimationFrame(tick)
    },
    { immediate: true }
  )

  onUnmounted(() => cancelAnimationFrame(raf))

  const formatted = computed(() => formatNumber(display.value))
  return { display, formatted, isAnimating }
}

const route = useRoute()
const router = useRouter()

const icode = route.params.icode as string
const drug = ref<DrugDetail | null>(null)
const loading = ref(false)
const hasError = ref(false)
const lastUpdated = ref('')

/** Incremented every fetch — used as :key to re-mount animated elements */
const animKey = ref(0)

/* ── Filter state (ปีงบประมาณ / เดือน) ── */
const now = new Date()
const currentGYear = now.getFullYear()
const currentFiscalGYear = now.getMonth() + 1 >= 10 ? currentGYear + 1 : currentGYear
const currentFiscalBEYear = toBuddhistYear(currentFiscalGYear)

const fiscalYear = ref<number>(currentFiscalGYear)
const selectedMonth = ref<number | null>(null)

const fiscalYearOptions: FiscalYearOption[] = (() => {
  const list: FiscalYearOption[] = []
  for (let endBE = START_BE_YEAR; endBE <= currentFiscalBEYear; endBE++) {
    const startBE = endBE - 1
    const isCurrent = endBE === currentFiscalBEYear
    list.push({
      label: `พ.ศ. ${endBE} (ต.ค. ${startBE} – ก.ย. ${endBE})${isCurrent ? ' ★' : ''}`,
      value: endBE - 543
    })
  }
  return list.reverse()
})()

const filteredFiscalYearOptions = ref<FiscalYearOption[]>(fiscalYearOptions)

function filterFiscalYear(val: string, update: (fn: () => void) => void): void {
  update(() => {
    const needle = val?.trim().toLowerCase()
    filteredFiscalYearOptions.value = needle
      ? fiscalYearOptions.filter((o) => o.label.toLowerCase().includes(needle))
      : fiscalYearOptions
  })
}

const drugTtr = ref(0)
const drugBalValue = ref(0)

const animTtr = useCountUp(drugTtr, { duration: 1400 })
const animBalance = useCountUp(drugBalValue, { duration: 1800 })

const summaryCards = computed(() => {
  if (!drug.value) return []
  return [
    {
      key: 'ttr',
      icon: 'medication',
      label: 'จำนวนยา (TTR)',
      display: animTtr.formatted.value,
      unit: drug.value.units,
      color: '#7d1c28',
      iconBg: '#fbe6e5',
      animating: animTtr.isAnimating.value
    },
    {
      key: 'balance',
      icon: 'account_balance_wallet',
      label: 'มูลค่าคงเหลือรวม',
      display: animBalance.formatted.value,
      unit: 'บาท',
      color: '#a5720f',
      iconBg: '#fbead0',
      animating: animBalance.isAnimating.value
    }
  ]
})

const infoItems = computed(() => {
  if (!drug.value) return []
  return [
    { label: 'รหัสเวชภัณฑ์', value: drug.value.invcode },
    { label: 'จำนวนต่อแพ็ค', value: `${drug.value.mpack} ${drug.value.unit}` },
    { label: 'หน่วยนับ', value: drug.value.units },
    { label: 'ความแรง', value: drug.value.strength }
  ]
})

/* ════════════════════════════════════════════════
   เปรียบเทียบมูลค่ายกมา / นำเข้า รายเดือน (กราฟแท่ง)
   ════════════════════════════════════════════════ */

const compareLoading = ref(true)
const compareHasError = ref(false)
const compareLabels = ref<string[]>([])

/** เปรียบเทียบ "จำนวน" (tremain / tr) รายเดือน */
const compareQtyChartRef = ref<HTMLCanvasElement | null>(null)
let compareQtyChart: Chart | null = null
let compareQtyResizeObserver: ResizeObserver | null = null

const compareSubLabel = computed(() =>
  selectedMonth.value
    ? `${MONTH_OPTIONS.find((m) => m.value === selectedMonth.value)?.label ?? ''} · ปีงบ ${currentFiscalBEYear}`
    : `ทุกเดือน · ปีงบ ${toBuddhistYear(fiscalYear.value)}`
)

function destroyCompareQtyChart(): void {
  compareQtyChart?.destroy()
  compareQtyChart = null
  compareQtyResizeObserver?.disconnect()
  compareQtyResizeObserver = null
}

function observeCompareQtyResize(canvas: HTMLCanvasElement, chart: Chart): void {
  compareQtyResizeObserver?.disconnect()
  const parent = canvas.parentElement
  if (!parent || typeof ResizeObserver === 'undefined') return

  let lastW = 0
  let lastH = 0
  compareQtyResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    if (width === lastW && height === lastH) return
    lastW = width
    lastH = height
    if (width > 0 && height > 0) chart.resize()
  })
  compareQtyResizeObserver.observe(parent)
}

/** กราฟแท่งเปรียบเทียบ "จำนวน" ยกมา (tremain) นำเข้า (tr) และคงเหลือ (ttr) รายเดือน */
function renderCompareQtyChart(labels: string[], tremain: number[], tr: number[], ttr: number[]): void {
  destroyCompareQtyChart()
  if (!compareQtyChartRef.value) return
  const mobile = isMobile()

  compareQtyChart = new Chart(compareQtyChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'จำนวนยกมา',
          data: tremain,
          backgroundColor: '#e2a63d',
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.7
        },
        {
          label: 'จำนวนนำเข้า',
          data: tr,
          backgroundColor: '#0f6e56',
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.7
        },
        {
          label: 'จำนวนคงเหลือ',
          data: ttr,
          backgroundColor: '#e2384a',
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: mobile ? 800 : 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 10, boxHeight: 10, font: { ...CHART_FONT, size: 11 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: TOOLTIP_BG,
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.9)',
          titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 13 },
          bodyFont: { ...CHART_FONT, size: 12 },
          padding: { top: 10, bottom: 10, left: 14, right: 14 },
          cornerRadius: 10,
          callbacks: {
            label: (ctxItem) => `${ctxItem.dataset.label}: ${formatNumber(ctxItem.parsed.y as number)} ${drug.value?.units ?? ''}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: TICK_COLOR, font: { ...CHART_FONT, size: mobile ? 10 : 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: GRID_COLOR },
          ticks: {
            color: TICK_COLOR,
            font: { ...CHART_FONT, size: mobile ? 10 : 11 },
            callback: (v) => formatAxisValue(Number(v))
          }
        }
      }
    }
  })

  observeCompareQtyResize(compareQtyChartRef.value, compareQtyChart)
}

async function fetchCompare(): Promise<void> {
  compareLoading.value = true
  compareHasError.value = false
  try {
    const params: Record<string, string | number> = { icode, financialYear: fiscalYear.value }
    if (selectedMonth.value) params.month = selectedMonth.value

    // ใช้ allSettled แทน all: ถ้า endpoint ไหนพัง (เช่น /balance ยังไม่พร้อม)
    // อีก 2 ตัวที่เหลือยังแสดงผลได้ตามปกติ ไม่ต้องรอทุกตัวสำเร็จพร้อมกัน
    const [carryResult, importResult, balanceResult] = await Promise.allSettled([
      api.get<CarryMonthlyItem[]>('/backoffice/dashboard/carry', { params }),
      api.get<ImportMonthlyItem[]>('/backoffice/dashboard/import', { params }),
      api.get<BalanceMonthlyItem[]>('/backoffice/dashboard/balance', { params })
    ])

    // carry คือแหล่งของ label เดือน ถ้าตัวนี้พังถือว่าโหลดไม่สำเร็จจริง ๆ
    if (carryResult.status === 'rejected') throw carryResult.reason

    const carry = carryResult.value.data ?? []
    const imported = importResult.status === 'fulfilled' ? (importResult.value.data ?? []) : []
    const balance = balanceResult.status === 'fulfilled' ? (balanceResult.value.data ?? []) : []

    if (importResult.status === 'rejected') {
      console.error('[StockDetail] fetchCompare (import):', importResult.reason)
    }
    if (balanceResult.status === 'rejected') {
      console.error('[StockDetail] fetchCompare (balance):', balanceResult.reason)
    }

    compareLabels.value = carry.map((i) => i['เดือน'])

    compareLoading.value = false
    await nextTick()
    renderCompareQtyChart(
      compareLabels.value,
      carry.map((i) => i.tremain),
      imported.map((i) => i.tr),
      balance.map((i) => i.ttr)
    )
  } catch (e) {
    console.error('[StockDetail] fetchCompare:', e)
    compareHasError.value = true
    compareLoading.value = false
  }
}

/* ════════════════════════════════════════════════
   แนวโน้มจำนวนจ่ายออกรายเดือน (tr) — เทียบกับ HOSXP / HOSXP PCU (Linear Graph)
   ════════════════════════════════════════════════ */

const exportLoading = ref(true)
const exportHasError = ref(false)
const exportLabels = ref<string[]>([])
/** true เมื่อโหลด /exportHosxp ไม่สำเร็จ — กราฟจะยังแสดงเฉพาะเส้นระบบ/PCU ที่เหลือได้ */
const exportHosxpHasError = ref(false)
/** true เมื่อโหลด /exportHosxpPCU ไม่สำเร็จ — กราฟจะยังแสดงเฉพาะเส้นระบบ/HOSXP ที่เหลือได้ */
const exportHosxpPCUHasError = ref(false)

const exportChartRef = ref<HTMLCanvasElement | null>(null)
let exportChart: Chart | null = null
let exportResizeObserver: ResizeObserver | null = null

function destroyExportChart(): void {
  exportChart?.destroy()
  exportChart = null
  exportResizeObserver?.disconnect()
  exportResizeObserver = null
}

function observeExportResize(canvas: HTMLCanvasElement, chart: Chart): void {
  exportResizeObserver?.disconnect()
  const parent = canvas.parentElement
  if (!parent || typeof ResizeObserver === 'undefined') return

  let lastW = 0
  let lastH = 0
  exportResizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0]
    if (!entry) return
    const { width, height } = entry.contentRect
    if (width === lastW && height === lastH) return
    lastW = width
    lastH = height
    if (width > 0 && height > 0) chart.resize()
  })
  exportResizeObserver.observe(parent)
}

/** กราฟเส้นแสดงจำนวนจ่ายออก (tr) รายเดือน — เส้นระบบ vs เส้น HOSXP vs เส้น HOSXP PCU */
function renderExportChart(
  labels: string[],
  trSystem: number[],
  trHosxp: number[] | null,
  trHosxpPCU: number[] | null
): void {
  destroyExportChart()
  if (!exportChartRef.value) return
  const mobile = isMobile()

  const datasets: import('chart.js').ChartDataset<'line'>[] = [
    {
      label: 'จำนวนจ่ายออก (ระบบ)',
      data: trSystem,
      borderColor: '#0f6e56',
      backgroundColor: 'rgba(15, 110, 86, 0.12)',
      pointBackgroundColor: '#0f6e56',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true
    }
  ]

  if (trHosxp) {
    datasets.push({
      label: 'จำนวนจ่ายออก (HOSXP)',
      data: trHosxp,
      borderColor: '#e2a63d',
      backgroundColor: 'rgba(226, 166, 61, 0.1)',
      pointBackgroundColor: '#e2a63d',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      borderDash: [6, 4],
      tension: 0.35,
      fill: false
    })
  }

  if (trHosxpPCU) {
    datasets.push({
      label: 'จำนวนจ่ายออก (HOSXP PCU)',
      data: trHosxpPCU,
      borderColor: '#6a4c93',
      backgroundColor: 'rgba(106, 76, 147, 0.1)',
      pointBackgroundColor: '#6a4c93',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      borderDash: [2, 3],
      tension: 0.35,
      fill: false
    })
  }

  exportChart = new Chart(exportChartRef.value, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: mobile ? 800 : 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'top',
          labels: { boxWidth: 10, boxHeight: 10, font: { ...CHART_FONT, size: 11 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: TOOLTIP_BG,
          titleColor: '#fff',
          bodyColor: 'rgba(255,255,255,0.9)',
          titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 13 },
          bodyFont: { ...CHART_FONT, size: 12 },
          padding: { top: 10, bottom: 10, left: 14, right: 14 },
          cornerRadius: 10,
          callbacks: {
            label: (ctxItem) =>
              `${ctxItem.dataset.label}: ${formatNumber(ctxItem.parsed.y as number)} ${drug.value?.units ?? ''}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: TICK_COLOR, font: { ...CHART_FONT, size: mobile ? 10 : 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: GRID_COLOR },
          ticks: {
            color: TICK_COLOR,
            font: { ...CHART_FONT, size: mobile ? 10 : 11 },
            callback: (v) => formatAxisValue(Number(v))
          }
        }
      }
    }
  })

  observeExportResize(exportChartRef.value, exportChart)
}

async function fetchExport(): Promise<void> {
  exportLoading.value = true
  exportHasError.value = false
  exportHosxpHasError.value = false
  exportHosxpPCUHasError.value = false
  try {
    const params: Record<string, string | number> = { icode, financialYear: fiscalYear.value }
    if (selectedMonth.value) params.month = selectedMonth.value

    // ใช้ allSettled: ข้อมูลระบบ (/export) คือแหล่งหลัก ถ้า /exportHosxp หรือ /exportHosxpPCU พัง
    // ยังแสดงเส้นที่เหลือได้ตามปกติ
    const [systemResult, hosxpResult, hosxpPCUResult] = await Promise.allSettled([
      api.get<ExportMonthlyItem[]>('/backoffice/dashboard/export', { params }),
      api.get<ExportHosxpItem[]>('/backoffice/dashboard/exportHosxp', { params }),
      api.get<ExportHosxpPCUItem[]>('/backoffice/dashboard/exportHosxpPCU', { params })
    ])

    if (systemResult.status === 'rejected') throw systemResult.reason

    const items = systemResult.value.data ?? []
    exportLabels.value = items.map((i) => i['เดือน'])

    let hosxpTr: number[] | null = null
    if (hosxpResult.status === 'fulfilled') {
      const hosxpItems = hosxpResult.value.data ?? []
      // จับคู่ค่าตาม yearmonth กับเดือนของข้อมูลระบบ เผื่อสองฝั่งมีจำนวนเดือนไม่เท่ากัน
      const hosxpByYearMonth = new Map(hosxpItems.map((i) => [i.yearmonth, i.tr]))
      hosxpTr = items.map((i) => hosxpByYearMonth.get(i.yearmonth) ?? 0)
    } else {
      exportHosxpHasError.value = true
      console.error('[StockDetail] fetchExport (hosxp):', hosxpResult.reason)
    }

    let hosxpPCUTr: number[] | null = null
    if (hosxpPCUResult.status === 'fulfilled') {
      const hosxpPCUItems = hosxpPCUResult.value.data ?? []
      // จับคู่ค่าตาม yearmonth เช่นเดียวกับ HOSXP เผื่อจำนวนเดือนไม่เท่ากับข้อมูลระบบ
      const hosxpPCUByYearMonth = new Map(hosxpPCUItems.map((i) => [i.yearmonth, i.tr]))
      hosxpPCUTr = items.map((i) => hosxpPCUByYearMonth.get(i.yearmonth) ?? 0)
    } else {
      exportHosxpPCUHasError.value = true
      console.error('[StockDetail] fetchExport (hosxpPCU):', hosxpPCUResult.reason)
    }

    exportLoading.value = false
    await nextTick()
    renderExportChart(
      exportLabels.value,
      items.map((i) => i.tr),
      hosxpTr,
      hosxpPCUTr
    )
  } catch (e) {
    console.error('[StockDetail] fetchExport:', e)
    exportHasError.value = true
    exportLoading.value = false
  }
}

async function fetchDrugDetail() {
  loading.value = true
  hasError.value = false
  try {
    // Response เป็น flat object ตรง ๆ ไม่มี key ครอบ
    const { data } = await api.get<DrugDetail>(
      `/backoffice/dashboard/totalbalance/${encodeURIComponent(icode)}`
    )
    drug.value = data
    drugTtr.value = data.ttr ?? 0
    drugBalValue.value = data.bal_value ?? 0
    updateTimestamp()
    animKey.value++
  } catch (err) {
    console.error('โหลดข้อมูลยาไม่สำเร็จ', err)
    drug.value = null
    hasError.value = true
  } finally {
    loading.value = false
  }
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function handleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    compareQtyChart?.resize()
    exportChart?.resize()
  }, 200)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  void fetchDrugDetail()
  void fetchCompare()
  void fetchExport()
})

watch([fiscalYear, selectedMonth], () => {
  void fetchCompare()
  void fetchExport()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimer) clearTimeout(resizeTimer)
  destroyCompareQtyChart()
  destroyExportChart()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap');

.stock-page {
  --bg: #faf4f2;
  --card: #ffffff;
  --ink: #2a1315;
  --forest-900: #430d16;
  --forest-700: #7d1c28;
  --forest-500: #b32a37;
  --amber-500: #e2a63d;
  --amber-100: #fbead0;
  --text-2: #6b5a58;
  --text-3: #a3908d;
  --border: rgba(67, 13, 22, 0.08);
  --shadow-sm: 0 1px 4px rgba(67, 13, 22, 0.06);
  --shadow-md: 0 8px 24px rgba(67, 13, 22, 0.1);
  --shadow-lg: 0 14px 36px rgba(67, 13, 22, 0.14);
  --r: 16px;
  --r-sm: 12px;

  background: var(--bg);
  min-height: 100vh;
  font-family: 'IBM Plex Sans Thai', 'Inter', sans-serif;
  color: var(--ink);
  padding-bottom: 16px;
}

/* ── Animations ── */
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes cardPop {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  60% { transform: translateY(-3px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.anim-slide-up { animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-fade-in { animation: fadeIn 0.4s ease both; animation-delay: var(--delay, 0s); }
.stat-card { animation: cardPop 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--delay, 0s); }

@media (prefers-reduced-motion: reduce) {
  .anim-slide-up, .anim-fade-in, .stat-card { animation: none !important; }
}

/* ── Hero ── */
.hero-header {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, var(--forest-900) 0%, var(--forest-700) 65%, var(--forest-500) 125%);
  padding: 40px 24px 88px;
  border-radius: 0 0 28px 28px;
  margin-bottom: -60px;
  z-index: 1;
}

.hero-decor { position: absolute; pointer-events: none; }

.hero-decor--blister {
  inset: 0;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.09) 3px, transparent 3.5px);
  background-size: 34px 34px;
  -webkit-mask-image: radial-gradient(130% 110% at 30% -10%, #000 0%, transparent 72%);
  mask-image: radial-gradient(130% 110% at 30% -10%, #000 0%, transparent 72%);
}

.hero-decor--blister-2 {
  background-image: radial-gradient(circle, rgba(226, 166, 61, 0.1) 2.5px, transparent 3px);
  background-position: 17px 17px;
  -webkit-mask-image: radial-gradient(110% 100% at 90% 10%, #000 0%, transparent 65%);
  mask-image: radial-gradient(110% 100% at 90% 10%, #000 0%, transparent 65%);
}

.hero-decor--cross {
  top: -70px;
  right: -50px;
  width: 300px;
  height: 300px;
  opacity: 0.07;
  transform: rotate(-6deg);
}
.hero-decor--cross::before,
.hero-decor--cross::after {
  content: '';
  position: absolute;
  background: #ffffff;
  border-radius: 6px;
}
.hero-decor--cross::before { top: 0; bottom: 0; left: 42%; right: 42%; }
.hero-decor--cross::after { left: 0; right: 0; top: 42%; bottom: 42%; }

.hero-inner { position: relative; z-index: 2; max-width: 960px; margin: 0 auto; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600; color: var(--amber-500);
  letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;
}
.hero-eyebrow__rx {
  display: inline-flex; align-items: center; justify-content: center;
  width: 20px; height: 20px; border-radius: 5px;
  background: rgba(226, 166, 61, 0.16);
  border: 1px solid rgba(226, 166, 61, 0.4);
  font-family: 'IBM Plex Serif', serif; font-size: 13px; line-height: 1; text-transform: none;
}
.hero-title {
  font-family: 'IBM Plex Serif', serif;
  font-size: clamp(22px, 5vw, 30px);
  font-weight: 700; color: #ffffff;
  line-height: 1.2; letter-spacing: -0.01em;
}
.hero-subtitle { font-size: 13.5px; color: rgba(255, 255, 255, 0.6); margin-top: 6px; }

.hero-skeleton :deep(.q-skeleton) { background: rgba(255, 255, 255, 0.15); }

.hero-tear {
  position: absolute; left: 0; right: 0; bottom: 0; height: 18px;
  background: radial-gradient(circle at 9px 0, var(--bg) 9px, transparent 9.5px) 0 0 / 18px 18px repeat-x;
}

/* ── Stat cards ── */
.card-row {
  display: flex; flex-direction: row; flex-wrap: wrap; gap: 16px;
  max-width: 960px; margin: 28px auto 0; padding: 0 24px;
  position: relative; z-index: 3;
}
.stat-card { flex: 1 1 260px; }
.stat-card {
  position: relative; display: flex; align-items: center; gap: 20px;
  background: var(--card); border: 1.5px solid var(--forest-700);
  border-radius: 20px; padding: 22px 28px; box-shadow: var(--shadow-lg);
  overflow: hidden; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s;
}
.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.stat-card__shine {
  position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transition: left 0.6s; pointer-events: none;
}
.stat-card:hover .stat-card__shine { left: 120%; }
.stat-card__icon { width: 64px; height: 64px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card__icon :deep(.q-icon) { font-size: 30px !important; }
.stat-card__body { display: flex; flex-direction: column; min-width: 0; }
.stat-card__label { font-size: 14px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; }
.stat-card__row { display: flex; align-items: baseline; gap: 8px; }
.stat-card__value { font-family: 'IBM Plex Mono', monospace; font-size: clamp(28px, 4vw, 36px); font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
.stat-card__unit { font-size: 15px; color: var(--text-3); font-weight: 500; }
.stat-card__value--counting { font-variant-numeric: tabular-nums; }
.stat-card__icon--pulse { animation: icon-pulse 0.8s ease-in-out infinite alternate; }
@keyframes icon-pulse { 0% { transform: scale(1); opacity: 0.85; } 100% { transform: scale(1.08); opacity: 1; } }

/* ── Content ── */
.content-area { max-width: 960px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }

.error-banner { background: #fdecea; color: #7d1c28; max-width: 480px; }

.filter-bar {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--r);
  padding: 16px 20px; box-shadow: var(--shadow-sm); margin: 0 0 20px;
}
.filter-bar__label {
  display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
  color: var(--forest-700); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 12px;
}
.filter-bar__fields { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-field :deep(.q-field__control) { border-radius: 10px !important; }
.filter-field :deep(.q-field__native), .filter-field :deep(.q-field__label) { font-size: 13px; }
.fiscal-field { width: 300px; max-width: 100%; flex: 1 1 280px; }
.month-field { width: 160px; max-width: 100%; flex: 0 1 160px; }

.back-btn { padding-left: 0; margin-top: 4px; }

/* ── Panels ── */
.panel {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--r);
  padding: 24px; box-shadow: var(--shadow-sm); margin-bottom: 20px; overflow: hidden;
  transition: box-shadow 0.3s;
}
.panel:hover { box-shadow: var(--shadow-md); }
.panel__head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 8px; }
.panel__title { display: flex; align-items: center; font-size: 15px; font-weight: 700; color: var(--forest-900); }
.panel__sub { font-size: 12px; color: var(--text-2); margin-top: 3px; margin-left: 28px; }
.panel__state { display: flex; flex-direction: column; align-items: center; padding: 40px 16px; }
.panel__state-text { font-size: 12px; color: var(--text-2); margin-top: 8px; }

.panel__canvas { position: relative; width: 100%; box-sizing: border-box; }
.panel__canvas canvas { display: block; width: 100% !important; height: 100% !important; }
.panel__canvas--compare { height: 320px; }

.hosxp-warning {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: #a5720f; margin-top: 10px;
}

/* ── Info grid ── */
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.info-item { background: #faf4f2; border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.info-label { font-size: 12px; color: var(--text-3); margin-bottom: 3px; }
.info-value { font-size: 14.5px; font-weight: 700; color: var(--forest-900); }

.dash-footer { text-align: center; padding: 24px 16px 8px; font-size: 12px; color: var(--text-3); }

/* ═══════════════ Responsive ═══════════════ */

/* Large desktop */
@media (min-width: 1440px) {
  .hero-inner, .card-row, .content-area { max-width: 1100px; }
  .info-grid { gap: 16px; }
  .stat-card__value { font-size: 38px; }
  .panel__canvas--compare { height: 360px; }
}

/* Tablet / small laptop */
@media (min-width: 600px) and (max-width: 1023px) {
  .hero-header { padding: 32px 20px 84px; }
  .card-row { padding: 0 20px; }
  .filter-bar__fields { flex-wrap: wrap; }
  .fiscal-field, .month-field { flex: 1 1 100%; min-width: 0; }
  .info-grid { grid-template-columns: repeat(2, 1fr); }
  .panel__canvas--compare { height: 280px; }
}

/* Narrow tablet / large phone — stack stat cards before they get cramped */
@media (min-width: 600px) and (max-width: 719px) {
  .card-row { flex-direction: column; }
  .stat-card { flex: 1 1 100%; }
}

@media (max-width: 599px) {
  .hero-header { padding: 28px 16px 96px; border-radius: 0 0 22px 22px; margin-bottom: -52px; }
  .hero-decor--cross { display: none; }
  .hero-title { font-size: 22px; }
  .hero-subtitle { font-size: 12px; }
  .card-row { gap: 10px; margin-top: 20px; padding: 0 16px; flex-direction: column; flex-wrap: nowrap; }
  .stat-card { flex: 1 1 100%; flex-direction: row; align-items: center; gap: 12px; padding: 16px; border-radius: var(--r-sm); }
  .stat-card:hover { transform: none; box-shadow: var(--shadow-md); }
  .stat-card__icon { width: 48px; height: 48px; border-radius: 12px; }
  .stat-card__icon :deep(.q-icon) { font-size: 22px !important; }
  .stat-card__value { font-size: 24px; }
  .content-area { padding: 0 12px; }
  .back-btn { min-height: 40px; }
  .filter-bar { padding: 12px; margin: 0 0 16px; border-radius: var(--r-sm); }
  .filter-bar__fields { flex-direction: column; align-items: stretch; gap: 8px; }
  .fiscal-field, .month-field { width: 100% !important; flex: 0 0 auto; }
  .panel { padding: 14px; margin-bottom: 14px; border-radius: var(--r-sm); }
  .panel__head { flex-direction: column; align-items: flex-start; margin-bottom: 14px; }
  .panel__title { font-size: 14px; }
  .panel__sub { margin-left: 0; }
  .info-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
  .panel__canvas--compare { height: 240px; }
}

@media (max-width: 380px) {
  .hero-header { padding: 20px 12px 84px; margin-bottom: -46px; }
  .hero-title { font-size: 20px; }
  .content-area { padding: 0 10px; }
  .info-grid { grid-template-columns: 1fr; }
  .panel { padding: 12px; }
  .panel__canvas--compare { height: 200px; }
}

@media (hover: none) and (pointer: coarse) {
  .stat-card:hover { transform: none; box-shadow: var(--shadow-md); }
  .stat-card__shine { display: none; }
  .back-btn :deep(.q-btn__content) { min-height: 40px; }
  .filter-field :deep(.q-field__control) { min-height: 44px; }
}
</style>