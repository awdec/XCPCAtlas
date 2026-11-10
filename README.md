# ICPC/CCPC 比赛结果展示平台

## 项目介绍

本项目面向 ICPC/CCPC 参赛者、教练和竞赛爱好者，用于集中整理与展示不同年份、不同赛区的比赛结果。平台将原始成绩表转换为结构化数据，支持按年份、赛区、学校、队伍和选手进行查询，可查看排名、解题数、罚时、奖牌及 OI 获奖记录，方便对比学校的跨赛区表现并追踪选手参赛经历。项目附带数据预处理脚本，便于补充新赛事和修正历史数据，适用于个人查询、校队统计、赛事资料归档、成绩核验及竞赛生态研究。站点采用静态部署，无需后端服务，便于本地使用和公开分享。

## 功能

- **首页** — 年份选择，显示所有可用年份
- **年份首页** — 该年份所有赛区卡片总览，显示冠军信息和队伍数量
- **赛区详情** — 排名表格（前端分页，每页 100 条，适配 2000+ 队的网络预选赛）、搜索过滤、学校类型筛选、OI 人数筛选
- **全部成绩** — 跨赛区汇总表格，支持搜索学校/队伍/队员，按比赛、学校类型、OI 人数、奖项筛选，二进制偏移分页
- **学校详情** — 某学校在所有赛区的参赛记录，含比赛名、985/211 标签
- **选手详情** — 选手参赛记录与 OI 获奖经历
- **公告** — 静态公告页面
- **队伍详情** — 题目提交状态、队员信息、奖牌
- **数据分析** — 年度统计分析：总览与各赛区奖牌分布、赛站获奖人数与跨赛站获奖迁移、选手获奖分布、参赛场次与获奖率、排名稳定性（散点点击跳转选手个人页）、各奖牌档 OIer 占比与队伍构成、金银铜牌选手最高 OI 奖项分布（共享赛站筛选）、学校层次获奖率与 OIer 率、无金牌 985 与有金牌 211/双非 名单
- **OI 标记** — 有 OI 获奖记录的选手显示 ☀️ 标记，悬停查看获奖详情
- **新标签页打开** — 所有导航链接支持 Ctrl+点击 / 鼠标中键在新标签页打开

## 技术栈

- Vue 3.5 + TypeScript（strict）+ Vite 8
- Reka UI（无障碍基础组件，shadcn-vue 风格封装）+ Tailwind CSS 4（亮/暗主题令牌）
- TanStack Vue Query（数据获取与缓存）、TanStack Table / Virtual（大表格）、Pinia（界面偏好）
- Web Worker + Comlink（整年数据在后台线程加载与聚合）
- ECharts 6（图表可视化）、motion-v + View Transitions API（动效，支持「减少动效」）
- Vue Router 4（路由，Hash 模式）
- Vitest（单元 + golden 基线）、Playwright（E2E、axe 无障碍检查）、ESLint

## 快速开始

### 1. 数据预处理

将 xlsx 文件转为 JSON（仅首次或数据更新时需要）：

```bash
pip install openpyxl pandas
python scripts/extract_players.py      # 提取选手列表
python scripts/extract_oi_records.py   # 匹配 OI 记录（需要 raw.txt）
python scripts/convert_xlsx.py         # 主脚本：xlsx → 赛区 JSON（支持多年份）
python scripts/gen_trajectories.py     # 赛区 JSON → 分析页「轨迹分析」用的 trajectories.json
```

注意首次接入新年份时需按上述顺序执行（convert 需要该年份的 `oi_records.json` 来给队员嵌入 OI 记录）；convert 会清空年份目录下除 `oi_records.json` 外的 JSON，因此 `gen_trajectories.py` 必须在 convert 之后运行。

OIer 按姓名匹配 OI 获奖记录，并根据获奖时年级推算 XCPC 参赛当年的年级：通常接受大一至大五；西安交通大学、中国科学技术大学的选手接受高一至大五。学校以 XCPC 名单为准，例外适用于所有年份。

输出到 `web/public/data/{year}/` 目录。

