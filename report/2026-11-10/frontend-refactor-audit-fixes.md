# 前端重构审查问题修复

对应审查：`report/2026-11-10/frontend-refactor-audit.md`（7 项问题 + 3 项执行差异）。

## 目标

按审查报告的优先级修复：先清 P1（lint 阻断、并发缓存串写），再处理 P2（Worker 缓存回收、分层规则失效、键盘可达、首页预算、视觉回归与组件验收），最后处理 3 项执行差异并更新完成记录。

## 实际改动

### P1-1 lint 失败

| 文件 | 改动 |
| --- | --- |
| `web/tests/e2e/po/app.js` | 删除未使用的 `escapeRe`（死代码） |
| `web/tests/unit/data-table.test.ts` | 测试名中的 `\ <` 改为 `无奖牌 <`，消除 `no-useless-escape` |

结果：`eslint .` 从 2 errors / 17 warnings → **0 errors / 9 warnings**。剩余 9 条均为 `vue/require-default-prop`，针对可选 TS prop（`tone?`、`width?`、`class?` 等），补默认值会改变 `undefined` 语义，故保留并记录。

### P1-2 scope=all 缓存串写

| 文件 | 改动 |
| --- | --- |
| `web/src/data/queries.ts` | `usePlayerRecords` 在 `await years.json` **之前**固定 `pageYear / playerName / playerSchool / scopeAll`，不再在 await 之后读 `toValue` |
| `web/tests/unit/queries.test.ts` | 新增回归测试：拦住 `years.json`，切换姓名，放行后断言原 queryKey 的调用仍用旧姓名 |

验证方式：把 `queries.ts` 临时还原成旧实现，测试失败（`toHaveBeenCalledWith` 未命中旧姓名）；恢复修复后通过。确认测试真的能复现审查描述的 bug。

### P2-3 Worker 缓存回收（M4-T5）

| 文件 | 改动 |
| --- | --- |
| `web/src/workers/year-client.ts` | 新增 `evictYearCacheExcept(keepYear)`，`client` 未创建时直接返回，避免为淘汰而实例化 Worker |
| `web/src/pages/player/PlayerPage.vue` | `onUnmounted` 按**目标路由**年份淘汰（保留下一页刚加载的数据）；`watch(allYears)` 在退回单年 scope 时淘汰 |
| `web/tests/unit/data.test.ts` | 新增 `evictExcept` 单测：淘汰后再次请求会重新下载 |

说明：`onUnmounted` 只在离开 player 路由时触发；同一路由内切换选手不会卸载组件，因此不会误删 scope=all 正在用的全量缓存。

### P2-4 分层规则失效

| 文件 | 改动 |
| --- | --- |
| `web/package.json` / `package-lock.json` | 新增 `eslint-import-resolver-typescript@4.4.5`（2026-06-01 发布，满足「两周以上」约定） |
| `web/eslint.config.js` | `import-x/resolver-next` 指向 `tsconfig.json`；新增 Worker 边界 zone（不得依赖 UI 层；`data` 只允许 `year-core / loaders / fetch-json / schemas`） |
| `web/tests/unit/layering.test.ts` | 用 ESLint Node API 对虚拟文件做 4 项规则验证 |

验证：`@/pages/home/HomePage.vue` 与 `../data/queries` 在 `src/domain/` 下现在都会报 `import-x/no-restricted-paths`；`@/data/year-core` 在 `src/workers/` 下不报错。

### P2-5 OI 提示键盘不可达

| 文件 | 改动 |
| --- | --- |
| `web/src/entities/player/PlayerLink.vue` | Tooltip 触发节点从不可聚焦的外层 `span` 改为 `RouterLink` 本身；☀️ 与 `sr-only` 留在链接外，链接无障碍名仍是选手姓名 |
| `web/tests/e2e/boards.spec.js` | 增加「悬停打开 → 移开鼠标断言关闭 → 聚焦再打开」断言 |

### P2-6 首页初始 JS 超预算

| 文件 | 改动 |
| --- | --- |
| `web/src/pages/home/HomePage.vue` | 卡片入场改用既有 `.animate-enter`（`--i` 交错），悬停/按下改 CSS `.card-press` |
| `web/src/app/App.vue` | 移除全局 `MotionConfig`，根组件只剩 `AppShell` |
| `web/src/pages/year/YearPage.vue` | `MotionConfig` 下沉到本页，`reducedMotion` 读 `usePrefsStore` |
| `web/src/shared/ui/SegmentedControl.vue` | 同上，`MotionConfig` 包住 ToggleGroup |

