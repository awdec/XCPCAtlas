<script setup lang="ts">
/** 轨迹单字（金/银/铜/铁/\）及配色 */
import type { Tier } from '@/domain/types'
import { TIER_TEXT } from '@/domain/trajectory'

defineProps<{ tier: Tier }>()
const cls: Record<Tier, string> = {
  gold: 'text-medal-gold-text font-semibold',
  silver: 'text-medal-silver-text font-semibold',
  bronze: 'text-medal-bronze-text font-semibold',
  iron: 'text-medal-iron-text',
  none: 'text-fg-faint',
}
</script>

<template>
  <span :class="cls[tier]">{{ TIER_TEXT[tier] }}</span>
</template>
