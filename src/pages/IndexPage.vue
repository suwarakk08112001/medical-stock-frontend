<template>
  <q-page class="dashboard-page">
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
          <div class="hero-title">Dashboard</div>
          <div class="hero-subtitle">
            ภาพรวมคลังยา · ปีงบประมาณ พ.ศ. {{ buddhistFiscalYear }}
          </div>
        </div>
      </div>

      <div class="card-row">
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
      <div v-if="hasError" class="q-mb-md">
        <q-banner class="error-banner" rounded>
          <template #avatar><q-icon name="error" color="negative" /></template>
          โหลดข้อมูลแดชบอร์ดไม่สำเร็จ
          <template #action>
            <q-btn flat color="negative" label="ลองใหม่" @click="fetchAll" />
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

      <!-- ═══ Monthly Trend (line + pie) ═══ -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <div class="panel__title">
              <q-icon name="show_chart" size="20px" color="deep-orange-4" class="q-mr-xs" />
              แนวโน้มมูลค่าจ่ายออกรายเดือน
            </div>
            <div class="panel__sub">ปีงบประมาณ พ.ศ. {{ buddhistFiscalYear }}</div>
          </div>
          <div class="legend-inline">
            <span class="legend-inline__dot" style="background: #e2384a"></span>
            <span class="legend-inline__text">≥ ค่าเฉลี่ย</span>
            <span class="legend-inline__dot" style="background: #e2a63d; margin-left: 12px"></span>
            <span class="legend-inline__text">&lt; ค่าเฉลี่ย</span>
          </div>
        </div>

        <div v-if="monthlyLoading" class="panel__state">
          <q-spinner-dots color="primary" size="36px" />
          <div class="panel__state-text">กำลังโหลดข้อมูล...</div>
        </div>
        <div v-else-if="monthlyHasError" class="panel__state">
          <q-icon name="error_outline" size="32px" color="negative" />
          <div class="panel__state-text">โหลดข้อมูลไม่สำเร็จ</div>
          <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchMonthlyTrend" />
        </div>
        <div v-else-if="!monthlyItems.length" class="panel__state">
          <q-icon name="inbox" size="32px" color="grey-5" />
          <div class="panel__state-text">ไม่มีข้อมูลในช่วงเวลานี้</div>
        </div>

        <div v-else class="chart-combo">
          <div class="chart-combo__bar">
            <div class="panel__canvas panel__canvas--monthly">
              <canvas ref="monthlyChartRef"></canvas>
            </div>
          </div>
          <div class="chart-combo__pie">
            <div class="pie-heading">สัดส่วนมูลค่ารายเดือน</div>
            <div class="panel__canvas panel__canvas--doughnut">
              <canvas ref="monthlyPieRef"></canvas>
            </div>
            <div class="html-legend" :key="'ml-' + animKey">
              <div
                v-for="(item, i) in monthlyPieLegend"
                :key="i"
                class="html-legend__row anim-fade-in"
                :class="{
                  'html-legend__row--active': highlightedPieIndex === i,
                  'html-legend__row--dimmed': highlightedPieIndex != null && highlightedPieIndex !== i
                }"
                :style="{ '--delay': i * 0.04 + 's' }"
                @mouseenter="highlightPieSegment('monthlyPie', i)"
                @mouseleave="unhighlightPieSegment('monthlyPie')"
              >
                <span class="html-legend__dot" :style="{ background: item.color }"></span>
                <span class="html-legend__name">{{ item.label }}</span>
                <span class="html-legend__pct">{{ item.pct }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Compare: ยกมา / นำเข้า / จ่ายออก ═══ -->
      <div class="panel">
        <div class="panel__head">
          <div>
            <div class="panel__title">
              <q-icon name="bar_chart" size="20px" color="deep-orange-4" class="q-mr-xs" />
              เปรียบเทียบมูลค่ายกมา นำเข้า และจ่ายออกรายเดือน
            </div>
            <div class="panel__sub">ปีงบประมาณ พ.ศ. {{ buddhistFiscalYear }}</div>
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
          <canvas ref="compareChartRef"></canvas>
        </div>
      </div>

      <!-- ═══ Top 10 (config-driven) ═══ -->
      <div class="twin-grid">
        <div v-for="cfg in topTenConfigs" :key="cfg.key" class="panel">
          <div class="panel__head">
            <div>
              <div class="panel__title">
                <q-icon :name="cfg.icon" size="20px" :color="cfg.iconColor" class="q-mr-xs" />
                {{ cfg.title }}
              </div>
              <div class="panel__sub">{{ topTenSubLabel }}</div>
            </div>
            <span class="tag" :class="cfg.tagClass">{{ cfg.tagLabel }}</span>
          </div>

          <div v-if="cfg.loading.value" class="panel__state">
            <q-spinner-dots color="primary" size="36px" />
            <div class="panel__state-text">กำลังโหลดข้อมูล...</div>
          </div>
          <div v-else-if="cfg.hasError.value" class="panel__state">
            <q-icon name="error_outline" size="32px" color="negative" />
            <div class="panel__state-text">โหลดข้อมูลไม่สำเร็จ</div>
            <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchTopTen(cfg)" />
          </div>
          <div v-else-if="!cfg.items.value.length" class="panel__state">
            <q-icon name="inbox" size="32px" color="grey-5" />
            <div class="panel__state-text">ไม่มีข้อมูลในช่วงเวลานี้</div>
          </div>

          <template v-else>
            <!-- HTML bar list -->
            <div class="hbar" :key="'hbar-' + cfg.key + '-' + topTenAnimKey">
              <div
                v-for="(item, i) in cfg.items.value"
                :key="i"
                class="hbar__row anim-slide-up"
                :class="{
                  'hbar__row--active': topTenHighlight[cfg.key] === i,
                  'hbar__row--dimmed': topTenHighlight[cfg.key] != null && topTenHighlight[cfg.key] !== i
                }"
                :style="{ '--delay': i * 0.06 + 's' }"
                @mouseenter="onBarHover(cfg.key, i)"
                @mouseleave="onBarLeave(cfg.key)"
                @click="onBarClick(cfg.key, i)"
              >
                <div class="hbar__rank">#{{ i + 1 }}</div>
                <div class="hbar__info">
                  <div class="hbar__label">{{ item.name }}</div>
                  <div class="hbar__track">
                    <div
                      :class="['hbar__fill', cfg.fillClass, 'anim-bar-grow']"
                      :style="{ width: item.pct + '%', '--delay': i * 0.06 + 0.15 + 's' }"
                    >
                      <span v-if="item.pct > 28" class="hbar__val-inside">{{ formatNumber(item.value) }}</span>
                    </div>
                    <span v-if="item.pct <= 28" class="hbar__val-outside">{{ formatNumber(item.value) }}</span>
                  </div>
                </div>
                <q-tooltip
                  class="hbar-tooltip"
                  anchor="top middle"
                  self="bottom middle"
                  :offset="[0, 8]"
                  transition-show="scale"
                  transition-hide="scale"
                >
                  <div class="hbar-tooltip__name">{{ item.name }}</div>
                  <div v-if="item.strength" class="hbar-tooltip__line">ขนาด: {{ item.strength }}</div>
                  <div class="hbar-tooltip__line">
                    {{ cfg.quantityLabel }}: {{ formatNumber(item.value) }} {{ item.unit }}
                  </div>
                  <div class="hbar-tooltip__line">{{ cfg.moneyLabel }}: {{ formatNumber(item.moneyValue) }} บาท</div>
                </q-tooltip>
              </div>
            </div>

            <!-- Pie -->
            <div class="pie-section">
              <div class="pie-heading">สัดส่วน{{ cfg.tagLabel }}</div>
              <div class="panel__canvas panel__canvas--doughnut">
                <canvas :ref="el => setTopTenCanvas(cfg.key, el)"></canvas>
              </div>
              <div class="html-legend" :key="'lg-' + cfg.key + '-' + topTenAnimKey">
                <div
                  v-for="(item, i) in cfg.legend.value"
                  :key="i"
                  class="html-legend__row anim-fade-in"
                  :class="{
                    'html-legend__row--active': topTenHighlight[cfg.key] === i,
                    'html-legend__row--dimmed': topTenHighlight[cfg.key] != null && topTenHighlight[cfg.key] !== i
                  }"
                  :style="{ '--delay': i * 0.04 + 's' }"
                  @mouseenter="onBarHover(cfg.key, i)"
                  @mouseleave="onBarLeave(cfg.key)"
                  @click="onBarClick(cfg.key, i)"
                >
                  <span class="html-legend__dot" :style="{ background: item.color }"></span>
                  <span class="html-legend__name">{{ item.label }}</span>
                  <span class="html-legend__pct">{{ item.pct }}%</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="dash-footer">ระบบคลังยา · อัปเดตล่าสุด {{ lastUpdated }}</div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch, reactive, type Ref } from 'vue';
