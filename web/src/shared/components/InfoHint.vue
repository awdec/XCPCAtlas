<script setup lang="ts">
/**
 * ⓘ 说明（§7.3）：可聚焦按钮，悬停或聚焦弹出说明；文案由调用方原文传入。
 */
import Tooltip from '@/shared/ui/Tooltip.vue'

defineProps<{ text: string }>()
</script>

<template>
  <Tooltip :delay="200">
    <button
      type="button"
      class="mx-0.5 inline-grid size-4.5 cursor-help place-items-center rounded-full align-[-2px] text-[13px] leading-none text-fg-faint hover:text-fg-muted focus-visible:text-fg-muted"
      aria-label="说明"
      @click.stop
    >ⓘ</button>
    <template #content>
      <div class="leading-relaxed">{{ text }}</div>
    </template>
  </Tooltip>
</template>
