/**
 * 页码按钮（B-F7）：当前页 ± 二进制偏移（1, 2, 4, 8, 16），裁剪到 [1, total]，升序
 */
export function pageButtons(cur: number, total: number): number[] {
  const set = new Set([cur])
  for (let step = 1; step <= 16; step *= 2) {
    if (cur - step >= 1) set.add(cur - step)
    if (cur + step <= total) set.add(cur + step)
  }
  return [...set].sort((a, b) => a - b)
}

export const totalPages = (count: number, pageSize: number): number => Math.ceil(count / pageSize)

export function pageSlice<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return rows.slice(start, start + pageSize)
}
