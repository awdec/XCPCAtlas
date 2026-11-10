# XCPCAtlas Frontend Refactor — Execution Plan for AI Agents

> **Audience:** AI coding agents that will carry out this refactor, one task at a time.
> **Status:** Executed 2026-11-10 (M0–M7). See the progress log in §13 for results and deviations. Written 2026-11-10 from a full read of `web/src` (commit `1ea95eb`).
> **Owner decisions** are recorded in §2; anything they do not cover is **not approved** (see §2.3).
> If this document and the code disagree about *current behaviour*, the code wins: stop and record the discrepancy in §14 instead of guessing.

---

## 0. How to use this document

1. Read §1–§5 in full before your first task. They are short and they hold all the rules.
2. Pick a task from §9 whose **Depends on** list is satisfied. Each task has an ID such as `M3-T4`.
3. Each task names its files, steps and a **Done when** checklist. The task is finished only when every box can be ticked and the verification in §11 passes.
4. When the task is finished, add a line to the progress log (§13): task ID, date, branch or commit, notes.
5. Do not start a later milestone while an earlier one has open P0 tasks. Tasks inside a milestone marked ⫽ can run in parallel.
6. Also read `AGENTS.md`, plus `docs/analysis-page.md` before touching anything under the analysis page. That second document is binding: how values are counted, chart conventions, known pitfalls, verification.

---

## 1. Hard rules (apply to every task)

| # | Rule |
|---|---|
| R1 | **Behaviour parity.** Every item in §6 must behave exactly as specified. The only intended changes are the six in §2.1. Visual restyling is approved; behaviour changes are not. |
| R2 | **No data-pipeline changes.** Do not edit anything in `scripts/`, `xcpc/`, `raw.txt`, `players.json` or `web/public/data/**`. Build-time JSON minification (§2.1 D6) runs on the build output only. |
| R3 | **Never push to `main`.** `main` deploys to GitHub Pages automatically (`.github/workflows/deploy.yml`). Work on milestone branches (`refactor/m0-safety-net`, `refactor/m1-foundation`, …). Push or merge only when the repo owner says so. |
| R4 | **All UI text is Chinese and copied verbatim** from the current code: labels, placeholders, headings, ⓘ help text, empty states, error messages. Never translate, shorten or rephrase. §6 quotes the strings that tests depend on. |
| R5 | **Port the domain logic, don't rewrite it.** Code moved into `src/domain/` must be a 1:1 translation to TypeScript: same branches, same ordering, same tie-breaking. Golden tests (M0) must stay byte-identical. |
| R6 | **Links are links.** Anything that navigates is a `<RouterLink>` (or a real `<a href>`), never `@click="router.push"`. This is a rule in AGENTS.md. The one exception is canvas chart points; see §6.10. |
| R7 | **Large tables are paginated or virtualized.** Never hand all rows of a large list to the DOM. This is a rule in AGENTS.md. |
| R8 | **Animations move only `transform` and `opacity`,** follow the tokens in §8.1, last 400 ms or less, and switch off under `prefers-reduced-motion`. |
| R9 | **Keep the hash URLs.** Hash history and `base: '/XCPCAtlas/'` stay, so existing shared links keep working. |
| R10 | **Don't break the build between tasks.** At the end of every task, `npm run build`, `npm run typecheck` (from M1 on) and the test suites must pass. |
| R11 | **Ask; don't invent.** If something in §6 is ambiguous or the code does something §6 doesn't mention, keep the code's behaviour and add a note to §14. |

---

## 2. Decisions

### 2.1 Approved changes (owner decisions, 2026-11-10)

| ID | Decision | Exact intended behaviour |
|---|---|---|
| D1 | **Remove the 120 ms pause** after each contest file on the Summary page | Files still load **one after another**. The counter `正在加载比赛数据（x / n）` and the percentage bar still run from 0 to n, advancing as each file arrives. Only the `wait(120)` goes away. |
| D2 | **Add a 404 page** | A catch-all route renders `NotFound`. A valid year with an unknown contest id shows a dedicated "赛区不存在" state. Exact rules in §6.12. |
| D3 | **School page: show `—` instead of `#Infinity`** | 最佳排名 shows `—` when no team has a truthy `rank`. This includes a school with teams that all lack a rank (today that shows `#Infinity`). |
| D4 | **Debounce Summary and Players text search** | The 搜索学校 / 搜索队伍 / 搜索队员 / 搜索选手 inputs update immediately on screen, but filtering uses the value 300 ms after the last keystroke, as Contest already does. Selects stay immediate. The page resets to 1 when a *debounced* or select value changes. |
| D5 | **Logo, trajectory rows and scatter points become real links** | Same destinations as today. Ctrl/Cmd+click and middle-click open a new tab. Details in §6.10. |
| D6 | **Minify JSON at build time** | `dist/data/**/*.json` is re-serialized without whitespace. Content must be identical to the source (checked by deep-equal in CI). Measured: 123.3 MB → 62.4 MB on disk (−49%); gzipped transfer 6.8 MB → 5.7 MB (−16%). The target is a **total** saving of at least 45%, not per file (tiny files such as `years.json` save less). |
| D7 | **Decode Player and School names once** (owner decision on Q2, 2026-11-10) | Player and School pages use `route.params.name` as the router already decoded it, with no extra `decodeURIComponent`. Links keep building URLs with `encodeURIComponent(name)`. Every real name in today's data (none contains `%`) resolves exactly as before; a name containing `%` now works instead of throwing `URIError`. |

### 2.2 Architecture decisions (made in the approved plan)

- Stay on **Vue 3.5 + Vite 8**, as a static SPA on GitHub Pages. No Next.js or Nuxt: pre-rendering is impossible for an open-ended set of player/school names, and SSR gains nothing when every page is a client-side view over static JSON.
- **TypeScript strict** (+ `noUncheckedIndexedAccess`).
- **TanStack Vue Query v5** for fetched data; **Pinia 3** only for UI preferences.
- **shadcn-vue (Reka UI)** replaces Element Plus. **TanStack Vue Table + Virtual** replace `el-table`.
- **ECharts 6 + vue-echarts stay** (no chart rewrite).
- **Animation:** View Transitions API (router-driven) + **motion-v** + CSS scroll-driven animations.
- **Web Worker (Comlink)** for whole-year loading and aggregation.
- **Valibot** schemas at the fetch boundary.
- **Vitest** (unit + golden tests), **Playwright** (E2E, visual, axe), **ESLint** flat config.

### 2.3 Not approved — do not do these

- Changing how values are counted or de-duplicated anywhere (see `docs/analysis-page.md` §3).
- Changing page sizes (Contest 100, Summary 20, Players 20) or the binary-offset pager.
- Making the Analysis or Summary contest loading parallel (it stays sequential, now without the pause).
- Adding scroll restoration or `scrollBehavior` (today there is none). The owner confirmed this on Q1 (§14).
- Changing the Player page's matching rules (name-only vs `name@school`).
- Turning invalid-year redirects into 404s (they still go to Home).
- Removing any emoji that carries meaning: `☀️` (OIer marker, explained on the 公告 page) and `🥇 金牌` / `🥈 银牌` / `🥉 铜牌` in labels and filter options. Purely decorative emoji in nav items and headings (🏠📊👤📈📅📢🏆) **may** become `lucide` icons, keeping the Chinese text.
- Adding features: search across years, export, i18n, accounts, and so on.

---

## 3. Current system reference (as of `1ea95eb`)

### 3.1 Files (all of `web/src`, ~3.7k LOC)

| File | Role | Moves to |
|---|---|---|
| `main.js` | App bootstrap, routes, year guard, Element Plus (zh-cn) | `app/main.ts`, `app/router/*` |
| `App.vue` | Header + nav + `<router-view>` | `layouts/AppShell.vue`, `AppHeader.vue`, `MobileNavSheet.vue` |
| `assets/styles/main.css` | Tailwind import, problem/medal/row colour classes, scrollbar | `shared/styles/*` |
| `utils/dataLoader.js` | Fetch + in-memory cache | `data/*` (Vue Query) |
| `utils/analysis.js` | Pure analysis calculations | `domain/analysis.ts` (1:1) |
| `utils/formatters.js` | `formatSubmission`, `problemClass`, `medalClass`, `medalText`, `aggregateBySchool` (unused) | `domain/formatters.ts`, `entities/*` |
| `utils/trajectory.js` | Tier text and classes, code ↔ tiers | `domain/trajectory.ts` |
| `views/Home.vue` | Year cards + intro dialog | `pages/home`, `features/intro-dialog` |
| `views/YearHome.vue` | Contest cards | `pages/year` |
| `views/Contest.vue` | Contest ranking: filters, pager, TeamDetail | `pages/contest`, `features/ranking` |
| `views/Summary.vue` | All teams in the year | `pages/summary`, `features/summary` |
| `views/Players.vue` | Per-player medal board | `pages/players`, `features/players-board` |
| `views/Player.vue` | One player's records (+ `scope=all`) | `pages/player`, `features/player-profile` |
| `views/School.vue` | One school's teams | `pages/school`, `features/school-profile` |
| `views/Analysis.vue` | Six-tab analysis container | `pages/analysis`, `features/analysis` |
| `views/TrajectoryDetail.vue` | Player list for one trajectory | `pages/trajectory`, `features/trajectory` |
| `views/Announcement.vue` | Five static announcements | `pages/announcement` |
| `components/RankTable.vue` | Contest ranking table | `features/ranking/RankTable.vue` |
| `components/TeamDetail.vue` | Team dialog | `features/ranking/TeamDetailDialog.vue` |
| `components/SchoolStats.vue` | **Dead code**, not imported anywhere | delete (M1) |
| `components/analysis/*.vue` | `AnalysisChart` + 6 tab components | `features/analysis/*` |

