// DataTable 排序（M3-T1）：三态循环与稳定性（以轨迹表为参照）
import { describe, it, expect } from 'vitest'
import { nextSort, sortRows, type Column } from '@/shared/components/data-table'
import { yearSortMethod } from '@/domain/trajectory'
import type { Tier } from '@/domain/types'

type R = { tiers: Tier[]; count: number; i: number }
const rows: R[] = [
  { tiers: ['bronze', 'none', 'none', 'none', 'none'], count: 9, i: 0 },
  { tiers: ['gold', 'none', 'none', 'none', 'none'], count: 3, i: 1 },
  { tiers: ['bronze', 'gold', 'none', 'none', 'none'], count: 9, i: 2 },
  { tiers: ['iron', 'bronze', 'none', 'none', 'none'], count: 1, i: 3 },
]
const cols: Column<R>[] = [
  { key: 'y0', label: '第一年', sortable: true, compare: yearSortMethod(0) },
  { key: 'count', label: '选手数', sortable: true, value: r => r.count },
]

describe('nextSort', () => {
  it('同列 asc → desc → 原顺序；换列从 asc 开始', () => {
    let s = { key: null as string | null, dir: null as 'asc' | 'desc' | null }
    s = nextSort(s, 'y0'); expect(s).toEqual({ key: 'y0', dir: 'asc' })
    s = nextSort(s, 'y0'); expect(s).toEqual({ key: 'y0', dir: 'desc' })
    s = nextSort(s, 'y0'); expect(s).toEqual({ key: null, dir: null })
    s = nextSort({ key: 'y0', dir: 'desc' }, 'count'); expect(s).toEqual({ key: 'count', dir: 'asc' })
  })
})

describe('sortRows', () => {
  it('升序：\ < 铁 < 铜 < 银 < 金，并列保持原顺序', () => {
    expect(sortRows(rows, cols, { key: 'y0', dir: 'asc' }).map(r => r.i)).toEqual([3, 0, 2, 1])
  })
  it('降序取反比较器而非反转数组：并列仍保持原顺序', () => {
    expect(sortRows(rows, cols, { key: 'y0', dir: 'desc' }).map(r => r.i)).toEqual([1, 0, 2, 3])
    expect(sortRows(rows, cols, { key: 'count', dir: 'desc' }).map(r => r.i)).toEqual([0, 2, 1, 3])
  })
  it('无排序时返回原数组', () => {
    expect(sortRows(rows, cols, { key: null, dir: null })).toBe(rows)
  })
})
