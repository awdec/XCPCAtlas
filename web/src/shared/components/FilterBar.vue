<script setup lang="ts">
/**
 * 榜单筛选条（Contest / Summary / Players 共用布局）：搜索输入一行、下拉一行，小屏两列网格（§7.2）。
 */
defineProps<{ count: string }>()
</script>

<template>
  <div class="mb-4 space-y-3" data-filter-bar>
    <div class="grid grid-cols-2 items-center gap-3 sm:flex sm:flex-wrap">
      <slot name="search" />
      <span class="col-span-2 text-sm text-fg-subtle sm:col-span-1" data-count>{{ count }}</span>
    </div>
    <div v-if="$slots.selects" class="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      <slot name="selects" />
    </div>
  </div>
</template>
