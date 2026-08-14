<template>
  <q-page class="dashboard-page">
    <!-- Hero header -->
    <div class="hero">
      <div class="hero-blister"></div>
      <div class="hero-blister hero-blister--offset"></div>
      <div class="med-cross"></div>

      <div class="hero-content">
        <div class="hero-badge">
          <span class="hero-badge__rx">℞</span>
          ระบบคลังยา
        </div>
        <div class="hero-title">Dashboard</div>
        <div class="hero-subtitle">
          ภาพรวมคลังยา · ปีงบประมาณ {{ currentFiscalLabel }}
        </div>

        <div class="row q-col-gutter-md hero-stats">
          <div class="col-12 col-sm-6 col-md-6">
            <q-card class="stat-card stat-card--drug" flat>
              <div class="stat-card__tab"></div>
              <q-card-section class="row items-center no-wrap">
                <q-avatar class="stat-avatar stat-avatar--drug" size="52px">
                  <q-icon name="medication" size="26px" />
                </q-avatar>
                <div class="q-ml-md">
                  <div class="stat-label">จำนวนคลังยาทั้งหมด</div>
                  <div class="stat-value">
                    {{ drugDisplay }}
                    <span class="stat-unit">รายการ</span>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-sm-6 col-md-6">
            <q-card class="stat-card stat-card--balance" flat>
              <div class="stat-card__tab"></div>
              <q-card-section class="row items-center no-wrap">
                <q-avatar class="stat-avatar stat-avatar--balance" size="52px">
                  <q-icon name="account_balance_wallet" size="26px" />
                </q-avatar>
                <div class="q-ml-md">
                  <div class="stat-label">มูลค่าคงเหลือรวม</div>
                  <div class="stat-value">
                    {{ balanceDisplay }}
                    <span class="stat-unit">บาท</span>
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>

      <div class="hero-tear"></div>
    </div>

    <!-- Filter card -->
    <div class="q-px-md filter-wrap">
      <q-card class="filter-card" flat bordered>
        <q-card-section>
          <div class="filter-title">
            <q-icon name="tune" size="20px" />
            <span>ตัวกรอง</span>
          </div>

          <div class="toolbar-right">
            <q-select
              v-model="fiscalYear"
              :options="filteredFiscalYears"
              option-value="value"
              option-label="label"
              label="ปีงบประมาณ"
              outlined
              dense
              emit-value
              map-options
              use-input
              fill-input
              hide-selected
              input-debounce="0"
              class="year-select"
              @filter="filterFiscalYears"
              @update:model-value="onFiscalYearChange"
              @clear="filteredFiscalYears = fiscalYears"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">ไม่พบปีงบประมาณ</q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-select
              v-model="activeMonth"
              :options="fiscalMonths"
              option-value="value"
              option-label="label"
              label="เดือน"
              emit-value
              map-options
              dense
              outlined
              clearable
              class="month-select"
              @update:model-value="onMonthChange"
              @clear="onMonthChange"
            />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <div class="q-px-md">
      <div class="row justify-center q-mt-xl" v-if="loading">
        <div class="column items-center">
          <q-spinner-dots color="primary" size="40px" />
          <div class="text-caption text-grey-6 q-mt-sm">กำลังโหลดข้อมูล...</div>
        </div>
      </div>

      <div class="row justify-center q-mt-lg" v-if="hasError">
        <q-banner class="bg-red-1 text-red-9 error-banner" rounded>
          <template v-slot:avatar>
            <q-icon name="error" color="red" />
          </template>
          โหลดข้อมูลแดชบอร์ดไม่สำเร็จ
          <template v-slot:action>
            <q-btn flat color="red" label="ลองใหม่" @click="fetchDashboardData" />
          </template>
        </q-banner>
      </div>
    </div>

    <!-- ===================== TOP 10 SIDE-BY-SIDE ===================== -->
    <div class="q-px-md q-mt-md q-mb-lg">
      <div class="row q-col-gutter-md top-ten-row">
        <!-- LEFT: TTR (คงคลัง) -->
        <div class="col-12 col-md-6">
          <q-card class="rank-card rank-card--teal" flat bordered>
            <q-card-section class="rank-header">
              <div class="rank-title-group">
                <div class="rank-title">
                  <q-icon name="bar_chart" size="20px" />
                  <span>Top 10 ยาที่คงเหลือในคลัง (TTR)</span>
                </div>
                <div class="rank-subtitle">{{ ttrSubLabel }}</div>
              </div>
              <div class="rank-badge rank-badge--teal">คงคลัง</div>
            </q-card-section>

            <q-separator />

            <q-card-section v-if="ttrLoading" class="rank-state">
              <q-spinner-dots color="primary" size="36px" />
              <div class="text-caption text-grey-6 q-mt-sm">กำลังโหลดข้อมูล...</div>
            </q-card-section>

            <q-card-section v-else-if="ttrHasError" class="rank-state">
              <q-icon name="error_outline" size="32px" color="negative" />
              <div class="text-caption text-grey-7 q-mt-sm">โหลดข้อมูลไม่สำเร็จ</div>
              <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchTtrData" />
            </q-card-section>

            <q-card-section v-else-if="!ttrItems.length" class="rank-state">
              <q-icon name="inbox" size="32px" color="grey-5" />
              <div class="text-caption text-grey-6 q-mt-sm">ไม่มีข้อมูลในช่วงเวลานี้</div>
            </q-card-section>

            <template v-else>
              <q-card-section class="rank-pill-list">
                <div v-for="(item, idx) in ttrItems" :key="item.id" class="rank-pill-row rank-pill-row--hover">
                  <div class="rank-pill-rank">#{{ idx + 1 }}</div>
                  <div class="rank-pill-body">
                    <div class="rank-pill-name">{{ item.drugitem?.name ?? item.icode }}</div>
                    <div class="rank-pill-track">
                      <div
                        class="rank-pill-fill rank-pill-fill--teal"
                        :style="{ width: Math.max(ttrBarPercent(item.ttr), 8) + '%' }"
                      >
                        <span v-if="ttrBarPercent(item.ttr) > 22" class="rank-pill-value rank-pill-value--inside">
                          {{ formatNumber(item.ttr) }}
                        </span>
                      </div>
                      <span v-if="ttrBarPercent(item.ttr) <= 22" class="rank-pill-value rank-pill-value--outside rank-pill-value--outside-teal">
                        {{ formatNumber(item.ttr) }}
                      </span>
                      <q-tooltip
                        anchor="top middle"
                        self="bottom middle"
                        class="rank-tooltip rank-tooltip--teal"
                        transition-show="jump-up"
                        transition-hide="jump-down"
                      >
                        <div class="rank-tooltip-title">{{ item.drugitem?.name ?? item.icode }}</div>
                        <div v-if="item.drugitem?.strength" class="rank-tooltip-line">ขนาด: {{ item.drugitem.strength }}</div>
                        <div class="rank-tooltip-line">TTR: {{ formatNumber(item.ttr) }} {{ item.unit }}</div>
                        <div class="rank-tooltip-line">มูลค่ารับ: {{ formatNumber(item.bal_value ?? 0) }} บาท</div>
                      </q-tooltip>
                    </div>
                  </div>
                </div>
              </q-card-section>

              <q-separator />
              <q-card-section class="rank-donut-section">
                <div class="rank-donut-title">สัดส่วน TTR</div>
                <div class="rank-donut-wrap">
                  <canvas ref="ttrDonutRef"></canvas>
                </div>
              </q-card-section>
            </template>
          </q-card>
        </div>

        <!-- RIGHT: จ่ายออก (TopTentr) -->
        <div class="col-12 col-md-6">
          <q-card class="rank-card rank-card--coral" flat bordered>
            <q-card-section class="rank-header">
              <div class="rank-title-group">
                <div class="rank-title">
                  <q-icon name="local_shipping" size="20px" />
                  <span>Top 10 ยาที่จ่ายออกมากที่สุด</span>
                </div>
                <div class="rank-subtitle">{{ dispensedSubLabel }}</div>
              </div>
              <div class="rank-badge rank-badge--coral">จ่ายออก</div>
            </q-card-section>

            <q-separator />

            <q-card-section v-if="dispensedLoading" class="rank-state">
              <q-spinner-dots color="primary" size="36px" />
              <div class="text-caption text-grey-6 q-mt-sm">กำลังโหลดข้อมูล...</div>
            </q-card-section>

            <q-card-section v-else-if="dispensedHasError" class="rank-state">
              <q-icon name="error_outline" size="32px" color="negative" />
              <div class="text-caption text-grey-7 q-mt-sm">โหลดข้อมูลไม่สำเร็จ</div>
              <q-btn flat dense color="primary" label="ลองใหม่" class="q-mt-sm" @click="fetchDispensedData" />
            </q-card-section>

            <q-card-section v-else-if="!dispensedItems.length" class="rank-state">
              <q-icon name="inbox" size="32px" color="grey-5" />
              <div class="text-caption text-grey-6 q-mt-sm">ไม่มีข้อมูลในช่วงเวลานี้</div>
            </q-card-section>

            <template v-else>
              <q-card-section class="rank-pill-list">
                <div v-for="(item, idx) in dispensedItems" :key="item.id" class="rank-pill-row rank-pill-row--hover">
                  <div class="rank-pill-rank">#{{ idx + 1 }}</div>
                  <div class="rank-pill-body">
                    <div class="rank-pill-name">{{ item.drugitem?.name ?? item.icode }}</div>
                    <div class="rank-pill-track">
                      <div
                        class="rank-pill-fill rank-pill-fill--coral"
                        :style="{ width: Math.max(dispensedBarPercent(item.tr), 8) + '%' }"
                      >
                        <span v-if="dispensedBarPercent(item.tr) > 22" class="rank-pill-value rank-pill-value--inside">
                          {{ formatNumber(item.tr) }}
                        </span>
                      </div>
                      <span v-if="dispensedBarPercent(item.tr) <= 22" class="rank-pill-value rank-pill-value--outside rank-pill-value--outside-coral">
                        {{ formatNumber(item.tr) }}
                      </span>
                      <q-tooltip
                        anchor="top middle"
                        self="bottom middle"
                        class="rank-tooltip rank-tooltip--coral"
                        transition-show="jump-up"
                        transition-hide="jump-down"
                      >
                        <div class="rank-tooltip-title">{{ item.drugitem?.name ?? item.icode }}</div>
                        <div v-if="item.drugitem?.strength" class="rank-tooltip-line">ขนาด: {{ item.drugitem.strength }}</div>
                        <div class="rank-tooltip-line">จำนวน: {{ formatNumber(item.tr) }}</div>
                        <div class="rank-tooltip-line">มูลค่าจ่ายออก: {{ formatNumber(item.rvalue) }} บาท</div>
                      </q-tooltip>
                    </div>
                   
                  </div>
                </div>
              </q-card-section>

              <q-separator />
              <q-card-section class="rank-donut-section">
                <div class="rank-donut-title">สัดส่วนจำนวนจ่ายออก</div>
                <div class="rank-donut-wrap">
                  <canvas ref="dispensedDonutRef"></canvas>
                </div>
              </q-card-section>
            </template>
          </q-card>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { api } from '@/boot/axios';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js';

