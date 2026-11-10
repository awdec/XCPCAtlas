// domain 层中与旧实现「有意不同」的行为（D3），以及新增的通用模块
import { describe, it, expect } from 'vitest'
import { schoolStats } from '@/domain/aggregate'
import { pageButtons, pageSlice, totalPages } from '@/domain/pagination'
import { matchMedal, matchSchoolType } from '@/domain/filters'
import { medalLabel, medalOrder, medalTone } from '@/domain/medal'
import type { TeamRow } from '@/domain/types'

const team = (rank: number): TeamRow => ({ rank, org_rank: null, school: 's', team: 't', solved: 1, penalty: 0, problems: {}, members: [], unofficial: false, girl: false, icpc_id: null })

describe('D3 学校最佳排名', () => {
  it('有效排名取最小', () => expect(schoolStats([team(5), team(0), team(3)]).bestRank).toBe(3))
  it('全部缺排名 → null（显示 —）', () => expect(schoolStats([team(0), team(0)]).bestRank).toBeNull())
  it('无队伍 → null', () => expect(schoolStats([]).bestRank).toBeNull())
})

describe('pagination', () => {
  it('pageButtons 与旧实现一致', () => expect(pageButtons(5, 40)).toEqual([1, 3, 4, 5, 6, 7, 9, 13, 21]))
  it('totalPages / pageSlice', () => {
    expect(totalPages(201, 100)).toBe(3)
    expect(pageSlice([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4])
  })
})

describe('filters / medal', () => {
  const tags = { set985: new Set(['A']), set211: new Set(['A', 'B']) }
  it('211 排除 985', () => {
    expect(matchSchoolType('A', '211', tags)).toBe(false)
    expect(matchSchoolType('B', '211', tags)).toBe(true)
    expect(matchSchoolType('C', 'other', tags)).toBe(true)
  })
  it('奖项 other = 缺失或非金银铜', () => {
    expect(matchMedal(undefined, 'other')).toBe(true)
    expect(matchMedal('Honorable', 'other')).toBe(true)
    expect(matchMedal('Gold', 'other')).toBe(false)
  })
  it('奖牌文字/排序/色调', () => {
    expect(medalLabel(undefined)).toBe('-')
    expect(medalLabel('Honorable')).toBe('Honorable')
    expect(medalOrder('Silver')).toBe(1)
    expect(medalTone('Honorable')).toBeNull()
  })
})
