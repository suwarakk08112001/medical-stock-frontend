<template>
  <q-item
    clickable
    tag="a"
    :to="isExternal ? undefined : to"
    :href="isExternal ? to : undefined"
    :target="isExternal ? '_blank' : undefined"
  >
    <q-item-section
      v-if="icon"
      avatar
    >
      <q-icon :name="icon" />
    </q-item-section>

    <q-item-section>
      <q-item-label>{{ label }}</q-item-label>
      <q-item-label caption>{{ caption }}</q-item-label>
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface EssentialLinkProps {
  label: string;
  caption?: string;
  icon?: string;
  to: string;
}

const props = defineProps<EssentialLinkProps>();

const isExternal = computed(() => /^https?:\/\//.test(props.to));
</script>