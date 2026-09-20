# 数据分析页开发文档

> 数据分析页（`/:year/analysis`）的专属参考文档。后续涉及该页的任务**先读本文**，再按需查看具体文件，无需重新通读代码。
> 创建于 2026-09，若实际代码与本文冲突，以代码为准并回填本文。

## 1. 定位与入口

- 页面视图：`web/src/views/Analysis.vue`（懒加载）；路由 `/:year/analysis`（`web/src/main.js`，受年份校验守卫约束）
- 导航项：`web/src/App.vue` 的 `yearNavItems` 末尾（"📈 数据分析"），仅进入具体年份后显示
- 页面标题只写"📈 数据分析"，不带年份括号（年份由页面上下文确定，用户决策）
- Tab 顺序：总览 → 赛站分析 → 选手分析 → OIer 分析 → 学校分析（`el-tabs`，非懒加载）
- 分析方向源自作者的两篇洛谷文章（2025 XCPC-region data 及其 OIerdb 番外），数值曾逐项对照验证

## 2. 文件地图

| 文件 | 职责 |
|---|---|
| `web/src/utils/analysis.js` | **唯一计算层**。全部口径、纯函数，不依赖 Vue/ECharts |
| `web/src/components/analysis/AnalysisChart.vue` | ECharts 封装（按需注册：Bar/Pie/Line/Scatter/Heatmap + Grid/Tooltip/Legend/VisualMap + Canvas）；转发元素级 click 事件 |
| `web/src/components/analysis/OverviewTab.vue` | 总览：6 张统计卡片、各赛区队伍奖牌分布（堆叠）、分赛事（CCPC/ICPC）奖牌发放数表格（独立卡片） |
| `web/src/components/analysis/RegionTab.vue` | 赛站分析：各赛站获奖人数（选手口径）、跨赛站获奖迁移（赛站下拉 + 4×4 热力图 + 明细表） |
| `web/src/components/analysis/PlayersTab.vue` | 选手分析：获奖分布饼图、参赛场次×无奖牌率（柱线双轴）、排名稳定性散点（≥2 场，点击数据点跳转选手个人页）+ 汇总表（三列带 ⓘ 说明） |
| `web/src/components/analysis/OIerTab.vue` | OIer 分析：各奖牌档 OIer 占比、队伍 OIer 人数构成（0~3 堆叠百分比）、金银铜牌选手最高 OI 奖项分布（三列并排，共享赛区下拉） |
| `web/src/components/analysis/SchoolTab.vue` | 学校分析：985/211/双非 奖牌分布堆叠、获奖率与 OIer 率、层次概览表、无金牌 985 名单、有金牌 211/双非 名单 |
| `web/src/views/Analysis.vue` | Tab 容器 + 顺序加载进度条 + 年份切换 watch + dataset/tags 构建 |

数据源：`web/public/data/{year}/contests.json`（索引）+ `{contest_id}.json`（`sheets['正式队伍']`）+ 全局 `985.json`/`211.json`。加载用 `dataLoader.js`（`loadSchoolTags` + 顺序 `loadContestData` 带进度）。

## 3. 数据口径（核心，改前先想清楚）

