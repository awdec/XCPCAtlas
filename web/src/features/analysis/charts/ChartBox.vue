<script setup lang="ts">
/**
 * 图表容器（替代 AnalysisChart，计划 M5-T1）：
 * - 与旧组件相同的 use([...]) 注册与 option/height/@click 接口
 * - 亮/暗主题（只影响非数据元素）、aria 描述、减弱动效时关闭动画
 * - linkResolver：点击数据点时，普通左键在当前页跳转；Ctrl/Cmd/Shift+点击或中键在新标签打开（D5）
 */
import { computed, shallowRef } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, PieChart, LineChart, ScatterChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, AriaComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '@/shared/composables/useTheme'
import { useReducedMotion } from '@/shared/composables/useReducedMotion'
import type { ChartOption } from './options'
import { registerChartThemes } from './echarts-theme'

use([BarChart, PieChart, LineChart, ScatterChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, AriaComponent, CanvasRenderer])
registerChartThemes()

type EChartsParams = { componentType?: string; seriesType?: string; data?: unknown; event?: { event?: unknown } }

const props = withDefaults(defineProps<{
  option: ChartOption
  height?: string
  label: string
  linkResolver?: (params: EChartsParams) => RouteLocationRaw | null
}>(), { height: '360px' })
const emit = defineEmits<{ click: [params: EChartsParams] }>()

const { isDark } = useTheme()
const reduced = useReducedMotion()
const router = useRouter()

const merged = computed<ChartOption>(() => ({
  aria: { enabled: true, label: { description: props.label } },
  animation: !reduced.value,
  animationDuration: 400,
  animationDurationUpdate: 300,
  animationEasing: 'cubicOut',
  ...props.option,
}))

const chartRef = shallowRef<InstanceType<typeof VChart> | null>(null)

function onClick(params: EChartsParams) {
  emit('click', params)
  if (!props.linkResolver) return
  const to = props.linkResolver(params)
  if (!to) return
  const e = params.event?.event as MouseEvent | undefined
  if (e && (e.ctrlKey || e.metaKey || e.shiftKey)) window.open(router.resolve(to).href, '_blank', 'noopener')
  else void router.push(to)
}

// 中键：zrender 的 click 不会为中键触发，单独监听 mouseup（best effort）
function onZrMouseUp(evt: { event?: MouseEvent; target?: unknown }) {
  if (!props.linkResolver || evt.event?.button !== 1 || !evt.target) return
  const chart = chartRef.value?.chart
  if (!chart) return
  const offset = [evt.event.offsetX, evt.event.offsetY]
  const opt = chart.getOption() as { series?: { data?: unknown[] }[] }
  for (let si = 0; si < (opt.series?.length ?? 0); si++) {
    const found = chart.convertFromPixel({ seriesIndex: si }, offset)
    if (!found) continue
    // 取距离最近的点
    const data = opt.series?.[si]?.data ?? []
    let best: unknown = null
    let bestD = Infinity
    for (const d of data) {
      if (!Array.isArray(d)) continue
      const px = chart.convertToPixel({ seriesIndex: si }, [d[0], d[1]]) as number[]
      const dist = Math.hypot(px[0]! - offset[0]!, px[1]! - offset[1]!)
      if (dist < bestD) { bestD = dist; best = d }
    }
    if (best && bestD < 10) {
      const to = props.linkResolver({ componentType: 'series', seriesType: 'scatter', data: best })
      if (to) window.open(router.resolve(to).href, '_blank', 'noopener')
      return
    }
  }
}

function onReady() {
  chartRef.value?.chart?.getZr().on('mouseup', onZrMouseUp as never)
}
</script>

<template>
  <div role="img" :aria-label="label" class="relative">
    <VChart
      ref="chartRef"
      :option="merged"
      :theme="isDark ? 'xcpc-dark' : 'xcpc-light'"
      :style="{ height }"
      autoresize
      @click="onClick"
      @rendered.once="onReady"
    />
  </div>
</template>
