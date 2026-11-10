<script setup lang="ts">
/** 公告（B-AN1）：五条公告原文，pre-line 换行 */
import { Megaphone } from 'lucide-vue-next'
import { announcements } from './content'
</script>

<template>
  <div>
    <h2 class="mb-6 flex items-center gap-2 text-2xl font-bold text-fg">
      <Megaphone class="size-6 text-primary" aria-hidden="true" /><span class="sr-only">📢 </span>公告
    </h2>
    <div class="space-y-4">
      <section
        v-for="(item, i) in announcements"
        :key="item.title"
        class="animate-enter rounded-xl border border-border bg-surface p-5 shadow-xs"
        :style="{ '--i': i }"
      >
        <h3 class="mb-2 text-lg font-semibold text-fg">{{ item.title }}</h3>
        <p class="whitespace-pre-line leading-relaxed text-fg-muted">{{ item.content }}</p>
      </section>
    </div>
  </div>
</template>
