<script setup lang="ts">
/**
 * 首页（B-H1–B-H4）：年份卡片（years.json 顺序）+ 介绍弹窗。
 * 卡片交错入场（§8.4），年份标题带共享元素名，切到年份页时形变过渡（§8.2）。
 */
import { RouterLink } from 'vue-router'
import { motion } from 'motion-v'
import { ArrowRight, Trophy, Users } from 'lucide-vue-next'
import { useYears } from '@/data/queries'
import IntroDialog from '@/features/intro-dialog/IntroDialog.vue'
import Skeleton from '@/shared/components/Skeleton.vue'
import AsyncState from '@/shared/components/AsyncState.vue'
import { dur, ease, staggerDelay } from '@/shared/lib/motion'

const { data: years, isPending, isError } = useYears()
</script>

<template>
  <div>
    <div class="mb-8 text-center">
      <h2 class="mb-2 text-2xl font-bold text-fg">ICPC/CCPC 比赛结果</h2>
      <p class="text-fg-subtle">选择年份查看各赛区比赛结果</p>
    </div>

    <AsyncState :pending="isPending">
      <template #skeleton>
        <Skeleton variant="cards" :count="6" class="mx-auto max-w-4xl" />
      </template>
      <div v-if="isError || !years?.length" class="py-20 text-center text-fg-subtle">暂无数据</div>
      <div v-else class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <motion.div
          v-for="(y, i) in years"
          :key="y.year"
          :initial="{ opacity: 0, y: 8 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: dur.base, ease: ease.enter, delay: staggerDelay(i) }"
          :while-hover="{ y: -2 }"
          :while-press="{ scale: 0.98 }"
        >
          <RouterLink
            :to="`/${y.year}/`"
            class="lift group block overflow-hidden rounded-xl border border-border bg-surface shadow-xs transition-colors duration-(--dur-fast) hover:border-primary/40"
          >
            <div class="h-1.5 bg-primary" aria-hidden="true" />
            <div class="p-6">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-2xl font-bold tabular text-fg transition-colors group-hover:text-primary" :style="{ viewTransitionName: `year-${y.year}`, viewTransitionClass: 'shared' }">
                  {{ y.year }}
                </h3>
                <span class="text-sm text-fg-subtle">赛季</span>
              </div>
              <div class="space-y-2 text-sm text-fg-muted">
                <div class="flex items-center gap-2">
                  <Trophy class="size-4 text-primary" aria-hidden="true" />
                  <span>{{ y.contest_count }} 个赛区</span>
                </div>
                <div class="flex items-center gap-2">
                  <Users class="size-4 text-org-ccpc" aria-hidden="true" />
                  <span>{{ y.total_teams }} 支队伍</span>
                </div>
              </div>
              <div class="mt-4 border-t border-border-soft pt-4">
                <span class="inline-flex items-center gap-1 text-sm font-medium text-primary">
                  查看详情 →<ArrowRight class="sr-only" aria-hidden="true" />
                </span>
              </div>
            </div>
          </RouterLink>
        </motion.div>
      </div>
    </AsyncState>

    <IntroDialog />
  </div>
</template>