interface TotalDrugResponse {
  total_drug_items: number;
}

interface BalanceResponse {
  total_balance_value: string | number;
}

interface FiscalYearOption {
  label: string;
  value: number;
}

interface FiscalMonthOption {
  label: string;
  value: number;
  gYear: number;
  yearmonth: string;
}

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
  rvalue: number;
  drugitem?: DrugItemInfo | null;
}

const loading = ref(true);
const hasError = ref(false);

const balanceValue = ref(0);
const drugValue = ref(0);

const balanceDisplay = ref('0');
const drugDisplay = ref('0');

function toBuddhistYear(gYear: number) {
  return gYear + 543;
}

function buildFiscalYears(): FiscalYearOption[] {
  const now = new Date();
  const gYear = now.getFullYear();
  const gMonth = now.getMonth() + 1;
  const currentFiscalGYear = gMonth >= 10 ? gYear + 1 : gYear;
  const currentFiscalBE = toBuddhistYear(currentFiscalGYear);

  const startBEYear = 2564;
  const endBEYear = currentFiscalBE;

  const list: FiscalYearOption[] = [];
  for (let endBE = startBEYear; endBE <= endBEYear; endBE++) {
    const startBE = endBE - 1;
    const isCurrent = endBE === currentFiscalBE;
    list.push({
      value: endBE - 543,
      label: `พ.ศ. ${endBE} (ต.ค. ${startBE} – ก.ย. ${endBE})${isCurrent ? ' ★' : ''}`,
    });
  }
  return list.reverse();
}

