<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Loading } from '@element-plus/icons-vue'
import { loadContestData, loadSchoolTags } from '../utils/dataLoader'
import { aggregateBySchool } from '../utils/formatters'
import RankTable from '../components/RankTable.vue'
import TeamDetail from '../components/TeamDetail.vue'
import SchoolStats from '../components/SchoolStats.vue'

const props = defineProps({
  year: {
    type: String,
    required: true
  }
})

const route = useRoute()

const contest = ref(null)
const loading = ref(true)
const error = ref('')
const searchMember = ref('')
const searchTeam = ref('')
const searchSchool = ref('')
// 搜索输入防抖（300ms）：输入即时回显，筛选按防抖值计算，避免大数据量榜单逐键重渲染
const debouncedSearch = ref({ school: '', team: '', member: '' })
let searchTimer = null
watch([searchSchool, searchTeam, searchMember], () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    debouncedSearch.value = { school: searchSchool.value, team: searchTeam.value, member: searchMember.value }
  }, 300)
})
const filterSchoolType = ref('')
const filterOiCount = ref('')
const activeTab = ref('rank')
const selectedTeam = ref(null)
const showTeamDetail = ref(false)
const schoolTags = ref({ set985: new Set(), set211: new Set() })

// 前端分页：大榜单（2000+ 队）全量渲染 el-table 会卡顿，只渲染当前页
const PAGE_SIZE = 100
const currentPage = ref(1)

const currentTeams = computed(() => {
  if (!contest.value) return []
  let teams = contest.value.sheets['正式队伍'] || []
  const qSchool = debouncedSearch.value.school.trim().toLowerCase()
  const qTeam = debouncedSearch.value.team.trim().toLowerCase()
  const qMember = debouncedSearch.value.member.trim().toLowerCase()
  if (qSchool) teams = teams.filter(t => t.school.toLowerCase().includes(qSchool))
  if (qTeam) teams = teams.filter(t => t.team.toLowerCase().includes(qTeam))
  if (qMember) teams = teams.filter(t => t.members.some(m => m.name.toLowerCase().includes(qMember)))
  if (filterSchoolType.value) {
    const { set985, set211 } = schoolTags.value
    if (filterSchoolType.value === '985') teams = teams.filter(t => set985.has(t.school))
    else if (filterSchoolType.value === '211') teams = teams.filter(t => set211.has(t.school) && !set985.has(t.school))
    else if (filterSchoolType.value === 'other') teams = teams.filter(t => !set211.has(t.school) && !set985.has(t.school))
  }
  if (filterOiCount.value !== '' && filterOiCount.value != null) {
    const n = Number(filterOiCount.value)
    teams = teams.filter(t => t.members.filter(m => m.oi?.length).length === n)
  }
  return teams
})

// 任一筛选条件变化（含防抖后的搜索词）回到第 1 页
watch([debouncedSearch, filterSchoolType, filterOiCount], () => {
  currentPage.value = 1
})

const totalPages = computed(() => Math.ceil(currentTeams.value.length / PAGE_SIZE))
// 页码按钮：当前页 ± 二进制偏移（1, 2, 4, 8, 16），不越界（与全部成绩页一致）
const pageButtons = computed(() => {
  const cur = currentPage.value
  const total = totalPages.value
  const set = new Set([cur])
  for (let step = 1; step <= 16; step *= 2) {
    if (cur - step >= 1) set.add(cur - step)
    if (cur + step <= total) set.add(cur + step)
  }
  return [...set].sort((a, b) => a - b)
})
const pagedTeams = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return currentTeams.value.slice(start, start + PAGE_SIZE)
})
const goToPage = (page) => {
  currentPage.value = page
}

const schoolStats = computed(() => {
  if (!contest.value) return []
  const formal = contest.value.sheets['正式队伍'] || []
  return aggregateBySchool(formal)
})

let loadSeq = 0