import { api } from '@/boot/axios';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

/* ════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════ */

interface DrugItemInfo {
  name: string;
  strength?: string | null;
}

interface TopTenTtrItem {
  id: number;
  icode: string;
  ttr: number;
  unit?: string | null;
  bal_value?: number | null;
  drugitem?: DrugItemInfo | null;
}

interface TopTenTrItem {
  id: number;
  icode: string;
  tr: number;
  unit: string;
  rvalue: number;
  drugitem?: DrugItemInfo | null;
}

interface MonthlyDvalueItem {
  yearmonth: string;
  'ปีงบประมาณ': number;
  'เดือน': string;
  'จำนวนรายการ': number;
  td: number;
  dvalue: number;
}

interface RemainvalueMonthlyItem {
  yearmonth: string;
  'เดือน': string;
  remainvalue: number;
}

interface RvalueMonthlyItem {
  yearmonth: string;
  'เดือน': string;
  rvalue: number;
}

interface LegendItem {
  label: string;
  color: string;
  pct: string;
  value: number;
}

interface BarItem {
  name: string;
  value: number; // ปริมาณหลัก (ttr / tr)
  moneyValue: number; // มูลค่าประกอบ (bal_value / rvalue)
  unit: string;
  strength?: string | null;
  pct: number; // ความกว้างแท่งเทียบค่าสูงสุด (%)
  sharePct: number; // สัดส่วนของค่ารวมทั้งหมด (%)
}

interface FiscalYearOption {
  label: string;
  value: number;
}

type TopTenKey = 'ttr' | 'imported';

interface TopTenPanelConfig {
  key: TopTenKey;
  title: string;
  icon: string;
  iconColor: string;
  tagLabel: string;
  tagClass: string;
  fillClass: string;
  endpoint: string;
  palette: readonly string[];
  quantityLabel: string;
  moneyLabel: string;
  loading: Ref<boolean>;
  hasError: Ref<boolean>;
  items: Ref<BarItem[]>;
  legend: Ref<LegendItem[]>;
}

interface DoughnutDetail {
  strength?: string | null;
  unit: string;
  moneyValue: number;
  quantityLabel: string;
  moneyLabel: string;
}

/* ════════════════════════════════════════════════
   Constants
   ════════════════════════════════════════════════ */

const THAI_MONTHS_FULL = [
  '',
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม'
] as const;

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
] as const;

const PALETTE = {
  teal: ['#0f6e56', '#159672', '#1ba887', '#2fbe9c', '#5dcaa5', '#7cd6b7', '#9fe1cb', '#bfeadb', '#dcf4ea', '#eef9f4'],
  coral: ['#993c1d', '#b8481f', '#d85a30', '#e26f45', '#ec8a63', '#f0997b', '#f3ac95', '#f6c0b0', '#f9d4c9', '#fbe4dd']
} as const;

const CHART_FONT = { family: "'IBM Plex Sans Thai','Inter',sans-serif", size: 12 } as const;
const GRID_COLOR = 'rgba(67, 13, 22, 0.05)';
const TICK_COLOR = 'rgba(42, 19, 21, 0.55)';
const TOOLTIP_BG = '#430d16';
const START_BE_YEAR = 2564; // พ.ศ. เริ่มต้นตัวเลือกปีงบประมาณ

const TREND_HIGH = { line: '#e2384a', fill: 'rgba(226, 56, 74, 0.16)', pie: '#e2384a' };
const TREND_LOW = { line: '#e2a63d', fill: 'rgba(226, 166, 61, 0.22)', pie: '#e2a63d' };

function trendColor(value: number, average: number) {
  return value >= average ? TREND_HIGH : TREND_LOW;
}

