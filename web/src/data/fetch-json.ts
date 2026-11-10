/**
 * 静态 JSON 获取（计划 M1-T4）。
 * - 非 2xx 抛出带上下文的错误（与旧 dataLoader 文案一致）
 * - Vite dev server 对缺失文件可能回退 index.html（200）——校验 content-type，避免把 HTML 当数据
 * - 相对 BASE_URL 拼接，部署在 /XCPCAtlas/ 下同样可用；Worker 中通过 base 参数传入
 */
export class DataNotFoundError extends Error {
  constructor(public readonly url: string, public readonly status: number) {
    super(`加载失败 (${status}): ${url}`)
    this.name = 'DataNotFoundError'
  }
}

export function dataUrl(path: string, base: string = import.meta.env.BASE_URL): string {
  return `${base.endsWith('/') ? base : base + '/'}data/${path}`
}

export async function fetchJson<T>(path: string, init?: { signal?: AbortSignal | undefined; base?: string }): Promise<T> {
  const url = dataUrl(path, init?.base)
  const res = await fetch(url, { signal: init?.signal ?? null })
  if (!res.ok) throw new DataNotFoundError(url, res.status)
  const type = res.headers.get('content-type') || ''
  if (type && !type.includes('json')) throw new DataNotFoundError(url, 404)
  return (await res.json()) as T
}
