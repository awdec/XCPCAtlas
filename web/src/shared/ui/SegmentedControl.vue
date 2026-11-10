<script setup lang="ts" generic="V extends string">
/**
 * 分段切换（替代 el-radio-group 按钮样式）：Reka ToggleGroup，单选、不可取消；
 * 选中指示块用 motion-v layoutId 平滑移动（§8.4）。
 * MotionConfig 从 App.vue 下沉到这里：motion-v 只随使用本组件的页面加载（审查 P2-6）。
 */
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { MotionConfig, motion } from 'motion-v'
import { computed, useId } from 'vue'
import { spring } from '@/shared/lib/motion'
import { cn } from '@/shared/lib/cn'
import { usePrefsStore } from '@/shared/stores/prefs'

const model = defineModel<V>({ required: true })
defineProps<{ options: { value: V; label: string }[]; label: string; class?: string }>()
const layoutId = `seg-${useId()}`
const onUpdate = (v: unknown) => { if (typeof v === 'string' && v) model.value = v as V }

const prefs = usePrefsStore()
const reducedMotion = computed(() => (prefs.reducedMotion ? 'always' : 'user'))
</script>

<template>
  <MotionConfig :reduced-motion="reducedMotion">
    <ToggleGroupRoot
      type="single"
      :model-value="model"
      :aria-label="label"
      :class="cn('inline-flex rounded-lg border border-border bg-surface-2 p-0.5', $props.class)"
      @update:model-value="onUpdate"
    >
      <ToggleGroupItem
        v-for="o in options"
        :key="o.value"
        :value="o.value"
        class="relative h-8 rounded-md px-3.5 text-sm font-medium text-fg-muted transition-colors duration-(--dur-fast) data-[state=on]:text-fg hover:text-fg"
      >
        <motion.span
          v-if="model === o.value"
          :layout-id="layoutId"
          class="absolute inset-0 rounded-md bg-surface shadow-sm ring-1 ring-border"
          :transition="spring.snappy"
          aria-hidden="true"
        />
        <span class="relative">{{ o.label }}</span>
      </ToggleGroupItem>
    </ToggleGroupRoot>
  </MotionConfig>
</template>
