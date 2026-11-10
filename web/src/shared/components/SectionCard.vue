<script setup lang="ts">
/** 内容卡片（数据分析页区块、表格容器）。scroll-reveal 为滚动驱动入场（§8.5，渐进增强） */
import { cn } from '@/shared/lib/cn'

defineProps<{ title?: string; description?: string; class?: string; reveal?: boolean }>()
</script>

<template>
  <section :class="cn('rounded-xl border border-border bg-surface p-4 shadow-xs sm:p-5', reveal && 'scroll-reveal', $props.class)">
    <header v-if="title || $slots.header" class="mb-3">
      <slot name="header">
        <h3 class="text-base font-semibold text-fg">{{ title }}</h3>
      </slot>
      <p v-if="description" class="mt-1 text-xs leading-relaxed text-fg-subtle">{{ description }}</p>
    </header>
    <slot />
  </section>
</template>
