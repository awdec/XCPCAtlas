<script setup lang="ts" generic="T">
/**
 * 数据表格（替代 el-table，计划 M3-T1）。
 * - 语义化 <table>，表头 sticky；首列可固定（横向滚动时保持可见）
 * - 行色调：tone（底色，B-C6）/ textTone（整行文字色，B-S6），斑马纹
 * - 三态排序，稳定（并列保持原顺序）
 * - 超过 virtualizeOver 行时虚拟滚动（只渲染可视行）
 * - 单元格插槽：#cell-<key>="{ row, index }"
 * - rowLink：整行可点击跳转时，由调用方在首个单元格放置真实链接并以 ::after 撑满整行（D5）
 */
import { computed, ref, useTemplateRef } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-vue-next'
import InfoHint from './InfoHint.vue'
import Tooltip from '@/shared/ui/Tooltip.vue'
import { cn } from '@/shared/lib/cn'
import { nextSort, sortRows, type Column, type SortState } from './data-table'
import type { MedalTone } from '@/domain/medal'

const props = withDefaults(defineProps<{
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  tone?: (row: T) => MedalTone
  textTone?: (row: T) => MedalTone
  maxHeight?: string
  striped?: boolean
  bordered?: boolean
  caption: string
  emptyText?: string
  virtualizeOver?: number
  rowHeight?: number
  rowClass?: string
  /** 表格固定宽度（px），用于数据分析页的窄表居中 */
  width?: number
  size?: 'sm' | 'md' | 'lg'
  pending?: boolean
}>(), {
  maxHeight: '70vh',
  striped: true,
  bordered: true,
  emptyText: '暂无数据',
  virtualizeOver: 200,
  rowHeight: 41,
  size: 'md',
  pending: false,
})

const sort = ref<SortState>({ key: null, dir: null })
const sorted = computed(() => sortRows(props.rows, props.columns, sort.value))
const toggleSort = (c: Column<T>) => { if (c.sortable) sort.value = nextSort(sort.value, c.key) }

const scroller = useTemplateRef<HTMLElement>('scroller')
const virtual = computed(() => sorted.value.length > props.virtualizeOver)
const virtualizer = useVirtualizer(computed(() => ({
  count: virtual.value ? sorted.value.length : 0,
  getScrollElement: () => scroller.value,
  estimateSize: () => props.rowHeight,
  overscan: 12,
})))
const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const padTop = computed(() => (virtual.value ? virtualRows.value[0]?.start ?? 0 : 0))
const padBottom = computed(() => {
  if (!virtual.value) return 0
  const last = virtualRows.value[virtualRows.value.length - 1]
  return last ? virtualizer.value.getTotalSize() - last.end : 0
})
const visible = computed(() => (virtual.value
  ? virtualRows.value.map(v => ({ row: sorted.value[v.index]!, index: v.index }))
  : sorted.value.map((row, index) => ({ row, index }))))

const cellPad = computed(() => ({ sm: 'px-2.5 py-1.5', md: 'px-3 py-2.5', lg: 'px-4 py-3' })[props.size])
const fontSize = computed(() => ({ sm: 'text-[13px]', md: 'text-sm', lg: 'text-base' })[props.size])
const alignClass = (c: Column<T>) => (c.align === 'center' ? 'text-center' : c.align === 'right' ? 'text-right' : 'text-left')
const widthStyle = (c: Column<T>) => (c.width ? { width: `${c.width}px`, minWidth: `${c.width}px` } : c.minWidth ? { minWidth: `${c.minWidth}px` } : {})
const ariaSort = (c: Column<T>) => (!c.sortable ? undefined : sort.value.key === c.key ? (sort.value.dir === 'asc' ? 'ascending' : 'descending') : 'none')
const cellText = (c: Column<T>, row: T) => {
  const v = c.value?.(row)
  return v == null ? '' : String(v)
}
</script>

