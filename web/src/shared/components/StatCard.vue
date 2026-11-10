<script setup lang="ts">
/**
 * 统计卡片（Analysis 总览）。count-up 动画 600ms，减弱动效时直接显示终值（§8.4）。
 */
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useReducedMotion } from '@/shared/composables/useReducedMotion'

const props = defineProps<{ label: string; value: number; suffix?: string }>()
const reduced = useReducedMotion()
const shown = ref(props.value)
let raf = 0

function run(from: number, to: number) {
  cancelAnimationFrame(raf)
  if (reduced.value || from === to) { shown.value = to; return }
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / 600)
    const e = 1 - (1 - k) ** 3
    shown.value = Math.round(from + (to - from) * e)
    if (k < 1) raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

onMounted(() => run(0, props.value))
watch(() => props.value, (v, old) => run(old ?? 0, v))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div class="rounded-xl border border-border bg-surface p-4 text-center shadow-xs" data-stat-card>
    <div class="text-2xl font-bold tabular text-fg">
      <span class="sr-only">{{ value }}</span><span aria-hidden="true">{{ shown }}</span><span v-if="suffix" class="text-sm font-medium text-fg-subtle">{{ suffix }}</span>
    </div>
    <div class="mt-1 text-xs text-fg-subtle">{{ label }}</div>
  </div>
</template>
