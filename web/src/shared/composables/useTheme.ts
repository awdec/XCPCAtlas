/**
 * 主题：跟随系统，可在页眉覆盖；在 <html> 上切换 .dark（§7.1）。
 * 同时同步 .reduce-motion 类（减弱动效开关）。
 */
import { computed, watchEffect } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { usePrefsStore } from '@/shared/stores/prefs'

export function useTheme() {
  const prefs = usePrefsStore()
  const systemDark = usePreferredDark()
  const isDark = computed(() => prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark.value))

  watchEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', isDark.value)
    root.classList.toggle('reduce-motion', prefs.reducedMotion)
  })

  const cycle = () => {
    prefs.theme = prefs.theme === 'system' ? (systemDark.value ? 'light' : 'dark') : prefs.theme === 'dark' ? 'light' : 'dark'
  }
  return { isDark, cycle, prefs }
}
