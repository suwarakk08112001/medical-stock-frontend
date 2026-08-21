<template>
  <q-page class="drug-page q-pa-md">
    <!-- Header -->
    <div class="header-card q-pa-lg q-mb-lg">
      <div class="row items-center no-wrap">
        <q-avatar size="52px" class="header-avatar">
          <q-icon name="medication" size="28px" color="white" />
        </q-avatar>
        <div class="q-ml-md">
          <div class="text-h6 text-weight-bold text-white">คลังยา</div>
          <div class="text-caption text-white" style="opacity: 0.85">
            รายการยาและเวชภัณฑ์ทั้งหมด
            <span v-if="pagination.rowsNumber"> · {{ pagination.rowsNumber }} รายการ</span>
          </div>
        </div>
        <q-space />
        <q-input
          v-model="search"
          dense
          outlined
          bg-color="white"
          debounce="400"
          placeholder="ค้นหาชื่อยา / รหัส"
          class="search-input"
          clearable
          @update:model-value="onSearch"
        >
          <template #prepend>
            <q-icon name="search" color="primary" />
          </template>
        </q-input>
      </div>
    </div>

    <!-- Table Card -->
    <q-card flat bordered class="table-card">
      <q-table
        flat
        row-key="id"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        v-model:pagination="pagination"
        @request="onRequest"
        binary-state-sort
        class="drug-table"
        :rows-per-page-options="[10, 20, 50]"
      >
        <template #loading>
          <q-inner-loading showing color="primary">
            <q-spinner-dots size="40px" color="primary" />
          </q-inner-loading>
        </template>

        <template #header="props">
          <q-tr :props="props" class="table-header-row">
            <q-th v-for="col in props.cols" :key="col.name" :props="props">
              {{ col.label }}
            </q-th>
          </q-tr>
        </template>

        <template #body="props">
          <q-tr :props="props" class="table-row">
            <q-td key="invcode" :props="props">
              <q-badge color="blue-1" text-color="primary" class="code-badge">
                {{ props.row.invcode }}
              </q-badge>
            </q-td>
            <q-td key="icode" :props="props">
              <span class="text-grey-8">{{ props.row.icode }}</span>
            </q-td>
            <q-td key="name" :props="props">
              <div class="row items-center no-wrap">
                <q-avatar size="30px" class="drug-avatar q-mr-sm">
                  <q-icon name="vaccines" size="16px" color="primary" />
                </q-avatar>
                <span class="text-weight-medium text-grey-9">
                  {{ props.row.drugitem?.name }}
                </span>
              </div>
            </q-td>
            <q-td key="strength" :props="props">
              <span class="text-grey-7">{{ props.row.drugitem?.strength }}</span>
            </q-td>
            <q-td key="unit" :props="props">
              <q-chip dense square color="teal-1" text-color="teal-9" class="unit-chip">
                {{ props.row.unit }}
              </q-chip>
            </q-td>
            <q-td key="mpack" :props="props">
              <span class="text-weight-bold text-primary">{{ props.row.mpack }}</span>
            </q-td>
            <q-td key="actions" :props="props">
              <q-btn
                flat
                round
                dense
                icon="visibility"
                color="primary"
                size="sm"
                @click="goToStock(props.row)"
              >
                <q-tooltip>ดูรายละเอียด</q-tooltip>
              </q-btn>
            </q-td>
          </q-tr>
        </template>

        <template #no-data>
          <div class="full-width column flex-center q-pa-xl text-grey-5">
            <q-icon name="inventory_2" size="48px" class="q-mb-sm" />
            <div class="text-subtitle1">ไม่พบข้อมูลยา</div>
            <div class="text-caption">ลองค้นหาด้วยคำอื่น หรือรีเซ็ตตัวกรอง</div>
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/boot/axios';
import type { QTableProps } from 'quasar'

interface DrugItemDetail {
  icode: string
  name: string
  strength: string
  invcode: string
}

