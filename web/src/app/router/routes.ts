/**
 * 路由表（B-G1）：路径与名称与旧 main.js 完全一致，新增 NotFound 兜底（D2）。
 * 页面全部懒加载；props: true 时 year/id/code/name 作为 props 传入。
 */
import type { RouteRecordRaw } from 'vue-router'

export const routes: RouteRecordRaw[] = [
  { path: '/', name: 'Home', component: () => import('@/pages/home/HomePage.vue') },
  { path: '/announcement', name: 'Announcement', component: () => import('@/pages/announcement/AnnouncementPage.vue') },
  { path: '/:year/', name: 'YearHome', component: () => import('@/pages/year/YearPage.vue'), props: true },
  { path: '/:year/contest/:id', name: 'Contest', component: () => import('@/pages/contest/ContestPage.vue'), props: true },
  { path: '/:year/summary', name: 'Summary', component: () => import('@/pages/summary/SummaryPage.vue'), props: true },
  { path: '/:year/analysis', name: 'Analysis', component: () => import('@/pages/analysis/AnalysisPage.vue'), props: true },
  { path: '/:year/trajectory/:code', name: 'TrajectoryDetail', component: () => import('@/pages/trajectory/TrajectoryPage.vue'), props: true },
  { path: '/:year/school/:name', name: 'School', component: () => import('@/pages/school/SchoolPage.vue'), props: true },
  { path: '/:year/players', name: 'Players', component: () => import('@/pages/players/PlayersPage.vue'), props: true },
  { path: '/:year/player/:name', name: 'Player', component: () => import('@/pages/player/PlayerPage.vue'), props: true },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: () => import('@/pages/not-found/NotFoundPage.vue') },
]