| 口径 | 定义 | 决策来源 |
|---|---|---|
| XCPC 选手判重 | **学校+姓名** 双关键字 `name@school`，同名跨校视为不同人；学校是键的一部分，不存在归属歧义 | 用户明确决策（2026-09），取代早期"姓名去重+最高奖牌队伍归属学校"方案 |
| OIer 判定 | 沿用预处理 `extract_oi_records.py`（姓名+年龄反推，大一~大五窗口）；前端只消费 `members[].oi`（convert 按 `name@school` 挂载） | 用户明确决策：OI 侧只看姓名+年龄，不改 |
| 奖牌档 | 当年所有赛区的**最高**奖牌；无奖牌=铁牌（iron）。行/桶/颜色全按此互斥划分 | 与文章口径一致 |
| 赛站口径 | 每名选手在每个赛站取该站最好奖牌档；每站人数按选手去重（总览页是队伍口径，两者刻意不同） | |
| 排名稳定性 | 仅 `appearances ≥ 2` 的选手；极差/标准差是**每人自己各场名次**的极差/标准差，再按奖牌档平均（两层结构，列头有 ⓘ 说明） | 用户确认过语义 |
| 迁移矩阵 | 在本站获某档奖的选手（去重）中，还参加过其他赛站者的**其他站最好成绩**分布；单站选手不计入 | 复现文章"郑州金 96%"的口径 |
| OI 奖项等级 | 家族映射 `OI_FAMILY_LEVEL`：CSP-J/NOIP普及(0) < CSP-S/NOIP/春季测试/NGOI(1) < WC/APIO/APIO线上/CTSC(2) < NOI/NOI夏令营/NOID类(3) < IOI(4)；等级内 金/一等 < 银/二等 < 铜/三等（奖项中的"国际"视作比赛届别名，"国际金牌"即金牌，用户决策 2026-09）；同为最高时取更近年份 | 文章阶梯 + 数据实际字符串（APIO线上/NOID类等真实存在）；CTSC 归入 WC/APIO 层、国际金牌并入金牌均为用户决策（2026-09），与文章阶梯不同 |
| 学校层次 | 985（57 所，含公告中的特殊院校）优先于 211，其余双非 | 与 Summary/学校页一致 |
| 排除项 | 只读 `sheets['正式队伍']`；铁牌=medal 空；unofficial/girl 字段存在但当前数据全为 false，未特判 | |

**已知取舍**（勿当 bug 报）：同名**同校**的两人仍会合并（无 ID 无法区分）；`icpc_id` 字段基本为空，将来若补全可升级为 ID 判重。对外对照时注意范围差异：本项目 2025 收录 12 赛区（含总决赛），文章只统计 10 站。**2026 特殊**：目前仅收录 3 场网络预选赛（CCPC ×1、ICPC ×2，线上赛不发奖牌），因此该年奖牌档分析中全员计为铁牌（iron），奖牌相关图表对该年只有铁牌段属正常。

## 4. 计算函数一览（analysis.js 导出）

| 函数 | 输入 | 输出（要点） |
|---|---|---|
| `buildYearDataset(contestsData)` | 各赛区 JSON 数组 | `{ teams, players }`；team 含 `regionId/regionName/org/rank/tier/members/oiCount`；player 含 `key/name/school/appearances/bestTier/isOIer/oi[]` |
| `computeOverview(dataset)` | dataset | 卡片数字 + `perRegion`（队伍口径）+ `orgMedals`（CCPC/ICPC 金银铜，队伍口径） |
| `computeRegionStats(dataset)` | dataset | `perSite`（选手口径人数）+ `migration[regionId][tier] = { total, other: {gold…} }` |
| `computePlayerStats(dataset)` | dataset | `tierCounts`、`participation`（1/2/3/4+ 桶）、`stability`（每人 mean/std/range）、`stabilityAgg` |
| `computeOIerStats(dataset)` | dataset | `playerTiers`（各档 OIer 占比）、`teamTiers`（各档队伍 0~3 名 OIer 构成） |
| `computeOIAwardStats(dataset, regionId?, tier?)` | dataset；regionId null=全部；tier 默认 gold，可传 silver/bronze | 该档选手最高 OI 奖项直方图 `{ total, withOi, items[] }`；口径为**该档奖牌队伍成员**（拿过该档即计入，跨档重叠，非最高档互斥）；展示层合并（用户决策 2026-09）：NOI夏令营→NOI、CSP-J/NOIP普及→入门、CSP-S/NOIP/春季测试/NGOI→提高、WC/APIO/CTSC→"WC 级"；"国际金牌"视作金牌并入 |
| `computeSchoolStats(dataset, tags)` | dataset + `{set985,set211}` | `tierStats`（players/goldRate/medalRate/oierRate）、`noGold985`、`goldSchools`（有金牌的 211/双非，拼音序） |
| `parseOIAward(comp, award)` | 单条 OI 记录 | `{ level, rank, label, year }` 或 null（不可解析即丢弃；已验证 2020-2025 金牌选手记录零丢失） |
| `medalTier / schoolTierOf / fmtPct` | — | 工具 |

## 5. 图表统一约定（新图表必须遵守）

