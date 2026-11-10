# XCPCAtlas · 长期项目笔记

## 项目约定

- **工作报告归档**（2026-11-10 曾在 `AGENTS.md` 建立 `## Work Reports` 约定，同日已随回退删除，报告目录与 stash 均已清理）：**当前不强制生成报告**。若用户重新启用，约定为归档到 `report/<YYYY-MM-DD>/`、同日复用目录、kebab-case 文件名不覆盖、内容含任务概述/改动清单/关键决策与结论/遗留问题与下一步；只记录真实发生的事。
- 前端硬约束：hash 路由 + `base:'/XCPCAtlas/'` + 相对数据路径；`<router-link>`（Ctrl/中键新标签页）；大榜单分页 + 300ms 防抖；ECharts 显式 `use()`；分析页 6 Tab 顺序与 URL `tab` 参数；奖牌堆叠 铁→铜→银→金；轨迹编码 `i-b-g-n-n`；全中文 UI。
- 数据管线顺序：`extract_players.py` → `extract_oi_records.py` → `convert_xlsx.py` → `gen_trajectories.py`。

## 前端重构状态（2026-11-10 已终止）

- 用户明确对开发结果不满意，**已全部回退并彻底清理**。当前 HEAD `1ea95eb`（清理冗余文件），`git diff` 为空，`git status --short` 仅剩未跟踪的 `.workbuddy/`，工作区源码 = 重构开始前。
- 已删除：`report/2026-11-10/` 全部 11 份方案与实施报告、`web/dist/` 全部构建产物、两份 git stash（源码改动 + `AGENTS.md` 约定）、新增的 `web/src/assets/styles/tokens.css`。A/D/E 阶段从未实施，未做浏览器实测，未 commit / push。
- 保留：`.workbuddy/memory/`（系统约束不可删）；其中 `2026-11-10.md` 日志按 append-only 原样保留历史记录，**其「代码已落地」「报告见 xxx」等结论均已失效**，仅作审计用途。
- **不要依据旧条目继续推进 v2.1 方案或 A/D/E 阶段**；是否重启、以哪个版本为准，须用户重新确认。
