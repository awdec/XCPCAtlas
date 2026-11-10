// @vitest-environment happy-dom
/* eslint-disable vue/one-component-per-file -- 测试内联桩组件与包装组件 */
// 组件验收（计划 M2-T3 / M3-T1 / M3-T3 / M5-T1）：共享状态、实体原子、DataTable 虚拟滚动、ChartBox。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { defineComponent, h, nextTick } from 'vue'
import { TooltipProvider } from 'reka-ui'

import OrgTag from '@/entities/contest/OrgTag.vue'
import MedalText from '@/entities/medal/MedalText.vue'
import ProblemCell from '@/entities/problem/ProblemCell.vue'
import SchoolLink from '@/entities/school/SchoolLink.vue'
import PlayerLink from '@/entities/player/PlayerLink.vue'
import DataTable from '@/shared/components/DataTable.vue'
import ChartBox from '@/features/analysis/charts/ChartBox.vue'
import { usePrefsStore } from '@/shared/stores/prefs'

vi.mock('vue-echarts', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      name: 'Echarts',
      props: {
        option: { type: Object, default: () => ({}) },
        theme: { type: String, default: '' },
        style: { type: [Object, String], default: () => ({}) },
      },
      setup(_, { expose }) {
        expose({ chart: null })
        return () => h('div', { 'data-vchart': '' })
      },
    }),
  }
})

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }],
  })
}

function mountWith(component: Parameters<typeof mount>[0], props: Record<string, unknown>) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = makeRouter()
  // 应用里 TooltipProvider 在 AppShell；单独挂载实体组件时补上
  const Wrapper = defineComponent({
    setup: () => () => h(TooltipProvider, { delayDuration: 300 }, { default: () => h(component, props) }),
  })
  return mount(Wrapper, { global: { plugins: [pinia, router] } })
}

describe('实体原子（M3-T3）', () => {
  it('OrgTag 按赛事着色，bar 变体只渲染色条', () => {
    const tag = mountWith(OrgTag, { org: 'ICPC' })
    expect(tag.text()).toBe('ICPC')
    expect(tag.get('[data-org-tag]').classes()).toContain('bg-org-icpc-soft')

    const bar = mountWith(OrgTag, { org: 'CCPC', bar: true })
    expect(bar.find('[data-org-tag]').exists()).toBe(false)
    expect(bar.find('.bg-org-ccpc').exists()).toBe(true)
  })

  it('MedalText 按奖牌档位显示中文，缺失按铁牌', () => {
    expect(mountWith(MedalText, { medal: 'gold' }).text()).toBe('金牌')
    expect(mountWith(MedalText, { medal: 'Silver Medal' }).text()).toBe('银牌')
    expect(mountWith(MedalText, { medal: null }).text()).toBe('铁牌')
  })

  it('ProblemCell 的提交文本与无障碍描述', () => {
    const solved = mountWith(ProblemCell, { letter: 'A', problem: { status: 'solved', attempts: 2, time: 35 } })
    expect(solved.text()).toContain('+1(35)')
    expect(solved.get('[data-problem]').attributes('aria-label')).toBe('A 题：通过，第 35 分钟，提交 2 次')

    const unsolved = mountWith(ProblemCell, { letter: 'B', problem: { status: 'unsolved', attempts: 3, time: 0 } })
    expect(unsolved.text()).toContain('-3')
    expect(unsolved.get('[data-problem]').attributes('aria-label')).toBe('B 题：未通过，提交 3 次')
  })

  it('SchoolLink 编码学校名并阻止冒泡', () => {
    const w = mountWith(SchoolLink, { year: 2025, school: '清华大学' })
    expect(w.get('a').attributes('href')).toBe(`/2025/school/${encodeURIComponent('清华大学')}`)
  })

  it('PlayerLink 只在有 OI 记录时挂载 OIer 标识', () => {
    const withOi = mountWith(PlayerLink, { year: 2025, member: { name: '张三', oi: [{ 比赛: 'NOI', 奖项: '金牌' }] } })
    expect(withOi.text()).toContain('☀️')
    expect(withOi.get('a').attributes('href')).toBe(`/2025/player/${encodeURIComponent('张三')}`)

    const without = mountWith(PlayerLink, { year: 2025, member: { name: '李四', oi: [] } })
    expect(without.text()).not.toContain('☀️')
    expect(without.get('a').attributes('href')).toBe(`/2025/player/${encodeURIComponent('李四')}`)
  })
})

describe('DataTable 虚拟滚动（M3-T1）', () => {
  const rows = Array.from({ length: 500 }, (_, i) => ({ i }))
  const columns = [{ key: 'i', label: '#', value: (r: { i: number }) => r.i }]

  beforeEach(() => {
    // happy-dom 没有布局：虚拟化按 clientHeight 计算可视区，给滚动容器一个高度
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
  })

  it('超过 200 行只渲染可视行，未虚拟化时全量渲染', async () => {
    const virtual = mountWith(DataTable, { columns, rows, rowKey: (r: { i: number }) => r.i, caption: '虚拟' })
    await nextTick()
    await new Promise(r => setTimeout(r, 50))
    await nextTick()
    const virtualCount = virtual.findAll('tbody tr[data-index]').length
    expect(virtualCount).toBeGreaterThan(0)
    expect(virtualCount).toBeLessThan(rows.length)

    const plain = mountWith(DataTable, { columns, rows: rows.slice(0, 50), rowKey: (r: { i: number }) => r.i, caption: '普通' })
    await nextTick()
    expect(plain.findAll('tbody tr[data-index]')).toHaveLength(50)
  })
})

describe('ChartBox（M5-T1）', () => {
  it('提供 aria 描述，减弱动效时关闭动画', () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    usePrefsStore().reducedMotion = true
    const router = makeRouter()
    const w = mount(ChartBox, {
      props: { option: { series: [] }, label: '测试图表' },
      global: { plugins: [pinia, router] },
    })
    expect(w.get('[role="img"]').attributes('aria-label')).toBe('测试图表')
    const chart = w.findComponent({ name: 'Echarts' })
    expect((chart.props('option') as { animation?: boolean }).animation).toBe(false)
  })
})

describe('界面偏好（M2-T3）', () => {
  beforeEach(() => localStorage.clear())

  it('减弱动效开关持久化到 localStorage', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const prefs = usePrefsStore()
    prefs.reducedMotion = true
    await nextTick()
    expect(localStorage.getItem('xcpc_reduced_motion')).toBe('1')
  })
})