- **奖牌堆叠顺序**：视觉自下而上 铁→铜→银→金（即 series 数组用 `[...MEDAL_ORDER].reverse()`），金牌段永远在柱顶；tooltip formatter 手动按 `b.seriesIndex - a.seriesIndex` 排序保证列表从金牌开始；legend 用显式 `data: MEDAL_ORDER.map(MEDAL_LABELS)` 保持 金银铜铁 阅读顺序
- **颜色**：`MEDAL_COLORS = { gold: '#e6a23c', silver: '#909399', bronze: '#b3703c', iron: '#dcdfe6' }`；OIer 构成图 0~3 名用 `['#dcdfe6','#a0cfff','#409eff','#1d6fd8']`；OI 奖项分布图按等级配色（0~3 沿用同组蓝色梯度、等级 4 IOI 用金牌色，`oiLevelColors[level]`）
- **横向条形图排序**：不要 reverse 数据数组，用 `yAxis.inverse: true` 控制方向——formatter 里 `items[p.dataIndex]` 才能天然对齐（见坑 6.1）
- **表头 ⓘ 模式**：`el-table-column` 的 `#header` 插槽 + `el-tooltip`，图标 `<span class="text-gray-400 cursor-help ml-0.5">ⓘ</span>`（PlayersTab 三列已用）；小节标题内同样适用（OIerTab 奖项分布标题左侧 ⓘ 解释金银铜牌选手口径）
- **图表点击跳转**：AnalysisChart 把 ECharts 元素级 click 转发为组件 `@click`（仅点到系列数据时触发，空白区不触发）。散点数据第 3 位放元数据对象，点击处理从 `params.data[2]` 取 `name` 后 `router.push('/'+year+'/player/'+encodeURIComponent(name))`；个人页按**姓名**检索（全站选手链接皆此口径，同名选手个人页会聚合）。PlayersTab 散点已用
- ECharts 新图表类型需在 `AnalysisChart.vue` 的 `use([...])` 里补注册

## 6. 已知坑（历次踩过）

1. **tooltip 索引镜像/串位（出过两个 bug）**：axis 触发的 tooltip 里 `dataIndex` 是类目索引、`seriesIndex` 是系列索引；凡数据数组做过 `reverse()`，formatter 就不能再直接用源数组下标。修复后约定见第 5 节
2. **Vite dev server 文件监听偶尔漏更新**（Windows）：表现为页面/模块内容落后于磁盘。`curl http://localhost:11451/XCPCAtlas/src/<file>` 对比磁盘内容，落后则 `touch` 该文件；必要时重启
3. **杀 dev server 要杀 vite 子进程**：`TaskStop`/Ctrl+C 只杀外层 shell 时端口仍被占。`netstat -ano | grep :11451` 找 PID 后 `taskkill //F //PID <pid>`
4. **el-tab-pane 非懒加载**：全部图表随页面挂载（当前 9 个 canvas）。图多卡顿时给 `el-tab-pane` 加 `lazy`
5. **el-select 拉满整行**：必须内联 `style="width: 8rem"` 之类显式限宽；Tailwind 的 `w-*` 宽度类对 el-select 无效（实测样式表中未生成对应规则，`w-44` 曾因此长期全宽）
6. **canvas 图表交互必须用真实鼠标**：ECharts 6/zrender 不响应 JS 合成事件（对 canvas/host `dispatchEvent` 的 mousemove/pointermove 全部无效，既无 tooltip 也不改 cursor）。验证 tooltip/点击一律用 `tab.cua.move({x,y})` / `cua.click({x,y})` 真实鼠标。要精确点击某个数据点：从 `x-vue-echarts` 元素的 `__vueParentComponent.exposed` 拿图表实例（`exposed.chart._value` 才是 ECharts 实例；exposed 上也有 convertToPixel/getOption 等直通方法），`convertToPixel({xAxisIndex:0,yAxisIndex:0},[x,y])` 换算像素坐标（加 canvas 的 getBoundingClientRect 偏移）后 `cua.click`；重叠点会命中绘制在最上层的那个，属正常行为
7. **数字对照外部文章时**：注意赛站集合（12 vs 10 站）与判重口径（学校+姓名 vs 官方 ID）差异，趋势一致即可，不追小数

## 7. 验证方法（每次改统计逻辑后必做）

