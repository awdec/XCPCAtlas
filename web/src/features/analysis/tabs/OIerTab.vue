<script setup lang="ts">
/**
 * OIer 分析：各奖牌档 OIer 占比、队伍 OIer 人数构成、金/银/铜牌选手最高 OI 奖项分布（共享赛区下拉，可清空=全部）。
 */
import { computed, ref } from 'vue'
import { computeOIAwardStats, computeOIerStats } from '@/domain/analysis'
import type { YearDataset } from '@/domain/types'
import type { MedalTier } from '@/domain/types'
import { oierAwardChartHeight, oierAwardOption, oierPlayerRateOption, oierRegionOptions, oierTeamCompOption } from '../charts/options'
import ChartBox from '../charts/ChartBox.vue'
import SectionCard from '@/shared/components/SectionCard.vue'
import InfoHint from '@/shared/components/InfoHint.vue'
import Select from '@/shared/ui/Select.vue'

const props = defineProps<{ dataset: YearDataset }>()
const stats = computed(() => computeOIerStats(props.dataset))
const playerRateOption = computed(() => oierPlayerRateOption(stats.value))
const teamCompOption = computed(() => oierTeamCompOption(stats.value))

const awardRegion = ref<string | null>('')
const regionOptions = computed(() => oierRegionOptions(props.dataset).map(r => ({ label: r.name, value: r.id })))
const tierSections: { tier: MedalTier; name: string }[] = [
  { tier: 'gold', name: '金牌选手' },
  { tier: 'silver', name: '银牌选手' },
  { tier: 'bronze', name: '铜牌选手' },
]
const awardStatsByTier = computed(() => Object.fromEntries(
  tierSections.map(s => [s.tier, computeOIAwardStats(props.dataset, awardRegion.value || null, s.tier)]),
) as Record<string, ReturnType<typeof computeOIAwardStats>>)
const awardOptionsByTier = computed(() => Object.fromEntries(
  tierSections.map(s => [s.tier, oierAwardOption(awardStatsByTier.value[s.tier]!)]),
))
</script>

<template>
  <div class="space-y-4">
    <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="各奖牌档选手的 OIer 占比" description="选手按 学校+姓名 跨赛区去重，取当年最高奖牌" reveal>
        <ChartBox :option="playerRateOption" label="各奖牌档选手的 OIer 占比" />
      </SectionCard>
      <SectionCard title="各奖牌档队伍的 OIer 人数构成" description="按队伍内 OIer 人数（0~3 名）统计队伍占比" reveal>
        <ChartBox :option="teamCompOption" label="各奖牌档队伍的 OIer 人数构成" />
      </SectionCard>
    </div>

    <SectionCard reveal>
      <template #header>
        <div class="mb-1 flex flex-wrap items-center gap-3">
          <h3 class="text-base font-semibold text-fg">
            <InfoHint text="金/银/铜牌选手指当年获得过对应档奖牌的选手（按 学校+姓名 跨赛区去重）。同一选手跨赛站获得过多个奖牌档时，会同时计入多张图（并非按全年最高奖牌互斥划分）。" />
            各奖牌档选手的最高 OI 奖项分布
          </h3>
          <Select v-model="awardRegion" :options="regionOptions" placeholder="全部赛区" clearable class="w-36" />
        </div>
        <p class="text-xs text-fg-subtle">奖项等级：IOI &gt; NOI &gt; WC 级 &gt; 提高 &gt; 入门</p>
      </template>
      <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div v-for="t in tierSections" :key="t.tier">
          <h4 class="mb-0.5 text-sm font-semibold text-fg-muted">{{ t.name }}</h4>
          <p class="mb-2 text-xs text-fg-subtle">统计 {{ awardStatsByTier[t.tier]!.total }} 名，其中 {{ awardStatsByTier[t.tier]!.withOi }} 人有 OI 记录</p>
          <ChartBox
            v-if="awardStatsByTier[t.tier]!.items.length"
            :option="awardOptionsByTier[t.tier]!"
            :height="oierAwardChartHeight(awardStatsByTier[t.tier]!)"
            :label="`${t.name}最高 OI 奖项分布`"
          />
          <p v-else class="py-8 text-center text-sm text-fg-subtle">该范围内{{ t.name }}均无 OI 记录。</p>
        </div>
      </div>
    </SectionCard>
  </div>
</template>
