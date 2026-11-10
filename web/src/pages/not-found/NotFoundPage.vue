<script setup lang="ts">
/** 404（D2 / B-N1） */
import { RouterLink } from 'vue-router'
import ResultState from '@/shared/components/ResultState.vue'
import Button from '@/shared/ui/Button.vue'
</script>

<template>
  <ResultState icon="notfound" title="页面不存在" sub-title="您访问的页面不存在或已被移除">
    <Button as-child variant="primary"><RouterLink to="/">返回首页</RouterLink></Button>
    <Button as-child variant="outline"><RouterLink to="/announcement">查看公告</RouterLink></Button>
  </ResultState>
</template>
