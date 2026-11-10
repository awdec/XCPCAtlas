<script setup lang="ts">
/**
 * 题目状态色块（B-C8）：字母、提交文本（+N(t) / (t) / -N / -），已解出时下方显示「t min / N次」。
 */
import { computed } from 'vue'
import type { Problem } from '@/domain/types'
import { formatSubmission, problemClass } from '@/domain/formatters'

const props = defineProps<{ letter: string; problem: Problem }>()
const text = computed(() => formatSubmission(props.problem))
const tone = computed(() => problemClass(props.problem))
const label = computed(() => {
  const p = props.problem
  if (p.status === 'solved') return `${props.letter} 题：通过，第 ${p.time} 分钟，提交 ${p.attempts} 次`
  if (p.status === 'unsolved') return `${props.letter} 题：未通过，提交 ${p.attempts} 次`
  return `${props.letter} 题：未提交`
})
</script>

<template>
  <div class="text-center" :aria-label="label" role="group" data-problem>
    <div class="mb-1 text-xs text-fg-subtle">{{ letter }}</div>
    <div class="w-16 rounded py-1.5 text-sm font-medium tabular" :class="tone">{{ text }}</div>
    <div v-if="problem.status === 'solved'" class="mt-1 text-xs text-fg-subtle tabular">{{ problem.time }}min / {{ problem.attempts }}次</div>
  </div>
</template>
