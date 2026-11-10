/**
 * DataTable 列定义与排序（计划 M3-T1）。
 * 排序三态：升序 → 降序 → 恢复原始顺序；比较相等时保持原顺序（稳定，ES2019+ Array.sort 保证）。
 */
export interface Column<T> {
  key: string
  label: string
  /** 单元格纯文本（无插槽时显示；同时用于溢出提示） */
  value?: (row: T) => string | number | null | undefined
  /** 固定宽度（px）或最小宽度 */
  width?: number
  minWidth?: number
  align?: 'left' | 'center' | 'right'
  /** 固定在左侧（仅第一列） */
  pinned?: boolean
  /** 超长截断 + 悬停提示 */
  truncate?: boolean
  /** 可排序；compare 缺省按 value 数值/字符串比较 */
  sortable?: boolean
  compare?: (a: T, b: T) => number
  /** 表头说明（ⓘ） */
  hint?: string
  /** 表头附加类 */
  headerClass?: string
}

export type SortDir = 'asc' | 'desc' | null
export interface SortState { key: string | null; dir: SortDir }

/** 三态循环：同一列 null → asc → desc → null；换列从 asc 开始 */
export function nextSort(state: SortState, key: string): SortState {
  if (state.key !== key) return { key, dir: 'asc' }
  if (state.dir === 'asc') return { key, dir: 'desc' }
  if (state.dir === 'desc') return { key: null, dir: null }
  return { key, dir: 'asc' }
}

const defaultCompare = <T>(col: Column<T>) => (a: T, b: T): number => {
  const va = col.value?.(a)
  const vb = col.value?.(b)
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va ?? '').localeCompare(String(vb ?? ''), 'zh-Hans-CN')
}

/** 稳定排序：desc 取反比较器（不反转数组），并列保持原顺序 */
export function sortRows<T>(rows: T[], columns: Column<T>[], state: SortState): T[] {
  if (!state.key || !state.dir) return rows
  const col = columns.find(c => c.key === state.key)
  if (!col) return rows
  const cmp = col.compare ?? defaultCompare(col)
  const sign = state.dir === 'asc' ? 1 : -1
  return rows.slice().sort((a, b) => sign * cmp(a, b))
}
