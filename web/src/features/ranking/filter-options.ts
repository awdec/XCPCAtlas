/**
 * 榜单下拉选项（B-F3 / B-F4 / B-S4 / B-P3），文案与旧页面一致。
 */
import type { SelectOption } from '@/shared/ui/Select.vue'
import type { MedalFilter, SchoolType } from '@/domain/filters'

export const schoolTypeOptions: SelectOption<Exclude<SchoolType, ''>>[] = [
  { label: '985', value: '985' },
  { label: '211', value: '211' },
  { label: '其他', value: 'other' },
]

export const oiCountOptions: SelectOption<number>[] = [0, 1, 2, 3].map(n => ({ label: `${n} 人`, value: n }))

export const medalOptions: SelectOption<Exclude<MedalFilter, ''>>[] = [
  { label: '🥇 金牌', value: 'gold' },
  { label: '🥈 银牌', value: 'silver' },
  { label: '🥉 铜牌', value: 'bronze' },
  { label: '其他', value: 'other' },
]

/** 金/银/铜 ≥ N（N = 0…5） */
export const atLeastOptions: SelectOption<number>[] = [0, 1, 2, 3, 4, 5].map(n => ({ label: `≥ ${n}`, value: n }))

export const oiHasOptions: SelectOption<'yes' | 'no'>[] = [
  { label: '有 OI 奖项', value: 'yes' },
  { label: '无 OI 奖项', value: 'no' },
]
