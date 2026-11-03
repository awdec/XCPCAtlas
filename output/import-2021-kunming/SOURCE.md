# 第 46 届 ICPC 昆明站：2021 赛季临时导入源

本包归入 **2021 赛季**，比赛实际举行日期为 **2022-04-17**。本次仅准备可复核的临时文件，未写入 `xcpc/`，未修改公共转换逻辑或前端数据。

## 榜单来源

- [RankLand 赛事页](https://rl.algoux.cn/collection/official?rankId=icpc2021kunming)
- [公开 SRK JSON 导出](https://cdn.algoux.cn/rankland/file/70792638223093760/icpc2021kunming.srk.json)
- 榜单注明的[原比赛链接](https://ac.nowcoder.com/acm/contest/32708#rank)
- 下载日期：2026-11-03。原始 JSON、页面快照及所有来源文件的 SHA-256 见 `source.metadata.json`。

公开源共 887 队，本表仅保留 `user.official=true` 的 **753 正式队**，排除 134 打星队；全部公开队伍至少有一次提交。正式队来自 299 个原始学校名称，共 13 题，金/银/铜牌为 **35/70/105**，57 队零解题。

`ICPC kunming.xlsx` 使用现有转换器支持的标准格式：`正式队伍` 工作表，第 1 行赛事标题、第 2 行表头，第 3 行起为队伍。保留完整榜单的学校、队名及正式队次序，按原始解题数和**秒级总罚时**计算竞赛名次，同分同罚时并列；不按取整后的分钟重排。总罚时直接使用 `floor(score.time秒/60)`，每题 AC 时间单独向下取整为分钟。分题取整后的罚时之和可能与总罚时不同，不能据此重新计算总分。`Source User ID` 仅供审核，不作为 ICPC ID 导入。原始 SRK 继续保留秒数与首次通过（FB）信息。源没有女队标记的实际归属信息，`Girl=N`。

## 队员来源与覆盖

队员来自 [CPCFinder 赛事页](https://cpcfinder.com/contest/27) 于 2026-11-03 的逐队 UI 审核：`../cpcfinder-27-members-audit.json`。该页只列 210 支获奖队，不能代表完整参赛名单。

- 176 队按学校与队名唯一、严格相等匹配；另 34 队逐条人工审核学校、队名的标点、字符或转录差异，显式映射见 `confirmed-member-mappings.json`。名次、奖牌仅用作交叉佐证，没有按名次或模糊相似度自动配对。
- 最终 210 队填有 **616 个具体姓名条目**：202 队各 3 个姓名、2 队各 2 个、6 队各 1 个；543 支其他正式队的成员单元格留空。
- 排除 7 个“无”占位与 1 个“两人队”标记，保留原始具体姓名文字，未擅自纠正疑似错字。填有具体姓名不等于已证实队伍姓名完整。
- 姓名直接写入 `Member1`～`Member3`，不使用 `.members.json` 补充文件。逐队最终对应关系及过滤的非姓名项见 `member-match-audit.json`。
- `member-mapping-unmatched.json` 是审核前的 34 处差异及候选清单；其中的 `unconfirmed` 是当时状态。最终审核结论以 `confirmed-member-mappings.json` 和 `member-match-audit.json` 为准。

## 验证

`prepare_kunming.py` 先逐队核对题目 AC/FB 数与源 `score.value`、原始秒级通过时间和错误次数罚时与源 `score.time`，再通过未修改的 `convert_file` 读取标准工作簿，逐项核对全部 **753 队、9,789 个题目状态**以及名次、解题数、分钟总罚时、学校、队名、奖牌和具体姓名，均通过。正式队合计 **1,466 次 AC/FB**，源总罚时合计 **17,328,921 秒**，两项一致性错误均为 0。转换结果可查看 `normalized-preview.json`，完整计数、来源哈希和显式映射亦保存在 `source.metadata.json`。