### 3.2 Data files (served from `web/public/data`, read-only)

- `years.json`: `[{ year: number, contest_count: number, total_teams: number }]`
- `{year}/contests.json`: `[{ id, name, org, city, teams, champion?: { school, team, solved, penalty } }]`
- `{year}/{id}.json`: `{ id, org, city_cn, name, sheets: { "正式队伍": TeamRow[] } }`. 72 contest files; each is 1.1–1.5 MB.
- `{year}/oi_records.json`: `{ "name@school": OIRecord[] }`
- `{year}/trajectories.json`: `{ window: [number, number], years: number[], total, first_best_tiers: {gold,silver,bronze}, all_time_best_tiers: {gold,silver,bronze}, rows: [{ tiers: Tier5[], count, players: [school, name][] }] }`
- `985.json`, `211.json`: `string[]`

Field facts, measured over all 24,632 team rows:

| Field | Type | Notes |
|---|---|---|
| `rank` | `number` | Always present. Code still guards with `rank || 999/9999` and `rank > 0`; keep those guards. |
| `org_rank` | `number \| null` | Shown as 校排 |
| `school`, `team` | `string` | |
| `solved`, `penalty` | `number` | |
| `problems` | `Record<letter, { status: 'solved'\|'unsolved'\|'none', attempts: number, time: number }>` | Keys are in source order |
| `members` | `{ name: string, oi: OIRecord[] }[]` | `oi` is always present (may be empty) |
| `medal` | `'Gold'\|'Silver'\|'Bronze'\|'Honorable'` or **missing** | Missing on 1,746 rows. Code compares lowercase with `includes`; keep that. |
| `unofficial`, `girl` | `boolean` | |
| `icpc_id` | `string \| null` | |
| `coaches` | `string[]`, optional | Present on 9,524 rows |
| `team_id` | `string`, optional | Present on 598 rows; not used by the UI |

`OIRecord = { 比赛: string, 奖项: string, 学校: string, 年级: string }`. Keys are Chinese; keep them.

---

## 4. Target stack

Pin **exact** versions in `package.json` (no `^`). Before adding a dependency, check the current stable version with `npm view <pkg> version`; record what you chose in §13.

| Concern | Package(s) | Notes |
|---|---|---|
| Framework | `vue@3.5.x`, `vue-router@4.x` | Keep `createWebHashHistory()` |
| Build | `vite@8.x`, `@vitejs/plugin-vue`, `@tailwindcss/vite@4.x`, `tailwindcss@4.x` | Keep `base: '/XCPCAtlas/'`, dev port 11451 |
| Types | `typescript@5.x`, `vue-tsc` | `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes: false` |
| Server state | `@tanstack/vue-query@5.x` | |
| Client state | `pinia@3.x` | theme, reduced-motion override, nothing else |
| Validation | `valibot@1.x` | |
| Worker | `comlink@4.x` | Vite `new Worker(new URL(...), { type: 'module' })` |
| UI primitives | `reka-ui@2.x` via shadcn-vue CLI (`npx shadcn-vue@latest init` / `add`) | Generated into `src/shared/ui/` |
| Tables | `@tanstack/vue-table@8.x`, `@tanstack/vue-virtual@3.x` | |
| Icons | `lucide-vue-next` | |
| Utilities | `@vueuse/core` | debounce, media queries, storage |
| Animation | `motion-v` | Motion for Vue |
| Charts | `echarts@6.x`, `vue-echarts@8.x` (kept) | |
| Tests | `vitest`, `@vue/test-utils`, `happy-dom`, `@playwright/test`, `@axe-core/playwright` | |
| Lint | `eslint@9` flat config, `eslint-plugin-vue`, `typescript-eslint`, `eslint-plugin-import` (layer rules) | |

New `web/package.json` scripts (names are fixed so tasks can refer to them):

```
dev, build, preview                       (unchanged meaning)
typecheck   → vue-tsc --noEmit
lint        → eslint .
test        → vitest run
test:golden → vitest run tests/golden
test:e2e    → playwright test
verify:data → node scripts/verify-data.mjs   (checks dist/data matches public/data; see M1-T6)
```

CI (`deploy.yml`): go to Node 22, and run `typecheck`, `lint`, `test`, `build` and `verify:data` before uploading the Pages artifact. E2E runs in a separate job and does not block deploy until M7.

---

## 5. Target architecture

### 5.1 Directory layout (`web/`)

```
src/
  app/            main.ts · App.vue · router/{routes.ts, guards.ts, view-transition.ts, depth.ts}
                  providers/{query-client.ts, motion.ts, theme.ts}
  layouts/        AppShell.vue · AppHeader.vue · MobileNavSheet.vue · PageContainer.vue
  pages/          home/ year/ contest/ summary/ players/ player/ school/ analysis/ trajectory/
                  announcement/ not-found/          ← thin: read route → compose features
  features/
    intro-dialog/ ranking/ (RankTable, TeamDetailDialog, RankingFilters)
    summary/ players-board/ player-profile/ school-profile/
    analysis/     tabs/*.vue · charts/options/*.ts (pure ECharts option builders)
    trajectory/
  entities/
    medal/        MedalBadge.vue · medal.ts (tier, label, tone)
    school/       SchoolLink.vue · SchoolTierTag.vue
    player/       PlayerLink.vue (+ OI hover card)
    problem/      ProblemCell.vue
  domain/         types.ts · analysis.ts · trajectory.ts · formatters.ts · filters.ts
                  pagination.ts · aggregate/{summaryRows,playerBoard,playerRecords,schoolTeams}.ts
  data/           fetch-json.ts · schemas.ts · query-keys.ts · queries.ts
  workers/        year.worker.ts · year-client.ts
  shared/
    ui/           shadcn-vue generated components
    components/   DataTable · Pager · FilterBar · StatCard · SectionCard · InfoHint · AsyncState
                  ResultState · LoadProgress · ChartBox · ErrorBoundary
    composables/  useDebouncedRef · usePagedList · useReducedMotion · useTheme · useSequentialLoad
    styles/       tokens.css · base.css · medal.css · view-transitions.css
tests/
  golden/         *.test.ts + __golden__/*.json
  reference/      verbatim copies of old inline view logic (see M0-T2)
  e2e/            *.spec.ts + po/ (page objects)
  visual/
scripts/          verify-data.mjs · gen-golden.mjs
```

### 5.2 Layering (enforced by `eslint-plugin-import/no-restricted-paths`)

`domain` ← `data` ← `shared` ← `entities` ← `features` ← `pages` ← `layouts` ← `app`

Imports only point **left** in this chain. `domain/` must not import `vue` or any browser API. `workers/` may import `domain/` and `data/fetch-json.ts` only.

### 5.3 Data flow

```
public/data/*.json
   ├─ single files (years, contests index, one contest, tags, oi, trajectories)
   │     → data/queries.ts (Vue Query, staleTime ∞) → page
   └─ whole-year sets (Summary, Players, School, Player, Analysis)
         → workers/year.worker.ts  (fetch sequentially or in parallel, parse, aggregate,
                                    report progress through a Comlink proxy)
         → Vue Query (queryFn = worker call, key includes year)
         → page-local refs (filters, page, dialog) → computed slice → DataTable
URL state (unchanged): :year :id :name :code ?tab ?scope ?school
```

---

## 6. Behaviour specification (tests and implementation must match)

IDs (`B-…`) are referenced by E2E tests. Strings in `code font` are exact.

### 6.1 Global shell
- **B-G1 Routes** (hash):
  - `/`, `/announcement`
  - `/:year/`, `/:year/contest/:id`, `/:year/summary`, `/:year/players`, `/:year/player/:name`, `/:year/school/:name`, `/:year/analysis`, `/:year/trajectory/:code`
  - Route names stay as in `main.js`: `Home`, `Announcement`, `YearHome`, `Contest`, `Summary`, `Analysis`, `TrajectoryDetail`, `School`, `Players`, `Player`. Add `NotFound`.
- **B-G2 Year guard:**
  - `parseInt(year)` that is NaN, below 2020 or above 2030 → redirect to `Home`.
  - The router is non-strict, so `/foo` and `/foo/` match `/:year/` and therefore redirect Home. They do **not** show the 404 page.
- **B-G3 Header title:** `${year} ICPC/CCPC 比赛结果` when the route has a year, otherwise `ICPC/CCPC 比赛结果`. Clicking it goes to `/` and it is a real link (D5).
- **B-G4 Navigation:**
  - Global items: `年份选择` → `/`, `公告` → `/announcement`.
  - Year items, shown only when the route has a year: `赛区列表` → `/${y}/`, `全部成绩` → `/${y}/summary`, `选手成绩` → `/${y}/players`, `数据分析` → `/${y}/analysis`.
  - An item is active when `route.path === item.path` exactly. On mobile (below `md`) the items move into a Sheet with the same items and order.
- **B-G5 Document title** stays `ICPC/CCPC 比赛结果` (no per-route titles yet).

