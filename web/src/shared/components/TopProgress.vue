<script setup lang="ts">
/**
 * 全局顶部细进度条（§8.3）：路由导航或任一查询进行中超过 150ms 时显示（不确定进度，仅 transform 动画）。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useIsFetching } from '@tanstack/vue-query'

const router = useRouter()
const navigating = ref(false)
const stopBefore = router.beforeEach(() => { navigating.value = true })
const stopAfter = router.afterEach(() => { navigating.value = false })
router.onError(() => { navigating.value = false })
onBeforeUnmount(() => { stopBefore(); stopAfter() })

const fetching = useIsFetching()
const busy = computed(() => navigating.value || fetching.value > 0)
const visible = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
watch(busy, (b) => {
  clearTimeout(timer)
  if (b) timer = setTimeout(() => { visible.value = true }, 150)
  else visible.value = false
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 overflow-hidden transition-opacity duration-(--dur-base)"
    :class="visible ? 'opacity-100' : 'opacity-0'"
    aria-hidden="true"
  >
    <div class="top-progress-bar h-full w-full origin-left bg-primary" />
  </div>
</template>

<style>
.top-progress-bar {
  animation: topbar-indeterminate 1.2s var(--ease-standard) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .top-progress-bar { animation: none; transform: scaleX(0.35); }
}
.reduce-motion .top-progress-bar { animation: none; transform: scaleX(0.35); }
</style>
