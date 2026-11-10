<script setup lang="ts">
/**
 * 文本输入（带清除按钮，对应旧 el-input clearable）。v-model 即时更新，防抖由调用方处理（B-F2）。
 */
import { X, Search } from 'lucide-vue-next'
import { cn } from '@/shared/lib/cn'

const model = defineModel<string>({ required: true })
const props = defineProps<{ placeholder: string; class?: string; icon?: boolean }>()
</script>

<template>
  <div :class="cn('relative', props.class)">
    <Search v-if="icon" class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-faint" aria-hidden="true" />
    <input
      v-model="model"
      type="text"
      :placeholder="placeholder"
      :aria-label="placeholder"
      autocomplete="off"
      :class="cn(
        'h-9 w-full rounded-md border border-border bg-surface pr-8 text-sm text-fg placeholder:text-fg-faint',
        'transition-[border-color] duration-(--dur-fast) hover:border-fg-faint focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30',
        icon ? 'pl-8' : 'pl-3',
      )"
    >
    <button
      v-if="model"
      type="button"
      class="absolute right-1.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-fg-faint hover:bg-surface-3 hover:text-fg"
      :aria-label="`清除${placeholder}`"
      @click="model = ''"
    >
      <X class="size-3.5" aria-hidden="true" />
    </button>
  </div>
</template>
