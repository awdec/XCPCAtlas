// 参考实现的边界单测（M0）：确保冻结基线本身行为如计划 §6 所述
import { describe, it, expect } from 'vitest'
import { pageButtons, shouldShowIntro, schoolStats, summaryMedalOrder } from '../reference/views.js'
import { codeToTiers, tiersToCode } from '../reference/trajectory.js'
import { formatSubmission } from '../reference/formatters.js'

describe('B-F7 pageButtons', () => {
  it('当前页 ± 1/2/4/8/16，裁剪到 [1,total]', () => {
    expect(pageButtons(1, 40)).toEqual([1, 2, 3, 5, 9, 17])
    expect(pageButtons(17, 40)).toEqual([1, 9, 13, 15, 16, 17, 18, 19, 21, 25, 33])
    expect(pageButtons(1, 1)).toEqual([1])
  })
})

describe('B-H4 介绍弹窗', () => {
  it('7 天边界', () => {
    const now = 1e12
    expect(shouldShowIntro(String(now - 7 * 864e5), now)).toBe(false)
    expect(shouldShowIntro(String(now - 7 * 864e5 - 1), now)).toBe(true)
    expect(shouldShowIntro('0', now)).toBe(true)
  })
})

describe('B-SC3 旧版最佳排名', () => {
  it('全部缺排名时为 Infinity（D3 后显示 —）', () => {
    expect(schoolStats([{ rank: 0, solved: 1 }]).bestRank).toBe(Infinity)
    expect(schoolStats([]).bestRank).toBe(null)
  })
})

describe('B-T2 轨迹编码', () => {
  it('往返与非法', () => {
    expect(tiersToCode(['gold', 'silver', 'bronze', 'iron', 'none'])).toBe('g-s-b-i-n')
    expect(codeToTiers('g-s-b-i-n')).toEqual(['gold', 'silver', 'bronze', 'iron', 'none'])
    expect(codeToTiers('g-s-b-i')).toBeNull()
    expect(codeToTiers('g-s-b-i-x')).toBeNull()
  })
})

describe('B-C8 / B-S3', () => {
  it('提交格式化', () => {
    expect(formatSubmission({ status: 'solved', attempts: 1, time: 7 })).toBe('(7)')
    expect(formatSubmission({ status: 'solved', attempts: 3, time: 7 })).toBe('+2(7)')
    expect(formatSubmission({ status: 'unsolved', attempts: 4 })).toBe('-4')
    expect(formatSubmission(null)).toBe('-')
  })
  it('奖牌序', () => {
    expect(['Gold', 'Silver', 'Bronze', 'Honorable', undefined].map(summaryMedalOrder)).toEqual([0, 1, 2, 3, 3])
  })
})
