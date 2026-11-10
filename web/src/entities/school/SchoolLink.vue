<script setup lang="ts">
/**
 * 学校链接：/:year/school/:name（名称经 encodeURIComponent，D7 下只解码一次即可还原）。
 * 点击不冒泡，避免触发所在行的点击处理（B-C7）。
 */
import { RouterLink } from 'vue-router'

defineProps<{ year: string | number; school: string }>()
</script>

<template>
  <RouterLink
    :to="`/${year}/school/${encodeURIComponent(school)}`"
    class="text-primary hover:underline underline-offset-2"
    @click.stop
  >{{ school }}</RouterLink>
</template>
