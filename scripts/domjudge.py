#!/usr/bin/env python3
"""
DOMjudge 榜单导出格式的解析工具。

区别于 XCPCIO Board 导出（单个"正式队伍"sheet，+1(170) 式提交记录），
DOMjudge 导出的特征是: 无"正式队伍" sheet， Official/Main 等表首行为
'# / R# / S# / Markers / ... / Organization / Name / Team Members / Score / Time',
题目列表头为 'A (386/963)' 式统计, 提交记录为 'AC/1/0:26:17' / 'FB/2/2:19:30' / 'RJ/6' 式。
"""

import re
import pandas as pd

PROBLEM_LETTERS = list("ABCDEFGHIJKLMN")

# 表头名 → 含义: '# ' 列含排名与奖牌标注（如 "1 (金奖)"）
PROBLEM_HEADER_RE = re.compile(r"^([A-N])\s*\(\d+/\d+\)$")
SUBMISSION_RE = re.compile(r"^([A-Za-z]+)/(\d+)(?:/(\d+):(\d+):(\d+))?$")
TIME_RE = re.compile(r"^(\d+):(\d+):(\d+)$")

# 中文奖牌 → 前端 medalClass/medalText 匹配的英文值
MEDAL_MAP = {
    "金奖": "Gold", "金牌": "Gold",
    "银奖": "Silver", "银牌": "Silver",
    "铜奖": "Bronze", "铜牌": "Bronze",
    "优胜奖": "Honorable",
    "冠军": "Winner",
    # algoUX 榜单导出的英文奖牌标注
    "Gold Award": "Gold",
    "Silver Award": "Silver",
    "Bronze Award": "Bronze",
    "Honorable Mention": "Honorable",
    "Champion": "Winner",
    # ICPC 榜单导出的英文奖牌标注（如 2020 CCPC 北京、2022 ICPC 上海）
    "Gold Medalist": "Gold",
    "Silver Medalist": "Silver",
    "Bronze Medalist": "Bronze",
}

SOLVED_TOKENS = {"AC", "FB", "OK", "SV"}


# DOMjudge 榜单必需的表头列
DOMJUDGE_REQUIRED_COLS = ("Organization", "Name", "Team Members", "Score", "Time")


def _is_header_domjudge(header_values):
    cols = {str(c).strip() for c in header_values if pd.notna(c)}
    return set(DOMJUDGE_REQUIRED_COLS) <= cols


def domjudge_sheet_name(xls):
    """返回 DOMjudge 榜单所在的 sheet 名（Official/Main）；非该格式返回 None。"""
    if "正式队伍" in xls.sheet_names:
        return None
    for name in ("Official", "Main"):
        if name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=name, header=None, nrows=1)
            if _is_header_domjudge(df.iloc[0]):
                return name
    return None


def is_domjudge_format(xls):
    """判断 ExcelFile 是否为 DOMjudge 榜单导出格式（无"正式队伍" sheet）。"""
    return domjudge_sheet_name(xls) is not None


def _header_map(df):
    """解析首行表头，返回 (表头名→列号 dict, [(题号, 列号)])。"""
    header = [str(c).strip() if pd.notna(c) else "" for c in df.iloc[0]]
    cols = {}
    for i, h in enumerate(header):
        if h and h not in cols:
            cols[h] = i
    problem_cols = []
    for i, h in enumerate(header):
        m = PROBLEM_HEADER_RE.match(h)
        if m:
            problem_cols.append((m.group(1), i))
    return cols, problem_cols


def _minutes(raw):
    """'22:49:00' → 1369（分钟）；已是数字则原样取整。"""
    s = str(raw).strip()
    m = TIME_RE.match(s)
    if m:
        return int(m.group(1)) * 60 + int(m.group(2))
    try:
        return int(float(s))
    except ValueError:
        return 0


def _optional_int(raw):
    """'9' → 9；NaN / '*' 等非数字 → None。"""
    if pd.isna(raw):
        return None
    try:
        return int(float(str(raw).strip()))
    except ValueError:
        return None


def parse_submission(raw):
    """
    解析 DOMjudge 提交记录为项目提交结构。
      'AC/1/0:26:17' → {status: solved, attempts: 1, time: 26}
      'FB/2/2:19:30' → {status: solved, attempts: 2, time: 139}（首次通关也是一次通过）
      'RJ/6'         → {status: unsolved, attempts: 6, time: None}
      NaN / ''       → {status: none, attempts: 0, time: None}
    """
    if pd.isna(raw):
        return {"status": "none", "attempts": 0, "time": None}
    m = SUBMISSION_RE.match(str(raw).strip())
    if not m:
        return {"status": "none", "attempts": 0, "time": None}
    token, attempts, h, mi, _sec = m.groups()
    attempts = int(attempts)
    if token.upper() in SOLVED_TOKENS:
        time = int(h) * 60 + int(mi) if h is not None else None
        return {"status": "solved", "attempts": attempts, "time": time}
    return {"status": "unsolved", "attempts": attempts, "time": None}


def parse_rank_medal(raw):
    """'# ' 列 → (排名, 英文奖牌)。'1 (金奖)' → (1, 'Gold')；'*' → (None, None)。"""
    if pd.isna(raw):
        return None, None
    s = str(raw).strip()
    m = re.search(r"[（(](.+?)[）)]", s)
    medal = MEDAL_MAP.get(m.group(1).strip()) if m else None
    num = re.match(r"^(\d+)", s)
    rank = int(num.group(1)) if num else None
    return rank, medal