const fiscalYears = ref<FiscalYearOption[]>(buildFiscalYears());
const filteredFiscalYears = ref<FiscalYearOption[]>(fiscalYears.value);
const fiscalYear = ref<number>(
  fiscalYears.value.find((y) => y.label.includes('★'))?.value ??
    fiscalYears.value[fiscalYears.value.length - 1]!.value
);

const currentFiscalLabel = computed(() => `พ.ศ. ${toBuddhistYear(fiscalYear.value)}`);

function filterFiscalYears(val: string, update: (cb: () => void) => void) {
  update(() => {
    const needle = val.toLowerCase();
    filteredFiscalYears.value = fiscalYears.value.filter((y) =>
      y.label.toLowerCase().includes(needle)
    );
  });
}

const thaiMonthNames = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const fiscalMonthOrder = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function buildFiscalMonths(endGYear: number): FiscalMonthOption[] {
  const startGYear = endGYear - 1;

  return fiscalMonthOrder.map((m) => {
    const gYear = m >= 10 ? startGYear : endGYear;
    return {
      label: thaiMonthNames[m - 1] as string,
      value: m,
      gYear,
      yearmonth: `${gYear}-${String(m).padStart(2, '0')}`,
    };
  });
}

const fiscalMonths = ref<FiscalMonthOption[]>(buildFiscalMonths(fiscalYear.value));
const activeMonth = ref<number | null>(null);