### 6.2 Home (`/`)
- **B-H1** Heading `ICPC/CCPC 比赛结果`, sub-text `选择年份查看各赛区比赛结果`.
- **B-H2** While loading: a spinner, or a skeleton grid (the new design). If loading fails or returns no years: `暂无数据` (the error is only logged).
- **B-H3** One card per entry in `years.json`, in file order. Each card links to `/${year}/` and shows the year, `赛季`, `${contest_count} 个赛区`, `${total_teams} 支队伍` and `查看详情 →`.
- **B-H4 Intro dialog:**
  - localStorage key `xcpc_intro_seen_v1`; shown when the stored value is missing, 0 or not a number, or when `Date.now() - stored > 7*24*3600*1000`.
  - Title `网站说明`. The body is the exact `introText` from `Home.vue`, rendered with `white-space: pre-line`.
  - The **only** way to close it is the `知道了` button: no ✕, no Esc, no backdrop click, no swipe.
  - On close it writes `String(Date.now())`. If storage throws (read or write), the error is ignored silently and the dialog shows again next time.

### 6.3 Year home (`/:year/`)
- **B-Y1** Heading `${year} 赛季各赛区比赛结果`, sub-text `共 ${n} 个赛区，点击卡片查看详情`. On load error n = 0 and the list is empty (no error panel).
- **B-Y2** Cards follow `contests.json` order and link to `/${year}/contest/${id}`.
  - Top stripe and tag by org: ICPC blue, CCPC green, anything else purple.
  - Champion block only when `champion` is present: `🥇 冠军`, school, team, `${solved} 题`, `罚时 ${penalty}`.
- **B-Y3** A year change (same component, new param) reloads the data.

### 6.4 Shared filtering and pagination (Contest, Summary, Players)
- **B-F1 Text search:** `value.trim().toLowerCase()`, substring match against the lowercased field. An empty query skips that filter.
  - Contest/Summary: `搜索学校` (school), `搜索队伍` (team), `搜索队员` (any member name).
  - Players: `搜索学校`, `搜索选手` (name).
- **B-F2 Debounce** of 300 ms on text search: Contest today; Summary and Players after D4.
- **B-F3 School type** select (`学校类型`, options `985` / `211` / `其他`):
  - `985` → `set985.has(school)`
  - `211` → `set211.has(school) && !set985.has(school)`
  - `other` → in neither set
- **B-F4 OI count** select (`OI 人数`, `0 人`…`3 人`): keep teams where the number of members with `oi?.length` truthy **equals** N. A value of `0` is a valid filter; the empty string or null means "no filter".
- **B-F5 Order of filters** (results are the same either way, but keep it): Summary applies contest, then school, team, member, type, OI, medal. Contest applies school, team, member, type, OI.
- **B-F6 Reset to page 1** whenever any filter value used for filtering changes (debounced text or a select). Contest also resets to page 1 when the contest finishes loading.
- **B-F7 Pager:**
  - `totalPages = ceil(filtered / PAGE_SIZE)`.
  - Buttons are the set {cur} ∪ {cur ± 1, 2, 4, 8, 16 that fall inside [1, total]}, sorted ascending. There are no prev/next/first/last buttons. The current page is highlighted.
  - Shown only when the filtered list is not empty.
  - Text: Contest `每页 100 条，共 ${totalPages} 页`; Summary and Players `每页 20 条，共 ${filtered} 条，${totalPages} 页`.
  - Pure function `domain/pagination.ts#pageButtons(cur, total)`.
- **B-F8 Count text:** Contest `共 ${n} 支队伍`; Summary `共 ${n} 条记录`; Players `共 ${n} 位选手` (n is the filtered count).
- **B-F9 School tag** after a school name: red `985` if in the 985 set, otherwise orange `211` if in the 211 set, otherwise none.

### 6.5 Contest (`/:year/contest/:id`)
- **B-C1** Load the contest file and the school tags. Concurrent loads are race-safe: only the latest route's result is shown.
- **B-C2** Errors:
  - Fetch or parse failure: a warning result titled `加载失败`, sub-text `赛区数据加载失败，请稍后重试`.
  - **Unknown id** (D2): see §6.12.
- **B-C3** Header: contest `name` and an org tag (same colours as B-Y2).
- **B-C4** Table rows are only `sheets['正式队伍']` (or `[]`), PAGE_SIZE 100.
- **B-C5** Columns:
  1. `队排` = `rank`, pinned
  2. `校排` = `org_rank`
  3. `学校`: SchoolLink + B-F9 tag; truncated with an overflow tooltip
  4. `队伍`: a button that opens TeamDetail
  5. `选手1`, `选手2`, `选手3`: PlayerLink for `members[i]` if present
- **B-C6 Row tint by medal:** `medal.toLowerCase()` contains `gold` / `silver` / `bronze` → gold tint `#fdf6e3`, silver `#f4f4f5`, bronze `#fdf2e9`. Striped rows use `#faf0d4` / `#ebebec` / `#fae8d6`. Others get no tint. Dark mode uses equivalent token values.
- **B-C7 PlayerLink:**
  - Links to `/${year}/player/${encodeURIComponent(name)}`.
  - If `oi.length > 0`: show `☀️` after the name and a hover or focus card (300 ms delay) listing `${比赛} · ${奖项}` for every record, in order.
  - Mount the card **only** for players with OI records (performance rule from AGENTS.md).
  - Clicking a link inside a row must not trigger row-level handlers.
- **B-C8 TeamDetail dialog:**
  - Title `${school} — ${team}`.
  - Stats: `排名` `#${rank}`, `解题数` `solved`, `罚时` `penalty`.
  - Tags: medal tag with `medalText` (`🥇 金牌`, `🥈 银牌`, `🥉 铜牌`, or the raw medal string such as `Honorable`); `打星队伍` if `unofficial`; `女队` if `girl`.
  - `题目状态`: one cell per problem, in key order, showing the letter and `formatSubmission`:
    - solved: `+${attempts-1}(${time})` when attempts > 1, otherwise `(${time})`;
    - unsolved: `-${attempts}`;
    - none: `-`.
    - Colours: solved green `#67c23a`/white, unsolved red `#f56c6c`/white, none `#e4e7ed`/`#909399`.
    - Under solved cells: `${time}min / ${attempts}次`.
  - `队员`: member names. If `coaches?.length`: `教练: ${coaches.join(', ')}`.
  - Closes with ✕, Esc or a backdrop click (the normal dialog behaviour). Its content is destroyed on close.

### 6.6 Summary (`/:year/summary`)
- **B-S1** Heading `${year} 年全部成绩汇总`.
- **B-S2 Loading:**
  - school tags → contests index → each contest file **in index order, one after another**, updating the progress `x / n` (D1: no pause).
  - Display: a progress bar with percentage `round(x/n*100)` and the text `正在加载比赛数据（${x} / ${n}）`.
  - Error: `加载失败` / `数据加载失败，请稍后重试`. Filters and table are hidden while loading or after an error.
- **B-S3 Rows:**
  - For each contest in index order, copy its `正式队伍` rows and sort them by `medalOrder` (gold 0, silver 1, bronze 2, anything else 3), then by `(rank || 9999)`. Use a stable sort.
  - Row = `{ contestName, rank, school, team, members, medal }`.
- **B-S4 Filters:** B-F1/F3/F4 plus:
  - `比赛` select: distinct contest names in order of first appearance; matches `contestName ===`.
  - `奖项` select: `🥇 金牌`=gold, `🥈 银牌`=silver, `🥉 铜牌`=bronze, `其他`=other. `other` matches a missing medal **or** one that contains none of gold/silver/bronze.
- **B-S5 Columns:** `比赛名` (pinned), `排名`, `学校` (+tag), `队伍名` (plain text, no dialog), `选手 1`/`选手 2`/`选手 3` (PlayerLink), `奖项` (`🥇 金牌`/`🥈 银牌`/`🥉 铜牌`/raw string/`-` when missing).
- **B-S6 Row text colour:** the **whole row's text** is coloured by medal (gold `text-yellow-600` bold, silver `text-gray-500` bold, bronze `text-amber-700` bold). This is a text colour, not a background tint like Contest uses. Keep the difference.
- **B-S7** PAGE_SIZE 20; B-F7 pager.

### 6.7 Players (`/:year/players`)
- **B-P1** Heading `${year} 年选手成绩汇总`. Loading uses the same progress UI. Today all files load in parallel and the bar jumps from 0 to 100%; keeping parallel loading is fine.
- **B-P2 Aggregation** (port verbatim into `domain/aggregate/playerBoard.ts`):
  - key = `${school}\0${name}`; first-seen order is preserved.
  - Count every team row the player appears in:
    - medal lowercased contains `gold` → `gold++`, else `silver` → `silver++`, else `bronze` → `bronze++`;
    - else, if the medal is truthy → `honorable++`;
    - a missing medal counts nothing.
  - `oi` = the longest `members[].oi` array seen for that key (ties keep the first).
  - Final order: `gold` desc, `silver` desc, `bronze` desc (stable).
- **B-P3 Filters:** `搜索学校`, `搜索选手`, `学校类型`; `金牌 ≥`, `银牌 ≥`, `铜牌 ≥` (options `≥ 0`…`≥ 5`, meaning count ≥ N); `OI 奖项`: `有 OI 奖项` (oi.length > 0) / `无 OI 奖项`.
- **B-P4 Columns:**
  - `学校` (pinned, link + tag), `选手` (PlayerLink).
  - `🥇 金牌` (yellow bold when > 0, else gray), `🥈 银牌` (gray bold), `🥉 铜牌` (amber bold), `Honorable` (green bold).
  - The table area is at most 70vh high.
- **B-P5** PAGE_SIZE 20; B-F7 pager.

