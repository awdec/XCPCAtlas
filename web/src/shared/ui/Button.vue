<script setup lang="ts">
/**
 * 按钮（shadcn-vue 风格）。as-child 时渲染为子元素（例如 RouterLink），保持链接语义。
 */
import { computed } from 'vue'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/cn'

const button = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium select-none ' +
    'transition-[color,background-color,border-color,opacity] duration-(--dur-fast) ease-standard ' +
    'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
    'active:scale-[0.98] motion-reduce:active:scale-100 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
        outline: 'border border-border bg-surface text-fg hover:bg-surface-3',
        ghost: 'text-fg-muted hover:bg-surface-3 hover:text-fg',
        soft: 'bg-primary-soft text-primary-soft-fg hover:opacity-90',
        link: 'text-primary underline-offset-4 hover:underline px-0',
      },
      size: {
        sm: 'h-8 px-2.5 text-xs',
        md: 'h-9 px-3.5',
        lg: 'h-10 px-5',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

type Variants = VariantProps<typeof button>

const props = withDefaults(defineProps<PrimitiveProps & {
  variant?: Variants['variant']
  size?: Variants['size']
  class?: string
}>(), { as: 'button' })

const classes = computed(() => cn(button({ variant: props.variant, size: props.size }), props.class))
</script>

<template>
  <Primitive :as="as" :as-child="asChild" :class="classes">
    <slot />
  </Primitive>
</template>
