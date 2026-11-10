/**
 * 应用入口：Pinia → Vue Query → Router → MotionConfig（在 App.vue 中）。
 * Element Plus 已移除（M7-T1）；ECharts 及其主题只在数据分析页的分块中加载。
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { createAppRouter } from './router'
import { createQueryClient } from './providers/query-client'
import '@/shared/styles/index.css'

const app = createApp(App)
app.use(createPinia())
app.use(VueQueryPlugin, { queryClient: createQueryClient() })
app.use(createAppRouter())
app.mount('#app')
