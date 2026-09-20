<script setup>
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart, PieChart, LineChart, ScatterChart, HeatmapChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([BarChart, PieChart, LineChart, ScatterChart, HeatmapChart, GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, CanvasRenderer])

defineProps({
  option: { type: Object, required: true },
  height: { type: String, default: '360px' },
})

// 转发 ECharts 元素级 click（仅在点到系列数据元素时触发，params 为 ECElementEvent）
const emit = defineEmits(['click'])
</script>

<template>
  <v-chart :option="option" :style="{ height }" autoresize @click="emit('click', $event)" />
</template>
