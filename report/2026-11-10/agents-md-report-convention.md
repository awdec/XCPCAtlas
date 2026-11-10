# AGENTS.md 新增「工作完成后写报告」约定

## 目标

在仓库的 agent 指引中固化一条流程约定：每次工作完成后产出 md 报告，归档到 `report/` 下的日期文件夹；当天第一份报告时先创建日期文件夹。

## 实际改动

| 文件 | 改动 |
| --- | --- |
| `AGENTS.md` | 在 `## Conventions` 末尾新增一条 bullet（+1 行） |

新增内容：

> **每次工作完成后必须写报告**：在 `report/YYYY-MM-DD/` 下新建 `<任务简述>.md`（kebab-case 英文文件名，如 `frontend-refactor-report.md`），记录本次任务的目标、实际改动（含文件路径）、验证方式与结果、遗留问题或未验证的假设。若当天还没有报告，先创建日期文件夹（`mkdir -p report/$(date +%F)`）。报告写结论与证据，不复制代码全文

## 约定细节的确定依据

写入前先核对了仓库现状，使约定与既有实践一致，而非另立一套：

- `report/` 目录已存在，且已有 `report/2026-11-10/` 日期文件夹（`YYYY-MM-DD` 格式）。
- 该文件夹内已有 `frontend-refactor-report.md`、`frontend-refactor-audit.md`，文件名均为 kebab-case 英文，故约定沿用此命名风格。
- `report/` 未被 `.gitignore` 忽略，报告会随仓库提交，因此约定中要求「写结论与证据，不复制代码全文」，避免报告膨胀。

## 验证

- `git diff --stat AGENTS.md` → `1 file changed, 1 insertion(+)`，无其他行被改动。
- `git diff AGENTS.md` 确认新增行位于 `## Conventions` 最后一条之后，位置正确。
- `file AGENTS.md` → `with CRLF line terminators`，原有 CRLF 行尾未被破坏（diff 中无整文件重写）。
- 本报告本身即为新约定的首次执行：`report/2026-11-10/` 已存在，故未重复创建日期文件夹。

## 遗留问题

- 约定未规定报告是否需要在 `docs/` 或 README 中索引；当前按「只归档、不索引」处理。
- 未规定报告与 git commit 的绑定关系（是否每次提交都需附带报告）。若后续希望「一次提交一份报告」，需补充说明。
