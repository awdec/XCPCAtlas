import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './assets/styles/main.css'

// 路由配置
const routes = [
  { path: '/', name: 'Home', component: () => import('./views/Home.vue') },
  { path: '/announcement', name: 'Announcement', component: () => import('./views/Announcement.vue') },
  { path: '/:year/', name: 'YearHome', component: () => import('./views/YearHome.vue'), props: true },
  { path: '/:year/contest/:id', name: 'Contest', component: () => import('./views/Contest.vue'), props: true },
  { path: '/:year/summary', name: 'Summary', component: () => import('./views/Summary.vue'), props: true },
  { path: '/:year/analysis', name: 'Analysis', component: () => import('./views/Analysis.vue'), props: true },
  { path: '/:year/trajectory/:code', name: 'TrajectoryDetail', component: () => import('./views/TrajectoryDetail.vue'), props: true },
  { path: '/:year/school/:name', name: 'School', component: () => import('./views/School.vue'), props: true },
  { path: '/:year/players', name: 'Players', component: () => import('./views/Players.vue'), props: true },
  { path: '/:year/player/:name', name: 'Player', component: () => import('./views/Player.vue'), props: true },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 年份验证守卫
router.beforeEach((to, from, next) => {
  // 如果路由包含年份参数，验证年份格式
  if (to.params.year) {
    const year = parseInt(to.params.year)
    if (isNaN(year) || year < 2020 || year > 2030) {
      // 无效年份，重定向到首页
      next({ name: 'Home' })
      return
    }
  }
  next()
})

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(router)
app.mount('#app')
