# AGENTS.md

This file provides guidance for AI coding agents working in this repository.

## Project Overview

ICPC/CCPC contest results visualization platform supporting multiple years (2020-2026). Static SPA with no backend — all data is pre-processed from xlsx files into JSON.

## Feature Docs

- **`docs/frontend-refactor-plan.md`** — 前端重构计划（已执行完毕）：行为规格 `B-*`、已批准变更 D1–D7、进度日志。改动任何页面行为前对照其 §6。
- **`docs/analysis-page.md`** — 数据分析页（`/:year/analysis`）专属文档：统计口径、计算函数一览、图表约定、已知坑、验证方法。改动该页前必读，勿重新通读代码。

## Commands

### Frontend (run from `web/`)
```bash
npm run dev          # Vite dev server on localhost:11451
npm run build        # Production build to web/dist/（同时压缩 dist/data 下的 JSON）
npm run preview      # Preview production build
npm run typecheck    # vue-tsc（TS strict）
npm run lint         # ESLint（含分层导入约束）
npm test             # Vitest 单元测试
npm run test:golden  # 业务计算 golden 基线（7 个年份，逐字节比较）
npm run test:e2e     # Playwright（chromium + webkit + mobile；会自动 build + preview）
npm run verify:data  # 校验 dist/data 与 public/data 内容一致（build 之后）
```

数据更新（新年份/新赛区）后 golden 基线会失效：确认页面数字正确后，经仓库所有者同意再运行 `npm run gen:golden` 重新生成，勿手改 `tests/golden/__golden__`。

### Data Pipeline (run from project root)
Requires Python 3 with `openpyxl` and `pandas`.
```bash
python scripts/convert_xlsx.py         # xlsx → JSON in web/public/data/{year}/
python scripts/extract_players.py      # xlsx → players.json (unique school+name pairs)
python scripts/extract_oi_records.py   # matches raw.txt OI records to players → web/public/data/{year}/oi_records.json
python scripts/gen_trajectories.py    # contest JSONs → {year}/trajectories.json (analysis trajectory tab)
```

`convert_xlsx.py` is the main pipeline — it reads each xlsx file's "正式队伍" sheet and outputs per-contest JSON plus a `contests.json` index. Run it after adding or updating xlsx source files.

The pipeline also reads `xcpc/{year}/*.rank.json` snapshots from `rank.iccpc.cn`, via `scripts/iccpc_rank.py`. Keep their source URL and retrieval time. Only complete, single-group post-contest snapshots are supported; exclude starred and no-submission teams, ignore CE and submissions after first AC, and floor the summed penalty seconds to minutes. `extract_players.py` uses the same reader.

**接入新年份时必须按 `extract_players.py` → `extract_oi_records.py` → `convert_xlsx.py` 的顺序跑**：convert 在转换时按 `name@school` 把该年的 OI 记录嵌入队员，若该年还没有按年的 `oi_records.json`，会跳过 OI 嵌入并打印警告（不再回退到未按年份过滤的旧数据）。

`gen_trajectories.py` 消费的是 convert 的产物，且 convert 每次重跑会清空年份目录（仅保留 `oi_records.json`），所以它必须在 convert 之后运行；被清掉后分析页「轨迹分析」tab 会显示「暂不可用」，重跑即恢复。

## Architecture

### Frontend (`web/src/`)
- **Vue 3.5** (`<script setup lang="ts">`) + **TypeScript strict** + **Vite 8** + **Tailwind CSS 4** + **Reka UI**（shadcn-vue 风格组件在 `shared/ui/`）+ **ECharts 6**（`use()` 按需注册）+ **TanStack Vue Query / Table / Virtual** + **Pinia**（仅界面偏好）+ **motion-v**
- **分层**（ESLint 强制，只能向左依赖）：`domain` ← `data` ← `shared` ← `entities` ← `features` ← `pages` ← `layouts` ← `app`
  - `domain/` 纯 TS 业务逻辑（统计口径、筛选、分页、聚合、格式化），不依赖 Vue；golden 测试锁定
  - `data/` 获取与校验静态 JSON（Valibot）、Vue Query 组合式函数；`year-core.ts` 为整年加载/聚合核心
  - `workers/year.worker.ts` 在后台线程加载整年数据并聚合（Comlink），不支持 Worker 时回退主线程
  - `shared/` 通用组件（DataTable、Pager、FilterBar、AsyncState、ResultState…）、组合式函数、样式令牌
  - `entities/` 领域原子（SchoolLink、PlayerLink、OrgTag、ProblemCell、MedalText）
  - `features/` 业务组件（榜单表格、队伍详情、数据分析各 Tab 与图表 option、介绍弹窗）
  - `pages/` 路由页面（薄层），`layouts/` 外壳与导航，`app/` 入口、路由、Provider
