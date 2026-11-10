<script setup lang="ts">
/**
 * 奖牌文字（Player 页奖牌列 B-PL7）：按 medalTier 显示 金牌/银牌/铜牌/铁牌（缺失为铁牌），加粗并按档着色。
 */
import { computed } from 'vue'
import { MEDAL_LABELS, medalTier } from '@/domain/analysis'

const props = defineProps<{ medal: string | null | undefined }>()
const tier = computed(() => medalTier(props.medal))
const cls = computed(() => ({
  gold: 'text-medal-gold-text',
  silver: 'text-medal-silver-text',
  bronze: 'text-medal-bronze-text',
  iron: 'text-medal-iron-text',
})[tier.value])
</script>

<template>
  <span class="font-bold" :class="cls">{{ MEDAL_LABELS[tier] }}</span>
</template>
