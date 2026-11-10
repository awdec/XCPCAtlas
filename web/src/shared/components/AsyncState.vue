<script setup lang="ts">
/**
 * 统一加载态（§8.3）：
 * - pending 超过 120ms 才显示骨架，显示后至少保持 300ms，避免闪烁
 * - error → ResultState（标题「加载失败」+ 页面自己的副标题）
 * 骨架内容通过 #skeleton 插槽给出，与最终布局一致。
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import ResultState from './ResultState.vue'

const props = withDefaults(defineProps<{
  pending: boolean
  error?: boolean
  errorText?: string
  errorTitle?: string
}>(), { error: false, errorText: '', errorTitle: '加载失败' })

const showSkeleton = ref(false)
let showTimer: ReturnType<typeof setTimeout> | undefined
let shownAt = 0
let hideTimer: ReturnType<typeof setTimeout> | undefined
const holdPending = ref(props.pending)

watch(() => props.pending, (p) => {
  clearTimeout(showTimer)
  clearTimeout(hideTimer)
  if (p) {
    holdPending.value = true
    showTimer = setTimeout(() => { showSkeleton.value = true; shownAt = Date.now() }, 120)
  } else if (showSkeleton.value) {
    const rest = Math.max(0, 300 - (Date.now() - shownAt))
    hideTimer = setTimeout(() => { showSkeleton.value = false; holdPending.value = false }, rest)
  } else {
    holdPending.value = false
  }
}, { immediate: true })

onBeforeUnmount(() => { clearTimeout(showTimer); clearTimeout(hideTimer) })
</script>

<template>
  <ResultState v-if="error && !pending" icon="warning" :title="errorTitle" :sub-title="errorText" />
  <template v-else-if="holdPending">
    <slot v-if="showSkeleton" name="skeleton" />
    <div v-else class="min-h-40" aria-busy="true" />
  </template>
  <slot v-else />
</template>
