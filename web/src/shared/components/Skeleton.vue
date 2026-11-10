<script setup lang="ts">
/**
 * 骨架屏：按最终布局占位，避免 CLS（§8.3）。
 * variant=cards（卡片网格）/ table（前 10 行真实行高）/ block（固定高度块，如图表）
 */
withDefaults(defineProps<{
  variant?: 'cards' | 'table' | 'block' | 'lines'
  count?: number
  height?: string
  columns?: string
}>(), { variant: 'block', count: 6, height: '20rem', columns: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' })
</script>

<template>
  <div aria-hidden="true" data-skeleton>
    <div v-if="variant === 'cards'" class="grid gap-5" :class="columns">
      <div v-for="i in count" :key="i" class="overflow-hidden rounded-xl border border-border-soft bg-surface">
        <div class="skeleton h-1.5 rounded-none" />
        <div class="space-y-3 p-5">
          <div class="skeleton h-6 w-1/2" />
          <div class="skeleton h-4 w-2/3" />
          <div class="skeleton h-4 w-1/3" />
        </div>
      </div>
    </div>
    <div v-else-if="variant === 'table'" class="overflow-hidden rounded-lg border border-border bg-surface">
      <div class="h-10 border-b border-border bg-surface-2" />
      <div v-for="i in count" :key="i" class="flex h-10 items-center gap-4 border-b border-border-soft px-3 last:border-0">
        <div class="skeleton h-3.5 w-10" />
        <div class="skeleton h-3.5 w-1/4" />
        <div class="skeleton h-3.5 w-1/5" />
        <div class="skeleton h-3.5 w-1/6" />
      </div>
    </div>
    <div v-else-if="variant === 'lines'" class="space-y-2.5">
      <div v-for="i in count" :key="i" class="skeleton h-4" :style="{ width: `${90 - (i % 3) * 18}%` }" />
    </div>
    <div v-else class="skeleton w-full" :style="{ height }" />
  </div>
</template>
