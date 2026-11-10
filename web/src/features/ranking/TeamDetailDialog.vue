<script setup lang="ts">
/**
 * 队伍详情弹窗（B-C8）：标题「学校 — 队伍」；排名/解题数/罚时；奖牌/打星/女队标签；
 * 题目状态（按键顺序）；队员与教练。可用关闭按钮、Esc、遮罩关闭；关闭后内容销毁。
 */
import { computed } from 'vue'
import type { TeamRow } from '@/domain/types'
import { medalClass, medalText } from '@/domain/formatters'
import Dialog from '@/shared/ui/Dialog.vue'
import ProblemCell from '@/entities/problem/ProblemCell.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ team: TeamRow | null }>()
const problems = computed(() => (props.team?.problems ? Object.entries(props.team.problems) : []))
const title = computed(() => (props.team ? `${props.team.school} — ${props.team.team}` : ''))
</script>

<template>
  <Dialog v-model:open="open" :title="title">
    <div v-if="team">
      <dl class="mb-5 grid grid-cols-3 gap-4">
        <div>
          <dt class="text-xs text-fg-subtle">排名</dt>
          <dd class="text-xl font-bold tabular text-fg">#{{ team.rank }}</dd>
        </div>
        <div>
          <dt class="text-xs text-fg-subtle">解题数</dt>
          <dd class="text-xl font-bold tabular text-primary">{{ team.solved }}</dd>
        </div>
        <div>
          <dt class="text-xs text-fg-subtle">罚时</dt>
          <dd class="text-xl font-bold tabular text-fg-muted">{{ team.penalty }}</dd>
        </div>
      </dl>

      <div class="mb-4 flex flex-wrap gap-2">
        <span v-if="team.medal" class="inline-flex h-6 items-center rounded border border-border bg-surface-2 px-2 text-xs" :class="medalClass(team.medal)">{{ medalText(team.medal) }}</span>
        <span v-if="team.unofficial" class="inline-flex h-6 items-center rounded bg-warning-soft px-2 text-xs text-warning-soft-fg">打星队伍</span>
        <span v-if="team.girl" class="inline-flex h-6 items-center rounded bg-danger-soft px-2 text-xs text-danger-soft-fg">女队</span>
      </div>

      <div class="mb-5">
        <div class="mb-2 text-sm font-medium text-fg">题目状态</div>
        <div class="flex flex-wrap gap-2">
          <ProblemCell v-for="[letter, p] in problems" :key="letter" :letter="letter" :problem="p" />
        </div>
      </div>

      <div>
        <div class="mb-2 text-sm font-medium text-fg">队员</div>
        <div class="flex flex-wrap gap-2">
          <span v-for="m in team.members" :key="m.name" class="inline-flex h-6 items-center rounded bg-surface-3 px-2 text-xs text-fg-muted">{{ m.name }}</span>
        </div>
        <div v-if="team.coaches?.length" class="mt-2 text-sm text-fg-subtle">教练: {{ team.coaches.join(', ') }}</div>
      </div>
    </div>
  </Dialog>
</template>
