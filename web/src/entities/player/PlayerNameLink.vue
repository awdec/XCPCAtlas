<script setup lang="ts">
/**
 * 选手名单元格（Summary / Players 用）：与 PlayerLink 相同，但接受 name+oi（Players 行无 Member 对象）。
 */
import type { OIRecord } from '@/domain/types'
import PlayerLink from './PlayerLink.vue'

defineProps<{ year: string | number; name: string; oi: OIRecord[] }>()
</script>

<template>
  <PlayerLink :year="year" :member="{ name, oi }" />
</template>
