# 安装 Lighthouse 并补齐模拟 4G 指标

## 目标

审查报告遗留项：「Lighthouse 模拟 4G 的 LCP/交互指标仍未测量（Lighthouse isn't installed in this environment）」。本次安装 Lighthouse，并把它跑通、把数字记录下来。

## 实际改动

| 文件 | 改动 |
| --- | --- |
| `web/package.json` / `web/package-lock.json` | 新增 devDependency `lighthouse@13.5.0`（精确锁版本） |
| `web/scripts/lighthouse.mjs` | 新增：自动复用 Playwright 的 Chromium，跑 Home / Contest / Summary / Analysis 四条路由，输出 JSON |
| `web/package.json` | 新增 `npm run lighthouse` |
| `web/tests/visual/baseline.mjs` | 交互测法从「防抖前的两帧」改为「输入到统计文案真正变化」 |
| `.gitignore` | 忽略 `web/tests/visual/lighthouse.json`（本地测量产物，数字记在 §13） |
| `docs/frontend-refactor-plan.md` | §13 追加本次进度与实测数字 |

### 版本选择

最新稳定版是 13.6.0，发布于 2026-10-27T21:34Z；本次执行时间是 2026-11-10T13:22Z，相差 **13 天 15 小时**，不足 AGENTS.md 要求的「发布两周以上」。因此取上一个稳定版 **13.5.0**（2026-09-18，53 天前）。

### 脚本行为

- 浏览器：优先 `CHROME_PATH`，否则在 `%LOCALAPPDATA%/ms-playwright/chromium-*/chrome-win64/chrome.exe`（Linux 为 `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome`）里取最新一个。
- 配置：Lighthouse 默认移动端配置，即模拟 4G（150 ms RTT / 1.6 Mbps / 4x CPU 降速）。
- 输出：`tests/visual/lighthouse.json`，同时打印到终端。

## 验证

`npm run build && npm run preview` 后执行 `node scripts/lighthouse.mjs`：

| 路由 | 性能分 | LCP | TBT | CLS |
| --- | --- | --- | --- | --- |
| Home `/` | 96 | 2414 ms | 30 ms | 0 |
| Contest `/2025/contest/nanjing` | 90 | 3113 ms | 145 ms | 0 |
| Summary `/2025/summary` | 94 | 2539 ms | 156 ms | 0.0001 |
| Analysis `/2025/analysis` | 76 | 4263 ms | 290 ms | 0.0002 |

交互测法修正后：`summary-search-update-ms` = **329 ms**（其中 300 ms 是防抖，实际渲染约 29 ms）。旧测法报的 17.3 ms 只覆盖防抖前的两帧，不能代表用户感知的等待。

`npm run lint` 仍为 0 errors / 9 warnings，`npm run typecheck` 通过。

## 遗留问题与未验证的假设

- **INP 不是实验室指标**：Lighthouse 不直接产出 INP（字段指标），本次以 TBT 作为交互阻塞代理。若要真实 INP，需要 RUM 或 Chrome UX Report，本仓库没有后端，暂不具备条件。
- **Lighthouse 未接入 CI**：计划只要求「记录一次运行」，且 CI 上跑 Lighthouse 会显著拉长流水线、且分数受 runner 性能影响。当前作为手动脚本，命令写在 §13。
- **Analysis 页 76 分**：主要成本是 ECharts（222 KB gzip）与首屏图表初始化。这是已知的按需加载结果，未在本次优化范围内。
- **Chromium 版本耦合**：脚本取 Playwright 目录下最新的 `chromium-*`。若 Playwright 升级后目录结构变化，需要同步调整 `findChrome()`。
