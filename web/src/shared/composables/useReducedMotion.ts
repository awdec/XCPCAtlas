/**
 * 是否减弱动效：系统 prefers-reduced-motion 或页眉开关（Pinia）任一为真（§8.6）。
 */
import { computed, type ComputedRef } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { usePrefsStore } from '@/shared/stores/prefs'

export function useReducedMotion(): ComputedRef<boolean> {
  const system = usePreferredReducedMotion()
  const prefs = usePrefsStore()
  return computed(() => system.value === 'reduce' || prefs.reducedMotion)
}

/** 非组件上下文（路由守卫）中判断 */
export function prefersReducedMotionNow(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')
}