/* ════════════════════════════════════════════════
   Formatting helpers
   ════════════════════════════════════════════════ */

function formatNumber(val: number, decimals = 0): string {
  return (val ?? 0).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatAxisValue(val: number): string {
  if (Math.abs(val) >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(val) >= 1_000) return Math.round(val / 1_000) + 'K';
  return formatNumber(val);
}

function truncateLabel(label: string, max = 18): string {
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= 599;
}

function toBuddhistYear(gYear: number): number {
  return gYear + 543;
}

/* ════════════════════════════════════════════════
   Data helpers
   ════════════════════════════════════════════════ */

function dedupeByIcode<T extends { icode: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (!seen.has(item.icode)) {
      seen.add(item.icode);
      result.push(item);
    }
  }
  return result;
}

function buildLegendItems(labels: string[], values: number[], palette: readonly string[]): LegendItem[] {
  const total = values.reduce((a, b) => a + b, 0);
  return labels.map((label, i) => ({
    label,
    color: palette[i % palette.length] ?? '#999999',
    pct: total > 0 ? Math.round(((values[i] ?? 0) / total) * 100).toString() : '0',
    value: Math.round(values[i] ?? 0)
  }));
}

function buildTopTenItems(
  names: string[],
  quantities: number[],
  moneyValues: number[],
  units: string[],
  strengths: (string | null | undefined)[]
): BarItem[] {
  const max = Math.max(...quantities, 1);
  const total = quantities.reduce((a, b) => a + b, 0);
  return names.map((name, i) => ({
    name,
    value: Math.round(quantities[i] ?? 0),
    moneyValue: Math.round(moneyValues[i] ?? 0),
    unit: units[i] ?? '',
    strength: strengths[i] ?? null,
    pct: Math.max(((quantities[i] ?? 0) / max) * 100, 8),
    sharePct: total > 0 ? ((quantities[i] ?? 0) / total) * 100 : 0
  }));
}

