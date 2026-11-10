<script setup lang="ts">
/**
 * 对话框（Reka Dialog）。
 * dismissible=false 时：无关闭按钮、Esc 与点击遮罩都不能关闭（首页介绍弹窗 B-H4）。
 * 小屏全屏（§7.2），入场使用 spring.gentle 等价的 CSS 缓动。
 */
import {
  DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, VisuallyHidden,
} from 'reka-ui'
import { X } from 'lucide-vue-next'
import { cn } from '@/shared/lib/cn'

const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{
  title: string
  description?: string
  dismissible?: boolean
  class?: string
}>(), { dismissible: true, description: '' })

const block = (e: Event) => { if (!props.dismissible) e.preventDefault() }
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="dialog-overlay fixed inset-0 z-50 bg-black/45" />
      <DialogContent
        :class="cn(
          'dialog-content fixed z-50 flex flex-col bg-surface text-fg shadow-lg outline-none',
          'inset-0 sm:inset-auto sm:left-1/2 sm:top-[12vh] sm:max-h-[76vh] sm:w-[min(36rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-xl sm:border sm:border-border',
          props.class,
        )"
        @escape-key-down="block"
        @pointer-down-outside="block"
        @interact-outside="block"
      >
        <header class="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
          <DialogTitle class="text-base font-semibold leading-6 text-fg">{{ title }}</DialogTitle>
          <DialogClose
            v-if="dismissible"
            class="-mr-1 grid size-8 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-3 hover:text-fg"
            aria-label="关闭"
          >
            <X class="size-4" aria-hidden="true" />
          </DialogClose>
        </header>
        <VisuallyHidden v-if="!description" as-child>
          <DialogDescription>{{ title }}</DialogDescription>
        </VisuallyHidden>
        <DialogDescription v-else class="sr-only">{{ description }}</DialogDescription>
        <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="flex justify-end gap-2 border-t border-border-soft px-5 py-3">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.dialog-overlay[data-state='open'] { animation: dlg-fade-in var(--dur-base) var(--ease-enter); }
.dialog-overlay[data-state='closed'] { animation: dlg-fade-out calc(var(--dur-base) * 0.75) var(--ease-exit); }
.dialog-content[data-state='open'] { animation: dlg-in var(--dur-base) var(--ease-enter); }
.dialog-content[data-state='closed'] { animation: dlg-out calc(var(--dur-base) * 0.75) var(--ease-exit); }
@keyframes dlg-fade-in { from { opacity: 0; } }
@keyframes dlg-fade-out { to { opacity: 0; } }
@keyframes dlg-in { from { opacity: 0; scale: 0.96; } }
@keyframes dlg-out { to { opacity: 0; scale: 0.96; } }
@media (max-width: 639px) {
  @keyframes dlg-in { from { opacity: 0; translate: 0 16px; } }
  @keyframes dlg-out { to { opacity: 0; translate: 0 16px; } }
}
</style>