interface DrugItemRow {
  id: number
  mpack: number
  icode: string
  invcode: string
  unit: string
  drugitem: DrugItemDetail
}

interface DrugItemResponse {
  drugitem: {
    data: DrugItemRow[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
  message: string
}

const router = useRouter()

const rows = ref<DrugItemRow[]>([])
const loading = ref(false)
const search = ref('')

const columns: QTableProps['columns'] = [
  { name: 'invcode', label: 'รหัสเวชภัณฑ์', field: 'invcode', align: 'left', sortable: true },
  { name: 'icode', label: 'รหัสยา', field: 'icode', align: 'left', sortable: true },
  { name: 'name', label: 'ชื่อยา', field: (row) => row.drugitem?.name, align: 'left', sortable: true },
  { name: 'strength', label: 'ความแรง', field: (row) => row.drugitem?.strength, align: 'left' },
  { name: 'unit', label: 'หน่วย', field: 'unit', align: 'center' },
  { name: 'mpack', label: 'จำนวนต่อแพ็ค', field: 'mpack', align: 'right', sortable: true },
  { name: 'actions', label: 'การจัดการ', field: 'id', align: 'center' },
]

const pagination = ref({
  sortBy: 'invcode',
  descending: false,
  page: 1,
  rowsPerPage: 10,
  rowsNumber: 0,
})

async function fetchDrugItems() {
  loading.value = true
  try {
    const { page, rowsPerPage, sortBy, descending } = pagination.value

    const params: Record<string, unknown> = {
      page,
      limit: rowsPerPage,
    }
    if (sortBy) {
      params.sortBy = sortBy
      params.order = descending ? 'desc' : 'asc'
    }
    if (search.value) {
      params.search = search.value
    }

    const { data } = await api.get<DrugItemResponse>('/backoffice/drugitems', { params })

    rows.value = data.drugitem.data
    pagination.value.rowsNumber = data.drugitem.total
    pagination.value.page = data.drugitem.page
    pagination.value.rowsPerPage = data.drugitem.limit
  } catch (err) {
    console.error('โหลดข้อมูลยาไม่สำเร็จ', err)
    rows.value = []
  } finally {
    loading.value = false
  }
}

function onRequest(props: { pagination: typeof pagination.value }) {
  pagination.value.page = props.pagination.page
  pagination.value.rowsPerPage = props.pagination.rowsPerPage
  pagination.value.sortBy = props.pagination.sortBy
  pagination.value.descending = props.pagination.descending
  void fetchDrugItems()
}

function onSearch() {
  pagination.value.page = 1
  void fetchDrugItems()
}

function goToStock(row: DrugItemRow) {
  void router.push(`/stock/${encodeURIComponent(row.icode)}`)
}

onMounted(() => {
  void fetchDrugItems()
})
</script>

<style scoped>
.drug-page {
  background: #f4f6fb;
  min-height: 100vh;
}

.header-card {
  border-radius: 16px;
  background: linear-gradient(135deg, #4f7cff 0%, #6a5cff 100%);
  box-shadow: 0 8px 24px rgba(79, 124, 255, 0.25);
}

.header-avatar {
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.35);
}

.search-input {
  width: 300px;
  border-radius: 8px;
}

.search-input :deep(.q-field__control) {
  border-radius: 8px;
}

.table-card {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(17, 24, 39, 0.06);
}

.drug-table :deep(.q-table__top),
.drug-table :deep(.q-table__bottom) {
  padding: 12px 16px;
}

.table-header-row th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  font-size: 12.5px;
  letter-spacing: 0.02em;
  border-bottom: 2px solid #e2e8f0;
}

.table-row:hover {
  background: #f5f7ff;
}

.table-row td {
  border-bottom: 1px solid #eef1f6;
}

.code-badge {
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

.unit-chip {
  border-radius: 6px;
  font-weight: 600;
}

.drug-avatar {
  background: #eef2ff;
}

@media (max-width: 599px) {
  .search-input {
    width: 100%;
    margin-top: 12px;
  }
}
</style>