function updateTimestamp(): void {
  lastUpdated.value = new Date().toLocaleString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/* ════════════════════════════════════════════════
   Reactive state
   ════════════════════════════════════════════════ */

const loading = ref(false);
const hasError = ref(false);
const totalDrugItems = ref(0);
const totalBalanceValue = ref(0);
const lastUpdated = ref('');

/** Incremented every fetch — used as :key to re-mount animated elements */
const animKey = ref(0);
const topTenAnimKey = ref(0);

const now = new Date();
const currentGYear = now.getFullYear();
const currentFiscalGYear = now.getMonth() + 1 >= 10 ? currentGYear + 1 : currentGYear;

const fiscalYear = ref<number>(currentFiscalGYear);
const selectedMonth = ref<number | null>(null);

const buddhistFiscalYear = computed(() => toBuddhistYear(fiscalYear.value));

const topTenSubLabel = computed(() =>
  selectedMonth.value
    ? `${THAI_MONTHS_FULL[selectedMonth.value]} · ปีงบ ${buddhistFiscalYear.value}`
    : `ทุกเดือน · ปีงบ ${buddhistFiscalYear.value}`
);

// Interactive state: which pie/bar index is highlighted
const highlightedPieIndex = ref<number | null>(null);
const topTenHighlight = reactive<Record<TopTenKey, number | null>>({
  ttr: null,
  imported: null
});

/* ════════════════════════════════════════════════
   Animated count-up
   ════════════════════════════════════════════════ */

function useCountUp(source: Ref<number>, opts: { duration?: number } = {}) {
  const { duration = 1400 } = opts;
  const display = ref(0);
  const isAnimating = ref(false);
  let raf = 0;

  function easeOutExpo(t: number): number {
    return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  watch(
    source,
    (to, from) => {
      const start = from ?? 0;
      const delta = to - start;
      if (delta === 0) {
        display.value = to;
        return;
      }

      cancelAnimationFrame(raf);
      isAnimating.value = true;
      const t0 = performance.now();

      function tick(t: number) {
        const elapsed = t - t0;
        const progress = Math.min(elapsed / duration, 1);
        display.value = Math.round(start + delta * easeOutExpo(progress));

        if (progress < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          display.value = to;
          isAnimating.value = false;
        }
      }

      raf = requestAnimationFrame(tick);
    },
    { immediate: true }
  );

  onUnmounted(() => cancelAnimationFrame(raf));

  const formatted = computed(() => formatNumber(display.value));
  return { display, formatted, isAnimating };
}

const animDrugItems = useCountUp(totalDrugItems, { duration: 1400 });
const animBalance = useCountUp(totalBalanceValue, { duration: 1800 });

const summaryCards = computed(() => [
  {
    key: 'drug',
    icon: 'medication',
    label: 'จำนวนคลังยาทั้งหมด',
    display: animDrugItems.formatted.value,
    unit: 'รายการ',
    color: '#7d1c28',
    iconBg: '#fbe6e5',
    animating: animDrugItems.isAnimating.value
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
]);

/* ════════════════════════════════════════════════
   Fiscal year options
   ════════════════════════════════════════════════ */

const currentFiscalBEYear = toBuddhistYear(currentFiscalGYear);

const fiscalYearOptions: FiscalYearOption[] = (() => {
  const list: FiscalYearOption[] = [];
  for (let endBE = START_BE_YEAR; endBE <= currentFiscalBEYear; endBE++) {
    const startBE = endBE - 1;
    const isCurrent = endBE === currentFiscalBEYear;
    list.push({
      label: `พ.ศ. ${endBE} (ต.ค. ${startBE} – ก.ย. ${endBE})${isCurrent ? ' ★' : ''}`,
      value: endBE - 543
    });
  }
  return list.reverse();
})();

const filteredFiscalYearOptions = ref<FiscalYearOption[]>(fiscalYearOptions);

function filterFiscalYear(val: string, update: (fn: () => void) => void): void {
  update(() => {
    const needle = val?.trim().toLowerCase();
    filteredFiscalYearOptions.value = needle
      ? fiscalYearOptions.filter((o) => o.label.toLowerCase().includes(needle))
      : fiscalYearOptions;
  });
}

/* ════════════════════════════════════════════════
   Top-ten panel state & configs
   ════════════════════════════════════════════════ */

const ttrLoading = ref(true);
const ttrHasError = ref(false);
const ttrItems = ref<BarItem[]>([]);
const ttrLegend = ref<LegendItem[]>([]);

const importedLoading = ref(true);
const importedHasError = ref(false);
const importedItems = ref<BarItem[]>([]);
const importedLegend = ref<LegendItem[]>([]);

const topTenConfigs: TopTenPanelConfig[] = [
  {
    key: 'ttr',
    title: 'Top 10 ยาที่คงเหลือในคลัง (TTR)',
    icon: 'bar_chart',
    iconColor: 'teal-7',
    tagLabel: 'คงคลัง',
    tagClass: 'tag--teal',
    fillClass: 'hbar__fill--teal',
    endpoint: '/dashboard/TopTenttr',
    palette: PALETTE.teal,
    quantityLabel: 'TTR',
    moneyLabel: 'มูลค่ารับ',
    loading: ttrLoading,
    hasError: ttrHasError,
    items: ttrItems,
    legend: ttrLegend
  },
  {
    key: 'imported',
    title: 'Top 10 ยาที่นำเข้ามากที่สุด',
    icon: 'local_shipping',
    iconColor: 'deep-orange-4',
    tagLabel: 'นำเข้า',
    tagClass: 'tag--coral',
    fillClass: 'hbar__fill--coral',
    endpoint: '/dashboard/TopTentr',
    palette: PALETTE.coral,
    quantityLabel: 'จำนวน',
    moneyLabel: 'มูลค่านำเข้า',
    loading: importedLoading,
    hasError: importedHasError,
    items: importedItems,
    legend: importedLegend
  }
];

const topTenCanvasRefs = new Map<TopTenKey, HTMLCanvasElement | null>();
function setTopTenCanvas(key: TopTenKey, el: unknown): void {
  topTenCanvasRefs.set(key, (el as HTMLCanvasElement | null) ?? null);
}

/* ════════════════════════════════════════════════
   Monthly trend & compare state
   ════════════════════════════════════════════════ */

const monthlyLoading = ref(true);
const monthlyHasError = ref(false);
const monthlyItems = ref<MonthlyDvalueItem[]>([]);
const monthlyPieLegend = ref<LegendItem[]>([]);
const monthlyChartRef = ref<HTMLCanvasElement | null>(null);
const monthlyPieRef = ref<HTMLCanvasElement | null>(null);

const monthlyAverage = computed(() => {
  const vals = monthlyItems.value.map((i) => i.dvalue || 0);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
});

const compareLoading = ref(true);
const compareHasError = ref(false);
const compareLabels = ref<string[]>([]);
const compareChartRef = ref<HTMLCanvasElement | null>(null);

/* ════════════════════════════════════════════════
   Chart instance registry
   ════════════════════════════════════════════════ */

const charts = new Map<string, Chart>();
const chartResizeObservers = new Map<string, ResizeObserver>();

function destroyChart(key: string): void {
  charts.get(key)?.destroy();
  charts.delete(key);
  chartResizeObservers.get(key)?.disconnect();
  chartResizeObservers.delete(key);
}

function destroyAllCharts(): void {
  for (const c of charts.values()) c.destroy();
  charts.clear();
  for (const o of chartResizeObservers.values()) o.disconnect();
  chartResizeObservers.clear();
}

function resizeAllCharts(): void {
  for (const c of charts.values()) c.resize();
}

/**
 * เฝ้าดูขนาดของ container รอบ canvas ด้วย ResizeObserver แล้วสั่ง chart.resize()
 * ทุกครั้งที่ขนาดเปลี่ยนจริง — แก้ปัญหากราฟว่างเปล่าตอนสร้างครั้งแรก เพราะ container
 * (โดยเฉพาะภายใน q-page/QLayout ของ Quasar) อาจยังไม่ finish layout จนวัดได้ 0x0
 * ตอน Chart.js สร้างกราฟ ซึ่งการ resize ด้วย requestAnimationFrame เพียงอย่างเดียว
 * อาจไม่ทันจังหวะเสมอไป
 */
function observeCanvasResize(key: string, canvas: HTMLCanvasElement, chart: Chart): void {
  chartResizeObservers.get(key)?.disconnect();
  const parent = canvas.parentElement;
  if (!parent || typeof ResizeObserver === 'undefined') return;

  let lastW = 0;
  let lastH = 0;
  const observer = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry) return;
    const { width, height } = entry.contentRect;
    if (width === lastW && height === lastH) return;
    lastW = width;
    lastH = height;
    if (width > 0 && height > 0) chart.resize();
  });
  observer.observe(parent);
  chartResizeObservers.set(key, observer);
}

/* ════════════════════════════════════════════════
   Interactive: cross-chart highlighting
   ════════════════════════════════════════════════ */

function highlightPieSegment(chartKey: string, index: number): void {
  highlightedPieIndex.value = index;
  const chart = charts.get(chartKey);
  if (!chart) return;
  chart.setActiveElements([{ datasetIndex: 0, index }]);
  chart.tooltip?.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
  chart.update('none');
}

function unhighlightPieSegment(chartKey: string): void {
  highlightedPieIndex.value = null;
  const chart = charts.get(chartKey);
  if (!chart) return;
  chart.setActiveElements([]);
  chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  chart.update('none');
}

function onBarHover(cfgKey: TopTenKey, index: number): void {
  topTenHighlight[cfgKey] = index;
  const chart = charts.get(cfgKey);
  if (!chart) return;
  chart.setActiveElements([{ datasetIndex: 0, index }]);
  chart.tooltip?.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
  chart.update('none');
}

function onBarLeave(cfgKey: TopTenKey): void {
  topTenHighlight[cfgKey] = null;
  const chart = charts.get(cfgKey);
  if (!chart) return;
  chart.setActiveElements([]);
  chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  chart.update('none');
}

function onBarClick(cfgKey: TopTenKey, index: number): void {
  topTenHighlight[cfgKey] = topTenHighlight[cfgKey] === index ? null : index;
}

/* ════════════════════════════════════════════════
   API
   ════════════════════════════════════════════════ */

async function fetchAll(): Promise<void> {
  hasError.value = false;
  await Promise.all([fetchTotals(), fetchMonthlyTrend(), fetchCompare(), ...topTenConfigs.map(fetchTopTen)]);
  updateTimestamp();
  animKey.value++;
  topTenAnimKey.value++;
}

