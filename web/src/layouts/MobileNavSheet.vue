<script setup lang="ts">
/**
 * 移动端导航抽屉（§7.2）：与桌面导航同项同序；点击链接后关闭。
 * 附带「减少动效」开关（§8.6）。
 */
import { watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle, DialogDescription, DialogClose } from 'reka-ui'
import { X } from 'lucide-vue-next'
import type { NavItem } from './nav'

const open = defineModel<boolean>('open', { required: true })
defineProps<{ items: NavItem[]; reducedMotion: boolean }>()
defineEmits<{ toggleMotion: [] }>()
const route = useRoute()
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="sheet-overlay fixed inset-0 z-50 bg-black/40 md:hidden" />
      <DialogContent class="sheet-content fixed inset-y-0 right-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-lg outline-none md:hidden">
        <div class="flex h-(--header-h) items-center justify-between border-b border-border px-4">
          <DialogTitle class="text-base font-semibold">导航</DialogTitle>
          <DialogDescription class="sr-only">站点导航菜单</DialogDescription>
          <DialogClose class="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-3" aria-label="关闭导航菜单">
            <X class="size-5" aria-hidden="true" />
          </DialogClose>
        </div>
        <nav class="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="主导航（移动端）">
          <RouterLink
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium"
            :class="route.path === item.path ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg hover:bg-surface-3'"
            :aria-current="route.path === item.path ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-5" aria-hidden="true" />
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="border-t border-border p-4">
          <label class="flex cursor-pointer items-center justify-between text-sm text-fg-muted">
            减少动效
            <input type="checkbox" class="size-4 accent-(--primary)" :checked="reducedMotion" @change="$emit('toggleMotion')">
          </label>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.sheet-overlay[data-state='open'] { animation: sheet-fade-in var(--dur-slow) var(--ease-enter); }
.sheet-overlay[data-state='closed'] { animation: sheet-fade-out var(--dur-base) var(--ease-exit); }
.sheet-content[data-state='open'] { animation: sheet-in var(--dur-slow) var(--ease-enter); }
.sheet-content[data-state='closed'] { animation: sheet-out var(--dur-base) var(--ease-exit); }
@keyframes sheet-fade-in { from { opacity: 0; } }
@keyframes sheet-fade-out { to { opacity: 0; } }
@keyframes sheet-in { from { transform: translateX(100%); } }
@keyframes sheet-out { to { transform: translateX(100%); } }
</style>
