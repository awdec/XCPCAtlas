/**
 * 路由驱动的 View Transitions（计划 §8.2）。
 * 跳过条件：API 不支持、减弱动效、首次导航、仅 query 变化。
 * 过渡的 update 回调先放行导航，再等待 afterEach 与 nextTick，保证快照里是新页面；
 * 数据加载不阻塞过渡（新页面在快照中显示骨架）。
 */
import { nextTick } from 'vue'
import type { Router } from 'vue-router'
import { prefersReducedMotionNow } from '@/shared/composables/useReducedMotion'
import { onlyQueryChanged, transitionType } from './depth'

interface ViewTransitionLike {
  finished: Promise<void>
  ready: Promise<void>
  skipTransition: () => void
}
type StartVT = (arg: { update: () => Promise<void>; types?: string[] } | (() => Promise<void>)) => ViewTransitionLike

/**
 * 只在 Chromium 内核启用（navigator.userAgentData 仅 Chromium 提供）。
 * 实测 Playwright WebKit 在过渡期间新页面异步替换内容时会整页崩溃（2026-11，见重构计划 §13）；
 * 页面过渡属于增强效果，不能以导航稳定性为代价，其他内核直接无动画切换。
 */
function viewTransitionsSupported(): boolean {
  return typeof document !== 'undefined'
    && 'startViewTransition' in document
    && typeof (navigator as Navigator & { userAgentData?: unknown }).userAgentData !== 'undefined'
}

export function installViewTransitions(router: Router): void {
  let first = true

  router.beforeResolve((to, from) => {
    const start = (document as Document & { startViewTransition?: StartVT }).startViewTransition?.bind(document)
    if (first) { first = false; return true }
    if (!start || !viewTransitionsSupported() || prefersReducedMotionNow() || onlyQueryChanged(to, from)) return true

    const type = transitionType(to, from)
    return new Promise<boolean>((allowNav) => {
      let finishNav!: () => void
      const navigated = new Promise<void>((r) => { finishNav = r })
      const stopAfter = router.afterEach(() => { stopAfter(); finishNav() })
      const timeout = setTimeout(() => finishNav(), 1500)
      // 导航绝不能依赖动画：浏览器可能跳过过渡（页面隐藏、无头 WebKit 等）而不调用 update，
      // 此时 150ms 后直接放行导航
      const failsafe = setTimeout(() => allowNav(true), 150)

      const update = async () => {
        clearTimeout(failsafe)
        allowNav(true)
        await navigated
        clearTimeout(timeout)
        await nextTick()
      }

      let vt: ViewTransitionLike | null = null
      try {
        vt = start({ update, types: [type] })
      } catch {
        try { vt = start(update) } catch { clearTimeout(failsafe); allowNav(true) }
      }
      vt?.ready.catch(() => {})
      vt?.finished.catch(() => {}).finally(() => { clearTimeout(failsafe); allowNav(true) })
    })
  })
}
