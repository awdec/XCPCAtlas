<script setup lang="ts">
/**
 * 年份页（B-Y1–B-Y3）：赛区卡片（contests.json 顺序）。
 * - 加载失败时 n=0、列表为空（不显示错误面板，与旧行为一致）
 * - 悬停/聚焦 120ms 预取该赛区数据（不改变显示）
 * - 年份标题、赛区标题带共享元素名（§8.2）
 */
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { MotionConfig, motion } from 'motion-v'
import { useQueryClient } from '@tanstack/vue-query'
import { useContestsIndex, prefetchContest } from '@/data/queries'
import OrgTag from '@/entities/contest/OrgTag.vue'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import { usePrefsStore } from '@/shared/stores/prefs'
import { dur, ease, staggerDelay } from '@/shared/lib/motion'

const props = defineProps<{ year: string }>()
const { data, isPending } = useContestsIndex(() => props.year)
const contests = computed(() => data.value ?? [])

// MotionConfig 从 App.vue 下沉到这里：motion-v 只随本页分块加载（审查 P2-6）
const prefs = usePrefsStore()
const reducedMotion = computed(() => (prefs.reducedMotion ? 'always' : 'user'))

const client = useQueryClient()
let hoverTimer: ReturnType<typeof setTimeout> | undefined
const prefetch = (id: string) => {
  clearTimeout(hoverTimer)
  hoverTimer = setTimeout(() => { void prefetchContest(client, props.year, id) }, 120)
}
const cancel = () => clearTimeout(hoverTimer)
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h2 class="mb-2 text-2xl font-bold text-fg">
        <span :style="{ viewTransitionName: `year-${year}`, viewTransitionClass: 'shared' }" class="inline-block">{{ year }}</span> 赛季各赛区比赛结果
      </h2>
      <p class="text-fg-subtle">共 {{ contests.length }} 个赛区，点击卡片查看详情</p>
    </div>

    <AsyncState :pending="isPending">
      <template #skeleton>
        <Skeleton variant="cards" :count="9" />
      </template>
      <MotionConfig :reduced-motion="reducedMotion">
        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <motion.div
            v-for="(c, i) in contests"
            :key="c.id"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: dur.base, ease: ease.enter, delay: staggerDelay(i) }"
            :while-hover="{ y: -2 }"
            :while-press="{ scale: 0.98 }"
          >
            <RouterLink
              :to="`/${year}/contest/${c.id}`"
              class="lift group block h-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-colors duration-(--dur-fast) hover:border-primary/40"
              @pointerenter="prefetch(c.id)"
              @focus="prefetch(c.id)"
              @pointerleave="cancel"
              @blur="cancel"
            >
              <OrgTag :org="c.org" bar />
              <div class="p-5">
                <div class="mb-3 flex items-center justify-between gap-2" :style="{ viewTransitionName: `contest-${c.id}`, viewTransitionClass: 'shared' }">
                  <h3 class="text-lg font-bold text-fg transition-colors group-hover:text-primary">{{ c.name }}</h3>
                  <OrgTag :org="c.org" />
                </div>
                <div v-if="c.champion" class="rounded-lg bg-surface-2 p-3">
                  <div class="mb-1 text-xs text-fg-subtle">🥇 冠军</div>
                  <div class="font-medium text-fg">{{ c.champion.school }}</div>
                  <div class="flex flex-wrap items-center gap-x-2 text-sm text-fg-subtle">
                    <span>{{ c.champion.team }}</span>
                    <span class="text-primary tabular">{{ c.champion.solved }} 题</span>
                    <span class="tabular">罚时 {{ c.champion.penalty }}</span>
                  </div>
                </div>
              </div>
            </RouterLink>
          </motion.div>
        </div>
      </MotionConfig>
    </AsyncState>
  </div>
</template>
