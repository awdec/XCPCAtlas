import { QueryClient } from '@tanstack/vue-query'

/** 静态数据：永不过期、窗口聚焦不重取、失败重试 1 次 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: Infinity, retry: 1, refetchOnWindowFocus: false, refetchOnReconnect: false },
    },
  })
}
