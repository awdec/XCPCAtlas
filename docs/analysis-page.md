# 数据分析页开发文档

> 数据分析页（`/:year/analysis`）的专属参考文档。后续涉及该页的任务**先读本文**，再按需查看具体文件，无需重新通读代码。
> 创建于 2026-09，若实际代码与本文冲突，以代码为准并回填本文。

## 1. 定位与入口

- 页面视图：`web/src/views/Analysis.vue`（懒加载）；路由 `/:year/analysis`（`web/src/main.js`，受年份校验守卫约束）
- 导航项：`web/src/App.vue` 的 `yearNavItems` 末尾（"📈 数据分析"），仅进入具体年份后显示
- 页面标题只写"📈 数据分析"，不带年份括号（年份由页面上下文确定，用户决策）
- Tab 顺序：总览 → 赛站分析 → 选手分析 → 轨迹分析 → OIer 分析 → 学校分析（`el-tabs`，非懒加载）
- 当前 Tab 由 URL 查询参数 `tab` 保存（`overview/region/players/trajectory/oier/school`）；切换用 `router.replace`，刷新和浏览器前进/后退均恢复对应 Tab，不为每次切换新增历史记录。未指定或参数无效时显示总览；轨迹名单页的“返回数据分析”链接显式携带 `tab=trajectory`。
- 分析方向源自作者的两篇洛谷文章（2025 XCPC-region data 及其 OIerdb 番外），数值曾逐项对照验证

## 2. 文件地图

| 文件 | 职责 |
|---|---|
| `web/src/utils/analysis.js` | **唯一计算层**。全部口径、纯函数，不依赖 Vue/ECharts |
| `web/src/components/analysis/AnalysisChart.vue` | ECharts 封装（按需注册：Bar/Pie/Line/Scatter/Heatmap + Grid/Tooltip/Legend/VisualMap + Canvas）；转发元素级 click 事件 |
| `web/src/components/analysis/OverviewTab.vue` | 总览：6 张统计卡片、各赛区队伍奖牌分布（堆叠）、奖牌发放数表格（CCPC/ICPC，独立卡片、表格居中） |
| `web/src/components/analysis/RegionTab.vue` | 赛站分析：各赛站获奖人数（选手口径）、跨赛站获奖迁移（赛站下拉 + 4×4 热力图 + 明细表） |
| `web/src/components/analysis/PlayersTab.vue` | 选手分析：获奖分布饼图、参赛场次×无奖牌率（柱线双轴）、**「第一次最高获奖」表**（金银铜三行，当年选手数来自 trajectories.json 的 `first_best_tiers`；“至今累计数”来自 `all_time_best_tiers`，累计至页面年份的最高档互斥计数）、排名稳定性散点（≥2 场，点击数据点跳转选手个人页）+ 汇总表（三列带 ⓘ 说明） |
| `web/src/components/analysis/TrajectoryTab.vue` | 轨迹分析：五年奖牌轨迹表（第一年~第五年 + 选手数，0 人行不显示，仅统计当年获奖选手，表头可按列排序，**行点击跳转名单页**）。**不走 dataset/analysis.js**，读预生成 `data/{year}/trajectories.json`（`Analysis.vue` 里非阻塞加载，失败显示「暂不可用」不炸整页） |
| `web/src/views/TrajectoryDetail.vue` | 轨迹名单页（`/:year/trajectory/:code`）：该轨迹全部选手的学校+姓名表；姓名链接 `/:year/player/:name?scope=all&school=学校`，按**学校+姓名**汇总项目全部年份的 ICPC/CCPC 记录，避免跨学校同名记录合并；赛区标注年份，按年份升序、同年按排名排列，赛区与学校链接使用记录年份。OI 仍读取页面所属年份，按完整 `name@school` 键匹配；普通年度个人页继续只按姓名检索。共享 `utils/trajectory.js` 的编解码（tiers↔`i-b-g-n-n` 式 code） |
| `web/src/components/analysis/OIerTab.vue` | OIer 分析：各奖牌档 OIer 占比、队伍 OIer 人数构成（0~3 堆叠百分比）、金银铜牌选手最高 OI 奖项分布（三列并排，共享赛区下拉） |
| `web/src/components/analysis/SchoolTab.vue` | 学校分析：985/211/双非 奖牌分布堆叠、获奖率与 OIer 率、层次概览表、无金牌 985 名单、有金牌 211/双非 名单 |
| `web/src/views/Analysis.vue` | Tab 容器 + 顺序加载进度条 + 年份切换 watch + dataset/tags 构建 |

