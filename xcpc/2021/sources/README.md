# 2021 赛季上海、昆明站来源

第 46 届 ICPC 上海站举办于 2021-11-28，昆明站举办于 2022-04-17，两站均归档到 2021 赛季。以下快照于 2026-11-03 下载或逐队读取。

| 比赛 | 完整成绩 | 队员名单 | 项目收录 |
|---|---|---|---|
| 上海 | [RankLand](https://rl.algoux.cn/collection/official?rankId=icpc2021shanghai)，[原始榜单](https://board.xcpcio.com/icpc/46th/shanghai) | [CPCFinder](https://cpcfinder.com/contest/48) | 632 支正式队、1896 条姓名；排除 50 支打星队 |
| 昆明 | [RankLand](https://rl.algoux.cn/collection/official?rankId=icpc2021kunming)，[原始榜单](https://ac.nowcoder.com/acm/contest/32708#rank) | [CPCFinder](https://cpcfinder.com/contest/27) | 753 支正式队、616 条已知姓名；排除 134 支打星队 |

## 文件

- `icpc2021shanghai.srk.json`、`icpc2021kunming.srk.json`：公开完整成绩快照，保留原始秒级罚时、分题状态及正式队标识。
- `cpcfinder-shanghai.members.json`、`cpcfinder-kunming.members.json`：逐队打开队伍详情读取的学校、队名、姓名原文；`members` 仅保留具体姓名，`raw_members` 同时保留页面占位或备注以便核查。
- `member_matches.json`：上海站逐队名单匹配的完整审核记录，含源队伍 ID、名次、匹配方式与最终姓名；`ICPC shanghai.source.json` 的 `member_matching.full_audit` 指向本文件，`full_audit_sha256` 为其校验值。
- 上级目录 `ICPC shanghai.source.json`、`ICPC kunming.source.json`：来源 URL、下载日期、快照和工作簿 SHA256、计数、学校别名及人工审核的队名差异映射。
- 上级目录两张同名 `.xlsx`：供现有数据管道直接读取，采用第二行表头的“正式队伍”工作表，已填入已知的 `Member1`–`Member3`。

## 收录与精度

只收录源 `user.official=true` 的队伍，包括零题但有提交的正式队；不收录打星队。两场均为 13 题、35 金 / 70 银 / 105 铜。

排名与并列根据原始秒级分数确定，转成分钟后不重新排序。总罚时从 `score.time` 的总秒数向下取整一次；分题通过时间分别取整为分钟，因此不能用取整后的分题时间精确复算总罚时。原始秒数仍在 SRK 快照中。上海冠军“重启征途”的原总罚时为 89209 秒，源表写为 1486 分钟。

两份成绩源均未标明具体队伍的女队归属，未依据全局女队图例推断 `Girl`。源站队伍 ID 仅作溯源，不作为 ICPC 官方 ID。

## 名单覆盖与差异

上海完整名单与成绩按学校及队名唯一匹配；只有“齐鲁工业大学”与带“山东省科学院”后缀的名称、以及“中国石油大学(北京)”的括号形式使用显式学校别名，共涉及 6 队。榜单中的学校和队名保留原文。

昆明 CPCFinder 当前仅收录 210 支获奖队伍，不能补出全部 753 队的姓名。176 队按学校和队名精确匹配，34 队经逐条审核空格、标点、大小写、学校别名或 OCR 转录差异后使用显式映射，证据写在 `.source.json` 中，未按名次或字符串相似度自动合并。

昆明获奖队中，202 队有三名具体姓名、2 队有两名、6 队有一名，共 616 条姓名。页面的 7 个“无”及 1 个“两人队”不作为选手，另 543 支正式队伍的成员列留空。个人姓名按 CPCFinder 原文保留；核查有无姓名不代表逐人核验拼写或身份。

## 重新生成

应用数据仍以两张标准 `.xlsx` 为输入，无需在线访问上述来源。更改源表后按项目 README 的顺序重新提取选手、匹配 OI、转换成绩，最后重新生成轨迹。`.source.json` 和本目录的快照不由转换器直接读取。