/** Only re-fetch totals + Top 10 panels (month filter changed) */
async function fetchTopTenOnly(): Promise<void> {
  await Promise.all([fetchTotals(), ...topTenConfigs.map(fetchTopTen)]);
  updateTimestamp();
  topTenAnimKey.value++;
}

async function fetchTotals(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { financialYear: fiscalYear.value };
    if (selectedMonth.value) params.month = selectedMonth.value;

    const [balanceRes, drugRes] = await Promise.all([
      api.get<{ total_balance_value: string | number }>('/dashboard/tbvalue', { params }),
      api.get<{ total_drug_items: number }>('/dashboard/totalDrug', { params })
    ]);

    totalBalanceValue.value = Math.round(parseFloat(String(balanceRes.data.total_balance_value)) || 0);
    totalDrugItems.value = drugRes.data.total_drug_items ?? 0;
  } catch (e) {
    console.error('[Dashboard] fetchTotals:', e);
    hasError.value = true;
  } finally {
    loading.value = false;
  }
}

async function fetchTopTen(cfg: TopTenPanelConfig): Promise<void> {
  cfg.loading.value = true;
  cfg.hasError.value = false;
  try {
    const params: Record<string, number> = { financialYear: fiscalYear.value };
    if (selectedMonth.value) params.month = selectedMonth.value;

    if (cfg.key === 'ttr') {
      const { data } = await api.get<TopTenTtrItem[]>(cfg.endpoint, { params });
      const rows = dedupeByIcode(data ?? []);
      const names = rows.map((r) => r.drugitem?.name ?? r.icode);
      const quantities = rows.map((r) => r.ttr);
      const money = rows.map((r) => r.bal_value ?? 0);
      const units = rows.map((r) => r.unit ?? '');
      const strengths = rows.map((r) => r.drugitem?.strength ?? null);
      cfg.items.value = buildTopTenItems(names, quantities, money, units, strengths);
      cfg.legend.value = buildLegendItems(names, quantities, cfg.palette);
    } else {
      const { data } = await api.get<TopTenTrItem[]>(cfg.endpoint, { params });
      const rows = dedupeByIcode(data ?? []);
      const names = rows.map((r) => r.drugitem?.name ?? r.icode);
      const quantities = rows.map((r) => r.tr);
      const money = rows.map((r) => r.rvalue);
      const units = rows.map((r) => r.unit);
      const strengths = rows.map((r) => r.drugitem?.strength ?? null);
      cfg.items.value = buildTopTenItems(names, quantities, money, units, strengths);
      cfg.legend.value = buildLegendItems(names, quantities, cfg.palette);
    }

    cfg.loading.value = false;
    await nextTick();
    const canvas = topTenCanvasRefs.get(cfg.key) ?? null;
    renderDoughnut(
      cfg.key,
      canvas,
      cfg.items.value.map((i) => truncateLabel(i.name)),
      cfg.items.value.map((i) => i.value),
      cfg.palette,
      cfg.quantityLabel,
      cfg.items.value.map((i) => ({
        strength: i.strength,
        unit: i.unit,
        moneyValue: i.moneyValue,
        quantityLabel: cfg.quantityLabel,
        moneyLabel: cfg.moneyLabel
      }))
    );
  } catch (e) {
    console.error(`[Dashboard] fetchTopTen(${cfg.key}):`, e);
    cfg.hasError.value = true;
    cfg.loading.value = false;
  }
}

async function fetchMonthlyTrend(): Promise<void> {
  monthlyLoading.value = true;
  monthlyHasError.value = false;
  try {
    const params = { financialYear: fiscalYear.value };
    const { data } = await api.get<MonthlyDvalueItem[]>('/dashboard/Dvaluemonthly', { params });
    monthlyItems.value = data ?? [];

    monthlyLoading.value = false;
    await nextTick();
    const labels = monthlyItems.value.map((i) => i['เดือน']);
    const values = monthlyItems.value.map((i) => i.dvalue);
    const avg = monthlyAverage.value;
    const palette = values.map((v) => trendColor(v, avg).pie);

    renderMonthlyLineChart(labels, monthlyItems.value);
    monthlyPieLegend.value = buildLegendItems(labels, values, palette);
    renderDoughnut('monthlyPie', monthlyPieRef.value, labels, values, palette, 'มูลค่า');
  } catch (e) {
    console.error('[Dashboard] fetchMonthlyTrend:', e);
    monthlyHasError.value = true;
    monthlyLoading.value = false;
  }
}

async function fetchCompare(): Promise<void> {
  compareLoading.value = true;
  compareHasError.value = false;
  try {
    const params = { financialYear: fiscalYear.value };
    const [remainRes, rvalueRes, dvalueRes] = await Promise.all([
      api.get<RemainvalueMonthlyItem[]>('/dashboard/Remainvaluemonthly', { params }),
      api.get<RvalueMonthlyItem[]>('/dashboard/Rvaluemonthly', { params }),
      api.get<MonthlyDvalueItem[]>('/dashboard/Dvaluemonthly', { params })
    ]);

    const remain = remainRes.data ?? [];
    const rvalue = rvalueRes.data ?? [];
    const dvalue = dvalueRes.data ?? [];
    compareLabels.value = remain.map((i) => i['เดือน']);

    compareLoading.value = false;
    await nextTick();
    renderCompareChart(
      compareLabels.value,
      remain.map((i) => i.remainvalue),
      rvalue.map((i) => i.rvalue),
      dvalue.map((i) => i.dvalue)
    );
  } catch (e) {
    console.error('[Dashboard] fetchCompare:', e);
    compareHasError.value = true;
    compareLoading.value = false;
  }
}

/* ════════════════════════════════════════════════
   Chart.js — average-line annotation plugin
   (simple afterDraw, no custom animation timing — safe to combine
   with Chart.js's own built-in animation instead of hand-rolled
   reveal plugins, which raced with Chart.js's internal animator
   and could leave the chart permanently clipped to ~0)
   ════════════════════════════════════════════════ */

