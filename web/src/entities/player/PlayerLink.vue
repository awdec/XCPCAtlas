<script setup lang="ts">
/**
 * 选手链接（B-C7）：
 * - 链接到 /:year/player/:name
 * - 有 OI 记录时显示 ☀️（读屏读作「OIer」），悬停/聚焦 300ms 后弹出「比赛 · 奖项」列表
 * - 提示的触发节点就是链接本身：外层 span 不可聚焦，挂在它上面键盘聚焦不会打开（审查 P2-5）
 * - 仅有 OI 记录的选手才挂载提示组件（AGENTS.md：tooltip 实例数是大榜单渲染开销大头）
 */
import { RouterLink } from 'vue-router'
import type { Member } from '@/domain/types'
import Tooltip from '@/shared/ui/Tooltip.vue'

defineProps<{ year: string | number; member: Member }>()
</script>

<template>
  <span v-if="member.oi?.length" class="inline-flex items-center" data-player>
    <Tooltip :delay="300">
      <RouterLink
        :to="`/${year}/player/${encodeURIComponent(member.name)}`"
        class="text-fg hover:text-primary hover:underline underline-offset-2"
        @click.stop
      >{{ member.name }}</RouterLink>
      <template #content>
        <div v-for="(r, j) in member.oi" :key="j" class="py-0.5">{{ r['比赛'] }} · {{ r['奖项'] }}</div>
      </template>
    </Tooltip>
    <span class="ml-0.5" aria-hidden="true">☀️</span><span class="sr-only">OIer</span>
  </span>
  <RouterLink
    v-else
    :to="`/${year}/player/${encodeURIComponent(member.name)}`"
    class="text-fg hover:text-primary hover:underline underline-offset-2"
    data-player
    @click.stop
  >{{ member.name }}</RouterLink>
</template>