同时支持 `rank.iccpc.cn` 的完整赛后提交快照：保存为 `xcpc/{year}/年份 CCPC 城市.rank.json`，由同一处理流程提取正式队伍、队员并生成赛事 JSON，无需转换为 Excel。2026 长春站和乐山站原始快照分别来自[长春官方榜单](https://rank.iccpc.cn/r/8a3a28e3-f6b3-4a58-b4ac-fa8039fb2c72)和[乐山官方榜单](https://rank.iccpc.cn/r/6503f86d-8281-4d33-9da0-b41e6fff4726)，保留来源地址和下载时间；按网站规则收录有提交的正式队伍（包括女队），不收录打星队及无提交队伍。CE 不计罚时，首次 AC 后的提交忽略，总罚时按秒累计后取整为分钟，奖牌按快照内配置计算。目前只支持单赛事归属、题号和结果完整公开的快照。

2026 乐山站（2026-11-08）收录 299 支正式队伍、191 所学校、895 个队员条目及 13 题，金/银/铜牌分别为 30/60/90 队。48 支打星队和 1 支无提交正式队仅保留在原始快照，不纳入站内统计；成都师范学院「十二月二十四」按原始名单保留 1 名队员。

2026 南京站使用 `xcpc/2026/icpc2026nanjing.xlsx` 的「正式队伍」表，收录 332 队、185 校、996 个队员条目及 13 题，保留源排名和金/银/铜牌 33/66/99 队；42 支打星队不导入。该表 `+N(时间)` 的 N 是包含成功提交的总次数，由 `TOTAL_ATTEMPTS_FILES` 显式配置；逐队按题目时间和失败次数重算的罚时均与源表一致。更新后同样运行完整的选手、OI、成绩与轨迹管线。

原表缺少队员姓名时，可在同目录提供同名 `.members.json`，按“学校＋队名”精确匹配补充；选手提取和成绩转换共用该名单，原表已有姓名时以原表为准。2026 西安站的补充名单来自 [XCPC Sight](https://junjiecharles.github.io/xcpc-sight/?series=2026-2027&previewContest=icpc-2026-xian&view=preview)（其来源为赛站参赛手册），覆盖成绩表中的 402 队、1205 个队员条目。佛山大学“我的刀盾”按来源保留 2 人。更新补充名单后，同样按上述三个步骤重新生成数据，OI 记录仍由本项目的 `raw.txt` 和年级窗口规则匹配。

2021 赛季补充第 46 届 ICPC 上海站（2021-11-28）和昆明站（2022-04-17）。完整成绩取自 RankLand 公开 SRK 榜单，队员取自 [CPCFinder 上海站](https://cpcfinder.com/contest/48)和[昆明站](https://cpcfinder.com/contest/27)，已写入标准源表的 `Member1`–`Member3` 列。上海收录 632 支正式队伍、1896 条姓名；昆明收录 753 支正式队伍，其中 210 支获奖队有 616 条具体姓名，其余 543 队姓名留空，`无`、`两人队`等占位或备注不作为选手。两站均排除打星队，保留源秒级并列排名，总罚时按源总秒数取整为分钟。原始成绩、名单快照、来源地址、下载日期和名称差异映射保存在 `xcpc/2021/sources/` 及同名 `.source.json`，详见[来源说明](xcpc/2021/sources/README.md)。

### 2. 启动前端

```bash
cd web
npm install
npm run dev
```

浏览器打开 http://localhost:11451/

### Windows 桌面启动

在项目根目录运行以下命令创建桌面上的 **XCPCAtlas** 快捷方式：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create-desktop-shortcut.ps1
```

双击快捷方式会显示服务终端，并打开 `http://127.0.0.1:11451/XCPCAtlas/`。关闭该终端窗口或按 `Ctrl+C` 即可停止服务；仅关闭浏览器不会停止服务。需要已安装 Node.js 且已在 `web` 中运行 `npm install`；重复点击会复用已有服务，请通过最初的服务终端关闭应用。端口被其他程序占用时会提示错误。移动项目目录后，重新执行上述命令即可更新快捷方式。

桌面及标签页采用统一的蓝底金色奖杯图标，文件位于 `web/public/`。修改 `scripts/create_icons.py` 后可运行 `python scripts/create_icons.py` 重新生成（需要 Pillow）。

### 3. 生产构建

```bash
cd web
npm run build
```

构建产物在 `web/dist/` 目录，可部署到任意静态服务器。

## 部署

项目通过 GitHub Actions 自动部署到 GitHub Pages。每次 push 到 `main` 分支会自动触发构建和部署。

首次部署需在仓库 Settings → Pages → Source 中选择 **GitHub Actions**。

## 项目结构

```
├── scripts/
│   ├── convert_xlsx.py          # xlsx → JSON 主脚本（支持多年份）
│   ├── extract_players.py       # 提取选手列表
│   └── extract_oi_records.py    # 匹配 OI 记录（按年份）
├── xcpc/
│   ├── 2020/                    # 2020 赛季原始成绩文件
│   ├── 2021/                    # 2021 赛季原始成绩文件
│   ├── 2022/                    # 2022 赛季原始成绩文件
│   ├── 2023/                    # 2023 赛季原始成绩文件
│   ├── 2024/                    # 2024 赛季原始成绩文件
│   ├── 2025/                    # 2025 赛季原始成绩文件
│   └── 2026/                    # 2026 赛季：ICPC 西安、成都、武汉、南京及 CCPC 长春、乐山
├── raw.txt                       # OI 原始记录（~25MB）
├── AGENTS.md                     # AI 编程助手项目指引
├── docs/
│   └── analysis-page.md          # 数据分析页开发文档（口径/约定/坑/验证方法）
├── .github/
│   └── workflows/
│       └── deploy.yml            # GitHub Pages 自动部署
├── web/
│   ├── public/
│   │   ├── data/                 # 预处理后的 JSON 数据
│   │   │   ├── years.json        # 可用年份索引
│   │   │   ├── 2020/             # 2020 赛季数据
│   │   │   │   ├── contests.json
│   │   │   │   ├── kunming.json
│   │   │   │   ├── oi_records.json
│   │   │   │   └── ...
│   │   │   ├── 985.json          # 学校标签（全局）
│   │   │   └── 211.json
│   │   └── favicon.svg           # 网站图标（蓝底金色奖杯）
│   ├── src/                      # 分层：domain ← data ← shared ← entities ← features ← pages ← layouts ← app
│   │   ├── app/                  # 入口、路由（含年份守卫、页面过渡）、Provider
│   │   ├── layouts/              # 外壳、页眉、移动端导航
│   │   ├── pages/                # 路由页面（首页、年份、赛区、汇总、选手、学校、分析、轨迹、公告、404）
│   │   ├── features/             # 业务组件（榜单、队伍详情、数据分析各 Tab 与图表 option、介绍弹窗）
│   │   ├── entities/             # 领域原子组件（学校/选手链接、赛事标签、题目状态、奖牌）
│   │   ├── shared/               # 通用组件（DataTable、分页、筛选条、加载态）、样式令牌、组合式函数
│   │   ├── data/                 # 数据获取、Valibot 校验、Vue Query 查询
│   │   ├── workers/              # 整年数据 Worker
│   │   └── domain/               # 纯 TS 业务逻辑（统计口径、筛选、分页、聚合）
│   ├── tests/                    # golden 基线、单元测试、E2E、截图基线
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
└── README.md
```
