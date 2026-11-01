# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICPC/CCPC contest results visualization platform supporting multiple years (2020-2026). Static SPA with no backend — all data is pre-processed from xlsx files into JSON.

## Feature Docs

- **`docs/analysis-page.md`** — 数据分析页（`/:year/analysis`）专属文档：统计口径、计算函数一览、图表约定、已知坑、验证方法。改动该页前必读，勿重新通读代码。

## Commands

### Frontend (run from `web/`)
```bash
npm run dev       # Vite dev server on localhost:11451
npm run build     # Production build to web/dist/
npm run preview   # Preview production build
```

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

**接入新年份时必须按 `extract_players.py` → `extract_oi_records.py` → `convert_xlsx.py` 的顺序跑**：convert 在转换时按 `name@school` 把该年的 OI 记录嵌入队员，若该年还没有按年的 `oi_records.json`，会静默回退到根目录未按年份过滤的旧文件（现有年份都有按年文件，不受影响）。

`gen_trajectories.py` 消费的是 convert 的产物，且 convert 每次重跑会清空年份目录（仅保留 `oi_records.json`），所以它必须在 convert 之后运行；被清掉后分析页「轨迹分析」tab 会显示「暂不可用」，重跑即恢复。

## Architecture

### Frontend (`web/src/`)
- **Vue 3 Composition API** (`<script setup>`) + **Vite** + **Element Plus** (Chinese locale) + **ECharts** (tree-shaken via `use()`) + **Tailwind CSS 4**
- **Hash-based routing** (`createWebHashHistory`):
  - `/` → Home (year selection)
  - `/:year/` → YearHome (contest list for that year)
  - `/:year/contest/:id` → Contest detail
  - `/:year/summary` → Summary
  - `/:year/analysis` → Analysis (per-year statistics; see `docs/analysis-page.md`)
  - `/:year/school/:name` → School detail
  - `/:year/player/:name` → Player detail
  - `/:year/trajectory/:code` → Trajectory detail (player list of one 5-year medal trajectory, e.g. `b-g-g-n-n`; see `docs/analysis-page.md`)
  - `/announcement` → Announcement (global)
- Views are **lazy-loaded** via dynamic `import()` in `web/src/main.js`
- **No backend/API** — `web/src/utils/dataLoader.js` fetches static JSON from `web/public/data/` with in-memory caching
- `web/src/utils/formatters.js` contains submission parsing (`+1(170)` → solved, 2 attempts, 170 min), medal display, and school aggregation logic

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
- Element Plus is imported globally in `main.js` with Chinese locale (`zhCn`)
- Charts use ECharts with explicit component registration for tree-shaking
- No TypeScript, no ESLint, no test framework configured
- `v-model:visible` pattern for dialog visibility in components (e.g., `TeamDetail`)
- **Navigation links** must use `<router-link :to="...">` instead of `@click="router.push(...)"` to support Ctrl+click / middle-click to open in new tab. Only use `@click` for non-link interactions (e.g., opening dialogs, `router.back()`)
- **大榜单必须分页渲染**：`Contest.vue` 只把当前页（`PAGE_SIZE`）交给 `el-table`，筛选/搜索输入走 300ms 防抖。网络预选赛单场 2000+ 队，全量渲染会让每次筛选触发整表重渲染而明显卡顿；`RankTable.vue` 的选手 tooltip 仅对有 OI 记录的队员挂载（tooltip 实例数是渲染开销大头）。新增表格类页面沿用同一模式（参考 `Summary.vue`）