### 6.8 Player (`/:year/player/:name`)
- **B-PL1 Name (D7):** the name is `route.params.name` exactly as the router decoded it. No second `decodeURIComponent`. `/#/2025/player/%E5%BC%A0%E4%B8%89` → `张三`; a name with a literal `%` (link built with `encodeURIComponent`) round-trips correctly.
- **B-PL2 Mode:**
  - `allYears = query.scope === 'all'`.
  - `school = allYears && typeof query.school === 'string' ? query.school : ''`.
- **B-PL3 Loading:**
  - Years = all years from `years.json` if `allYears`, otherwise `[year]`.
  - Load every contest of those years, plus `oi_records.json` **for the page year only**.
  - Race-safe. Error text: `选手数据加载失败，请稍后重试`.
- **B-PL4 ICPC records:**
  - Include every team row where (`school` is empty or `t.school === school`) and some member has `name ===` the player name.
  - Record = `{ year, contest name, contestId, school, team, rank, solved, penalty, medal }`.
  - Sort by year asc, then `(rank || 999)`.
- **B-PL5 OI records:**
  - For each entry `[key, records]` in `oi_records.json` order: skip unless `key.split('@')[0] === name`; if a school is set, also skip unless `key === name@school`.
  - Add records, de-duplicated by `${比赛}|${奖项}`.
- **B-PL6 UI:**
  - Heading = name. If `allYears`, sub-text `${school} · 历年 ICPC/CCPC 获奖记录` (the school part only when a school is set).
  - Toggle `ICPC/CCPC (${n})` / `OI 奖项 (${m})`; default `icpc`.
- **B-PL7 ICPC table:**
  - `#` (index), `赛区` (link `/${row.year}/contest/${contestId}`, prefixed `${year} 年 ` when `allYears`), `学校` (link `/${row.year}/school/...`), `队伍`, `排名`, `解题`, `罚时`, `奖牌`.
  - `奖牌` shows the `MEDAL_LABELS[medalTier(medal)]` text in that tier's colour (gold `#e6a23c`, silver `#909399`, bronze `#b3703c`, iron `#6b7280`). A missing medal shows `铁牌`.
- **B-PL8 OI table:** `#`, `比赛`, `奖项`, `年级`, `学校`.
- **B-PL9** An unknown name is **not** a 404: it shows the empty tables.

### 6.9 School (`/:year/school/:name`)
- **B-SC1** Name = `route.params.name`, decoded once by the router (D7, same as B-PL1). Load school tags and all contests of the year.
- **B-SC2 Teams:** rows with `t.school === name`, each tagged with the contest name, sorted by `(rank || 999)`. Error text: `学校数据加载失败，请稍后重试`.
- **B-SC3 Stats:**
  - `参赛队伍: ${count}`.
  - `最佳排名`: `#${min rank}` if any team has a truthy rank, otherwise `—` (**D3**).
  - Rule: `min(rank || Infinity)`; Infinity or no teams → `—`.
- **B-SC4 Table:** `比赛名` (pinned), `排名`, `学校` (link + tag), `队伍` (button → TeamDetail), `选手1`, `选手2`, `选手3` (PlayerLink). Row tint as in B-C6.
- **B-SC5** An unknown school is **not** a 404: it shows the heading, `参赛队伍: 0`, `最佳排名: —` and an empty table.

### 6.10 Analysis (`/:year/analysis`)
All of `docs/analysis-page.md` §1, §3, §5 and §6 applies. Key points:
- **B-A1** Heading `📈 数据分析` (the emoji may become an icon; the text stays).
  - Tabs, in order: `总览`(overview), `赛站分析`(region), `选手分析`(players), `轨迹分析`(trajectory), `OIer 分析`(oier), `学校分析`(school).
  - Active tab = `?tab` if valid, otherwise `overview`. Switching tabs calls `router.replace({ query: { ...query, tab } })`, so no history entry is added.
  - Back and forward restore the tab.
- **B-A2 Loading:**
  - school tags → contests index → contest files **in order, one at a time**, with progress `x / n` (there was never a pause here).
  - Then `buildYearDataset`.
  - Error: `加载失败` / `数据加载失败，请稍后重试`.
  - `trajectories.json` loads **at the same time, without blocking**. If it fails, only the trajectory tab shows `轨迹数据暂不可用`, and PlayersTab shows `第一次最高获奖数据暂不可用`.
- **B-A3** Tab content and charts exactly as in the current components. That means the same option objects: series order, colours, stacking (gold on top), tooltip formatters, `yAxis.inverse`, legend data, label formatters and heights.
  - Port option builders unchanged into `features/analysis/charts/options/*.ts`; golden-snapshot their output (M0-T3).
  - The new design may restyle cards around the charts, but not the chart options. The one allowed exception is theme colours for **non-data** elements in dark mode (axis, grid, text).
- **B-A4** Every ⓘ help text is copied verbatim (PlayersTab ×5, OIerTab ×1).
  - Region selects: OIer tab `全部赛区` (clearable, null = all); Region tab `选择赛站` (defaults to the first region).
- **B-A5 Scatter click (D5):**
  - A plain left click on a data point navigates to `/${year}/player/${encodeURIComponent(name)}`.
  - Ctrl/Cmd/Shift + click, or a middle click, opens `router.resolve(sameLocation).href` in a new tab (`window.open(href, '_blank', 'noopener')`).
  - Read modifiers from `params.event.event`. For the middle button, listen to `chart.getZr().on('mouseup')` with `event.event.button === 1` on a data element. Best effort; document the result in §13.
  - Clicking empty space does nothing.
- **B-A6 Trajectory table:**
  - Columns `第一年`…`第五年` plus `选手数`. Every column sorts through 3 states: asc → desc → original.
  - Year columns compare by `none 0 < iron 1 < bronze 2 < silver 3 < gold 4`. Ties keep JSON order (stable sort).
  - Tier glyphs `金 银 铜 铁 \` with the `TIER_CLASS` colours.
  - **Each row is a real link (D5)** to `/${year}/trajectory/${tiersToCode(tiers)}`. Build it as a `RouterLink` in the first cell, stretched over the whole row with an `::after` overlay.
    - Its accessible name: `查看轨迹 ${glyphs joined by space} 的选手名单`.
    - Sorting clicks on the header must not navigate.
- **B-A7** Description texts in TrajectoryTab and TrajectoryDetail, including the `rangeText` rule (`2021–2025`, or `2018–2022（实际数据 2020–2022）`), are verbatim.

### 6.11 Trajectory detail (`/:year/trajectory/:code`)
- **B-T1** Back link `← 返回数据分析` to `{ name: 'Analysis', params: { year }, query: { tab: 'trajectory' } }`.
- **B-T2 States, in this order:**
  1. loading;
  2. trajectories failed → `加载失败` / `轨迹数据暂不可用`;
  3. invalid code → `轨迹编码无效` / `URL 中的轨迹格式不正确`;
  4. row not found → `未找到该轨迹` / `该轨迹人数为 0 或数据已更新`;
  5. content.

  A code is valid when it has exactly 5 parts joined by `-`, each in `g s b i n`. These states stay as they are; they are **not** the 404 page.
- **B-T3 Content:** heading `轨迹选手名单`, the description, a tier strip (`第一年`…`第五年` + `选手数`), and a table with `学校` / `姓名`.
  - Each 姓名 links to `{ name: 'Player', params: { year, name }, query: { scope: 'all', school } }`.
  - Virtualize the table when there are more than 200 rows (the biggest row today has about 800 players).

### 6.12 404 and not-found states (D2)
- **B-N1** Catch-all route `/:pathMatch(.*)*` → `NotFound` page.
  - Heading `页面不存在`, sub-text `您访问的页面不存在或已被移除`.
  - Links: `返回首页` (`/`) and `查看公告` (`/announcement`).
  - Reached only by paths that match no other route, e.g. `/#/2025/unknown`, `/#/2025/contest`, `/#/a/b/c/d`.
  - B-G2 still runs first for anything that matches a year route.
- **B-N2 Unknown contest id with a valid year:**
  - The Contest page checks the id against the year's `contests.json`.
  - If it's missing: a result titled `赛区不存在`, sub-text `${year} 赛季没有该赛区`, and a link `返回赛区列表` to `/${year}/`.
  - Do not rely on the HTTP status: Vite's dev server may answer a missing file with `index.html` and status 200.
- **B-N3** Unknown player, school or trajectory names keep their current behaviour (B-PL9, B-SC5, B-T2). A year inside 2020–2030 that has no data (e.g. `/#/2027/`) is **not** a 404 (owner decision on Q3): it keeps its current behaviour, where the fetch fails and the page shows its own empty or error state.

### 6.13 Announcement (`/announcement`)
- **B-AN1** Heading `📢 公告`, then five cards. Their titles and contents are copied verbatim from `Announcement.vue`, including leading spaces after `\n`, rendered with `white-space: pre-line`. Move them into `pages/announcement/content.ts` unchanged.

---

## 7. Design system

### 7.1 Colour tokens (`shared/styles/tokens.css`, Tailwind 4 `@theme`)
The light-mode values for **data colours are fixed** (they are part of the business rules):