1. **构建**：`cd web && npm run build`
2. **双实现交叉核对**：用独立 Python（glob 该年 JSON 重算）与 `node -e "import('./src/utils/analysis.js').then(...)"`（cwd 在 `web/`）各算一遍，逐项对比。历史上两次"基线不一致"都是基线脚本自身写错（字母序比较、min/max 反用、cwd 错路径），页面代码反而是对的——先怀疑脚本再怀疑页面
3. **文章基准**（2025 年，学校+姓名口径）：获奖分布 金11.6%/银20%/铜27.6%/铁40.8%；各档 OIer 率 88%/64%/41%/26%、总 44.7%；无奖牌率 1 场 69.4% → 4+ 场 1.6%；郑州站金 68 人、95.6% 其他站也金（文章 96%）；重庆站最高 OI 奖项 NOI银 21 与文章一致（NOI夏令营当时单列；2026-09 并入 NOI 后该桶为 29）
4. **浏览器实测**：dev server `http://localhost:11451/XCPCAtlas/#/2025/analysis`（Hash 路由，vite base 为 `/XCPCAtlas/`）。逐 Tab 截图；tooltip 类交互用第 6 节方法

## 8. 变更历史（简）

- 2026-09 一期：占位页 → 总览 / OIer 占比 / 队伍构成 / 学校层次（含无金牌 985）
- 2026-09 二期：选手分析（饼图/场次/稳定性）+ 金牌选手最高 OI 奖项（逐站）+ 学校层次 OIer 率
- 2026-09 判重口径变更：姓名 → 学校+姓名（用户决策）
- 2026-09 赛站分析：各站获奖人数 + 跨赛站获奖迁移
- 评审修复：队伍构成图 tooltip 串位、奖项图 tooltip 镜像、`oier` 计数未初始化 NaN、`idx` 残留 ReferenceError、README 结构树滞后
- 2026-09 学校分析补充：本年有金牌的 211/双非 院校名单（与"无金牌 985"对称，绿色标签）；dev server 地址回填为 `/XCPCAtlas/`
- 2026-09 选手分析：稳定性散点点击跳转选手个人页（AnalysisChart 转发 click；个人页沿用全站姓名口径）
- 2026-09 OI 奖项分布：等级说明改从大到小降序、条形按奖项等级配色
- 2026-09 OI 等级口径变更：CTSC 从 NOI 层移入 WC/APIO 层（用户决策）；重庆站 NOI银 21 基线不受影响，全国仅 2 名最高奖为 CTSC 的选手受影响
- 2026-09 OI 奖项展示合并：NOI夏令营→NOI、CSP-J/NOIP普及→入门、CSP-S/NOIP/春季测试/NGOI→提高、WC/APIO/CTSC→"WC 级"（APIO 国际金单列；等级说明同步更新）；重庆站 NOI银 桶相应由 21 变 29
- 2026-09 OI 奖项分布 tooltip：去掉"占有 OI 记录者"字样，增加"该档及以上"累计人数（等级更高或同档位不低于该条之和，末条累计=有 OI 记录人数）
- 2026-09 最高 OI 奖项分布扩展到银/铜牌选手：三列并排共享赛区下拉；口径沿用"该档奖牌队伍成员"（拿过该档即计入，与金牌图一致）
- 2026-09 APIO 国际金并入 WC 级（显示为 "WC 级 国际金"，rank 0 仍单行）
- 2026-09 口径再调整：奖项中的"国际"视作比赛届别名，"国际金牌"直接并入金牌（金牌图 WC 级 金 28→29、银牌图 20→21，rank 0 分层删除）
- 2026-09 奖项分布标题左侧加 ⓘ：悬停解释金银铜牌选手口径（拿过对应档奖牌、跨档重叠）
- 2026-09 文案精简与样式修复：多处小字去除括号/分号说明（去重口径、2 人队归档、OIer 定义、统计范围等，统计逻辑均未变）；奖项分布筛选框由失效的 Tailwind `w-44` 改为内联 `style="width: 8rem"`
- 2026-09 接入 2026 年数据：3 场网络预选赛（`online`/`online1`/`online2`，14/14/12 题，无奖牌）。管道配套改动：problems 键改为按源表实际题列生成（12 个 12 题历史赛区随之移除幽灵 M 列，其余旧数据逐字节不变）；DOMjudge 题列正则 [A-M]→[A-N]（修复 N 题被静默丢弃）
