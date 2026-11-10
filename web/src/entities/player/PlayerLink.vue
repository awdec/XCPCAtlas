<script setup lang="ts">
/**
 * 选手链接（B-C7）：
 * - 链接到 /:year/player/:name
 * - 有 OI 记录时显示 ☀️（读屏读作「OIer」），悬停/聚焦 300ms 后弹出「比赛 · 奖项」列表
 * - 仅有 OI 记录的选手才挂载提示组件（AGENTS.md：tooltip 实例数是大榜单渲染开销大头）
 */
import { RouterLink } from 'vue-router'
import type { Member } from '@/domain/types'
import Tooltip from '@/shared/ui/Tooltip.vue'

defineProps<{ year: string | number; member: Member }>()
</script>

<template>
  <Tooltip v-if="member.oi?.length" :delay="300">
    <span class="inline-flex items-center" data-player>
      <RouterLink
        :to="`/${year}/player/${encodeURIComponent(member.name)}`"
        class="text-fg hover:text-primary hover:underline underline-offset-2"
        @click.stop
      >{{ member.name }}</RouterLink>
      <span class="ml-0.5" aria-hidden="true">☀️</span><span class="sr-only">OIer</span>
    </span>
    <template #content>
      <div v-for="(r, j) in member.oi" :key="j" class="py-0.5">{{ r['比赛'] }} · {{ r['奖项'] }}</div>
    </template>
  </Tooltip>
  <RouterLink
    v-else
    :to="`/${year}/player/${encodeURIComponent(member.name)}`"
    class="text-fg hover:text-primary hover:underline underline-offset-2"
    data-player
    @click.stop
  >{{ member.name }}</RouterLink>
</template>
