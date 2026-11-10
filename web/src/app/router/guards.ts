/**
 * 年份校验（B-G2）：路由带 year 时 parseInt 非数字或不在 [2020, 2030] → 重定向首页。
 * 与旧守卫等价；对 /:year/ 形式的任意首段（如 /foo/）同样生效，因此这些路径不会落到 404。
 */
import type { Router } from 'vue-router'

export function isValidYear(raw: unknown): boolean {
  const year = parseInt(String(raw))
  return !(isNaN(year) || year < 2020 || year > 2030)
}

export function installGuards(router: Router): void {
  router.beforeEach((to) => {
    if (to.params.year && !isValidYear(to.params.year)) return { name: 'Home' }
    return true
  })
}