| Token | Light | Used in |
|---|---|---|
| `--medal-gold` | `#e6a23c` | charts, Player medal text |
| `--medal-silver` | `#909399` | |
| `--medal-bronze` | `#b3703c` | charts (`MEDAL_COLORS`) |
| `--medal-bronze-text` | `#c0875a` | old `.medal-bronze` text class (TeamDetail tag) |
| `--medal-iron` | `#dcdfe6` | charts; Player text uses `#6b7280` |
| `--row-gold/silver/bronze` | `#fdf6e3 / #f4f4f5 / #fdf2e9` | B-C6 |
| `--row-*-striped` | `#faf0d4 / #ebebec / #fae8d6` | B-C6 |
| `--problem-solved/unsolved/none` | `#67c23a / #f56c6c / #e4e7ed (+ #909399 text)` | B-C8 |
| `--oi-0..3` | `#dcdfe6 #a0cfff #409eff #1d6fd8` | OIer charts |
| `--heat-0..3` | `#f3f7fd #b3d1f5 #6ba3e8 #2f6fce` | migration heatmap |
| `--org-icpc/ccpc/other` | blue-500 / green-500 / purple-500 (+100/700 tag pairs) | B-Y2 |

- **Dark mode:** a `.dark` class on `<html>`. It follows the system setting by default and can be overridden from a header toggle (stored with Pinia + localStorage under `xcpc_theme`).
  - Define dark values for surfaces and text. For medal, row and problem tokens, keep the hue and adjust lightness until text contrast reaches 4.5:1.
  - **ECharts data colours do not change in dark mode;** only the chart chrome (axis, grid, tooltip background) uses dark values, through registered `xcpc-light` / `xcpc-dark` themes.
- Neutral and brand colours follow the shadcn-vue defaults (zinc + blue primary). Font: `'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif`, with `font-variant-numeric: tabular-nums` in tables and stat cards.

### 7.2 Layout and responsiveness
- Mobile first. Breakpoints: Tailwind defaults. Content max-width: `max-w-7xl`.
- Below `md`: nav goes into a Sheet; filter bars become a 2-column grid; dialogs go full screen below `sm`.
- Tables: horizontal scroll inside their container with the first column pinned; nothing else on the page scrolls horizontally at 360 px.
- Replace every fixed px width from the old code (tables 480/560/600/640/880, `width: 360px` progress, `8rem/11rem` selects) with `w-full max-w-[…]`. The max-width keeps the old value, so the desktop look is unchanged.
- Chart heights keep their px values on desktop (`360/340/420/460/300`, award charts `max(320, items*26+60)`). Below `sm` they may shrink to at least 280 px.

### 7.3 Accessibility (WCAG 2.2 AA)
- Every interactive element is reachable by keyboard and has a visible focus ring.
- Tooltips and hover cards also open on focus.
- ⓘ hints are `<button aria-label="说明">` with `aria-describedby`.
- Decorative emoji get `aria-hidden="true"`. `☀️` gets an `sr-only` label `OIer`.
- Charts use the ECharts `aria: { enabled: true }` option and a `role="img"` wrapper with an `aria-label` that names the chart heading.
- Add a skip link (`跳到主要内容`); `<html lang="zh-CN">` stays.
- Contrast is AA in both themes.

---

## 8. Animation specification

### 8.1 Tokens (`shared/styles/tokens.css` + `app/providers/motion.ts`)

| Token | Value | Use |
|---|---|---|
| `--dur-instant` | 80ms | hover/press colour, opacity |
| `--dur-fast` | 150ms | tooltip, select menu, toggle |
| `--dur-base` | 220ms | dialog, tab panel, page cross-fade |
| `--dur-slow` | 320ms | shared-element morph, sheet |
| `--stagger` | 30ms per item, first 8 items only | card grids |
| `--ease-standard` | `cubic-bezier(.2,0,0,1)` | default |
| `--ease-enter` | `cubic-bezier(.05,.7,.1,1)` | entering |
| `--ease-exit` | `cubic-bezier(.3,0,.8,.15)` | leaving; exit duration = 0.75 × enter |
| `spring.snappy` | `{ type:'spring', stiffness:420, damping:34 }` | tab indicator, layout |
| `spring.gentle` | `{ type:'spring', stiffness:220, damping:26 }` | dialog |
| distances | page slide 16px, element slide 8px, scale 0.96→1 | |

