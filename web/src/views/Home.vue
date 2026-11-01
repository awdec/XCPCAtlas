<script setup>
import { ref, onMounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { loadYears } from '../utils/dataLoader'

const years = ref([])
const loading = ref(true)

// 首次进入首页弹窗介绍项目：localStorage 记录上次关闭时间戳，超过 7 天再次弹出；key 带版本号，文案改版时升版本让用户再看一次（版本号不展示）
const INTRO_SEEN_KEY = 'xcpc_intro_seen_v1'
const INTRO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const showIntro = ref(false)

// 弹窗文案：\n 分段（white-space: pre-line 渲染；模板内直接换行会被 Vue 编译压缩成空格）
const introText = '本平台收录了 2020-2026 赛季 ICPC/CCPC 各赛区的比赛结果。您可以通过首页查看各赛区概况，在"全部成绩"页搜索和筛选所有队伍，并查看选手的 OI 竞赛获奖经历。\n\n同时还提供了各个赛站和当年赛站总情况的数据分析，可以通过具体年份的"数据分析"查看具体内容：包括获奖率、赛站之间的获奖重合度、各奖牌具体 OI 奖项数量等。'

const closeIntro = () => {
  showIntro.value = false
  try {
    localStorage.setItem(INTRO_SEEN_KEY, String(Date.now()))
  } catch {
    // 隐私模式等存储不可用时忽略，页面不受影响（下次进入会再弹）
  }
}

onMounted(async () => {
  let lastSeen = 0
  try {
    lastSeen = Number(localStorage.getItem(INTRO_SEEN_KEY)) || 0
  } catch {
    lastSeen = 0
  }
  showIntro.value = !lastSeen || Date.now() - lastSeen > INTRO_INTERVAL_MS
  try {
    years.value = await loadYears()
  } catch (e) {
    console.error('加载年份数据失败:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold text-gray-800 mb-2">ICPC/CCPC 比赛结果</h2>
      <p class="text-gray-500">选择年份查看各赛区比赛结果</p>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <el-icon class="is-loading text-3xl text-blue-500"><Loading /></el-icon>
    </div>

    <div v-else-if="years.length === 0" class="text-center py-20 text-gray-500">
      暂无数据
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
      <router-link
        v-for="y in years"
        :key="y.year"
        :to="`/${y.year}/`"
        class="block bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
      >
        <div class="h-1.5 rounded-t-xl bg-blue-500" />
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-2xl font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
              {{ y.year }}
            </h3>
            <span class="text-sm text-gray-400">赛季</span>
          </div>

          <div class="space-y-2 text-sm text-gray-600">
            <div class="flex items-center gap-2">
              <span class="text-blue-500">🏆</span>
              <span>{{ y.contest_count }} 个赛区</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-green-500">👥</span>
              <span>{{ y.total_teams }} 支队伍</span>
            </div>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100">
            <span class="text-blue-500 text-sm font-medium group-hover:text-blue-700 transition-colors">
              查看详情 →
            </span>
          </div>
        </div>
      </router-link>
    </div>

    <!-- 首次访问介绍弹窗（仅"知道了"按钮可关闭，关闭时写入已读标志） -->
    <el-dialog
      v-model="showIntro"
      title="网站说明"
      width="480px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      :show-close="false"
    >
      <p class="text-base text-gray-600 leading-relaxed" style="white-space: pre-line">{{ introText }}</p>
      <template #footer>
        <el-button type="primary" @click="closeIntro">知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>