const averageLinePlugin = {
  id: 'averageLine',
  afterDraw(chart: Chart) {
    const avg = (chart as any).__average as number | undefined;
    const yScale = chart.scales['y'];
    if (avg == null || !yScale) return;
    const yPixel = yScale.getPixelForValue(avg);
    if (yPixel < chart.chartArea.top || yPixel > chart.chartArea.bottom) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(125, 28, 40, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.moveTo(chartArea.left, yPixel);
    ctx.lineTo(chartArea.right, yPixel);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `600 11px ${CHART_FONT.family}`;
    ctx.fillStyle = '#7d1c28';
    ctx.textAlign = 'right';
    ctx.fillText(`ค่าเฉลี่ย ${formatNumber(avg)}`, chartArea.right - 4, yPixel - 5);
    ctx.restore();
  }
};

/* ════════════════════════════════════════════════
   Chart rendering
   ════════════════════════════════════════════════ */

function baseTooltipStyle(): Record<string, unknown> {
  return {
    backgroundColor: TOOLTIP_BG,
    titleColor: '#fff',
    bodyColor: 'rgba(255,255,255,0.9)',
    titleFont: { ...CHART_FONT, weight: 'bold' as const, size: 13 },
    bodyFont: { ...CHART_FONT, size: 12 },
    padding: { top: 10, bottom: 10, left: 14, right: 14 },
    cornerRadius: 10
  };
}

function renderMonthlyLineChart(labels: string[], items: MonthlyDvalueItem[]): void {
  destroyChart('monthly');
  if (!monthlyChartRef.value) return;

  const mobile = isMobile();
  const values = items.map((i) => i.dvalue);
  const avg = monthlyAverage.value;
  const pointColors = values.map((v) => trendColor(v, avg).line);

  const chart = new Chart(monthlyChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'มูลค่าจ่ายออก (บาท)',
          data: values,
          segment: {
            borderColor: (ctx: any) => trendColor(ctx.p1.parsed.y, avg).line,
            backgroundColor: (ctx: any) => trendColor(ctx.p1.parsed.y, avg).fill
          },
          borderColor: TREND_HIGH.line,
          backgroundColor: TREND_HIGH.fill,
          borderWidth: 2.5,
          fill: 'origin',
          tension: 0.35,
          pointBackgroundColor: '#ffffff',
          pointBorderColor: pointColors,
          pointBorderWidth: 2,
          pointRadius: mobile ? 4 : 5,
          pointHoverRadius: mobile ? 7 : 8,
          pointHoverBackgroundColor: pointColors,
          pointHoverBorderColor: '#ffffff'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: mobile ? 900 : 1200, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltipStyle(),
          callbacks: {
            title: (ctxItems) => items[ctxItems[0]?.dataIndex ?? 0]?.['เดือน'] ?? '',
            label: (ctxItem) => {
              const row = items[ctxItem.dataIndex];
              const lines = [`มูลค่า: ${formatNumber(ctxItem.parsed.y as number, 2)} บาท`];
              if (row) {
                lines.push(`จำนวนรายการ: ${formatNumber(row['จำนวนรายการ'])}`);
                lines.push(`td: ${formatNumber(row.td)}`);
              }
              return lines;
            }
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
    },
    plugins: [averageLinePlugin]
  });

  (chart as any).__average = avg;
  charts.set('monthly', chart);
  observeCanvasResize('monthly', monthlyChartRef.value, chart);
}

function renderCompareChart(labels: string[], remain: number[], rvalue: number[], dvalue: number[]): void {
  destroyChart('compare');
  if (!compareChartRef.value) return;
  const mobile = isMobile();

  const chart = new Chart(compareChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'มูลค่ายกมา', data: remain, backgroundColor: '#e2a63d', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.7 },
        { label: 'มูลค่านำเข้า', data: rvalue, backgroundColor: '#0f6e56', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.7 },
        { label: 'มูลค่าจ่ายออก', data: dvalue, backgroundColor: '#e2384a', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.7 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: mobile ? 800 : 1100, easing: 'easeOutQuart' },
      plugins: {
        legend: { position: 'top', labels: { boxWidth: 10, boxHeight: 10, font: { ...CHART_FONT, size: 11 }, padding: 12 } },
        tooltip: {
          ...baseTooltipStyle(),
          callbacks: { label: (ctxItem) => `${ctxItem.dataset.label}: ${formatNumber(ctxItem.parsed.y as number, 2)} บาท` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: TICK_COLOR, font: { ...CHART_FONT, size: mobile ? 10 : 11 } } },
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
    },
    plugins: []
  });

  charts.set('compare', chart);
  observeCanvasResize('compare', compareChartRef.value, chart);
}

