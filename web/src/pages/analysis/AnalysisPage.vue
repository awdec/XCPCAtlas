<script setup lang="ts">
/**
 * 数据分析（B-A1–B-A7，docs/analysis-page.md）：
 * - 赛区文件按索引顺序逐个加载并显示 x/n 进度 → buildYearDataset（Worker）
 * - trajectories.json 并行、非阻塞加载；失败只影响轨迹 tab 与「第一次最高获奖」
 * - 当前 Tab 由 ?tab 决定（无效值回退总览），切换用 router.replace；
 *   各 Tab 首次访问时才挂载（避免一次挂载 9 个 canvas），之后保持挂载
 */
import { computed, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { ChartColumn } from 'lucide-vue-next'
import { useSchoolTags, useTrajectories, useYearDataset } from '@/data/queries'
import { computeOverview } from '@/domain/analysis'
import LoadProgress from '@/shared/components/LoadProgress.vue'
import ResultState from '@/shared/components/ResultState.vue'
import OverviewTab from '@/features/analysis/tabs/OverviewTab.vue'
import RegionTab from '@/features/analysis/tabs/RegionTab.vue'
import PlayersTab from '@/features/analysis/tabs/PlayersTab.vue'
import TrajectoryTab from '@/features/analysis/tabs/TrajectoryTab.vue'
import OIerTab from '@/features/analysis/tabs/OIerTab.vue'
import SchoolTab from '@/features/analysis/tabs/SchoolTab.vue'

const TABS = [
  { name: 'overview', label: '总览' },
  { name: 'region', label: '赛站分析' },
  { name: 'players', label: '选手分析' },
  { name: 'trajectory', label: '轨迹分析' },
  { name: 'oier', label: 'OIer 分析' },
  { name: 'school', label: '学校分析' },
] as const
type TabName = (typeof TABS)[number]['name']
const TAB_NAMES = new Set<string>(TABS.map(t => t.name))

const props = defineProps<{ year: string }>()
const route = useRoute()
const router = useRouter()
const activeTab = computed<TabName>({
  get: () => (typeof route.query.tab === 'string' && TAB_NAMES.has(route.query.tab) ? route.query.tab as TabName : 'overview'),
  set: tab => { void router.replace({ query: { ...route.query, tab } }) },
})

const datasetQ = useYearDataset(() => props.year)
const tagsQ = useSchoolTags()
const trajQ = useTrajectories(() => props.year)
const dataset = computed(() => datasetQ.data.value ?? null)
const overview = computed(() => (dataset.value ? computeOverview(dataset.value) : null))
const tags = computed(() => tagsQ.data.value ?? { set985: new Set<string>(), set211: new Set<string>() })
// 失败（或仍在加载）时为 null：轨迹 tab 显示「暂不可用」
const trajectories = computed(() => trajQ.data.value ?? null)

const visited = reactive(new Set<TabName>())
watch(activeTab, t => visited.add(t), { immediate: true })
watch(() => props.year, () => { visited.clear(); visited.add(activeTab.value) })

const loading = computed(() => datasetQ.isPending.value || tagsQ.isPending.value)
const failed = computed(() => datasetQ.isError.value || tagsQ.isError.value)
</script>

<template>
  <div>
    <h2 class="mb-2 flex items-center gap-2 text-2xl font-bold text-fg">
      <ChartColumn class="size-6 text-primary" aria-hidden="true" /><span class="sr-only">📈 </span>数据分析
    </h2>

    <LoadProgress v-if="loading" :done="datasetQ.progress.value.done" :total="datasetQ.progress.value.total" />
    <ResultState v-else-if="failed" title="加载失败" sub-title="数据加载失败，请稍后重试" />

    <TabsRoot v-else v-model="activeTab" :unmount-on-hide="false" activation-mode="manual">
      <div class="sticky top-(--header-h) z-30 -mx-4 mb-4 bg-bg/90 px-4 backdrop-blur-sm sm:mx-0 sm:px-0">
        <TabsList class="relative flex gap-1 overflow-x-auto border-b border-border" aria-label="数据分析">
          <TabsTrigger
            v-for="t in TABS"
            :key="t.name"
            :value="t.name"
            class="relative shrink-0 px-3 py-2.5 text-sm font-medium text-fg-subtle transition-colors duration-(--dur-fast) hover:text-fg data-[state=active]:text-primary"
            @click="activeTab = t.name"
          >{{ t.label }}</TabsTrigger>
          <TabsIndicator class="tab-indicator absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) rounded-full bg-primary" />
        </TabsList>
      </div>

      <TabsContent
        v-for="t in TABS"
        :key="t.name"
        :value="t.name"
        class="tab-panel focus-visible:outline-none data-[state=inactive]:hidden"
      >
        <div :id="`pane-${t.name}`">
        <template v-if="visited.has(t.name) && dataset">
          <OverviewTab v-if="t.name === 'overview' && overview" :overview="overview" />
          <RegionTab v-else-if="t.name === 'region'" :dataset="dataset" />
          <PlayersTab v-else-if="t.name === 'players'" :dataset="dataset" :year="year" :trajectories="trajectories" />
          <TrajectoryTab v-else-if="t.name === 'trajectory'" :data="trajectories" :year="year" />
          <OIerTab v-else-if="t.name === 'oier'" :dataset="dataset" />
          <SchoolTab v-else-if="t.name === 'school'" :dataset="dataset" :tags="tags" />
        </template>
        </div>
      </TabsContent>
    </TabsRoot>
  </div>
</template>

<style>
.tab-indicator {
  transition: translate var(--dur-slow) var(--ease-standard), width var(--dur-slow) var(--ease-standard);
}
.tab-panel[data-state='active'] {
  animation: tab-in var(--dur-base) var(--ease-enter);
}
@keyframes tab-in { from { opacity: 0; transform: translateY(4px); } }
</style>
