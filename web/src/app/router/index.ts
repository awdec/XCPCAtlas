import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from './routes'
import { installGuards } from './guards'
import { installViewTransitions } from './view-transition'

export function createAppRouter() {
  // 保持 hash 路由（R9）：已分享的 /#/... 链接继续有效；不设置 scrollBehavior（Q1 已确认）
  const router = createRouter({ history: createWebHashHistory(), routes })
  installGuards(router)
  installViewTransitions(router)
  return router
}
