<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          ระบบคลังยาโรงพยาบาลปะเหลียน
        </q-toolbar-title>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>
          เมนูหลัก
        </q-item-label>

        <EssentialLink
          v-for="link in linksList"
          :key="link.label"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import EssentialLink, { type EssentialLinkProps } from '@/components/EssentialLink.vue';

const linksList: EssentialLinkProps[] = [
  {
    label: 'แดชบอร์ด',
    caption: 'ภาพรวมระบบ',
    icon: 'insights',
    to: '/'
  },
  {
    label: 'คลังยา',
    caption: 'รายการยาคงคลัง',
    icon: 'medication',
    to: '/stock'
  },
  {
    label: 'รับยาเข้าคลัง',
    caption: 'บันทึกการรับยา',
    icon: 'inventory_2',
    to: '/stock-in'
  },
  {
    label: 'เบิกจ่ายยา',
    caption: 'บันทึกการเบิกจ่าย',
    icon: 'outbound',
    to: '/stock-out'
  },
  {
    label: 'รายงาน',
    caption: 'สรุปรายงานคลังยา',
    icon: 'summarize',
    to: '/reports'
  }
];

const leftDrawerOpen = ref(false);

function toggleLeftDrawer () {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}
</script>