function renderDoughnut(
  key: string,
  canvas: HTMLCanvasElement | null,
  labels: string[],
  values: number[],
  palette: readonly string[],
  valueLabel = '',
  details?: DoughnutDetail[]
): void {
  destroyChart(key);
  if (!canvas || !values.length || values.every((v) => v === 0)) return;

  const mobile = isMobile();
  const total = values.reduce((a, b) => a + b, 0);
  // ใช้ modulo แทน .slice() เพื่อให้จำนวนสีตรงกับจำนวนข้อมูลเสมอ
  // (slice(0, values.length) จะสั้นกว่าข้อมูลจริงถ้า values.length > palette.length)
  const colors = values.map((_, i) => palette[i % palette.length] ?? '#999999');

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [...labels],
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map((c) => c + 'DD'),
          borderWidth: 2,
          borderColor: '#ffffff',
          hoverBorderColor: '#ffffff',
          hoverOffset: 10
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: { duration: mobile ? 700 : 1000, easing: 'easeOutQuart' },
      layout: { padding: mobile ? 4 : 12 },
      onHover(_event, elements) {
        if (key === 'ttr' || key === 'imported') {
          topTenHighlight[key as TopTenKey] = elements.length ? elements[0]!.index : null;
        }
        if (key === 'monthlyPie') {
          highlightedPieIndex.value = elements.length ? elements[0]!.index : null;
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...baseTooltipStyle(),
          displayColors: true,
          callbacks: {
            title: (ctxItems) => labels[ctxItems[0]?.dataIndex ?? 0] ?? '',
            label: (ctxItem) => {
              const idx = ctxItem.dataIndex;
              const val = Math.round((ctxItem.parsed as number) ?? 0);
              const pct = total > 0 ? Math.round((val / total) * 100).toString() : '0';
              const detail = details?.[idx];

              if (detail) {
                const lines: string[] = [];
                if (detail.strength) lines.push(`ขนาด: ${detail.strength}`);
                lines.push(`${detail.quantityLabel}: ${formatNumber(val)} ${detail.unit}`.trim());
                lines.push(`${detail.moneyLabel}: ${formatNumber(detail.moneyValue)} บาท`);
                lines.push(`สัดส่วน: ${pct}%`);
                return lines;
              }

              const prefix = valueLabel ? `${valueLabel}: ` : '';
              return ` ${prefix}${formatNumber(val)} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: []
  });

  charts.set(key, chart);
  observeCanvasResize(key, canvas, chart);
}

/* ════════════════════════════════════════════════
   Resize (debounced)
   ════════════════════════════════════════════════ */

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
function handleResize(): void {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeAllCharts, 200);
}

/* ════════════════════════════════════════════════
   Lifecycle
   ════════════════════════════════════════════════ */

onMounted(() => {
  window.addEventListener('resize', handleResize);
  fetchAll();
});

watch(fiscalYear, () => {
  fetchAll();
});

watch(selectedMonth, () => {
  fetchTopTenOnly();
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  if (resizeTimer) clearTimeout(resizeTimer);
  destroyAllCharts();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap');

.dashboard-page {
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
@keyframes barGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
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

.anim-slide-up { animation: fadeSlideUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--delay, 0s); }
.anim-bar-grow { transform-origin: left center; animation: barGrow 0.7s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--delay, 0s); }
.anim-fade-in { animation: fadeIn 0.4s ease both; animation-delay: var(--delay, 0s); }
.stat-card { animation: cardPop 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; animation-delay: var(--delay, 0s); }

@media (prefers-reduced-motion: reduce) {
  .anim-slide-up, .anim-bar-grow, .anim-fade-in, .stat-card { animation: none !important; }
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

.hero-inner { position: relative; z-index: 2; max-width: 1280px; margin: 0 auto; }
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
  font-size: clamp(24px, 5vw, 34px);
  font-weight: 700; color: #ffffff;
  line-height: 1.15; letter-spacing: -0.01em;
}
.hero-subtitle { font-size: 14px; color: rgba(255, 255, 255, 0.6); margin-top: 6px; }

.hero-tear {
  position: absolute; left: 0; right: 0; bottom: 0; height: 18px;
  background: radial-gradient(circle at 9px 0, var(--bg) 9px, transparent 9.5px) 0 0 / 18px 18px repeat-x;
}

/* ── Stat cards ── */
.card-row {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;
  max-width: 1280px; margin: 28px auto 0; position: relative; z-index: 3;
}
.stat-card {
  position: relative; display: flex; align-items: center; gap: 16px;
  background: var(--card); border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--r); padding: 20px 20px; box-shadow: var(--shadow-md);
  overflow: hidden; transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s;
}
.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }
.stat-card__shine {
  position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transition: left 0.6s; pointer-events: none;
}
.stat-card:hover .stat-card__shine { left: 120%; }
.stat-card__icon { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.stat-card__body { display: flex; flex-direction: column; min-width: 0; }
.stat-card__label { font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 4px; }
.stat-card__row { display: flex; align-items: baseline; gap: 6px; }
.stat-card__value { font-family: 'IBM Plex Mono', monospace; font-size: clamp(19px, 3.2vw, 25px); font-weight: 700; line-height: 1.2; letter-spacing: -0.01em; }
.stat-card__unit { font-size: 13px; color: var(--text-3); font-weight: 400; }
.stat-card__value--counting { font-variant-numeric: tabular-nums; }
.stat-card__icon--pulse { animation: icon-pulse 0.8s ease-in-out infinite alternate; }
@keyframes icon-pulse { 0% { transform: scale(1); opacity: 0.85; } 100% { transform: scale(1.08); opacity: 1; } }

/* ── Content / filter ── */
.content-area { max-width: 1280px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 2; }

.error-banner { background: #fdecea; color: #7d1c28; max-width: 480px; }

.filter-bar {
  background: var(--card); border: 1px solid var(--border); border-radius: var(--r);
  padding: 16px 20px; box-shadow: var(--shadow-sm); margin: 20px 0;
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
.panel__canvas--monthly { height: 340px; }
.panel__canvas--compare { height: 340px; }
.panel__canvas--doughnut { height: 280px; }

.chart-combo { display: flex; gap: 24px; align-items: flex-start; }
.chart-combo__bar { flex: 3; min-width: 0; }
.chart-combo__pie { flex: 2; min-width: 0; display: flex; flex-direction: column; }

.legend-inline { display: flex; align-items: center; gap: 7px; flex-shrink: 0; }
.legend-inline__dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.legend-inline__text { font-size: 12px; font-weight: 600; color: var(--text-2); }

.pie-heading { font-size: 13px; font-weight: 700; color: var(--forest-700); margin-bottom: 10px; }

.html-legend { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 20px; margin-top: 14px; }
.html-legend__row {
  display: flex; align-items: center; gap: 8px; padding: 5px 6px; min-width: 0;
  border-radius: 8px; cursor: pointer; transition: background 0.2s ease, opacity 0.3s ease, transform 0.2s ease;
}
.html-legend__row:hover { background: rgba(67, 13, 22, 0.04); }
.html-legend__row--active { background: rgba(67, 13, 22, 0.06); transform: scale(1.02); }
.html-legend__row--dimmed { opacity: 0.3; }
.html-legend__dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; transition: transform 0.2s ease; }
.html-legend__row:hover .html-legend__dot, .html-legend__row--active .html-legend__dot { transform: scale(1.3); }
.html-legend__name { font-size: 13px; color: var(--ink); font-weight: 500; flex: 1; min-width: 0; line-height: 1.35; word-break: break-word; }
.html-legend__pct { font-size: 12px; color: var(--text-2); font-weight: 600; flex-shrink: 0; }

/* ── Top-10 HTML bars ── */
.hbar { display: flex; flex-direction: column; gap: 10px; }
.hbar__row {
  display: flex; align-items: center; gap: 10px; position: relative; cursor: pointer;
  padding: 6px 8px; border-radius: 10px; margin: -4px -6px;
  transition: opacity 0.3s ease, background 0.3s ease, transform 0.2s ease;
}
.hbar__row--active { background: rgba(67, 13, 22, 0.04); transform: scale(1.01); }
.hbar__row--dimmed { opacity: 0.35; }
.hbar__row:not(.hbar__row--dimmed):hover { background: rgba(67, 13, 22, 0.03); }
.hbar__rank { font-size: 11px; font-weight: 700; color: var(--text-3); min-width: 24px; text-align: center; flex-shrink: 0; }
.hbar__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.hbar__label { font-size: 13px; font-weight: 700; color: var(--forest-900); line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hbar__track { display: flex; align-items: center; gap: 8px; height: 27px; background: #f2ece9; border-radius: 999px; overflow: visible; position: relative; }
.hbar__fill { height: 100%; border-radius: 999px; display: flex; align-items: center; justify-content: flex-end; padding: 0 10px; min-width: 26px; box-sizing: border-box; transition: filter 0.2s; }
.hbar__fill--teal { background: linear-gradient(90deg, #5dcaa5, #0f6e56); }
.hbar__fill--coral { background: linear-gradient(90deg, #ec8a63, #993c1d); }
.hbar__row:hover .hbar__fill { filter: brightness(1.06); }
.hbar__val-inside { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: #fff; white-space: nowrap; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); }
.hbar__val-outside { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 700; color: var(--text-2); white-space: nowrap; flex-shrink: 0; }

.pie-section { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--border); }

.tag { display: inline-flex; align-items: center; flex-shrink: 0; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 999px; }
.tag--teal { color: #0f6e56; background: #e1f5ee; border: 1px solid rgba(15, 110, 86, 0.35); }
.tag--coral { color: #993c1d; background: #faece7; border: 1px solid rgba(153, 60, 29, 0.35); }

.twin-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.twin-grid .panel { margin-bottom: 0; }

.dash-footer { text-align: center; padding: 24px 16px 8px; font-size: 12px; color: var(--text-3); }

/* ═══════════════ Responsive ═══════════════ */

/* Tablet / small laptop */
@media (min-width: 600px) and (max-width: 1023px) {
  .hero-header { padding: 32px 20px 84px; }
  .filter-bar__fields { flex-wrap: wrap; }
  .fiscal-field, .month-field { flex: 1 1 100%; min-width: 0; }
  .panel__canvas--monthly, .panel__canvas--compare { height: 300px; }
  .panel__canvas--doughnut { height: 240px; }
  .twin-grid { grid-template-columns: 1fr; }
  .chart-combo { flex-direction: column; }
}

/* Large desktop */
@media (min-width: 1440px) {
  .panel__canvas--monthly, .panel__canvas--compare { height: 380px; }
  .panel__canvas--doughnut { height: 300px; }
}

/* Desktop-only fallback for the range between mobile and 1024px twin-grid stacking */
@media (max-width: 1023px) {
  .twin-grid { grid-template-columns: 1fr; }
  .chart-combo { flex-direction: column; }
}

/* Mobile */
@media (max-width: 599px) {
  .hero-header { padding: 28px 16px 96px; border-radius: 0 0 22px 22px; margin-bottom: -52px; }
  .hero-decor--cross { display: none; }
  .hero-title { font-size: 24px; }
  .hero-subtitle { font-size: 12px; }
  .card-row { gap: 10px; margin-top: 20px; }
  .stat-card { flex-direction: column; align-items: flex-start; gap: 10px; padding: 14px; border-radius: var(--r-sm); }
  .stat-card:hover { transform: none; box-shadow: var(--shadow-md); }
  .stat-card__icon { width: 42px; height: 42px; border-radius: 10px; }
  .stat-card__value { font-size: 20px; }
  .content-area { padding: 0 12px; }
  .filter-bar { padding: 12px; margin: 16px 0; border-radius: var(--r-sm); }
  .filter-bar__fields { flex-direction: column; align-items: stretch; gap: 8px; }
  .fiscal-field, .month-field { width: 100% !important; flex: 0 0 auto; }
  .panel { padding: 14px; margin-bottom: 14px; border-radius: var(--r-sm); }
  .panel__head { flex-direction: column; align-items: flex-start; margin-bottom: 14px; }
  .panel__title { font-size: 14px; }
  .panel__sub { margin-left: 0; }
  .panel__canvas--monthly, .panel__canvas--compare { height: 240px; }
  .panel__canvas--doughnut { height: 220px; }
  .chart-combo { flex-direction: column; gap: 14px; }
  .pie-section { margin-top: 16px; padding-top: 14px; }
  .html-legend { grid-template-columns: 1fr; gap: 2px; margin-top: 12px; }
  .html-legend__name { font-size: 12px; }
  .hbar { gap: 8px; }
  .hbar__label { font-size: 12px; }
  .hbar__track { height: 24px; }
  .hbar__val-inside, .hbar__val-outside { font-size: 10px; }
  .twin-grid { gap: 14px; }
  .tag { font-size: 10px; padding: 3px 10px; }
}

@media (max-width: 380px) {
  .hero-header { padding: 20px 12px 84px; margin-bottom: -46px; }
  .hero-title { font-size: 22px; }
  .content-area { padding: 0 10px; }
  .card-row { grid-template-columns: 1fr; gap: 8px; }
  .stat-card { flex-direction: row; align-items: center; gap: 12px; padding: 14px; }
  .stat-card__value { font-size: 20px; }
  .panel__canvas--monthly, .panel__canvas--compare { height: 200px; }
  .panel__canvas--doughnut { height: 190px; }
  .panel { padding: 12px; }
}

@media (hover: none) and (pointer: coarse) {
  .stat-card:hover { transform: none; box-shadow: var(--shadow-md); }
  .stat-card__shine { display: none; }
  .filter-field :deep(.q-field__control) { min-height: 44px; }
}
</style>

<!-- Global tooltip style (unscoped, matches q-tooltip rendering outside the component root) -->
<style>
.hbar-tooltip {
  background: #430d16 !important;
  border-radius: 12px !important;
  padding: 10px 14px !important;
  font-family: 'IBM Plex Sans Thai', 'Inter', sans-serif;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.hbar-tooltip__name { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 6px; line-height: 1.35; }
.hbar-tooltip__line { font-size: 12px; color: rgba(255, 255, 255, 0.85); margin-bottom: 2px; }
</style>