实测（全新浏览器上下文，逐文件 gzip）：**150,088 → 106,434 字节**（预算 120 KB）。motion 分块（约 43.5 KB）不再进入首页请求；YearPage / PlayerPage 仍按需加载。

### P2-7 视觉回归与组件验收

| 文件 | 改动 |
| --- | --- |
| `web/tests/e2e/visual.spec.js` | 新增 10 条路由的 `toHaveScreenshot` 像素断言 |
| `web/playwright.config.js` | 新增 `visual` 项目（1280×900、DPR 1）；其余项目 `testIgnore` 该 spec；`maxDiffPixelRatio: 0.001` |
| `web/tests/e2e/visual.spec.js-snapshots/` | 10 张 win32 基线 |
| `.github/workflows/deploy.yml` | 新增 `visual` job，并纳入 `build.needs` |
| `web/package.json` | `test:e2e` 显式排除 visual 项目；新增 `test:visual` |
| `web/tests/unit/components.test.ts` | 新增 8 项：实体原子（OrgTag / MedalText / ProblemCell / SchoolLink / PlayerLink）、DataTable 虚拟滚动、ChartBox、prefs 持久化 |
| `web/tests/e2e/quality.spec.js` | axe 覆盖新增 Player 页、Analysis 5 个 Tab、队伍详情弹窗 |

验证：把 `--primary` 临时改成红色后视觉用例**失败**（0.1% 阈值下），恢复后通过；确认不是「永远绿」的摆设。

### 顺带修复的真实缺陷

新增的弹窗 axe 扫描发现 `color-contrast` 13 处：白字在 `#67c23a` 上只有 2.24:1、在 `#f56c6c` 上 2.90:1。此前只扫页面不扫弹窗，所以漏掉。

| 文件 | 改动 |
| --- | --- |
| `web/src/shared/styles/tokens.css` | `--problem-solved` `#67c23a → #357a1e`（5.31:1）、`--problem-unsolved` `#f56c6c → #b83f3f`（5.50:1） |

图表里的 `#67c23a` 是数据色，未改（`options.ts` 与冻结参考实现保持一致）。

### 3 项执行差异

| 差异 | 处理 |
| --- | --- |
| DataTable 未用 `@tanstack/vue-table` | 在 `docs/frontend-refactor-plan.md` §13 记为架构偏差：排序/列模型自写，只接入 TanStack Virtual |
| AnalysisPage 过渡 `width` | `web/src/pages/analysis/AnalysisPage.vue` 去掉 `width` 过渡，只保留 `translate`（§8.1） |
| 桌面无「减少动效」入口 | `web/src/layouts/AppHeader.vue` 新增桌面按钮（`aria-pressed` + Tooltip），移动端抽屉开关保留 |

## 验证

| 检查 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint` | **0 errors**，9 warnings（均为可选 prop 的 `require-default-prop`） |
| `npm test` | 39 项通过（原 25 项） |
| `npm run test:golden` | 2020–2026 共 7 项通过 |
| `npm run build` | 通过 |
| `npm run verify:data` | 96 个文件一致，123.3 MB → 62.4 MB（-49.3%） |
| `npm run test:e2e` | 224 通过、44 跳过（原 215 / 35） |
| `npm run test:visual` | 10 项通过 |
| 首页初始 JS | 106,434 字节 gzip（预算 120 KB） |

## 遗留问题与未验证的假设

- **Linux 视觉基线缺失**：基线按平台保存，当前只有 `*-win32.png`。CI 的 `visual` job 在 Linux 上会因缺少基线而跳过（spec 内有显式 `test.skip` 与提示）。需在 CI 上跑一次 `npx playwright test --project=visual --update-snapshots` 并提交 `*-linux.png`，之后该 job 才真正拦截界面变化。
- **堆内存 90 秒验收未做**：本环境无法做 DevTools 堆快照。已用「生命周期调用 + 单测」替代证明淘汰路径存在，但「离开后 90 秒内释放」的实测数字仍未记录。
- **Lighthouse 4G 的 LCP/INP 未测**：Lighthouse 未安装。首页预算改用「完整请求集合逐文件 gzip」计量，比原先只比入口文件更接近真实。
- **9 条 lint 警告保留**：`vue/require-default-prop` 对可选 TS prop 是误报，补默认值会改变 `undefined` 语义，故不修。
- **视觉阈值 0.1%**：同平台渲染确定，0.1% 足以拦住改色/布局变化；若后续出现偶发抗锯齿抖动，可上调到 0.2%。