function onFiscalYearChange() {
  fiscalMonths.value = buildFiscalMonths(fiscalYear.value);
  const stillExists = fiscalMonths.value.some((m) => m.value === activeMonth.value);
  if (!stillExists) {
    activeMonth.value = null;
  }
  fetchDashboardData();
  fetchTtrData();
  fetchDispensedData();
}

function onMonthChange() {
  fetchDashboardData();
  fetchTtrData();
  fetchDispensedData();
}

function animateCount(
  target: number,
  onUpdate: (val: number) => void,
  duration = 1500,
  decimals = 0
) {
  const start = 0;
  const startTime = performance.now();

  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = start + (target - start) * eased;

    onUpdate(Number(current.toFixed(decimals)));

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onUpdate(Number(target.toFixed(decimals)));
    }
  }

  requestAnimationFrame(step);
}

function formatNumber(num: number, decimals = 0) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function truncateLabel(label: string, max = 22) {
  return label.length > max ? label.slice(0, max - 1) + '…' : label;
}

// กันไว้เผื่อ backend ส่งแถวซ้ำ (icode/ยาเดียวกันมาหลายแถว) — เก็บเฉพาะแถวแรกต่อ icode
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

async function fetchDashboardData() {
  loading.value = true;
  hasError.value = false;

  try {
    const params: Record<string, string | number> = {
      financialYear: fiscalYear.value,
    };
    if (activeMonth.value) {
      params.month = activeMonth.value;
    }

    const [balanceRes, drugRes] = await Promise.all([
      api.get<BalanceResponse>('/dashboard/tbvalue', { params }),
      api.get<TotalDrugResponse>('/dashboard/totalDrug', { params }),
    ]);

    balanceValue.value = parseFloat(String(balanceRes.data.total_balance_value)) || 0;
    drugValue.value = drugRes.data.total_drug_items ?? 0;

    animateCount(balanceValue.value, (val) => {
      balanceDisplay.value = formatNumber(val, 0);
    }, 1800, 0);

    animateCount(drugValue.value, (val) => {
      drugDisplay.value = formatNumber(val, 0);
    }, 1800, 0);
  } catch (err) {
    console.error('Failed to fetch dashboard data:', err);
    hasError.value = true;
  } finally {
    loading.value = false;
  }
}

// ===================== LEFT: TOP 10 TTR =====================
const ttrLoading = ref(true);
const ttrHasError = ref(false);
const ttrItems = ref<TopTenTtrItem[]>([]);
const ttrDonutRef = ref<HTMLCanvasElement | null>(null);
let ttrDonutInstance: Chart | null = null;

const ttrMaxValue = computed(() => {
  return ttrItems.value.reduce((max, i) => Math.max(max, i.ttr), 0) || 1;
});

function ttrBarPercent(value: number) {
  return Math.round((value / ttrMaxValue.value) * 100);
}

const ttrSubLabel = computed(() => {
  return activeMonth.value
    ? `${thaiMonthNames[activeMonth.value - 1]} · ${currentFiscalLabel.value}`
    : `ทุกเดือน · ${currentFiscalLabel.value}`;
});

