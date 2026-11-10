/**
 * 前端分页（B-F6 / B-F7）：只把当前页交给表格；resetOn 中任一值变化回到第 1 页。
 */
import { computed, ref, watch, type Ref, type WatchSource } from 'vue'
import { pageSlice, totalPages } from '@/domain/pagination'

export function usePagedList<T>(rows: Ref<T[]>, pageSize: number, resetOn: WatchSource[] = []) {
  const page = ref(1)
  const total = computed(() => totalPages(rows.value.length, pageSize))
  const current = computed(() => pageSlice(rows.value, page.value, pageSize))
  if (resetOn.length) watch(resetOn, () => { page.value = 1 }, { deep: true })
  return { page, total, current }
}