数据源：`web/public/data/{year}/contests.json`（索引）+ `{contest_id}.json`（`sheets['正式队伍']`）+ 全局 `985.json`/`211.json`。加载用 `dataLoader.js`（`loadSchoolTags` + 顺序 `loadContestData` 带进度）。轨迹分析另读预生成 `data/{year}/trajectories.json`（`scripts/gen_trajectories.py` 在 convert 之后运行生成；convert 重跑会清掉它，见 §3 口径与 README 管道说明）。

## 3. 数据口径（核心，改前先想清楚）

| 口径 | 定义 | 决策来源 |
|---|---|---|
| XCPC 选手判重 | **学校+姓名** 双关键字 `name@school`，同名跨校视为不同人；学校是键的一部分，不存在归属歧义 | 用户明确决策（2026-09），取代早期"姓名去重+最高奖牌队伍归属学校"方案 |
| OIer 判定 | 预处理 `extract_oi_records.py` 按姓名匹配并由 OI 年级反推 XCPC 当年年级：通常大一~大五；XCPC 所属学校为西安交通大学、中国科学技术大学时放宽为高一~大五。前端只消费 `members[].oi`（convert 按 `name@school` 挂载） | 用户明确决策（2026-10）：两校扩大推算年级窗口；不是按 OI 获奖时是否为高中生直接放行 |
| 奖牌档 | 当年所有赛区的**最高**奖牌；无奖牌=铁牌（iron）。行/桶/颜色全按此互斥划分 | 与文章口径一致 |
| 赛站口径 | 每名选手在每个赛站取该站最好奖牌档；每站人数按选手去重（总览页是队伍口径，两者刻意不同） | |
| 排名稳定性 | 仅 `appearances ≥ 2` 的选手；极差/标准差是**每人自己各场名次**的极差/标准差，再按奖牌档平均（两层结构，列头有 ⓘ 说明） | 用户确认过语义 |
| 迁移矩阵 | 在本站获某档奖的选手（去重）中，还参加过其他赛站者的**其他站最好成绩**分布；单站选手不计入 | 复现文章"郑州金 96%"的口径 |
| 奖牌轨迹 | 页面年 Y 的**窗口 [Y-4, Y]** 内、**当年（Y）获奖（金/银/铜）**的选手（学校+姓名判重；当年未参赛或最高仅铁牌者不计入该页，从未获奖者不会出现在任何一页），从**窗口内首次参赛年**起连续 5 个年度的当年最高奖牌档；某年未参赛（中间断档或落出窗口/未来年份）记 `\`（数据层 'none'）；Honorable/无奖牌=铁与 `medalTier` 一致；行按人数降序、并列按 金>银>铜>铁>\ 稳定排序；0 人行不显示。**离线预计算**（`scripts/gen_trajectories.py` → `{year}/trajectories.json`），前端只读不算；窗口前的生涯不锚定不计入 | 用户决策（2026-11）：窗口口径 + 本地预计算；同月用户修正人群为当年获奖选手 |
| 第一次最高获奖 | 当年（Y）获奖（金/银/铜）且**当年档位严格高于此前所有年份**（数据范围内 Y 之前的全部年份，**不限窗口**；往年铁牌不算获得过奖，不阻挡）的选手数，按 金/银/铜 三档分列——即「当年创造个人历史最好成绩」（含首次获奖、含甲型选手：早年铁牌后首次拿奖）。数据为 `trajectories.json` 的 `first_best_tiers` 字段 | 用户决策（2026-11）：先看当年最高奖项，往年获得过 ≥ 该档的奖则不计入 |
| 至今累计数 | **2020 年至页面年 Y（含）的全部记录**，按**学校+姓名**去重，每位选手只计入其截至 Y 年最高奖牌的金/银/铜一档，纯铁牌不计；不按年度人数求和，不受五年窗口限制，不计入 Y 年之后的获奖或选手。由 `gen_trajectories.py` 按页面年份分别计算并写入对应 `trajectories.json` 的 `all_time_best_tiers`；字段缺失显示 `—` | 用户决策（2026-11）：累计范围截至所在页面年份 |
| OI 奖项等级 | 家族映射 `OI_FAMILY_LEVEL`：CSP-J/NOIP普及(0) < CSP-S/NOIP/春季测试/NGOI(1) < WC/APIO/APIO线上/CTSC(2) < NOI/NOI夏令营/NOID类(3) < IOI(4)；等级内 金/一等 < 银/二等 < 铜/三等（奖项中的"国际"视作比赛届别名，"国际金牌"即金牌，用户决策 2026-09）；同为最高时取更近年份 | 文章阶梯 + 数据实际字符串（APIO线上/NOID类等真实存在）；CTSC 归入 WC/APIO 层、国际金牌并入金牌均为用户决策（2026-09），与文章阶梯不同 |
| 学校层次 | 985（57 所，含公告中的特殊院校）优先于 211，其余双非 | 与 Summary/学校页一致 |
| 排除项 | 只读 `sheets['正式队伍']`；铁牌=medal 空；unofficial/girl 字段存在但当前数据全为 false，未特判 | |

**已知取舍**（勿当 bug 报）：同名**同校**的两人仍会合并（无 ID 无法区分）；`icpc_id` 字段基本为空，将来若补全可升级为 ID 判重。对外对照时注意范围差异：本项目 2025 收录 12 赛区（含总决赛），文章只统计 10 站。**2026 数据范围**：收录 ICPC 西安、成都、武汉站和 CCPC 长春、乐山站，三场网络预选赛已移除。西安站含 402 支正式队伍、13 道题及奖牌；队员姓名由 [XCPC Sight](https://junjiecharles.github.io/xcpc-sight/?series=2026-2027&previewContest=icpc-2026-xian&view=preview) 的赛站手册名单按“学校＋队名”精确补充，存于 `xcpc/2026/2026 ICPC xian.members.json`，共 1205 个队员条目（佛山大学“我的刀盾”按来源保留 2 人）。本站队员纳入选手统计和参赛经历，OI 记录沿用本项目 `raw.txt` 的姓名及年级窗口匹配，不使用来源网站的 Rating 或 OI 匹配结果。乐山站使用官方完整赛后快照，收录 299 队、895 个队员条目，金/银/铜为 30/60/90 队；48 支打星队及 1 支无提交队排除，成都师范学院「十二月二十四」按源保留 1 名队员。

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
- **图表点击跳转**：AnalysisChart 把 ECharts 元素级 click 转发为组件 `@click`（仅点到系列数据时触发，空白区不触发）。散点数据第 3 位放元数据对象，点击处理从 `params.data[2]` 取 `name` 后 `router.push('/'+year+'/player/'+encodeURIComponent(name))`；普通年度个人页按**姓名**检索（同名选手个人页会聚合），轨迹名单入口的历年页携带学校并按**学校+姓名**匹配。PlayersTab 散点已用
- ECharts 新图表类型需在 `AnalysisChart.vue` 的 `use([...])` 里补注册

## 6. 已知坑（历次踩过）

1. **tooltip 索引镜像/串位（出过两个 bug）**：axis 触发的 tooltip 里 `dataIndex` 是类目索引、`seriesIndex` 是系列索引；凡数据数组做过 `reverse()`，formatter 就不能再直接用源数组下标。修复后约定见第 5 节
2. **Vite dev server 文件监听偶尔漏更新**（Windows）：表现为页面/模块内容落后于磁盘。`curl http://localhost:11451/XCPCAtlas/src/<file>` 对比磁盘内容，落后则 `touch` 该文件；必要时重启
3. **杀 dev server 要杀 vite 子进程**：`TaskStop`/Ctrl+C 只杀外层 shell 时端口仍被占。`netstat -ano | grep :11451` 找 PID 后 `taskkill //F //PID <pid>`
4. **el-tab-pane 非懒加载**：全部图表随页面挂载（当前 9 个 canvas）。图多卡顿时给 `el-tab-pane` 加 `lazy`
5. **el-select 拉满整行**：必须内联 `style="width: 8rem"` 之类显式限宽；Tailwind 的 `w-*` 宽度类对 el-select 无效（实测样式表中未生成对应规则，`w-44` 曾因此长期全宽）
6. **canvas 图表交互必须用真实鼠标**：ECharts 6/zrender 不响应 JS 合成事件（对 canvas/host `dispatchEvent` 的 mousemove/pointermove 全部无效，既无 tooltip 也不改 cursor）。验证 tooltip/点击一律用 `tab.cua.move({x,y})` / `cua.click({x,y})` 真实鼠标。要精确点击某个数据点：从 `x-vue-echarts` 元素的 `__vueParentComponent.exposed` 拿图表实例（`exposed.chart._value` 才是 ECharts 实例；exposed 上也有 convertToPixel/getOption 等直通方法），`convertToPixel({xAxisIndex:0,yAxisIndex:0},[x,y])` 换算像素坐标（加 canvas 的 getBoundingClientRect 偏移）后 `cua.click`；重叠点会命中绘制在最上层的那个，属正常行为
8. **el-tabs 真实 click 偶发超时**：Playwright `getByRole('tab', …).click()` 会卡在 waiting for click（元素被判定不稳定），改用 `evaluate(el => el.click())` 合成点击即可正常切换 tab（2026-11 轨迹 tab 实测）。另：el-tabs 非懒加载，所有 pane 同时在 DOM 里，`querySelector('.el-table')` 会命中别的 tab 的表，须用 `#pane-{name}` 作用域
7. **数字对照外部文章时**：注意赛站集合（12 vs 10 站）与判重口径（学校+姓名 vs 官方 ID）差异，趋势一致即可，不追小数

