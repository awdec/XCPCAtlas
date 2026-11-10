# 前端重构执行审查

审查日期：2026-11-10。对象：`refactor/m2-shell`，HEAD `6ae0027`；对照重构前 `1ea95eb`、`docs/frontend-refactor-plan.md` 和 `docs/analysis-page.md`。本次没有修改应用代码、测试或业务数据。

主体功能、技术栈迁移与业务计算保真已经落地，但目前尚不满足方案的完整验收条件。文档开头的 “Executed (M0–M7)” 和 §13 的全部完成表述应在补齐问题后再确认。

| 实际复核项 | 本次结果 |
|---|---|
| `npm run typecheck` | 通过 |
| `npm run lint` | 失败：2 个错误、17 个警告 |
| `npm test` | 25 项通过 |
| `npm run test:golden` | 2020–2026 共 7 项通过 |
| `npm run build` | 通过；ECharts 位于 Analysis 分块 |
| `npm run verify:data` | 96 个文件内容一致，123.3 MB → 62.4 MB，缩减 49.3% |
| `npm run test:e2e` | 215 项通过、35 项跳过，约 1.8 分钟 |
| 数据管道与源数据差异 | `scripts/`、`xcpc/`、`raw.txt`、`players.json`、`web/public/data/` 相对重构前无差异 |
| 首页首次加载 JS | 独立浏览器上下文实测加载 10 个 JS 文件，本地 gzip 合计 150,273 字节，超过 120 KB 预算 |

以下问题按修复优先级排列。

1. **[P1] 当前 lint 失败，会阻断部署检查。**

   位置：`web/tests/e2e/po/app.js:61`、`web/tests/unit/data-table.test.ts:30`；部署检查见 `.github/workflows/deploy.yml:33`。

   `escapeRe` 未使用触发 `@typescript-eslint/no-unused-vars`；测试名称中的反斜杠触发 `no-useless-escape`。本次命令退出码为 1，与方案 §13 的 “lint 0 errors” 不一致。应修复两处错误并更新实际检查结果；现有 17 项警告也应如实记录。

2. **[P1] 历年选手查询在路由切换时会把其他人的结果写入原选手缓存。**

   位置：`web/src/data/queries.ts:113–117`；违反 B-PL3 的并发安全要求。

   查询键已按原来的姓名、年份、学校确定，但 `scope=all` 查询先等待 `years.json`，随后又读取可变化的路由参数。若同一 Player 组件在等待期间切换姓名，原查询会用新姓名计算，却缓存到原查询键下。`staleTime: Infinity` 使返回原选手时继续使用该错误结果。

   浏览器复现：拦住 `years.json` 响应，访问 `/2025/player/刘海峰?scope=all`；在响应前切到不存在的姓名；放行响应后返回刘海峰。页面显示 ICPC/CCPC **0**、OI 奖项 **0**；完整刷新后恢复为 ICPC/CCPC **5**、OI 奖项 **17**。

   建议在异步操作前固定本次请求的全部参数，或从本次 queryKey 获取参数；增加“年份索引延迟返回时切换姓名并返回”的回归检查。

3. **[P2] 历年数据的 Worker 缓存没有回收路径，M4-T5 未完成。**

   位置：`web/src/data/year-core.ts:23–24,79–89`、`web/src/workers/year-client.ts:10–38`。

   `scope=all` 会将全部年份的赛区数据留在模块级单例 Worker 的 Map 中。全仓库搜索 `evictExcept` 仅发现定义和转发，没有导航或生命周期调用。因此 Vue Query 的 `gcTime: 60_000` 只能回收返回结果，不能释放 Worker 内仍被引用的原始数据。

   方案 §13 已承认此缺口。应接入有生命周期管理的缓存淘汰，再完成“离开后 90 秒内释放”的堆内存验证；本次没有执行该 90 秒堆快照验收。

