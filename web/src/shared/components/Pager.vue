<script setup lang="ts">
/**
 * 分页（B-F7）：二进制偏移页码；无上一页/下一页按钮；当前页 aria-current="page"。
 * summary 文案由调用方给出（Contest 与 Summary/Players 不同）。
 */
import { computed } from 'vue'
import { pageButtons } from '@/domain/pagination'

const page = defineModel<number>({ required: true })
const props = defineProps<{ total: number; summary: string }>()
const buttons = computed(() => pageButtons(page.value, props.total))
</script>

<template>
  <nav class="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="分页" data-pager>
    <span class="mr-2 text-sm text-fg-subtle">{{ summary }}</span>
    <button
      v-for="p in buttons"
      :key="p"
      type="button"
      class="h-8 min-w-8 rounded-md border px-2.5 text-sm font-medium tabular transition-colors duration-(--dur-fast)"
      :class="p === page
        ? 'border-primary bg-primary text-primary-fg'
        : 'border-border bg-surface text-fg-muted hover:bg-surface-3 hover:text-fg'"
      :aria-current="p === page ? 'page' : undefined"
      :aria-label="`第 ${p} 页`"
      @click="page = p"
    >{{ p }}</button>
  </nav>
</template>
