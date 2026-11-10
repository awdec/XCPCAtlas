/**
 * ECharts 主题（计划 §7.1）：只改坐标轴、网格、文字、提示框等非数据元素；
 * 数据色由各 option 自身决定（MEDAL_COLORS 等），亮暗主题下保持不变。
 */
import { registerTheme } from 'echarts/core'

const font = { fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", sans-serif' }

function axis(line: string, label: string, split: string) {
  return {
    axisLine: { lineStyle: { color: line } },
    axisTick: { lineStyle: { color: line } },
    axisLabel: { color: label },
    splitLine: { lineStyle: { color: split } },
    nameTextStyle: { color: label },
  }
}

let registered = false

export function registerChartThemes(): void {
  if (registered) return
  registered = true
  registerTheme('xcpc-light', {
    backgroundColor: 'transparent',
    textStyle: font,
    legend: { textStyle: { color: '#4b5563' } },
    categoryAxis: axis('#d1d5db', '#4b5563', '#eef0f3'),
    valueAxis: axis('#d1d5db', '#4b5563', '#eef0f3'),
    tooltip: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', textStyle: { color: '#1f2937' } },
    visualMap: { textStyle: { color: '#4b5563' } },
  })
  registerTheme('xcpc-dark', {
    backgroundColor: 'transparent',
    textStyle: { ...font, color: '#e6e8ec' },
    legend: { textStyle: { color: '#b3bac6' } },
    categoryAxis: axis('#3a4251', '#b3bac6', '#262c37'),
    valueAxis: axis('#3a4251', '#b3bac6', '#262c37'),
    tooltip: { backgroundColor: '#1b2029', borderColor: '#2b3240', textStyle: { color: '#e6e8ec' } },
    visualMap: { textStyle: { color: '#b3bac6' } },
  })
}