def _medal_from_row(row, col_idxs):
    """从若干排名列中提取第一个可识别的奖牌标注。

    常规榜的奖牌在 '# ' 列；CCPC 总决赛榜（2024 广州）无 '# ' 列，
    奖牌标注在本科/专科分组排名列 本科# / 专科# 上，R# 只是纯数字总排名。
    """
    for i in col_idxs:
        raw = row.iloc[i]
        if pd.isna(raw):
            continue
        m = re.search(r"[（(](.+?)[）)]", str(raw))
        if m:
            medal = MEDAL_MAP.get(m.group(1).strip())
            if medal:
                return medal
    return None


def _split_members(raw):
    if pd.isna(raw):
        return []
    return [p.strip() for p in str(raw).split(",") if p.strip()]


def read_domjudge_teams(xlsx_path, sheet_name):
    """
    读取 DOMjudge 榜单的一个 sheet（名称由 domjudge_sheet_name 探测），返回与"正式队伍"
    原始行等价的中间结构列表: { rank, org_rank, medal, school, team, members[], coaches[],
    solved, penalty, problems }。
    题目键取自榜单实际出现的题列（榜单题数逐年不同，2026 网络赛已有 14 题到 N）。
    CCPC 总决赛报名单把教练跟在 3 名队员之后（如 2024 广州），超出 3 人的部分归入 coaches。
    """
    df = pd.read_excel(xlsx_path, sheet_name=sheet_name, header=None)
    cols, problem_cols = _header_map(df)
    missing = [c for c in DOMJUDGE_REQUIRED_COLS if c not in cols]
    if missing:
        raise ValueError(f"{xlsx_path} 的 sheet '{sheet_name}' 缺少必需列: {', '.join(missing)}")
    # 排名列: 常规榜用 '# '（官方排名，含奖牌标注）；总决赛榜无 '# '，退回 R#（含专科队的总排名）
    rank_col = cols["#"] if "#" in cols else cols.get("R#", 0)
    # 奖牌可能在 '# ' 或分组排名列（本科# / 专科#）上
    medal_cols = [cols[c] for c in ("#", "本科#", "专科#") if c in cols]
    # S# 列 = 学校排名（UniqByUserField(organization)），仅学校首队有值，NaN 表示非首队
    org_rank_col = cols.get("S#")
    school_col = cols["Organization"]
    team_col = cols["Name"]
    members_col = cols["Team Members"]
    solved_col = cols["Score"]
    penalty_col = cols["Time"]

    teams = []
    for _, row in df.iloc[1:].iterrows():
        school = row.iloc[school_col]
        if pd.isna(school) or not str(school).strip():
            continue
        problems = {}
        for letter, idx in problem_cols:
            problems[letter] = parse_submission(row.iloc[idx])

        solved = row.iloc[solved_col]
        penalty = row.iloc[penalty_col]
        rank, _ = parse_rank_medal(row.iloc[rank_col])
        medal = _medal_from_row(row, medal_cols)
        members = _split_members(row.iloc[members_col])
        teams.append({
            "rank": rank,
            "org_rank": _optional_int(row.iloc[org_rank_col]) if org_rank_col is not None else None,
            "medal": medal,
            "school": str(school).strip(),
            "team": str(row.iloc[team_col]).strip() if pd.notna(row.iloc[team_col]) else "",
            "members": members[:3],
            "coaches": members[3:],
            "solved": int(float(solved)) if pd.notna(solved) else 0,
            "penalty": _minutes(penalty) if pd.notna(penalty) else 0,
            "problems": problems,
        })

    # 总决赛榜（2024 广州）无 '# ' 列，R# 是含打星队伍的完整榜排名，官方队序号有空洞；
    # 按榜单行序以 (solved, penalty) 重算官方标准竞赛排名——该公式在带 '# ' 列的榜单上
    # 与 '# ' 列完全一致（已对 2020 北京/2022 威海/2022 上海/2024 西安/2025 南阳验证）
    if "#" not in cols:
        last_key, last_rank = None, 0
        for i, t in enumerate(teams):
            key = (t["solved"], t["penalty"])
            if key != last_key:
                last_rank, last_key = i + 1, key
            t["rank"] = last_rank
    return teams


def read_domjudge_girl_teams(xlsx_path):
    """从"女队"/"Female" sheet 提取 (学校, 队名) 集合，用于给对应队伍打 girl 标记。"""
    xls = pd.ExcelFile(xlsx_path)
    girl_sheet = next((n for n in ("女队", "Female") if n in xls.sheet_names), None)
    if girl_sheet is None:
        return set()
    df = pd.read_excel(xls, sheet_name=girl_sheet, header=None)
    cols, _ = _header_map(df)
    school_col = cols.get("Organization")
    team_col = cols.get("Name")
    if school_col is None or team_col is None:
        return set()
    result = set()
    for _, row in df.iloc[1:].iterrows():
        school, team = row.iloc[school_col], row.iloc[team_col]
        if pd.notna(school) and pd.notna(team):
            result.add((str(school).strip(), str(team).strip()))
    return result
