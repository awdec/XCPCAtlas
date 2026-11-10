<script setup lang="ts" generic="V extends string">
/**
 * 分段切换（替代 el-radio-group 按钮样式）：Reka ToggleGroup，单选、不可取消；
 * 选中指示块用 motion-v layoutId 平滑移动（§8.4）。
 */
import { ToggleGroupItem, ToggleGroupRoot } from 'reka-ui'
import { motion } from 'motion-v'
import { useId } from 'vue'
import { spring } from '@/shared/lib/motion'
import { cn } from '@/shared/lib/cn'

const model = defineModel<V>({ required: true })
defineProps<{ options: { value: V; label: string }[]; label: string; class?: string }>()
const layoutId = `seg-${useId()}`
const onUpdate = (v: unknown) => { if (typeof v === 'string' && v) model.value = v as V }
</script>

<template>
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
</template>
