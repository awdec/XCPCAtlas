<script setup lang="ts">
/**
 * 赛事标签与色条（B-Y2 / B-C3）：ICPC 蓝、CCPC 绿、其他紫。
 */
import { computed } from 'vue'

const props = defineProps<{ org: string; bar?: boolean }>()
const tone = computed(() => (props.org === 'ICPC' ? 'icpc' : props.org === 'CCPC' ? 'ccpc' : 'other'))
const tagClass = computed(() => ({
  icpc: 'bg-org-icpc-soft text-org-icpc-fg',
  ccpc: 'bg-org-ccpc-soft text-org-ccpc-fg',
  other: 'bg-org-other-soft text-org-other-fg',
})[tone.value])
const barClass = computed(() => ({ icpc: 'bg-org-icpc', ccpc: 'bg-org-ccpc', other: 'bg-org-other' })[tone.value])
</script>

<template>
  <div v-if="bar" :class="barClass" class="h-1.5" aria-hidden="true" />
  <span v-else :class="tagClass" class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" data-org-tag>{{ org }}</span>
</template>