4. **[P2] 声称强制执行的分层规则对常用导入写法不起作用。**

   位置：`web/eslint.config.js:32–36`；涉及 M1-T1、§5.2 和验收 §10.7。

   用现有 ESLint 配置对虚拟 `src/domain/review-probe.ts` 做检查：`import x from '@/pages/home/HomePage.vue'` 无错误；`import { useYears } from '../data/queries'` 也无错误。只有显式相对 `.vue` 路径 `../pages/home/HomePage.vue` 能正确触发分层错误。

   这说明当前解析配置未覆盖项目的 `@/` 别名及省略扩展名的 TypeScript 导入，未来违规依赖可以通过 CI。应配置与 TypeScript/Vite 一致的解析方式，并添加有意违规的规则验证；同时补齐计划规定的 Worker 导入边界。

5. **[P2] OI 奖项提示无法通过键盘聚焦姓名打开。**

   位置：`web/src/entities/player/PlayerLink.vue:16–24`；违反 B-C7 和 §7.3。

   Tooltip 的触发节点是外层不可聚焦的 `span`，实际焦点位于内部 RouterLink。浏览器实测在 2025 南京榜单中聚焦有 OI 记录的选手姓名并等待 500 ms，Tooltip 数量为 **0**；鼠标悬停同一链接则出现 **1** 个 Tooltip。现有 E2E 只检查悬停。

   应将可聚焦链接作为 Tooltip 的实际触发节点，或正确处理内部焦点进入，并补充键盘检查。

6. **[P2] 首页初始 JS 超出预算，完成记录的计量范围不完整。**

   位置：`web/src/app/App.vue:6`、`web/src/pages/home/HomePage.vue:7`；方案 §10.3、§13。

   在全新浏览器上下文直接进入首页，按实际资源记录收集 JS 文件并逐一 gzip：合计 **150,273 字节，约 150 KB（146.8 KiB）**。其中入口文件为 46,324 字节，motion 分块为 43,668 字节，其余还包括共享 UI、图标、查询层与首页分块。方案日志将约 46 KB 的入口文件与 120 KB 的“初始 JS”预算直接比较，遗漏了首次加载必须下载的共享文件。

   应以首页完整请求集合计算预算并继续优化初始依赖。ECharts 已正确延迟到 Analysis，属于已经完成的优化。Lighthouse 模拟 4G 的 LCP/交互指标仍未测量；现有“两帧耗时”测法发生在 300 ms 防抖完成前，无法证明筛选交互满足性能验收。

7. **[P2] 视觉回归没有接入 CI，若干必需的组件验收未落实。**

   位置：`web/tests/visual/baseline.mjs:1–2`、`web/playwright.config.js:5`、`.github/workflows/deploy.yml`。

   M6-T5 要求启用视觉比较，但当前脚本明确写着“截图仅作对比参考，不做像素断言”；现有测试中没有 `toHaveScreenshot` 或截图比较，CI 也不执行该脚本。已有截图只是参考材料，界面变化不会令检查失败。

   另外，单元测试目前只有 4 个文件、25 个纯函数/数据层用例；M2-T3、M3-T3、M5-T1 要求的共享状态、实体、ChartBox 组件测试未实现，M3-T1 的虚拟滚动行数测试也缺失。现有无障碍路由集合未覆盖 Player 页面，Analysis 只扫描默认总览，没有扫描其他 Tab 和队伍详情弹窗。应按计划补齐针对性覆盖，不能用 215 个通过的 E2E 代替这些验收项。

还有几项应记录的执行差异：

- M3-T1 规定基于 TanStack Table，当前 DataTable 使用自写排序与列模型，只接入了 TanStack Virtual；`@tanstack/vue-table` 虽已安装，源码没有使用。若接受这一实现，应记录为架构偏差。
- `web/src/pages/analysis/AnalysisPage.vue:106` 对 Tab 指示条的 `width` 做过渡，与 §8.1 禁止宽度动画冲突。动效测试只采样首页，未覆盖此处。
- “减少动效”开关只存在于 `MobileNavSheet`，桌面布局没有可访问的入口，未完整落实 M2-T2 的页眉开关。

按里程碑判断：M0 的业务安全网、M1 的主要基础设施、M2–M5 的页面迁移和 D1–D7 主路径已经完成；M1 的分层约束、M3/M5 的组件验证、M4 的并发与内存管理、M6 的性能/视觉/交互验收、M7 的最终收尾仍需补齐。建议先修复两个 P1，再处理缓存与可访问性问题，最后补齐预算和验证，之后更新完成记录。
