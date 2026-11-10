<script setup lang="ts">
/**
 * 学校层次标签（B-F9）：985 优先，其次 211，否则不显示。
 */
import { computed } from 'vue'

const props = defineProps<{ school: string; set985: Set<string>; set211: Set<string> }>()
const tier = computed(() => (props.set985.has(props.school) ? '985' : props.set211.has(props.school) ? '211' : null))
</script>

<template>
  <span
    v-if="tier"
    class="ml-1 inline-flex h-5 items-center rounded border px-1.5 align-middle text-[11px] font-medium leading-none tabular"
    :class="tier === '985' ? 'border-(--tag-985-border) bg-(--tag-985-bg) text-(--tag-985-fg)' : 'border-(--tag-211-border) bg-(--tag-211-bg) text-(--tag-211-fg)'"
    data-school-tag
  >{{ tier }}</span>
</template>