async function fetchTtrData() {
  ttrLoading.value = true;
  ttrHasError.value = false;

  try {
    const params: Record<string, number> = { financialYear: fiscalYear.value };
    if (activeMonth.value) params.month = activeMonth.value;

    const res = await api.get<TopTenTtrItem[]>('/dashboard/TopTenttr', { params });
    ttrItems.value = dedupeByIcode(res.data ?? []);
    ttrLoading.value = false;
    await nextTick();
    renderDonut(ttrDonutRef, ttrDonutInstance, ttrItems.value.map((i) => i.drugitem?.name ?? i.icode), ttrItems.value.map((i) => i.ttr), tealShades, (inst) => (ttrDonutInstance = inst));
  } catch (err) {
    console.error('Failed to fetch TopTenTtr:', err);
    ttrHasError.value = true;
  } finally {
    ttrLoading.value = false;
  }
}

// ===================== RIGHT: TOP 10 TR (จ่ายออก) =====================
const dispensedLoading = ref(true);
const dispensedHasError = ref(false);
const dispensedItems = ref<TopTenTrItem[]>([]);
const dispensedDonutRef = ref<HTMLCanvasElement | null>(null);
let dispensedDonutInstance: Chart | null = null;

const dispensedMaxValue = computed(() => {
  return dispensedItems.value.reduce((max, i) => Math.max(max, i.tr), 0) || 1;
});

function dispensedBarPercent(value: number) {
  return Math.round((value / dispensedMaxValue.value) * 100);
}

const dispensedSubLabel = computed(() => {
  return activeMonth.value
    ? `${thaiMonthNames[activeMonth.value - 1]} · ${currentFiscalLabel.value}`
    : `ทุกเดือน · ${currentFiscalLabel.value}`;
});

async function fetchDispensedData() {
  dispensedLoading.value = true;
  dispensedHasError.value = false;

  try {
    const params: Record<string, number> = { financialYear: fiscalYear.value };
    if (activeMonth.value) params.month = activeMonth.value;

    const res = await api.get<TopTenTrItem[]>('/dashboard/TopTentr', { params });
    dispensedItems.value = dedupeByIcode(res.data ?? []);
    dispensedLoading.value = false;
    await nextTick();
    renderDonut(dispensedDonutRef, dispensedDonutInstance, dispensedItems.value.map((i) => i.drugitem?.name ?? i.icode), dispensedItems.value.map((i) => i.tr), coralShades, (inst) => (dispensedDonutInstance = inst));
  } catch (err) {
    console.error('Failed to fetch TopTentr:', err);
    dispensedHasError.value = true;
  } finally {
    dispensedLoading.value = false;
  }
}

// ===================== SHARED DONUT RENDERER =====================
const tealShades = [
  '#0f6e56', '#159672', '#1ba887', '#2fbe9c', '#5dcaa5',
  '#7cd6b7', '#9fe1cb', '#bfeadb', '#dcf4ea', '#eef9f4',
];

const coralShades = [
  '#993c1d', '#b8481f', '#d85a30', '#e26f45', '#ec8a63',
  '#f0997b', '#f3ac95', '#f6c0b0', '#f9d4c9', '#fbe4dd',
];

function renderDonut(
  canvasRefObj: { value: HTMLCanvasElement | null },
  existingInstance: Chart | null,
  rawLabels: string[],
  data: number[],
  shades: string[],
  setInstance: (inst: Chart | null) => void
) {
  if (!canvasRefObj.value) return;
  if (existingInstance) {
    existingInstance.destroy();
    setInstance(null);
  }

  const ctx = canvasRefObj.value.getContext('2d');
  if (!ctx) return;

  const labels = rawLabels.map((l) => truncateLabel(l, 18));

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: shades,
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 10, boxHeight: 10, font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          backgroundColor: '#430d16',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx) => {
              const value = ctx.parsed as number;
              const total = data.reduce((sum, v) => sum + v, 0) || 1;
              const pct = ((value / total) * 100).toFixed(1);
              return `${formatNumber(value)} (${pct}%)`;
            },
          },
        },
      },
    },
  };

  setInstance(new Chart(ctx, config));
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(async () => {
    await nextTick();
    if (ttrItems.value.length) {
      renderDonut(ttrDonutRef, ttrDonutInstance, ttrItems.value.map((i) => i.drugitem?.name ?? i.icode), ttrItems.value.map((i) => i.ttr), tealShades, (inst) => (ttrDonutInstance = inst));
    }
    if (dispensedItems.value.length) {
      renderDonut(dispensedDonutRef, dispensedDonutInstance, dispensedItems.value.map((i) => i.drugitem?.name ?? i.icode), dispensedItems.value.map((i) => i.tr), coralShades, (inst) => (dispensedDonutInstance = inst));
    }
  }, 200);
}

