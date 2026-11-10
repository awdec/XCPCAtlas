<script setup lang="ts">
/**
 * 根组件：外壳。
 * motion-v 的 MotionConfig 下沉到真正使用 motion 的懒加载页面（YearPage / SegmentedControl），
 * 避免把约 43 KB 的 motion 分块带进首页初始请求（审查 P2-6）。
 */
import AppShell from '@/layouts/AppShell.vue'
</script>

<template>
  <AppShell />
</template>