## 7. 验证方法（每次改统计逻辑后必做）

1. **构建**：`cd web && npm run build`
2. **双实现交叉核对**：用独立 Python（glob 该年 JSON 重算）与 `node -e "import('./src/utils/analysis.js').then(...)"`（cwd 在 `web/`）各算一遍，逐项对比。历史上两次"基线不一致"都是基线脚本自身写错（字母序比较、min/max 反用、cwd 错路径），页面代码反而是对的——先怀疑脚本再怀疑页面
3. **文章基准**（2025 年，学校+姓名口径）：获奖分布 金11.6%/银20%/铜27.6%/铁40.8%；各档 OIer 率 88%/64%/41%/26%、总 44.7%；无奖牌率 1 场 69.4% → 4+ 场 1.6%；郑州站金 68 人、95.6% 其他站也金（文章 96%）；重庆站最高 OI 奖项 NOI银 21 与文章一致（NOI夏令营当时单列；2026-09 并入 NOI 后该桶为 29）
4. **浏览器实测**：dev server `http://localhost:11451/XCPCAtlas/#/2025/analysis`（Hash 路由，vite base 为 `/XCPCAtlas/`）。逐 Tab 截图；tooltip 类交互用第 6 节方法
5. **轨迹分析 tab**：改口径后重跑 `python scripts/gen_trajectories.py`，用独立 node 脚本（`import './src/utils/analysis.js'` 的 `medalTier`，cwd 在 `web/`）重算全部年份与 JSON 逐行对比（total/行数/每行 count/排序），再抽 1 条轨迹手查其中 1 名选手的逐年原始奖牌

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
- 2026-10 接入 ICPC 西安站（`xian`）：402 支正式队伍、13 题，保留源表奖牌；通过 XCPC Sight 补充 1205 个队员条目，选手提取和成绩转换共用 `team_members.py` 读取同名 `.members.json`，重新生成本站选手经历及 OI 关联。
- 2026-10 OI 判定例外：西安交通大学、中国科学技术大学的选手，将 XCPC 当年的推算年级窗口由大一~大五扩大至高一~大五（大学年级数 -2~5）。仍保留上半年 OI 比赛的原有年级对齐方式，其他学校维持 1~5；按 XCPC 所属学校隔离同名选手的额外记录，重新生成所有年份数据。

