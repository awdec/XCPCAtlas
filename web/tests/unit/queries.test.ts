// @vitest-environment happy-dom
// 数据层并发安全（B-PL3 / 审查 P1-2）：scope=all 在等待 years.json 期间切换姓名，
// 原查询必须仍按原姓名计算并缓存到原 queryKey 下。
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'

const mocks = vi.hoisted(() => ({
  loadYears: vi.fn(),
  playerRecords: vi.fn(),
}))

vi.mock('@/data/loaders', () => ({
  loadYears: mocks.loadYears,
  loadSchoolTags: vi.fn(),
  loadContestsIndex: vi.fn(),
  loadContest: vi.fn(),
  loadTrajectories: vi.fn(),
  loadOIRecords: vi.fn(),
}))

vi.mock('@/workers/year-client', () => ({
  yearClient: () => ({ playerRecords: mocks.playerRecords }),
}))

const { usePlayerRecords } = await import('@/data/queries')

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>(r => { resolve = r })
  return { promise, resolve }
}

describe('usePlayerRecords 并发安全', () => {
  beforeEach(() => {
    mocks.loadYears.mockReset()
    mocks.playerRecords.mockReset()
    mocks.playerRecords.mockResolvedValue({ contests: [], oi: [] })
  })

  it('years.json 延迟返回期间切换姓名，仍按原姓名计算', async () => {
    const gate = deferred<{ year: number }[]>()
    mocks.loadYears.mockReturnValueOnce(gate.promise)
    mocks.loadYears.mockImplementation(() => Promise.resolve([{ year: 2025 }, { year: 2026 }]))

    const year = ref('2025')
    const name = ref('刘海峰')
    const allYears = ref(true)
    const school = ref('')

    const Comp = defineComponent({
      setup() {
        usePlayerRecords(year, name, allYears, school)
        return () => h('div')
      },
    })

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
    const wrapper = mount(Comp, { global: { plugins: [[VueQueryPlugin, { queryClient }]] } })

    await nextTick()
    await vi.waitFor(() => expect(mocks.loadYears).toHaveBeenCalled())

    // 原查询停在 years.json 上时切换姓名
    name.value = '另一个人'
    await nextTick()

    gate.resolve([{ year: 2025 }, { year: 2026 }])
    await vi.waitFor(() => expect(mocks.playerRecords).toHaveBeenCalledTimes(2))

    // 原 queryKey 的那次调用必须用旧姓名，而不是切换后的姓名
    expect(mocks.playerRecords).toHaveBeenCalledWith([2025, 2026], '2025', '刘海峰', '')
    wrapper.unmount()
  })
})