**Banned:** animating width, height, top, left, margin, padding, box-shadow (fade a shadow with a pseudo-element's opacity instead), or `filter: blur` on large areas. No animation of table rows during paging, filtering or sorting. No animation longer than 400 ms.

### 8.2 Route transitions (`app/router/view-transition.ts`)
- Feature-detect `document.startViewTransition`. Skip it when the API is missing, reduced motion is on, this is the first navigation, or **only the query changed** (Analysis tabs use their own animation).
- Route depth (`app/router/depth.ts`): Home 0, Announcement 0, NotFound 0, YearHome 1, Summary/Players/Analysis 2, Contest/School/Player/TrajectoryDetail 3.
- Transition type:
  - deeper → `forward` (old page fades out and moves −16px on x; new page fades in from +16px);
  - shallower → `back` (mirrored);
  - same depth, different route → `lateral` (cross-fade only);
  - same route, different `:year` → `swap` (8px vertical);
  - same route, other param → `lateral`.
- Implementation:
  - In `router.beforeResolve`, start the transition with `{ update, types: [type] }`. Inside `update`, resolve the navigation and wait for `router.isReady()` plus `nextTick()`.
  - On abort or error, call `transition.skipTransition()`.
  - Data loading must **not** block: the new page renders its skeleton inside the snapshot.
- Fixed names:
  - `view-transition-name: app-header` on the header, so it doesn't move.
  - Shared elements, applied only on the two pages involved:
    - year card `year-${y}` ↔ YearHome heading;
    - contest card `contest-${id}` ↔ Contest title block;
    - trajectory row `traj-${code}` ↔ TrajectoryDetail tier strip. Apply this name only to the clicked row, set just before navigating, so names stay unique.
- CSS lives in `shared/styles/view-transitions.css` using `:active-view-transition-type(forward)` and related selectors.

### 8.3 Loading
- `AsyncState` component with states `pending | error | empty | success`.
  - The skeleton appears only after 120 ms of waiting and then stays at least 300 ms (no flash).
  - Skeletons match the final layout: card grid; first 10 table rows at real row height; chart boxes at their real height. This keeps CLS below 0.05.
- `LoadProgress` for multi-file loads: a bar filled with `transform: scaleX(x/n)`, percentage text, and the exact `正在加载比赛数据（x / n）` caption.
- A global thin top progress bar appears when navigation plus the main query takes longer than 150 ms.
- Debounced search (D4): while a debounce is pending, the table body fades to `opacity: .6` and back to 1 when results update. There is no spinner.

### 8.4 Micro-interactions (motion-v)
- Year and contest cards enter staggered (y 8 → 0, opacity 0 → 1), lift 2px on hover, and press to scale 0.98.
- Analysis tab indicator uses `layoutId` with `spring.snappy`; the panel cross-fades with `--dur-base`.
- Overview stat cards count up over 600 ms, ease-out, with tabular numbers and the same suffix format (`fmtPct`). Under reduced motion the final value shows immediately.
- Dialogs scale and fade with `spring.gentle`; the mobile nav Sheet slides in.
- **The intro dialog keeps its closing rules** (B-H4): no swipe, Esc or backdrop close.
- Filter selects open and close with `--dur-fast`.
- ECharts: `animationDuration: 400`, `animationEasing: 'cubicOut'`. Set `animation: false` under reduced motion.

### 8.5 Scroll-driven animations (CSS, inside `@supports (animation-timeline: scroll())`)
- Header: the shadow pseudo-element fades in during the first 64px of scroll (`animation-timeline: scroll(root)`).
- Analysis section cards: opacity 0 → 1 and translateY 12px → 0 with `animation-timeline: view()` and `animation-range: entry 0% cover 20%`.
- Without support, everything is fully visible and static.

### 8.6 Reduced motion
- `@media (prefers-reduced-motion: reduce)`: set every `--dur-*` to `0.01ms` and disable scroll-driven keyframes.
- motion-v: `MotionConfig reducedMotion="user"`.
- No view transitions; ECharts `animation:false`; count-up shows the final value.
- A header toggle can force reduced motion on (Pinia, stored under `xcpc_reduced_motion`).

---

## 9. Milestones and tasks

Legend: **P0** must ship, **P1** core, **P2** polish. ⫽ = can run in parallel with the other ⫽ tasks in the same milestone.

### M0 — Safety net (P0). Branch `refactor/m0-safety-net`. **Tests are written against the current, unchanged app.**

**M0-T1 Test tooling** (P0)
- Steps:
  - Add Vitest, happy-dom, Playwright and @axe-core/playwright.
  - `playwright.config.ts`: webServer `npm run build && npm run preview -- --port 4173`, baseURL `http://localhost:4173/XCPCAtlas/`, Chromium + WebKit + a mobile viewport (Pixel 7).
  - Add the `test`, `test:golden` and `test:e2e` scripts.
- Done when: an empty test passes in each runner; the scripts appear in `package.json`.

**M0-T2 Reference implementations** (P0, ⫽)
- Copy the inline logic **verbatim** from today's views into `tests/reference/*.js`, as plain functions with the same code:
  - `summaryRows(allData)` from Summary `loadData`, minus fetching and the pause;
  - `playerBoard(contests)` from Players;
  - `playerRecords(contestYears, oi, name, school)` from Player;
  - `schoolTeams(contests, name)` and `schoolStats(teams)` from School;
  - every filter predicate block from Contest, Summary and Players;
  - `pageButtons`.
- Steps: add a header comment with the source file and line range of every copied block.
- Done when: the files import without errors in Node.

**M0-T3 Golden snapshots** (P0, depends on T2)
- `scripts/gen-golden.mjs` reads `public/data` for **all 7 years** and runs:
  - `buildYearDataset`, `computeOverview`, `computeRegionStats`, `computePlayerStats`, `computeOIerStats`, `computeOIAwardStats` (region `null` and every regionId × gold/silver/bronze), `computeSchoolStats`;
  - every chart option builder (extract them from the tab components into `tests/reference/chartOptions.js` verbatim, replacing `computed` with plain functions);
  - the reference functions from T2 for the year (Player for 5 fixed names per year: the first member of the first 5 contests' rank-1 teams, both with and without `scope=all` + school);
  - `codeToTiers` / `tiersToCode` round-trips for every trajectory row.
- Serialization:
  - Convert `Set` to a sorted array; skip functions (formatters inside options) but snapshot the formatter **output** for 3 sample `params` per chart;
  - write canonical JSON (sorted keys only where the source is a plain object map; **never** reorder arrays).
  - Output over 1 MB: store `{ sha256, length, head: first 50, tail: last 50 }`.
- Write to `tests/golden/__golden__/{year}/*.json`; add `tests/golden/*.test.ts` that re-run and compare.
- Done when: `npm run test:golden` passes on the current code, and the golden files are committed.

**M0-T4 E2E behaviour suite** (P0, ⫽ with T3)
- Page objects in `tests/e2e/po/` hold every selector, so that swapping the implementation later only changes the page objects. Prefer role, label and placeholder locators.
- One spec per §6 section, covering at least these IDs:
  - Global: B-G1–G4.
  - Home: B-H3, B-H4 (use `page.clock` to test the 6-day and 8-day cases, and `page.addInitScript` to make localStorage throw).
  - B-Y1–Y2.
  - B-F1–F9, on Contest `2025/nanjing` and Summary/Players 2025:
    - search `北京大学` in school;
    - OI = 0 and OI = 3;
    - type 211 excludes 985;
    - pager button sets on pages 1, 5 and the last page;
    - count text.
  - Contest: B-C5–C8 (open the dialog for rank 1; check problem cell strings against the JSON).
  - Summary: B-S3 (first rows are gold, ordered by rank), B-S4 (`其他` medal filter).
  - Players: B-P2 sort, B-P3.
  - Player: B-PL6–PL8, both modes.
  - School: B-SC3.
  - Analysis: B-A1 (tab ↔ URL, back/forward), B-A2 (block `trajectories.json` with `page.route` → only that tab says `轨迹数据暂不可用`), B-A6 (3-state sort, row click → URL), B-A5 (real mouse click on a scatter point; see `analysis-page.md` §6.6).
  - Trajectory: B-T1–T3 (valid `2026/trajectory/b-n-n-n-n`, invalid `x`, not found `g-g-g-g-g` if absent).
  - Announcement: B-AN1.
- **D7:** a test that opens Player and School pages for a name containing `%` (route the data with `page.route` to a mocked contest) and expects the name in the heading. Also a test that a normal Chinese name still resolves.
- **Tests for D1–D5 and D7** are written now and marked `test.fixme` (they fail on old code). They are switched on in the milestone that delivers each change.
- Done when: every non-fixme test passes on the current code, in Chromium and WebKit.

**M0-T5 Visual and performance baseline** (P1, ⫽)
- Steps:
  - Playwright screenshots of every route at 1280 and 390 width → `tests/visual/baseline-old/`. These are for reference only; the new design will differ.
  - Record a Lighthouse run (Home, Contest, Summary, Analysis) and an INP trace (typing in Summary search) into §13.
- Done when: the numbers are logged in §13.

**M0-T6 CI** (P0)
- Steps:
  - Add a `test` job to `deploy.yml`: Node 22, `npm ci`, `npm test`, `npm run test:golden`.
  - E2E runs in a separate non-blocking job with Playwright browsers cached.
- Done when: the workflow passes on the branch, without deploying from that branch.

### M1 — Foundation (P0). Branch `refactor/m1-foundation`. Depends on M0.

**M1-T1 TypeScript + lint**
- Steps:
  - `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `allowJs: true` during the transition, path alias `@/` → `src/`).
  - `vue-tsc`, the ESLint flat config and the layer rules from §5.2.
  - Rename `main.js` → `main.ts` and `vite.config.js` → `.ts`.
- Done when: `typecheck` and `lint` pass; the app still runs.

**M1-T2 `domain/types.ts`**
- Steps: types for §3.2 (`Contest`, `TeamRow`, `Member`, `OIRecord`, `Problem`, `ProblemStatus`, `ContestIndexEntry`, `YearEntry`, `Trajectories`, `Tier`, `Tier5`, `SchoolTags`) plus `YearDataset`, `DatasetTeam` and `DatasetPlayer` from `analysis.js`.
- Done when: the types compile and the M1-T3 port uses them.

**M1-T3 Port `domain/`** ⫽
- Steps:
  - `analysis.ts`, `trajectory.ts`, `formatters.ts` (drop the unused `aggregateBySchool`).
  - `filters.ts`: one source for B-F1, B-F3, B-F4 and the B-S4 medal filter.
  - `pagination.ts`.
  - `aggregate/*.ts` ported from `tests/reference`.
  - Old `utils/*.js` become re-export shims so the existing views keep working.
- Done when: the golden tests, pointed at the **new** modules (switch the import in the test files), are byte-identical.

**M1-T4 Data layer**
- `data/fetch-json.ts`: throws `Error('加载失败 (${status}): ${url}')` on a non-2xx response; checks `content-type` includes `json`, otherwise throws, so the dev server's HTML fallback is caught.
- `data/schemas.ts`: Valibot schemas. Validate fully for `years`, `contests` index and `trajectories`. For contest files validate only the top level plus the first row in production, and everything in dev.
- `query-keys.ts`: `['years']`, `['schoolTags']`, `['contests', y]`, `['contest', y, id]`, `['oi', y]`, `['trajectories', y]`, `['year-set', kind, y, …args]`.
- `queries.ts`: composables. Client defaults: `staleTime: Infinity`, `retry: 1`, `refetchOnWindowFocus: false`.
  - `gcTime`: 10 min for single files; 60 s for `year-set` from a non-current year.
- Done when: unit tests with mocked fetch cover dedup (two concurrent `schoolTags` calls → one fetch), error text and the HTML fallback.

**M1-T5 Delete dead code**
- Remove `components/SchoolStats.vue`.
- Done when: the build passes.

**M1-T6 JSON minification (D6)**
- Steps:
  - A Vite plugin (`vite-plugins/minify-data.ts`) in `closeBundle` walks `dist/data/**/*.json` and does `JSON.stringify(JSON.parse(text))`. Write UTF-8; Chinese stays unescaped.
  - `scripts/verify-data.mjs`:
    - for every file in `public/data`, check the file exists in `dist/data` and that `deepStrictEqual(parse(src), parse(dist))` holds;
    - print the total byte sizes;
    - exit 1 if any file differs or the total saving is below 45%.
  - Add both to CI after `build`.
- Done when: `verify:data` passes and reports about 123 MB → about 62 MB.

**M1-T7 Tokens and base styles**
- Steps:
  - `tokens.css` (§7.1, §8.1), `base.css`, `medal.css` (replaces the colour classes in `main.css`, keeping the class names until M7).
  - shadcn-vue `init` (style: new-york, base colour zinc, CSS variables on).
- Done when: the old UI looks unchanged.

### M2 — Shell and routing (P0). Depends on M1.

**M2-T1 Typed router**
- Steps:
  - `routes.ts` with the same paths and names, plus the `NotFound` catch-all.
  - `guards.ts` with the B-G2 logic.
  - `depth.ts`.
- Done when: the B-G1/G2 E2E tests pass; `/#/2025/unknown` shows NotFound (switch on that fixme).

**M2-T2 AppShell**
- Steps:
  - `AppHeader` (logo as a RouterLink, D5), desktop nav, `MobileNavSheet`, theme toggle, reduced-motion toggle, skip link.
  - `PageContainer`.
  - Put `ErrorBoundary` (`onErrorCaptured`) around `<RouterView>`. It shows a `ResultState` titled `页面出错了` with a `重新加载` button that calls `router.go(0)`.
- Done when: B-G3/G4 pass at 1280 and 390 width; D5 logo test (Ctrl+click → new page) is switched on and passes.

**M2-T3 Shared state components** ⫽
- `ResultState` (icons: warning/info; title; sub-title; optional actions), `AsyncState`, `LoadProgress`, `Skeleton` variants, `InfoHint`, `SectionCard`, `StatCard`.
- Done when: they have Vitest component tests.

**M2-T4 View transitions + motion provider** ⫽
- Implement §8.2, §8.6 and the motion-v config.
- Done when: in Chromium, navigating Home → YearHome animates and query-only changes don't; under `reducedMotion: 'reduce'` (Playwright `emulateMedia`) there are no `::view-transition` pseudo-elements.

**M2-T5 NotFound page**
- Build B-N1.
- Done when: the 404 E2E test passes.

### M3 — Table system and simple pages (P1). Depends on M2.

**M3-T1 `DataTable`**
- Built on TanStack Table. Props: `columns`, `data`, `rowTone(row)`, `rowClass(row)`, `maxHeight` (default `70vh`), `stickyHeader`, `pinFirstColumn`, `striped`, `bordered`, `virtualize` (on automatically when there are more than 200 rows), `emptyText`, `caption` (sr-only).
- Sorting: 3-state, with custom `sortingFn`, stable.
- Overflow cells: truncate and show a tooltip on hover or focus.
- Done when: unit tests cover 3-state sort stability (port the trajectory sort cases) and virtualization row counts.

**M3-T2 `Pager` + `usePagedList` + `useDebouncedRef` + `FilterBar`** ⫽
- B-F6–F8 as reusable pieces.
- Done when: unit tests cover reset-on-change and the button sets.

**M3-T3 Entity atoms** ⫽
- `MedalBadge` (variants `tag`, `text`, `summary-row`), `SchoolLink`, `SchoolTierTag`, `PlayerLink` (B-C7), `ProblemCell` (B-C8).
- Done when: they have component tests.

**M3-T4 Announcement + Home + intro dialog**
- Build B-AN1, B-H1–H4. Cards stagger in (§8.4).
- Done when: the E2E tests pass.

**M3-T5 YearHome**
- Build B-Y1–Y3. Hovering or focusing a contest card for 120 ms prefetches `['contest', y, id]`.
- Done when: the E2E tests pass.

**M3-T6 Contest + TeamDetailDialog**
- Build B-C1–C8 and B-N2. Page size 100 with the debounce. Remove the old `views/Contest.vue`, `RankTable.vue` and `TeamDetail.vue` once the new ones are in.
- Done when: the E2E tests pass; the B-N2 fixme is switched on and passes; INP when typing in contest search is under 200 ms.

### M4 — Whole-year pages (P1). Depends on M3.

**M4-T1 Year worker**
- `workers/year.worker.ts` exposes, through Comlink:
  - `loadYear(year, { sequential, onProgress })`: fetch the index, then the files in order, then return the contests;
  - `summaryRows(year, onProgress)`;
  - `playerBoard(year)`;
  - `schoolTeams(year, name)`;
  - `playerRecords(years, pageYear, name, school)`;
  - `yearDataset(year, onProgress)`.
- Requirements:
  - The worker keeps its own in-memory cache of parsed contests, keyed like the old `dataLoader`.
  - Every method uses only `domain/` functions.
  - `year-client.ts` wraps it as Vue Query `queryFn`s and falls back to the main thread if `Worker` isn't available.
- Done when: golden equality holds for the worker outputs on all years.

**M4-T2 Summary**
- B-S1–S7 with **D1** (sequential loading, no pause) and **D4** (debounce).
- Done when: the E2E tests pass with the D1/D4 fixmes switched on; the D1 test checks the progress text reaches `（n / n）` and that no 120 ms gaps occur (time the steps with mocked fast responses).

**M4-T3 Players** ⫽
- B-P1–P5 with **D4**.
- Done when: the E2E tests pass.

**M4-T4 School** ⫽
- B-SC1–SC5 with **D3** and **D7**.
- Done when: the E2E tests pass, including a mocked school whose teams all lack a rank → `—`, and the D7 fixme for School is switched on and passes.

**M4-T5 Player** ⫽
- B-PL1–PL9 with **D7** (switch on the Player D7 fixme). For `scope=all`, use the worker with all years; contest `year-set` for non-current years has `gcTime` 60 s.
- Done when: the E2E tests pass for both modes; the heap after visiting a `scope=all` page and going back is released within 90 s (check with a DevTools heap snapshot; note the result in §13).

### M5 — Analysis (P1). Depends on M4. Re-read `docs/analysis-page.md` before starting.

**M5-T1 ChartBox**
- Replaces `AnalysisChart`. Same props (`option`, `height`) and the same `@click` forwarding.
- Adds:
  - the registered `xcpc-light` / `xcpc-dark` themes;
  - `aria`;
  - a skeleton until the first render;
  - a ResizeObserver;
  - reduced motion;
  - the D5 modifier and middle-click handling as an opt-in `linkResolver(params) → RouteLocation`.
- Keep the same `use([...])` registrations.
- Done when: it has component tests.

**M5-T2 Option builders** ⫽
- Move every chart option into `features/analysis/charts/options/*.ts` as pure functions `(stats) => EChartsOption`, unchanged.
- Done when: golden snapshots (M0-T3) are identical.

**M5-T3 Analysis page + tabs**
- B-A1–A4. Reka Tabs, controlled by the URL.
  - A panel mounts on its first visit and stays mounted afterwards, which fixes `analysis-page.md` §6.4.
  - Dataset comes from `yearDataset` in the worker with progress; trajectories come from their own query.
- Ported tabs: Overview, Region, Players, Trajectory, OIer, School. Keep the existing component split.
- Done when: the E2E tests pass; doc §7 checks 1–5 pass. Record the 2025 benchmark numbers in §13.

**M5-T4 Trajectory row links + scatter links (D5)**
- B-A5, B-A6.
- Done when: the D5 fixmes for these are switched on and pass (middle-click on a row opens a new tab; Ctrl+click on a scatter point opens a new tab).

**M5-T5 TrajectoryDetail**
- B-T1–T3 with a virtualized table and the shared-element tier strip.
- Done when: the E2E tests pass.

### M6 — Animation and polish (P2). Depends on M5.

- **M6-T1** Shared-element names (§8.2), stagger, count-up and scroll-driven effects (§8.4, §8.5).
- **M6-T2** Dark-mode pass over every page and chart theme; check contrast.
- **M6-T3** Accessibility audit: axe in E2E for every route in both themes → 0 serious or critical issues; keyboard-only walkthrough of §6.
- **M6-T4** Performance pass toward §10 budgets: route chunks, keep ECharts only in the analysis chunk, preload the `years.json` fetch on Home.
- **M6-T5** New visual baseline screenshots → `tests/visual/baseline/`; switch on the visual comparison in CI.

### M7 — Cleanup and docs (P2). Depends on M6.

- **M7-T1** Remove Element Plus, `@element-plus/icons-vue`, the old `utils/` shims, the old `main.css` classes, and `allowJs`.
- **M7-T2** Update `AGENTS.md`:
  - stack, commands, the table and pagination convention (now `DataTable` + `Pager` / virtualization);
  - the link rule including the scatter exception;
  - the new scripts.

  Update `docs/analysis-page.md`: the file map (§2), and mark pitfalls §6.4, §6.5 and §6.8 as obsolete (they were Element Plus specific). Keep everything about how values are counted.
- **M7-T3** Make E2E a required check in CI.
- **M7-T4** Final run of the §10 acceptance criteria and a write-up in §13.

---

## 10. Acceptance criteria (whole refactor)

1. **Parity:** every §6 E2E test passes in Chromium and WebKit; golden snapshots are byte-identical for 2020–2026; the `docs/analysis-page.md` §7 benchmarks match.
2. **Approved changes:** each of D1–D7 has a passing E2E or CI check.
3. **Performance** (Lighthouse mobile, simulated 4G, mid-tier CPU):
   - Home LCP < 2.0 s;
   - CLS < 0.05 on every route;
   - INP < 200 ms for Contest search (400 rows), Summary search (~3.6k rows) and switching Analysis tabs;
   - initial JS < 120 KB gzipped; ECharts only in the Analysis chunk.
4. **Animation:** only `transform`/`opacity` animate (DevTools Animations panel); all motion gone under reduced motion; nothing over 400 ms.
5. **Accessibility:** axe 0 serious or critical in both themes; every action works by keyboard; AA contrast.
6. **Responsive:** at 360 px wide, only table containers scroll horizontally; nav, filters and dialogs are usable.
7. **Code:** `typecheck` and `lint` are clean; layer rules are enforced; no `any` in `domain/`, `data/` or `workers/`; Element Plus fully removed.
8. **Data:** `verify:data` passes; the source JSON is unchanged (`git diff --stat web/public/data` is empty).

---

## 11. Per-task verification (run before marking any task done)

```
cd web
npm run typecheck        # from M1 on
npm run lint             # from M1 on
npm test
npm run test:golden
npm run build
npm run verify:data      # from M1-T6 on
npm run test:e2e         # at least the specs for the pages you touched
```

Also, for any UI change, open the dev server (`npm run dev` → `http://localhost:11451/XCPCAtlas/#/…`) and look at the affected pages at 1280 and 390 width, in light and dark themes. For chart interaction, use real mouse input (`analysis-page.md` §6.6). For dev-server problems on Windows (stale modules, a stuck port), see `analysis-page.md` §6.2–6.3.

---

## 12. Risks and how to handle them

| Risk | Handling |
|---|---|
| Subtle behaviour drift | Golden + E2E first (M0). Port, don't rewrite (R5). If a test fails, fix the new code, not the test. Change a test only if it is proven wrong against the **old** app, and note it in §13. |
| `DataTable` differs from `el-table` (sort states, stable ties, pinned column) | Dedicated unit tests (M3-T1), with the trajectory table as the reference case |
| ECharts tooltip index pitfalls | Option builders moved verbatim + snapshotted (M5-T2) |
| View Transitions unsupported (older browsers) | Feature-detect; navigation works without animation |
| Worker cost of copying data back and forth | Return derived results only; send the year dataset once and cache it in the worker |
| Memory on `scope=all` | Short `gcTime`; the worker filters by name before returning |
| Vite dev server answers missing files with HTML and status 200 | Content-type check in `fetch-json.ts`; contest existence decided from the index (B-N2) |
| Accidental deploy | R3: never push to `main` |
| Data pipeline drift (new year added mid-refactor) | Re-run `gen-golden.mjs` only with the owner's approval; never edit golden files by hand |

---

## 13. Progress log (append-only)

| Date | Task | Branch / commit | Agent notes (versions chosen, measurements, deviations) |
|---|---|---|---|
| 2026-11-10 | Plan | — | Plan approved. Measured JSON: 123.3 MB raw → 62.4 MB minified; gzip 6.8 → 5.7 MB. |
| 2026-11-10 | Plan | — | Owner answered Q1–Q3: no scroll behaviour; decode names once (new D7); empty years are not 404. Checked: no school or player name in the data contains `%`. |
| 2026-11-10 | M0 | `refactor/m0-safety-net` | Vitest 5.1.0, Playwright 1.65.0, @axe-core/playwright 4.14.0. Golden baselines for 7 years from frozen reference copies (`tests/reference`); outputs over 20 KB stored as sha256. E2E: 150 passing on the old app (chromium + webkit), D-change tests written as `test.fixme`. Old-app baseline: entry JS 321 KB gzip, total JS 1.70 MB, Summary search frame 22.4 ms, CLS 0. |
| 2026-11-10 | M1 | `refactor/m1-foundation` | Pinned versions at least 2 weeks old. **Deviation:** TypeScript 5.9.3 instead of 7.x, because typescript-eslint 8.72 supports only `<6.1`. **Deviation:** Pinia 3.0.4 and @tanstack/vue-table 8.21.3 (the plan named those majors; newer majors exist). Chart option builders moved to `features/analysis/charts/options.ts` here (planned for M5-T2) so golden covers them from the start. Year worker (planned M4-T1) also built here. Golden byte-identical against new `domain/`. D6: 123.3 MB → 62.4 MB (-49.3%), 96 files, content identical. |
| 2026-11-10 | M2–M5 | `refactor/m2-shell` | All pages rebuilt on Reka UI + DataTable; Element Plus removed in the same branch (M7-T1 pulled forward) because no page used it any more. All 11 D-change tests switched on and passing. **Deviation (§8.2):** View Transitions are enabled only in Chromium: Playwright WebKit 27.2 crashed the whole page when a transition ran while the new page replaced its content asynchronously (bisected: crash disappears only when all view-transition animations are disabled). Other engines navigate without page transitions; motion-v and CSS animations still run. **Deviation:** Analysis tabs use Reka manual activation plus an explicit click handler, so tabs switch on click and on Enter/Space. Axe found real contrast failures in the first design pass; tokens were adjusted (light `--fg-faint` #9ca3af → #687080, `--primary` #2563eb → #1d4ed8, gold text #a16207 → #8f5606, 985/211 tag text darkened; dark `--primary` #4f8ff7 → #7aaefb so links stay ≥4.5:1 on medal-tinted rows). Data colours (`MEDAL_COLORS`, chart series) unchanged. |
| 2026-11-10 | M6–M7 | `refactor/m2-shell` | `tests/e2e/quality.spec.js`: view-transition type checks, reduced motion, transform/opacity-only animation sampling, axe on 10 routes × light/dark (0 serious/critical), 360 px no page-level horizontal scroll, mobile nav sheet, keyboard dialog, skip link, persisted theme. ECharts theme registration moved out of `main.ts`: entry chunk 155 → 46 KB gzip (budget 120 KB); ECharts only in the Analysis chunk (222 KB gzip). New baseline: total JS 1.24 MB (old 1.70 MB), Summary search frame 17.3 ms (old 22.4 ms), CLS 0 on all sampled routes. CI now runs typecheck, lint, unit, golden, build, verify:data and E2E, and E2E blocks deploy. AGENTS.md, README and analysis-page.md updated. Final: typecheck clean, lint 0 errors, 32 unit/golden tests, 215 E2E passing (35 skipped by design: Chromium-only checks and one WebKit keyboard-focus case). |
| 2026-11-10 | Open | — | Not measured here: Lighthouse LCP/INP on simulated 4G (Lighthouse isn't installed in this environment), and the heap-release check for `scope=all` (M4-T5). The Worker-side cache is evicted only through `evictExcept`, which is not yet called on navigation; the Vue Query results themselves use `gcTime` 60 s. |
| 2026-11-10 | Audit fixes | `refactor/m2-shell` | 按 `report/2026-11-10/frontend-refactor-audit.md` 修复。**P1**：lint 2 个错误清零（删除未用的 `escapeRe`、修正测试名反斜杠），余 9 条 `vue/require-default-prop` 警告为可选 TS prop 的误报，保留并记录。**P1**：`usePlayerRecords` 在 `await years.json` 前固定全部参数，修复 scope=all 把新姓名写入旧 queryKey 的缓存串写；新增 `tests/unit/queries.test.ts`，已验证旧实现会失败。**P2**：`evictExcept` 接入 PlayerPage 生命周期（离开页面/退回单年 scope），`evictYearCacheExcept` 在 Worker 未创建时不实例化；新增 year-core 淘汰单测。**P2**：ESLint 加 `eslint-import-resolver-typescript@4.4.5`（2026-06-01 发布）与 `import-x/resolver-next`，`@/` 别名与省略扩展名导入现在能被 `no-restricted-paths` 拦截；补 Worker 边界（不得依赖 UI 层，data 只允许 year-core/loaders/fetch-json/schemas）；`tests/unit/layering.test.ts` 用 ESLint Node API 做 4 项规则验证。**P2**：PlayerLink 的 Tooltip 触发节点改为链接本身，键盘聚焦可打开；E2E 增加「悬停关闭后聚焦再打开」断言。**P2**：首页初始 JS 150,088 → 106,150 字节 gzip（预算 120 KB）：HomePage 入场/悬停改 CSS，`MotionConfig` 从 App.vue 下沉到 YearPage 与 SegmentedControl，motion 分块不再进入首页请求。**P2**：视觉回归改为真实像素断言（`tests/e2e/visual.spec.js`，10 条路由，`--project=visual`，`maxDiffPixelRatio` 0.001），已用改色验证会失败；CI 新增 `visual` job 并纳入 `build.needs`。基线按平台保存，当前只有 win32，Linux 需在 CI 上跑一次 `--update-snapshots` 并提交。**P2**：补组件测试（实体原子、DataTable 虚拟滚动、ChartBox、prefs 持久化，共 8 项）；axe 覆盖新增 Player 页、Analysis 5 个 Tab、队伍详情弹窗。**修复真实对比度缺陷**：`--problem-solved` #67c23a → #357a1e（白字 2.24 → 5.31:1）、`--problem-unsolved` #f56c6c → #b83f3f（2.90 → 5.50:1），此前弹窗未扫描所以漏掉。**偏差记录**：DataTable 未使用 `@tanstack/vue-table`，排序/列模型为自写，只接入 TanStack Virtual；`@tanstack/vue-table` 仍在依赖中但源码未引用。**差异修复**：AnalysisPage 指示条不再过渡 `width`（§8.1）；页眉新增桌面端「减少动效」开关。 |
| 2026-11-10 | Lighthouse | `refactor/m2-shell` | 安装 `lighthouse@13.5.0`（精确锁版本）。**版本选择**：最新稳定版 13.6.0 发布于 2026-10-27T21:34Z，距本次 13 天 15 小时，不足「两周以上」，故取 13.5.0（2026-09-18）。新增 `web/scripts/lighthouse.mjs` 与 `npm run lighthouse`：自动复用 Playwright 的 Chromium（可用 `CHROME_PATH` 覆盖），默认移动端模拟 4G（150 ms RTT / 1.6 Mbps / 4x CPU）。**实测**（`npm run build && npm run preview` 后）：Home 性能 96 / LCP 2414 ms / TBT 30 ms / CLS 0；Contest 90 / 3113 / 145 / 0；Summary 94 / 2539 / 156 / 0.0001；Analysis 76 / 4263 / 290 / 0.0002。INP 是字段指标，Lighthouse 实验室不直接产出，以 TBT 作为交互阻塞代理。**同时修正交互测法**：`tests/visual/baseline.mjs` 原先在 300 ms 防抖完成前测「两帧」，改为测「输入到统计文案真正变化」，得 `summary-search-update-ms` 329 ms（其中 300 ms 是防抖，实际渲染约 29 ms）。 |
| 2026-11-10 | CI 修复 | `refactor/m2-shell` | 首次 push 后 `visual` job 全红，Pages 部署被 `build.needs` 挡住。**根因**：`testInfo.config.updateSnapshots` 默认是 `'missing'`（缺基线时写盘并判失败），而跳过条件写成了 `!== 'none'`，所以守卫从未生效；10 条用例全部报 `A snapshot doesn't exist ... *-visual-linux.png`。**修复**：守卫改为只在 `'all'` / `'changed'`（显式 `--update-snapshots`）时放行；把失败产物里的 10 张 `*-actual.png`（CI 上真实渲染的 1280×900 截图）作为 `*-visual-linux.png` 基线提交，Linux 从此真正参与像素比较。**验证**：win32 套件 10 项通过；临时移走一张 win32 基线后用例变为 skipped 而非 failed；WebKit 的键盘提示用例通过。 |

---

## 14. Open questions and discrepancies

Agents: add an entry here instead of guessing. Do not implement any answer until the owner fills it in.

| ID | Question | Default until answered |
|---|---|---|
| Q1 | Should the router reset scroll to the top on navigation and restore it on back/forward? Today there is no `scrollBehavior`. | **Answered 2026-11-10:** keep current, no `scrollBehavior` (§2.3). |
| Q2 | Player and School names are decoded twice (`decodeURIComponent` on top of the router's own decoding). A name containing `%` would throw `URIError`. | **Answered 2026-11-10:** decode once. Became D7 (§2.1); B-PL1 and B-SC1 updated. |
| Q3 | A year inside 2020–2030 that has no data (e.g. `/#/2027/`) shows an empty list or a load error. Should it be a 404? | **Answered 2026-11-10:** not a 404; keep current (B-N3). |

All questions are answered. Add new ones below as they come up.
