<script setup lang="ts">
/**
 * 提示气泡（Reka Tooltip）：悬停或键盘聚焦都会打开（§7.3）。
 * delay 对应旧 el-tooltip 的 show-after。
 */
import { TooltipArrow, TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from 'reka-ui'

withDefaults(defineProps<{ delay?: number; side?: 'top' | 'bottom' | 'left' | 'right' }>(), { delay: 300, side: 'top' })
</script>

<template>
  <TooltipRoot :delay-duration="delay">
    <TooltipTrigger as-child>
      <slot />
    </TooltipTrigger>
    <TooltipPortal>
      <TooltipContent
        :side="side"
        :side-offset="6"
        :collision-padding="8"
        class="tooltip-content z-60 max-w-xs rounded-md bg-fg px-2.5 py-1.5 text-xs leading-relaxed text-surface shadow-md"
      >
        <slot name="content" />
        <TooltipArrow class="fill-fg" :width="10" :height="5" />
      </TooltipContent>
    </TooltipPortal>
  </TooltipRoot>
</template>

<style>
.tooltip-content[data-state='delayed-open'],
.tooltip-content[data-state='instant-open'] {
  animation: tip-in var(--dur-fast) var(--ease-enter);
}
@keyframes tip-in { from { opacity: 0; transform: translateY(2px); } }
</style>