const loadContest = async (year, id) => {
  const seq = ++loadSeq
  loading.value = true
  error.value = ''
  try {
    const data = await loadContestData(year, id)
    const tags = await loadSchoolTags()
    if (seq !== loadSeq) return
    contest.value = data
    schoolTags.value = tags
    currentPage.value = 1
  } catch (e) {
    if (seq !== loadSeq) return
    console.error('加载赛区数据失败:', e)
    contest.value = null
    error.value = '赛区数据加载失败，请稍后重试'
  } finally {
    if (seq === loadSeq) loading.value = false
  }
}

onMounted(() => loadContest(props.year, route.params.id))
watch([() => props.year, () => route.params.id], ([year, id]) => { if (id) loadContest(year, id) })

const openTeamDetail = (team) => {
  selectedTeam.value = team
  showTeamDetail.value = true
}
</script>

<template>
  <div v-if="loading" class="flex justify-center py-20">
    <el-icon class="is-loading text-3xl text-blue-500"><Loading /></el-icon>
  </div>

  <div v-else-if="error" class="flex justify-center py-20">
    <el-result icon="warning" title="加载失败" :sub-title="error" />
  </div>

  <div v-else-if="contest">
    <!-- 赛区标题 -->
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-1">
        <h2 class="text-2xl font-bold text-gray-800">{{ contest.name }}</h2>
        <span
          class="text-xs font-medium px-2 py-0.5 rounded-full"
          :class="contest.org === 'ICPC' ? 'bg-blue-100 text-blue-700' : contest.org === 'CCPC' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'"
        >{{ contest.org }}</span>
      </div>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="mb-4">
      <el-tab-pane label="📋 排名" name="rank" />
      <el-tab-pane label="🏫 学校统计" name="schools" />
    </el-tabs>

    <!-- 排名 Tab -->
    <div v-if="activeTab === 'rank'">
      <!-- 搜索 + 筛选 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="w-40 shrink-0">
          <el-input v-model="searchSchool" placeholder="搜索学校" clearable />
        </div>
        <div class="w-40 shrink-0">
          <el-input v-model="searchTeam" placeholder="搜索队伍" clearable />
        </div>
        <div class="w-40 shrink-0">
          <el-input v-model="searchMember" placeholder="搜索队员" clearable />
        </div>
        <span class="text-sm text-gray-400">共 {{ currentTeams.length }} 支队伍</span>
      </div>
      <div class="flex items-center gap-3 mb-4">
        <div class="w-32 shrink-0">
          <el-select v-model="filterSchoolType" placeholder="学校类型" clearable>
            <el-option label="985" value="985" />
            <el-option label="211" value="211" />
            <el-option label="其他" value="other" />
          </el-select>
        </div>
        <div class="w-32 shrink-0">
          <el-select v-model="filterOiCount" placeholder="OI 人数" clearable>
            <el-option label="0 人" :value="0" />
            <el-option label="1 人" :value="1" />
            <el-option label="2 人" :value="2" />
            <el-option label="3 人" :value="3" />
          </el-select>
        </div>
      </div>

      <!-- 排名表格 -->
      <RankTable
        :teams="pagedTeams"
        :year="year"
        @team-click="openTeamDetail"
      />

      <!-- 分页（与全部成绩页一致：二进制偏移页码） -->
      <div v-if="currentTeams.length" class="flex items-center justify-center gap-2 mt-4 flex-wrap">
        <span class="text-sm text-gray-500 mr-2">每页 {{ PAGE_SIZE }} 条，共 {{ totalPages }} 页</span>
        <button
          v-for="page in pageButtons"
          :key="page"
          @click="goToPage(page)"
          class="px-3 py-1.5 rounded text-sm font-medium border transition-colors"
          :class="currentPage === page
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- 学校统计 Tab -->
    <div v-if="activeTab === 'schools'">
      <SchoolStats :stats="schoolStats" :year="year" />
    </div>

    <!-- 队伍详情弹窗 -->
    <TeamDetail
      v-model:visible="showTeamDetail"
      :team="selectedTeam"
      :contest-name="contest.name"
    />
  </div>
</template>
