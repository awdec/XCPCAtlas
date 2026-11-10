<script setup lang="ts">
/**
 * 多文件加载进度（§8.3）：进度条用 transform: scaleX 填充，文案与旧页面一致：
 * 「正在加载比赛数据（x / n）」。
 */
import { computed } from 'vue'

const props = defineProps<{ done: number; total: number }>()
const pct = computed(() => (props.total ? Math.round((props.done / props.total) * 100) : 0))
</script>

<template>
  <div class="flex flex-col items-center px-4 py-20" role="status" aria-live="polite" data-load-progress>
    <div class="flex w-full max-w-90 items-center gap-3">
      <div
        class="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        :aria-valuenow="pct"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label="加载进度"
      >
        <div
          class="h-full origin-left rounded-full bg-primary transition-transform duration-(--dur-base) ease-standard"
          :style="{ transform: `scaleX(${pct / 100})` }"
        />
      </div>
      <span class="w-10 text-right text-sm tabular text-fg-subtle">{{ pct }}%</span>
    </div>
    <p class="mt-3 text-sm text-fg-subtle">正在加载比赛数据（{{ done }} / {{ total }}）</p>
  </div>
</template>