onMounted(() => {
  fetchDashboardData();
  fetchTtrData();
  fetchDispensedData();
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (ttrDonutInstance) ttrDonutInstance.destroy();
  if (dispensedDonutInstance) dispensedDonutInstance.destroy();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Serif:wght@600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap');

.dashboard-page {
  --ink: #2a1315;
  --forest-900: #430d16;
  --forest-700: #7d1c28;
  --forest-500: #b32a37;
  --amber-500: #e2a63d;
  --amber-100: #fbead0;
  --paper-50: #faf4f2;
  --paper-100: #ffffff;

  background: var(--paper-50);
  min-height: 100%;
  font-family: 'IBM Plex Sans Thai', sans-serif;
  color: var(--ink);
}

.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, var(--forest-900) 0%, var(--forest-700) 65%, var(--forest-500) 125%);
  padding: 40px 24px 100px;
}

.hero-blister {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: radial-gradient(circle, rgba(255, 255, 255, 0.09) 3px, transparent 3.5px);
  background-size: 34px 34px;
  -webkit-mask-image: radial-gradient(130% 110% at 30% -10%, #000 0%, transparent 72%);
  mask-image: radial-gradient(130% 110% at 30% -10%, #000 0%, transparent 72%);
}

.hero-blister--offset {
  background-image: radial-gradient(circle, rgba(226, 166, 61, 0.1) 2.5px, transparent 3px);
  background-position: 17px 17px;
  -webkit-mask-image: radial-gradient(110% 100% at 90% 10%, #000 0%, transparent 65%);
  mask-image: radial-gradient(110% 100% at 90% 10%, #000 0%, transparent 65%);
}

.med-cross {
  position: absolute;
  top: -70px;
  right: -50px;
  width: 300px;
  height: 300px;
  opacity: 0.07;
  transform: rotate(-6deg);
  pointer-events: none;
}

.med-cross::before,
.med-cross::after {
  content: '';
  position: absolute;
  background: #ffffff;
  border-radius: 6px;
}

.med-cross::before {
  top: 0;
  bottom: 0;
  left: 42%;
  right: 42%;
}

.med-cross::after {
  left: 0;
  right: 0;
  top: 42%;
  bottom: 42%;
}

.hero-content {
  position: relative;
  z-index: 1;
  max-width: 1100px;
  margin: 0 auto;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--amber-500);
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.hero-badge__rx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  background: rgba(226, 166, 61, 0.16);
  border: 1px solid rgba(226, 166, 61, 0.4);
  font-family: 'IBM Plex Serif', serif;
  font-size: 13px;
  line-height: 1;
}

.hero-title {
  font-family: 'IBM Plex Serif', serif;
  font-size: 36px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.15;
  letter-spacing: -0.01em;
}

.hero-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 6px;
  margin-bottom: 26px;
}

.hero-stats {
  margin-top: 4px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  background: var(--paper-100);
  box-shadow: 0 10px 24px rgba(11, 46, 34, 0.22);
}

.stat-card__tab {
  position: absolute;
  top: 0;
  left: 0;
  width: 46px;
  height: 6px;
  border-radius: 0 0 6px 0;
}

.stat-card--drug .stat-card__tab {
  background: var(--forest-500);
}

.stat-card--balance .stat-card__tab {
  background: var(--amber-500);
}

.stat-avatar {
  border-radius: 10px;
}

.stat-avatar--drug {
  background: #fbe6e5;
  color: var(--forest-700);
}

.stat-avatar--balance {
  background: var(--amber-100);
  color: #a5720f;
}

.stat-label {
  font-size: 13px;
  color: #5c6b64;
  margin-bottom: 2px;
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 25px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.stat-card--drug .stat-value {
  color: var(--forest-700);
}

.stat-card--balance .stat-value {
  color: #a5720f;
}

.stat-unit {
  font-family: 'IBM Plex Sans Thai', sans-serif;
  font-size: 13px;
  font-weight: 400;
  color: #8b988f;
  margin-left: 2px;
}

.hero-tear {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 18px;
  background: radial-gradient(circle at 9px 0, var(--paper-50) 9px, transparent 9.5px) 0 0 / 18px 18px repeat-x;
}

.filter-wrap {
  margin-top: -48px;
  position: relative;
  z-index: 2;
}

.filter-card {
  border-radius: 10px;
  max-width: 1100px;
  margin: 0 auto;
  background: var(--paper-100);
  border: 1px solid #e2e8e3;
  box-shadow: 0 8px 20px rgba(11, 46, 34, 0.08);
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--forest-700);
  margin-bottom: 12px;
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}

.year-select {
  min-width: 280px;
  flex: 1 1 280px;
}

.month-select {
  min-width: 160px;
  flex: 0 1 160px;
}

.error-banner {
  max-width: 480px;
  width: 100%;
}

/* ===================== TOP 10 SIDE-BY-SIDE ===================== */
.top-ten-row {
  max-width: 1400px;
  margin: 0 auto;
}

.rank-card {
  border-radius: 12px;
  overflow: hidden;
  height: 100%;
}

.rank-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.rank-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 14px;
  color: var(--forest-900);
}

.rank-subtitle {
  font-size: 12px;
  color: #8b988f;
  margin-top: 2px;
  margin-left: 28px;
}

.rank-badge {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  padding: 4px 14px;
}

.rank-badge--teal {
  color: #0f6e56;
  background: #e1f5ee;
  border: 1px solid rgba(15, 110, 86, 0.35);
}

.rank-badge--coral {
  color: #993c1d;
  background: #faece7;
  border: 1px solid rgba(153, 60, 29, 0.35);
}

.rank-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
}

