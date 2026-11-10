<script setup lang="ts">
/**
 * 页眉（B-G3 / B-G4）：
 * - 站点标题为指向首页的真实链接（D5）
 * - 当前项按 route.path 精确匹配高亮（aria-current="page"）
 * - md 以下导航收进抽屉（MobileNavSheet）
 * - 主题、减弱动效开关
 * 页眉固定 view-transition-name，页面切换时不参与位移（§8.2）。
 */
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Trophy, Moon, Sun, Menu, Zap, ZapOff } from 'lucide-vue-next'
import { globalNavItems, yearNavItems } from './nav'
import MobileNavSheet from './MobileNavSheet.vue'
import { useTheme } from '@/shared/composables/useTheme'
import Tooltip from '@/shared/ui/Tooltip.vue'
import { ref } from 'vue'

const route = useRoute()
const currentYear = computed(() => (route.params.year ? String(route.params.year) : null))
const title = computed(() => (currentYear.value ? `${currentYear.value} ICPC/CCPC 比赛结果` : 'ICPC/CCPC 比赛结果'))
const items = computed(() => [...globalNavItems, ...yearNavItems(currentYear.value)])
const { isDark, cycle, prefs } = useTheme()
const menuOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur-md supports-[backdrop-filter]:bg-surface/75" style="view-transition-name: app-header">
    <div class="header-shadow pointer-events-none absolute inset-x-0 -bottom-px h-px shadow-md" aria-hidden="true" />
    <div class="mx-auto flex h-(--header-h) max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
      <RouterLink to="/" class="group flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-offset-4">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg" aria-hidden="true">
          <Trophy class="size-4.5" />
        </span>
        <h1 class="truncate text-base font-bold text-fg sm:text-lg">{{ title }}</h1>
      </RouterLink>

      <div class="flex items-center gap-1">
        <nav class="hidden items-center gap-0.5 md:flex" aria-label="主导航">
          <RouterLink
            v-for="item in items"
            :key="item.path"
            :to="item.path"
            class="relative flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors duration-(--dur-fast) lg:px-3"
            :class="route.path === item.path ? 'bg-primary-soft text-primary-soft-fg' : 'text-fg-muted hover:bg-surface-3 hover:text-fg'"
            :aria-current="route.path === item.path ? 'page' : undefined"
          >
            <component :is="item.icon" class="size-4" aria-hidden="true" />
            {{ item.label }}
          </RouterLink>
        </nav>

        <Tooltip :delay="400" side="bottom">
          <button
            type="button"
            class="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg"
            :aria-label="isDark ? '切换到浅色模式' : '切换到深色模式'"
            @click="cycle"
          >
            <Sun v-if="isDark" class="size-4.5" aria-hidden="true" />
            <Moon v-else class="size-4.5" aria-hidden="true" />
          </button>
          <template #content>{{ isDark ? '浅色模式' : '深色模式' }}</template>
        </Tooltip>

        <Tooltip :delay="400" side="bottom">
          <button
            type="button"
            class="hidden size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg md:grid"
            :aria-label="prefs.reducedMotion ? '关闭减少动效' : '开启减少动效'"
            :aria-pressed="prefs.reducedMotion"
            @click="prefs.reducedMotion = !prefs.reducedMotion"
          >
            <ZapOff v-if="prefs.reducedMotion" class="size-4.5" aria-hidden="true" />
            <Zap v-else class="size-4.5" aria-hidden="true" />
          </button>
          <template #content>{{ prefs.reducedMotion ? '关闭减少动效' : '减少动效' }}</template>
        </Tooltip>

        <button
          type="button"
          class="grid size-9 place-items-center rounded-md text-fg-muted hover:bg-surface-3 hover:text-fg md:hidden"
          aria-label="打开导航菜单"
          :aria-expanded="menuOpen"
          @click="menuOpen = true"
        >
          <Menu class="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
    <MobileNavSheet v-model:open="menuOpen" :items="items" :reduced-motion="prefs.reducedMotion" @toggle-motion="prefs.reducedMotion = !prefs.reducedMotion" />
  </header>
</template>
