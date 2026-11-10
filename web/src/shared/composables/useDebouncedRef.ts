/**
 * 防抖值（B-F2 / D4）：输入框即时回显 source，筛选使用 debounced（默认 300ms）。
 * pending 用于表体淡出提示（§8.3）。
 */
import { ref, watch, type Ref, onScopeDispose } from 'vue'

export function useDebouncedRef<T>(source: Ref<T>, ms = 300) {
  const debounced = ref(source.value) as Ref<T>
  const pending = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(source, (v) => {
    clearTimeout(timer)
    pending.value = true
    timer = setTimeout(() => {
      debounced.value = v
      pending.value = false
    }, ms)
  }, { deep: true })
  onScopeDispose(() => clearTimeout(timer))
  return { debounced, pending }
}
