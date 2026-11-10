/**
 * 界面偏好（Pinia）：主题与减弱动效开关。仅此两项，业务状态不进 Store（计划 §2.2）。
 * 持久化到 localStorage（xcpc_theme / xcpc_reduced_motion），存储不可用时静默降级。
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type ThemePref = 'system' | 'light' | 'dark'

const read = (k: string): string | null => {
  try { return localStorage.getItem(k) } catch { return null }
}
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* 忽略 */ }
}

export const usePrefsStore = defineStore('prefs', () => {
  const stored = read('xcpc_theme')
  const theme = ref<ThemePref>(stored === 'light' || stored === 'dark' ? stored : 'system')
  const reducedMotion = ref(read('xcpc_reduced_motion') === '1')
  watch(theme, v => write('xcpc_theme', v))
  watch(reducedMotion, v => write('xcpc_reduced_motion', v ? '1' : '0'))
  return { theme, reducedMotion }
})