<template>
  <div
    :class="cn('relative overflow-hidden rounded-lg bg-surface', bordered && 'border border-border')"
    :style="width ? { width: `min(100%, ${width}px)`, marginInline: 'auto' } : undefined"
    data-table
  >
    <div ref="scroller" class="overflow-auto overscroll-x-contain" :style="{ maxHeight }">
      <table :class="cn('w-full border-separate border-spacing-0 tabular', fontSize)">
        <caption class="sr-only">{{ caption }}</caption>
        <thead>
          <tr>
            <th
              v-for="c in columns"
              :key="c.key"
              scope="col"
              :aria-sort="ariaSort(c)"
              :style="widthStyle(c)"
              :class="cn(
                'sticky top-0 z-10 whitespace-nowrap border-b border-border bg-surface-2 font-semibold text-fg-muted',
                cellPad, alignClass(c),
                c.pinned && 'left-0 z-20 shadow-[1px_0_0_var(--border)]',
                bordered && 'border-r border-r-border-soft last:border-r-0',
                c.headerClass,
              )"
            >
              <button
                v-if="c.sortable"
                type="button"
                class="inline-flex items-center gap-1 rounded hover:text-fg"
                :class="c.align === 'center' ? 'justify-center' : ''"
                @click="toggleSort(c)"
              >
                {{ c.label }}
                <ArrowUp v-if="sort.key === c.key && sort.dir === 'asc'" class="size-3.5 text-primary" aria-hidden="true" />
                <ArrowDown v-else-if="sort.key === c.key && sort.dir === 'desc'" class="size-3.5 text-primary" aria-hidden="true" />
                <ChevronsUpDown v-else class="size-3.5 text-fg-faint" aria-hidden="true" />
              </button>
              <template v-else>
                <slot :name="`head-${c.key}`">{{ c.label }}</slot>
              </template>
              <InfoHint v-if="c.hint" :text="c.hint" />
            </th>
          </tr>
        </thead>
        <tbody class="pending-fade" :data-pending="pending">
          <tr v-if="padTop" aria-hidden="true"><td :colspan="columns.length" :style="{ height: `${padTop}px`, padding: 0, border: 0 }" /></tr>
          <tr
            v-for="{ row, index } in visible"
            :key="rowKey(row, index)"
            :data-tone="tone?.(row) ?? undefined"
            :data-text-tone="textTone?.(row) ?? undefined"
            :data-striped="striped && index % 2 === 1"
            :data-index="index"
            :class="cn('group/row', rowClass)"
          >
            <td
              v-for="c in columns"
              :key="c.key"
              :class="cn(
                'border-b border-border-soft bg-surface transition-colors duration-(--dur-instant) group-hover/row:bg-surface-2',
                striped && index % 2 === 1 && 'bg-surface-2/60',
                cellPad, alignClass(c),
                c.pinned && 'sticky left-0 z-[1] shadow-[1px_0_0_var(--border-soft)]',
                bordered && 'border-r border-r-border-soft last:border-r-0',
                c.truncate && 'max-w-0',
              )"
              :style="widthStyle(c)"
            >
              <Tooltip v-if="c.truncate" :delay="400">
                <div class="truncate"><slot :name="`cell-${c.key}`" :row="row" :index="index">{{ cellText(c, row) }}</slot></div>
                <template #content><slot :name="`cell-${c.key}`" :row="row" :index="index">{{ cellText(c, row) }}</slot></template>
              </Tooltip>
              <slot v-else :name="`cell-${c.key}`" :row="row" :index="index">{{ cellText(c, row) }}</slot>
            </td>
          </tr>
          <tr v-if="padBottom" aria-hidden="true"><td :colspan="columns.length" :style="{ height: `${padBottom}px`, padding: 0, border: 0 }" /></tr>
          <tr v-if="!sorted.length">
            <td :colspan="columns.length" class="py-10 text-center text-sm text-fg-subtle">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
