<script setup lang="ts" generic="T extends string | number">
/**
 * 下拉选择（Reka Select）。对应旧 el-select：
 * - placeholder 在未选择时显示（E2E 页对象按占位文字定位）
 * - clearable：已选时出现清除按钮，清除后值为 ''
 * Reka 的 SelectItem 不接受空字符串值，内部用字符串键映射。
 */
import { computed } from 'vue'
import {
  SelectContent, SelectItem, SelectItemIndicator, SelectItemText, SelectPortal, SelectRoot,
  SelectTrigger, SelectValue, SelectViewport,
} from 'reka-ui'
import { Check, ChevronDown, X } from 'lucide-vue-next'
import { cn } from '@/shared/lib/cn'

export interface SelectOption<V> { label: string; value: V }

const model = defineModel<T | '' | null>({ required: true })
const props = defineProps<{
  options: SelectOption<T>[]
  placeholder: string
  clearable?: boolean
  class?: string
  /** 未选择时显示的值文本（如默认选中项），不影响 v-model */
  display?: string
}>()

const keyOf = (v: T) => `k:${typeof v}:${String(v)}`
const inner = computed({
  get: () => (model.value === '' || model.value == null ? undefined : keyOf(model.value as T)),
  set: (k: string | undefined) => {
    const opt = props.options.find(o => keyOf(o.value) === k)
    model.value = opt ? opt.value : ''
  },
})
const selectedLabel = computed(() => props.options.find(o => keyOf(o.value) === inner.value)?.label ?? (props.display || undefined))
</script>

<template>
  <div :class="cn('relative', props.class)" data-select>
    <SelectRoot v-model="inner">
      <SelectTrigger
        :aria-label="placeholder"
        :class="cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface pl-3 pr-2 text-left text-sm',
          'transition-[border-color] duration-(--dur-fast) hover:border-fg-faint focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
          'data-[state=open]:border-ring',
        )"
      >
        <SelectValue :placeholder="placeholder" class="truncate" :class="selectedLabel ? 'text-fg' : 'text-fg-faint'" data-select-value>
          <span v-if="!selectedLabel" data-placeholder>{{ placeholder }}</span>
          <template v-else>{{ selectedLabel }}</template>
        </SelectValue>
        <ChevronDown class="size-4 shrink-0 text-fg-faint" aria-hidden="true" :class="clearable && selectedLabel ? 'invisible' : ''" />
      </SelectTrigger>
      <SelectPortal>
        <SelectContent
          position="popper"
          :side-offset="4"
          class="select-content z-50 max-h-(--reka-select-content-available-height) min-w-(--reka-select-trigger-width) overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          <SelectViewport class="p-1">
            <SelectItem
              v-for="o in options"
              :key="keyOf(o.value)"
              :value="keyOf(o.value)"
              class="relative flex h-8 cursor-default select-none items-center rounded-sm pl-2 pr-8 text-sm text-fg outline-none data-highlighted:bg-surface-3 data-[state=checked]:font-medium data-[state=checked]:text-primary"
              data-option
            >
              <SelectItemText>{{ o.label }}</SelectItemText>
              <SelectItemIndicator class="absolute right-2 inline-flex items-center">
                <Check class="size-4" aria-hidden="true" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>
    <button
      v-if="clearable && selectedLabel"
      type="button"
      class="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-fg-faint hover:bg-surface-3 hover:text-fg"
      :aria-label="`清除${placeholder}`"
      @click="model = ''"
    >
      <X class="size-3.5" aria-hidden="true" />
    </button>
  </div>
</template>

<style>
.select-content[data-state='open'] {
  animation: select-in var(--dur-fast) var(--ease-enter);
}
.select-content[data-state='closed'] {
  animation: select-out calc(var(--dur-fast) * 0.75) var(--ease-exit);
}
@keyframes select-in { from { opacity: 0; transform: translateY(-4px) scale(0.98); } }
@keyframes select-out { to { opacity: 0; transform: translateY(-4px) scale(0.98); } }
</style>
