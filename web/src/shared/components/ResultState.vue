<script setup lang="ts">
/**
 * 结果态（替代 el-result）：加载失败 / 未找到 / 无效编码 / 404 等。
 * 标题与副标题文案由调用方传入，保持旧页面原文。
 */
import { AlertTriangle, Info, SearchX } from 'lucide-vue-next'

withDefaults(defineProps<{ icon?: 'warning' | 'info' | 'notfound'; title: string; subTitle?: string }>(), { icon: 'warning', subTitle: '' })
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 py-16 text-center" role="status" data-result>
    <div
      class="mb-4 grid size-14 place-items-center rounded-full"
      :class="icon === 'warning' ? 'bg-warning-soft text-warning-soft-fg' : 'bg-primary-soft text-primary-soft-fg'"
      aria-hidden="true"
    >
      <AlertTriangle v-if="icon === 'warning'" class="size-7" />
      <SearchX v-else-if="icon === 'notfound'" class="size-7" />
      <Info v-else class="size-7" />
    </div>
    <p class="text-lg font-semibold text-fg" data-result-title>{{ title }}</p>
    <p v-if="subTitle" class="mt-1.5 max-w-md text-sm text-fg-subtle" data-result-subtitle>{{ subTitle }}</p>
    <div v-if="$slots.default" class="mt-6 flex flex-wrap justify-center gap-2">
      <slot />
    </div>
  </div>
</template>