- 2026-10 移除 2026 年三场网络预选赛（`online`/`online1`/`online2`）的源表、赛事数据及索引；重新提取选手及各年份 OI 索引，2026 年保留 ICPC 西安站 402 支队伍。

- 2026-10 接入 CCPC 长春站（`changchun`）：保存官方完整赛后 `.rank.json` 快照，由 `iccpc_rank.py` 还原排名与奖牌；299 支正式队伍（含 2 支女队）、897 个队员条目、13 题，金/银/铜为 30/60/90 队。36 支打星队及 2 支无提交队伍仅留在原始快照，不纳入站内统计。
- 2026-11-08 接入 CCPC 乐山站（`leshan`）：保存[官方榜单](https://rank.iccpc.cn/r/6503f86d-8281-4d33-9da0-b41e6fff4726)完整赛后快照及来源时间，导入 299 队、191 校、895 个队员条目、13 题，金/银/铜为 30/60/90 队。48 支打星队及 1 支无提交队仅存于原始快照；成都师范学院「十二月二十四」按源保留 1 人。完整重跑选手、OI、成绩和轨迹管线；2026 年共 5 站、1688 队，轨迹当年获奖选手 2275 人，「第一次最高获奖」金/银/铜为 249/534/776。

- 2026-11 接入 ICPC 成都、武汉站（`chengdu`/`wuhan`）：分别 319/369 支正式队伍，均为 13 题；读取源表 Official 工作表，Team Members 前三人为队员，其余作为教练，沿用现有 OI 判定规则。
- 2026-11 总览表格文案与布局：标题"分赛事奖牌发放数（CCPC / ICPC）"改为"奖牌发放数（CCPC / ICPC）"，表格在卡片内居中（`margin: 0 auto`），去掉 `size="small"` 并放宽到 560px、内联 `font-size: 16px`（表头单元格均继承根元素字号，实测 16px）；统计口径未变。
- 2026-11 赛站分析卡片去标题化（用户决策）：总览"奖牌发放数"外的区块标题精简——"跨赛站获奖迁移" h3 移除，卡片顶部直接是"选择赛站"下拉 + 说明行；统计逻辑未变。迁移明细表同步放大：去 `size="small"`、760→880px 居中、内联 `font-size: 16px`（同总览表做法，用 `margin-left/right: auto` 保留 `mt-4`）；"有其他站记录"列宽 120→140 防 16px 表头换行。"各赛站获奖人数"下方的选手口径小字说明一并移除（口径本身不变，仅去 UI 注释；迁移卡片的说明行保留）。
- 2026-11 选手分析"各奖牌档稳定性汇总"表同款放大：去 `size="small"`、内联 `font-size: 16px`、`width: 640px` 居中。该表 4 列全为固定宽度，外层 width 须等于列宽合计（120/140/180/200），否则 bordered 表右侧留白；16px 下"排名极差/标准差的平均值"+ⓘ 表头需 180/200 才单行。
- 2026-11 学校分析"学校层次概览"表同款放大：去 `size="small"`、内联 `font-size: 16px`、`width: 600px`（6×100 列宽合计）居中；表头 16px 下均单行，无需调列宽。至此全站 el-table 均为 16px 居中样式。
- 2026-11 稳定性汇总表"奖牌档"列头补 ⓘ（用户决策）：说明仅一句"按选手当年所有赛区的最高奖牌档归档"（初版含金/银/铜/铁归档细则，用户要求精简后定稿）；与既有三列 ⓘ 模式一致，列宽 120 不变仍单行。
- 2026-11 新增「轨迹分析」tab（选手分析与 OIer 分析之间）：五年奖牌轨迹表，口径见 §3；`scripts/gen_trajectories.py` 预生成 `{year}/trajectories.json`（convert 之后运行，convert 重跑会清掉它，README/AGENTS.md 管道已加第 4 步）；前端 `TrajectoryTab.vue` 只读渲染（600px/16px 居中、70vh 滚动、金银铜铁\ 彩色单字，新口径下行数最多的 2023 页 139 行不需分页）；`Analysis.vue` 非阻塞加载，失败仅该 tab 显示「暂不可用」。双实现核对（Python 生成 vs node 用前端 medalTier 重算）7 个年份全部一致，2022 页抽查 陈一涵@南京理工大学（2020 铁→2021 铜→2022 金）逐年原始奖牌吻合
- 2026-11 轨迹分析口径修正（用户反馈）：人群由"窗口内出现过的所有选手"改为"**当年（页面年）获奖（金/银/铜）的选手**"——当年未参赛或最高仅铁牌者不计入该页（如 2020 年铜牌后退役的选手只出现在 2020 页，不再挂在 2022 页的 `铜 \ \ \ \` 行；从未获奖的纯铁牌选手不会出现在任何一页）；轨迹锚点不变（仍从窗口内首次参赛年起）。重新生成全部 trajectories.json（2022 页人群 13220→2831、行数 90→69），重做双实现核对，并验证用户两例：例 2"2020 铜、2021 未参赛、2022 银"恰 5 人对应行 `铜 \ 银 \ \` count=5；例 1 仅 2020 参赛的 748 名铜牌选手被排除出 2022 页
- 2026-11 轨迹表列排序（用户需求）：六个列表头均可点击升降序（第三次点击恢复默认人数降序）；年度列按 `\＜铁＜铜＜银＜金` 自定义比较（el-table `sort-method`，数据层 'none'=0），选手数列数值排序，并列行保持 JSON 顺序（稳定排序）；说明行尾加排序提示。仅前端展示层排序，不改预生成数据；浏览器实测升/降/恢复三态与单调性通过
- 2026-11 轨迹行点击 → 选手名单页（用户需求）：`trajectories.json` 每行新增 `players`（`[学校,姓名]` 按 school/name 排序，单文件最大 ~250KB）；新路由 `/:year/trajectory/:code`（`TrajectoryDetail.vue`，code 由 `utils/trajectory.js` 编码 tiers↔`i-b-g-n-n`，如 `铜 金 金 \ \` = `b-g-g-n-n`），表格仅学校+姓名两列、姓名 router-link 个人页（按姓名检索口径与全站一致）、70vh 滚动；轨迹表行加 `cursor-pointer` + `@row-click` 跳转。实测：2026 页 `铜 \ \ \ \` 行 511 人名单渲染正确，`b-g-g-n-n` 页 3 人（济南大学 肖远志等）与 JSON 一致，点击 肖远志 跳转其个人页正常
- 2026-11 选手分析新增「第一年最高奖牌分布」表（用户需求）：插在双图卡片行与排名稳定性之间；行=金/银/铜/铁（铁=第一年未获奖但后来获奖，用户枚举金银铜、铁按站内 MEDAL_ORDER 惯例补全），数据为 `trajectories.json` 顶层新字段 `first_year_tiers`（由行数据按 `tiers[0]` 汇总，Σ=total 已验证），口径与轨迹分析一致（当年获奖人群、第一年=统计范围内首次参赛年）；PlayersTab 新增 `trajectories` prop 由 Analysis.vue 传入，数据缺失时显示「暂不可用」
- 2026-11 「第一年最高奖牌分布」改为「**第一次最高获奖**」（用户口径修正）：先看选手当年最高奖项，往年获得过 ≥ 该档的奖则不计入——即当年为个人历史新高（含首次获奖）；字段更名 `first_year_tiers`→`first_best_tiers`，铁牌行删除（当年获奖人群下不可能出现铁），**往年范围取数据内 Y 之前全部年份而非仅窗口**（往年铁牌不阻挡）；node 双实现核对 7 年全过，案例抽查：张立@新疆大学（2023/2024 铁、2025 铜、2026 银→计入银）与 董雨润@北航（往年金、2026 银→不计入）均符合规则。2026 页数值 金229/银486/铜712（合计 1427，小于当年获奖总数 2085，差额为往年已达同档或更高者）