.rank-pill-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 16px;
}

.rank-pill-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.rank-pill-row--hover {
  padding: 6px 8px;
  margin: 0 -8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.rank-pill-row--hover:hover {
  background-color: rgba(67, 13, 22, 0.04);
  transform: translateX(2px);
}

.rank-pill-row--hover:hover .rank-pill-fill {
  filter: brightness(1.08);
  transform: scaleY(1.08);
}

.rank-pill-row--hover:hover .rank-pill-name {
  color: var(--forest-500);
}

.rank-tooltip {
  font-family: 'IBM Plex Sans Thai', sans-serif;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  max-width: 220px;
}

.rank-tooltip--teal {
  background: #0f6e56;
  color: #eef9f4;
}

.rank-tooltip--coral {
  background: #993c1d;
  color: #fbe4dd;
}

.rank-tooltip-title {
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 4px;
  color: #ffffff;
}

.rank-tooltip-line {
  opacity: 0.9;
}

.rank-pill-rank {
  flex-shrink: 0;
  width: 28px;
  padding-top: 22px;
  font-size: 11px;
  font-weight: 700;
  color: #9aa79f;
  text-align: center;
}

.rank-pill-body {
  flex: 1;
  min-width: 0;
}

.rank-pill-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--forest-900);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rank-pill-track {
  position: relative;
  display: flex;
  align-items: center;
  height: 26px;
  border-radius: 999px;
  background: #eef1ef;
  overflow: visible;
}

.rank-pill-fill {
  height: 100%;
  min-width: 26px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 10px;
  box-sizing: border-box;
  transition: width 0.8s ease, transform 0.18s ease, filter 0.18s ease;
  transform-origin: center;
}

.rank-pill-fill--teal {
  background: linear-gradient(90deg, #5dcaa5, #0f6e56);
}

.rank-pill-fill--coral {
  background: linear-gradient(90deg, #ec8a63, #993c1d);
}

.rank-pill-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.rank-pill-value--inside {
  color: #ffffff;
}

.rank-pill-value--outside {
  margin-left: 10px;
}

.rank-pill-value--outside-teal {
  color: #0f6e56;
}

.rank-pill-value--outside-coral {
  color: #993c1d;
}

.rank-pill-sub {
  margin-top: 4px;
  font-size: 11px;
  color: #9aa79f;
}

.rank-donut-section {
  padding-top: 18px;
}

.rank-donut-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--forest-700);
  margin-bottom: 8px;
}

.rank-donut-wrap {
  position: relative;
  width: 100%;
  height: 260px;
}

@media (max-width: 599px) {
  .hero {
    padding: 28px 16px 112px;
  }
  .hero-title {
    font-size: 27px;
  }
  .stat-value {
    font-size: 21px;
  }
  .toolbar-right {
    flex-direction: column;
  }
  .year-select,
  .month-select {
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
  }
  .rank-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .rank-subtitle {
    margin-left: 0;
  }
  .rank-donut-wrap {
    height: 220px;
  }
}
</style>