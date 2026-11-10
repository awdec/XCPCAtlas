<script setup lang="ts">
/**
 * 应用外壳：跳到主要内容链接、页眉、主内容区（view-transition-name: main，用于方向性页面过渡）。
 */
import { RouterView } from 'vue-router'
import { TooltipProvider } from 'reka-ui'
import AppHeader from './AppHeader.vue'
import ErrorBoundary from '@/shared/components/ErrorBoundary.vue'
import TopProgress from '@/shared/components/TopProgress.vue'

// hash 路由下锚点会被当作路由，改为直接聚焦主内容
const focusMain = () => document.getElementById('main-content')?.focus()
</script>

<template>
  <TooltipProvider :delay-duration="300">
    <div class="min-h-dvh bg-bg">
      <a
        href="#main-content"
        class="sr-only-focusable fixed left-3 top-3 z-[60] rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-fg"
        @click.prevent="focusMain"
      >跳到主要内容</a>
      <TopProgress />
      <AppHeader />
      <main id="main-content" tabindex="-1" class="mx-auto max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8" style="view-transition-name: main">
        <ErrorBoundary>
          <RouterView />
        </ErrorBoundary>
      </main>
    </div>
  </TooltipProvider>
</template>