- **Hash-based routing** (`createWebHashHistory`, `app/router/routes.ts`)，所有页面懒加载：
  - `/` → Home (year selection)
  - `/:year/` → YearHome (contest list for that year)
  - `/:year/contest/:id` → Contest detail（未知 id 显示「赛区不存在」）
  - `/:year/summary` → Summary
  - `/:year/players` → Players
  - `/:year/analysis` → Analysis (per-year statistics; see `docs/analysis-page.md`)
  - `/:year/school/:name` → School detail
  - `/:year/player/:name` → Player detail
  - `/:year/trajectory/:code` → Trajectory detail (player list of one 5-year medal trajectory, e.g. `b-g-g-n-n`; see `docs/analysis-page.md`)
  - `/announcement` → Announcement (global)
  - 其他路径 → 404（年份不在 2020–2030 的 `/:year/...` 仍重定向首页）
- **No backend/API** — static JSON under `web/public/data/`, fetched via `data/loaders.ts`；构建时压缩为无空白 JSON
- 页面过渡：View Transitions API（仅 Chromium 启用，`app/router/view-transition.ts`）；所有动画只动 `transform`/`opacity`，`prefers-reduced-motion` 与页眉「减少动效」开关下关闭
- 主题：亮/暗（`<html class="dark">`，跟随系统，可在页眉切换）；颜色一律使用 `shared/styles/tokens.css` 的令牌，文字色需满足 WCAG AA

### Data Model (per-contest JSON)
```
{ id, org, city_cn, name, sheets: { "正式队伍": [
  { rank, school, team, solved, penalty,
    problems: { A: { status, attempts, time }, ... },
    members: [{ name, oi: [...] }],
    unofficial, girl, medal, icpc_id }
] } }
```

### Data Pipeline (`scripts/`)
1. `convert_xlsx.py` — primary: xlsx → contest JSON files (supports multiple years)
2. `extract_players.py` — secondary: extracts unique (school, name) pairs across all years
3. `extract_oi_records.py` — enrichment: matches OI competition history from `raw.txt` to XCPC players per year, calculates expected grade in the XCPC year. Default window: college years 1–5; for 西安交通大学 and 中国科学技术大学 (XCPC school), extend to high school years 1–3 as well (college-year values -2–5). The exception is based on inferred XCPC-year grade, not the grade written in the OI award record.
4. `gen_trajectories.py` — post-processing: aggregates per-year contest JSONs into `{year}/trajectories.json` (5-year medal trajectories of the page year's medalists, window `[Y-4, Y]`, for the analysis page's trajectory tab). Runs after `convert_xlsx.py`, which wipes year dirs except `oi_records.json`.

### Key Data Files
- `web/public/data/years.json` — available years index
- `web/public/data/{year}/contests.json` — contest index per year
- `web/public/data/{year}/{contest_id}.json` — per-contest team data
- `web/public/data/{year}/oi_records.json` — OI history per player per year
- `web/public/data/{year}/trajectories.json` — precomputed 5-year medal trajectories for the analysis page (regenerate via `scripts/gen_trajectories.py`)
- `web/public/data/985.json` / `211.json` — university tier lists (global)
- `raw.txt` — source OI records (root level, not served to frontend)
- `xcpc/{year}/*.xlsx` — source contest result files

## Conventions

- All UI text is in **Chinese** — keep labels, tooltips, and column headers consistent
- Charts use ECharts with explicit component registration for tree-shaking（`features/analysis/charts/ChartBox.vue`）；option 构建器在 `charts/options.ts`，为纯函数并由 golden 测试覆盖
- 业务逻辑放 `domain/`，组件里不写统计/筛选口径；改动口径须同步更新 golden 基线（经所有者同意）
- `v-model:open` pattern for dialogs（`shared/ui/Dialog.vue`；`dismissible=false` 时只能用按钮关闭）
- **Navigation links** must use `<RouterLink :to="...">` instead of `@click="router.push(...)"` to support Ctrl+click / middle-click to open in new tab. Only use `@click` for non-link interactions (e.g., opening dialogs, `router.back()`). 整行可点击的表格：在首格放 RouterLink 并用 `::after` 撑满整行（见 `TrajectoryTab.vue`）。唯一例外是 canvas 图表数据点：通过 `ChartBox` 的 `linkResolver`，Ctrl/Cmd/Shift+点击与中键在新标签打开
- **大榜单必须分页或虚拟化渲染**：用 `shared/components/DataTable.vue` + `usePagedList`（Contest 每页 100、Summary/Players 每页 20）或 DataTable 内置虚拟滚动（超过 200 行自动启用）；搜索输入用 `useDebouncedRef` 300ms 防抖。`PlayerLink` 的 OI 提示仅对有 OI 记录的队员挂载（提示实例数是渲染开销大头）
- 新的加载态用 `AsyncState`（>120ms 才显示骨架、至少保持 300ms），多文件加载用 `LoadProgress`；错误文案沿用各页原文
- 新增依赖须精确锁版本，且选择发布两周以上的版本
