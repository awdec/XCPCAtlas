<script setup lang="ts">
/**
 * 根组件：主题同步 + motion-v 全局配置（减弱动效 = user，跟随系统与页眉开关）。
 */
import { computed } from 'vue'
import { MotionConfig } from 'motion-v'
import AppShell from '@/layouts/AppShell.vue'
import { useTheme } from '@/shared/composables/useTheme'

const { prefs } = useTheme()
const reducedMotion = computed(() => (prefs.reducedMotion ? 'always' : 'user'))
</script>

<template>
  <MotionConfig :reduced-motion="reducedMotion">
    <AppShell />
  </MotionConfig>
</template>
