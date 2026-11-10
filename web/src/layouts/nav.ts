/**
 * 导航项（B-G4）。图标由原 emoji 换为 lucide（计划 §2.3 允许装饰性 emoji 换图标），文字不变。
 */
import { CalendarDays, Megaphone, House, Table2, UserRound, ChartColumn } from 'lucide-vue-next'
import type { Component } from 'vue'

export interface NavItem { path: string; label: string; icon: Component }

export const globalNavItems: NavItem[] = [
  { path: '/', label: '年份选择', icon: CalendarDays },
  { path: '/announcement', label: '公告', icon: Megaphone },
]

export function yearNavItems(year: string | null): NavItem[] {
  if (!year) return []
  return [
    { path: `/${year}/`, label: '赛区列表', icon: House },
    { path: `/${year}/summary`, label: '全部成绩', icon: Table2 },
    { path: `/${year}/players`, label: '选手成绩', icon: UserRound },
    { path: `/${year}/analysis`, label: '数据分析', icon: ChartColumn },
  ]
}
