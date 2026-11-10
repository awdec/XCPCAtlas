<script setup lang="ts">
/**
 * 首页介绍弹窗（B-H4）：只能用「知道了」关闭（无关闭按钮、Esc 与遮罩点击无效），关闭时写入时间戳。
 */
import { onMounted, ref } from 'vue'
import Dialog from '@/shared/ui/Dialog.vue'
import Button from '@/shared/ui/Button.vue'
import { INTRO_TEXT, readIntroSeen, shouldShowIntro, writeIntroSeen } from './intro'

const open = ref(false)
onMounted(() => { open.value = shouldShowIntro(readIntroSeen(), Date.now()) })
const close = () => {
  open.value = false
  writeIntroSeen(Date.now())
}
</script>

<template>
  <Dialog v-model:open="open" title="网站说明" :dismissible="false" class="sm:w-[min(30rem,calc(100vw-2rem))]">
    <p class="whitespace-pre-line text-base leading-relaxed text-fg-muted">{{ INTRO_TEXT }}</p>
    <template #footer>
      <Button variant="primary" @click="close">知道了</Button>
    </template>
  </Dialog>
</template>
