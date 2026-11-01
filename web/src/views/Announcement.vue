<script setup>
const announcements = [
  {
    title: '网站说明',
    content: '本平台收录了 2020-2026 赛季 ICPC/CCPC 各赛区的比赛结果。您可以通过首页查看各赛区概况，在"全部成绩"页搜索和筛选所有队伍，并查看选手的 OI 竞赛获奖经历。\n\n同时还提供了各个赛站和当年赛站总情况的数据分析，可以通过具体年份的"数据分析"查看具体内容：包括获奖率、赛站之间的获奖重合度、各奖牌具体 OI 奖项数量等。',
  },
  {
    title: '关于作者',
    content: '本平台由 awdec 维护，您有任何问题都可以联系我，QQ 1120571672 或 微信 ice998244353。',
  },
  {
    title: '功能说明',
    content: '学校、队伍、选手均可以点击查看详情。\n 选手名右侧有 ☀️ 标识的为 OIer。\n鼠标移到名字上方，可以显示其 OI 奖项。',
  },
  {
    title: '985 的特殊说明',
    content: '区别于传统意义上的 985，本平台，将部分实力、生源等方面，可以视作于 985 同层次的院校，也称作 985，包括部分高校的分校区。\n 受影响的院校如下：杭州电子科技大学、南方科技大学、香港中文大学、香港中文大学（深圳）、哈尔滨工业大学（深圳）、哈尔滨工业大学（威海）、东北大学秦皇岛分校、香港大学、香港科技大学、香港科技大学（广州）、香港城市大学、香港理工大学、香港浸会大学、西湖大学、上海科技大学、中国科学院大学、山东大学（威海）。\n 其中，杭州电子科技大学，出于其在 XCPC 领域的特殊地位考虑，也将其纳入了 985 的范围。',
  },
  {
    title: 'OIer 判定规则说明',
    content: 'OI 数据源为 OIerDb。\n XCPC 数据源为 Board - XCPCIO。 \n 若一名选手按姓名匹配到一条获奖记录推算出其正常入学情况下，XCPC 参赛时为大一到大五，则视作合法记录，这名选手则被视作 OIer。\n 西安交通大学、中国科学技术大学的选手，推算在 XCPC 参赛当年为高一、高二或高三时，也接受对应获奖记录并视作 OIer。此例外按 XCPC 所属学校生效，适用于所有年份。\n 诚然，这样的判定规则并不是完全准确的，无法避免重名的情况，如果您发现错误地将您或是您认识的选手判定为了 OIer 可以联系我。',
  },
]
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-800 mb-6">📢 公告</h2>

    <div class="space-y-4">
      <div
        v-for="(item, index) in announcements"
        :key="index"
        class="bg-white rounded-lg shadow-sm border border-gray-100 p-5"
      >
        <h3 class="text-lg font-semibold text-gray-800 mb-2">{{ item.title }}</h3>
        <p class="text-gray-600 leading-relaxed" style="white-space: pre-line">{{ item.content }}</p>
      </div>
    </div>
  </div>
</template>
