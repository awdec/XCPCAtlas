<script setup lang="ts">
/**
 * 错误边界（M2-T2）：捕获子树渲染/生命周期异常，显示「页面出错了」与重新加载按钮。
 * 路由切换时自动复位。
 */
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ResultState from './ResultState.vue'
import Button from '@/shared/ui/Button.vue'

const error = ref<unknown>(null)
const route = useRoute()
const router = useRouter()

onErrorCaptured((err) => {
  console.error('页面渲染出错:', err)
  error.value = err
  return false
})
watch(() => route.fullPath, () => { error.value = null })
</script>

<template>
  <ResultState v-if="error" icon="warning" title="页面出错了" sub-title="请尝试重新加载页面">
    <Button variant="primary" @click="router.go(0)">重新加载</Button>
  </ResultState>
  <slot v-else />
</template>
