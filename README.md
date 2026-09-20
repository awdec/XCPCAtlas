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

- Vue 3 + Vite
- Element Plus（UI 组件）
- ECharts（图表可视化）
- Vue Router 4（路由，Hash 模式）
- Tailwind CSS 4（样式）

## 快速开始

### 1. 数据预处理

将 xlsx 文件转为 JSON（仅首次或数据更新时需要）：

```bash
pip install openpyxl pandas
python scripts/extract_players.py      # 提取选手列表
python scripts/extract_oi_records.py   # 匹配 OI 记录（需要 raw.txt）
python scripts/convert_xlsx.py         # 主脚本：xlsx → 赛区 JSON（支持多年份）
```

注意首次接入新年份时需按上述顺序执行（convert 需要该年份的 `oi_records.json` 来给队员嵌入 OI 记录）。

输出到 `web/public/data/{year}/` 目录。

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
│   └── 2026/                    # 2026 赛季网络预选赛（CCPC ×1、ICPC ×2）
├── raw.txt                       # OI 原始记录（~25MB）
├── CLAUDE.md                     # Claude Code 项目指引
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
│   ├── src/
│   │   ├── views/                # 页面
│   │   │   ├── Home.vue          # 首页（年份选择）
│   │   │   ├── YearHome.vue      # 年份首页（赛区列表）
│   │   │   ├── Contest.vue       # 赛区详情
│   │   │   ├── Summary.vue       # 全部成绩汇总
│   │   │   ├── Analysis.vue      # 数据分析（按年份）
│   │   │   ├── School.vue        # 学校详情
│   │   │   ├── Player.vue        # 选手详情
│   │   │   └── Announcement.vue  # 公告
│   │   ├── components/
│   │   │   ├── RankTable.vue     # 排名表格
│   │   │   ├── TeamDetail.vue    # 队伍详情弹窗
│   │   │   ├── SchoolStats.vue   # 学校统计图表
│   │   │   └── analysis/         # 数据分析页图表组件
│   │   │       ├── AnalysisChart.vue  # ECharts 通用封装
│   │   │       ├── OverviewTab.vue    # 总览
│   │   │       ├── RegionTab.vue      # 赛站分析
│   │   │       ├── PlayersTab.vue     # 选手分析
│   │   │       ├── OIerTab.vue        # OIer 分析
│   │   │       └── SchoolTab.vue      # 学校分析
│   │   ├── utils/
│   │   │   ├── dataLoader.js     # 数据加载（带缓存，支持多年份）
│   │   │   ├── analysis.js       # 数据分析统计（纯函数）
│   │   │   └── formatters.js     # 解析/聚合工具
│   │   ├── App.vue               # 根组件（导航栏）
│   │   └── main.js               # 入口（路由 + Element Plus）
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
└── README.md
```
