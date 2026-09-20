#!/usr/bin/env python3
"""
将 ICPC/CCPC xlsx 文件转换为前端可用的 JSON 数据。
支持多年份数据，遍历 xcpc/ 下所有年份目录。
输出目录: web/public/data/{year}/
"""

import os
import re
import json
import sys
import shutil
import pandas as pd
from pathlib import Path

from domjudge import is_domjudge_format, domjudge_sheet_name, read_domjudge_teams, read_domjudge_girl_teams

# 项目根目录
ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "web" / "public" / "data"

# 题号列表
PROBLEM_LETTERS = list("ABCDEFGHIJKLMN")

# 城市名称映射（英文小写 → 中文）
CITY_MAP = {
    "kunming": "昆明",
    "jinan": "济南",
    "nanjing": "南京",
    "nanyang": "南阳",
    "shanghai": "上海",
    "shenyang": "沈阳",
    "beijing": "北京",
    "guangzhou": "广州",
    "chengdu": "成都",
    "wuhan": "武汉",
    "xian": "西安",
    "hangzhou": "杭州",
    "chongqing": "重庆",
    "haerbin": "哈尔滨",
    "harbin": "哈尔滨",
    "zhengzhou": "郑州",
    "weihai": "威海",
    "qinhuangdao": "秦皇岛",
    "changchun": "长春",
    "mianyang": "绵阳",
    "hefei": "合肥",
    "xiamen": "厦门",
    "dalian": "大连",
    "changsha": "长沙",
    "taiyuan": "太原",
    "lanzhou": "兰州",
    "nanning": "南宁",
    "guiyang": "贵阳",
    "kunshan": "昆山",
    "yinchuan": "银川",
    "urumqi": "乌鲁木齐",
    "fuzhou": "福州",
    "guilin": "桂林",
    "shenzhen": "深圳",
    "final": "总决赛",
}

# 中文城市名 → 英文 ID 映射
CN_TO_ID = {v: k for k, v in CITY_MAP.items()}

# "年份/文件名" → 赛区身份的显式覆盖 (org, contest_id, city_cn, name)。
# 用于文件名无法自解释的情况。如 2020/2021/2024 年 CCPC 总决赛以举办城市命名
# （分站赛齐备 + 总决赛规模的队伍数可辨认为总决赛），故保留 id "final" 并将显示名改为城市。
# 2022 年总决赛以 "ccpc final" 命名但举办地同样在广州，且同年已有 id "guangzhou"
# 的普通分站，显示名加"（总决赛）"后缀消歧义。
FILENAME_OVERRIDES = {
    "2020/ccpc beijing.xlsx": ("CCPC", "final", "北京", "CCPC 北京"),
    "2021/ccpc nanjing.xlsx": ("CCPC", "final", "南京", "CCPC 南京"),
    "2022/ccpc final.xlsx": ("CCPC", "final", "广州", "CCPC 广州（总决赛）"),
    "2024/ccpc guangzhou.xlsx": ("CCPC", "final", "广州", "CCPC 广州"),
    # 网络预选赛为线上赛，无举办城市，city_cn 用"网络"占位；ICPC 网络预选赛
    # 每年两场，文件名以数字区分场次，id 同步带场次号。
    "2026/ccpc online.xlsx": ("CCPC", "online", "网络", "CCPC 网络预选赛"),
    "2026/icpc online 1.xlsx": ("ICPC", "online1", "网络", "ICPC 网络预选赛（第一场）"),
    "2026/icpc online 2.xlsx": ("ICPC", "online2", "网络", "ICPC 网络预选赛（第二场）"),
}


def parse_submission(raw):
    """
    解析提交记录，返回结构化数据。
    格式示例:
      '+1(170)' -> {status: 'solved', attempts: 2, time: 170}
      '-1'      -> {status: 'unsolved', attempts: 1, time: null}
      '-5'      -> {status: 'unsolved', attempts: 5, time: null}
      '-'       -> {status: 'none', attempts: 0, time: null}
    """
    if pd.isna(raw):
        return {"status": "none", "attempts": 0, "time": None}

    raw = str(raw).strip()

    # 通过: +N(M) 表示第N+1次提交正确，用时M分钟
    m = re.match(r'\+(\d+)\((\d+)\)', raw)
    if m:
        return {
            "status": "solved",
            "attempts": int(m.group(1)) + 1,
            "time": int(m.group(2))
        }

    # 未通过但有提交: -N
    m = re.match(r'-(\d+)', raw)
    if m:
        return {
            "status": "unsolved",
            "attempts": int(m.group(1)),
            "time": None
        }

    # 未提交: -
    if raw == '-':
        return {"status": "none", "attempts": 0, "time": None}

    # 数字形式（某些文件可能直接是 -1, -5 等整数）
    try:
        val = int(float(raw))
        if val < 0:
            return {"status": "unsolved", "attempts": abs(val), "time": None}
        elif val == 0:
            return {"status": "none", "attempts": 0, "time": None}
    except (ValueError, TypeError):
        pass

    return {"status": "none", "attempts": 0, "time": None}


def parse_team(row, problem_cols, has_coaches=False, oi_records=None):
    """将一行数据解析为队伍记录。题号键取自表内实际存在的题列（题数逐年不同）。"""
    problems = {letter: parse_submission(row[letter]) for letter in problem_cols}

    school = str(row["Organization"]).strip() if pd.notna(row["Organization"]) else ""
    members = []
    for col in ["Member1", "Member2", "Member3"]:
        if col in row and pd.notna(row[col]):
            name = str(row[col]).strip()
            key = f"{name}@{school}"
            oi = oi_records.get(key, []) if oi_records else []
            members.append({"name": name, "oi": oi})

    coaches = []
    if has_coaches and "Coaches" in row and pd.notna(row["Coaches"]):
        coaches.append(str(row["Coaches"]).strip())

    record = {
        "rank": int(row["Rank"]) if pd.notna(row["Rank"]) else None,
        "org_rank": int(row["Organization Rank"]) if pd.notna(row.get("Organization Rank")) else None,
        "school": school,
        "team": str(row["Team"]).strip() if pd.notna(row["Team"]) else "",
        "solved": int(row["Solved"]) if pd.notna(row["Solved"]) else 0,
        "penalty": int(row["Penalty"]) if pd.notna(row["Penalty"]) else 0,
        "problems": problems,
        "members": members,
        "unofficial": str(row.get("Unofficial", "N")).strip().upper() == "Y",
        "girl": str(row.get("Girl", "N")).strip().upper() == "Y",
        "icpc_id": str(row["ICPC ID"]).strip() if pd.notna(row.get("ICPC ID")) else None,
    }

    if has_coaches:
        record["coaches"] = coaches

    if "Medal" in row and pd.notna(row.get("Medal")):
        record["medal"] = str(row["Medal"]).strip()

    return record


def detect_problem_columns(columns):
    """从列名中识别题目列（A~M）。"""
    return [c for c in columns if c in PROBLEM_LETTERS]


def parse_contest_filename(filename):
    """
    从文件名解析赛区信息。
    支持多种格式:
      - "ICPC kunming.xlsx"
      - "第 46 届 ICPC 亚洲区域赛（昆明）正式赛.xlsx"
      - "第 47 届国际大学生程序设计竞赛亚洲区域赛南京站（正式赛）.xlsx"
      - "第 48 届 ICPC 国际大学生程序设计竞赛区域赛杭州站 - 正式赛.xlsx"
      - "The 46th ICPC Asia Jinan Regional Contest - Contest Session.xlsx"
      - "The 48th ICPC Asia East Continent Final Contest.xlsx"
    返回: (org, contest_id, city_cn, name)
    """
    stem = Path(filename).stem

    # 判断组织类型
    org = "ICPC"  # 默认 ICPC
    stem_lower = stem.lower()
    if "ccpc" in stem_lower:
        org = "CCPC"
    elif "icpc" in stem_lower:
        org = "ICPC"

    # 尝试从中文文件名中提取城市
    # 模式1: 括号中的城市名 （城市）
    m = re.search(r'[（(](\w+)[）)]', stem)
    if m:
        city_cn = m.group(1)
        if city_cn in CN_TO_ID:
            contest_id = CN_TO_ID[city_cn]
            name = f"{org} {city_cn}"
            return org, contest_id, city_cn, name

    # 模式2: "城市站" 格式
    for city_cn, city_id in CN_TO_ID.items():
        if city_cn in stem and city_cn != "总决赛":
            # 确认是城市名而不是其他词
            if f"{city_cn}站" in stem or f"{city_cn}赛" in stem or f"赛{city_cn}" in stem:
                contest_id = city_id
                name = f"{org} {city_cn}"
                return org, contest_id, city_cn, name
            # 检查是否是独立的城市名
            idx = stem.find(city_cn)
            if idx >= 0:
                # 检查前后字符
                before = stem[idx-1] if idx > 0 else ""
                after = stem[idx+len(city_cn)] if idx+len(city_cn) < len(stem) else ""
                if (not before or not before.isalnum()) and (not after or not after.isalnum()):
                    contest_id = city_id
                    name = f"{org} {city_cn}"
                    return org, contest_id, city_cn, name

    # 模式3: 英文格式 "ICPC kunming" 或 "The 46th ICPC Asia Jinan Regional Contest"
    parts = stem.split()
    if len(parts) >= 2:
        # 检查是否有英文城市名
        for part in parts:
            part_lower = part.lower()
            if part_lower in CITY_MAP and part_lower != "final":
                city_cn = CITY_MAP[part_lower]
                contest_id = part_lower
                name = f"{org} {city_cn}"
                return org, contest_id, city_cn, name

    # 模式4: "Final" 或 "final"
    if "final" in stem_lower:
        return org, "final", "总决赛", f"{org} 总决赛"

    # 模式5: 简单格式 "CCPC final"
    if len(parts) >= 2:
        contest_id = parts[-1].lower()
        if contest_id in CITY_MAP:
            city_cn = CITY_MAP[contest_id]
            name = f"{org} {city_cn}"
            return org, contest_id, city_cn, name

    return None


def load_oi_records(year):
    """加载指定年份的 OI 奖项记录。"""
    oi_path = OUTPUT_DIR / str(year) / "oi_records.json"
    if not oi_path.exists():
        # 尝试根目录
        oi_path = ROOT / "oi_records.json"
    if not oi_path.exists():
        print(f"警告: {year} 年 OI 记录不存在，跳过 OI 记录嵌入")
        return {}
    if not (OUTPUT_DIR / str(year) / "oi_records.json").exists():
        # 根目录 oi_records.json 是未按年份过滤的旧文件，新年份用它嵌入会把
        # 不在大学年份窗口内的记录挂上去；应先跑 extract_oi_records.py 生成按年文件
        print(f"警告: {year} 年缺少按年 oi_records.json，正在回退到根目录旧文件（未按年份过滤，结果可能不准）")
    with open(oi_path, "r", encoding="utf-8") as f:
        return json.load(f)


def convert_domjudge_file(xlsx_path, oi_records):
    """
    转换 DOMjudge 榜单导出格式的 xlsx。
    榜单表（Official/Main）→ "正式队伍"，女队表用于 girl 标记，打星队伍不转换（与原格式行为一致）。
    """
    girl_set = read_domjudge_girl_teams(xlsx_path)

    sheet = domjudge_sheet_name(pd.ExcelFile(xlsx_path))
    if sheet is None:
        raise ValueError(f"{xlsx_path}: 未找到 DOMjudge 榜单 sheet (Official/Main)")

    teams = []
    for raw in read_domjudge_teams(xlsx_path, sheet):
        members = []
        for name in raw["members"]:
            key = f"{name}@{raw['school']}"
            members.append({"name": name, "oi": oi_records.get(key, [])})

        record = {
            "rank": raw["rank"],
            "org_rank": raw["org_rank"],
            "school": raw["school"],
            "team": raw["team"],
            "solved": raw["solved"],
            "penalty": raw["penalty"],
            "problems": raw["problems"],
            "members": members,
            "unofficial": False,
            "girl": (raw["school"], raw["team"]) in girl_set,
            "icpc_id": None,
        }
        if raw["medal"]:
            record["medal"] = raw["medal"]
        if raw["coaches"]:
            record["coaches"] = raw["coaches"]
        teams.append(record)

    print(f"  DOMjudge 格式 ({sheet}): {len(teams)} 支队伍")
    return {"正式队伍": teams}


def convert_file(xlsx_path, contest_id, org, city_cn, name, oi_records):
    """转换单个 xlsx 文件为 JSON。"""
    xls = pd.ExcelFile(xlsx_path)
    result = {
        "id": contest_id,
        "org": org,
        "city_cn": city_cn,
        "name": name,
        "sheets": {}
    }

    if "正式队伍" in xls.sheet_names:
        for sheet_name in xls.sheet_names:
            if sheet_name != "正式队伍":
                continue
            df = pd.read_excel(xls, sheet_name=sheet_name, header=1)
            if len(df) == 0:
                continue

            problem_cols = detect_problem_columns(df.columns.tolist())
            has_coaches = "Coaches" in df.columns

            teams = []
            for _, row in df.iterrows():
                try:
                    team = parse_team(row, problem_cols, has_coaches, oi_records)
                    teams.append(team)
                except Exception as e:
                    print(f"  警告: 跳过一行 ({sheet_name}): {e}")

            result["sheets"][sheet_name] = teams
            print(f"  {sheet_name}: {len(teams)} 支队伍")
    elif is_domjudge_format(xls):
        result["sheets"] = convert_domjudge_file(xlsx_path, oi_records)
    else:
        print(f"  警告: 未找到 正式队伍 sheet，也不是 DOMjudge 格式，跳过转换")

    return result


def process_year(year_dir):
    """处理单个年份目录。全部 xlsx 转换成功才清理并写入输出；任一失败则该年份不落盘。"""
    year = year_dir.name
    print(f"\n{'='*50}")
    print(f"处理 {year} 年数据")
    print(f"{'='*50}")

    # 跳过 Excel 锁文件（源文件正被 Excel 打开时出现的 ~$ 临时文件）
    # 文件名字典序决定赛区在列表中的显示顺序；忽略大小写，使小写命名（如 "2025 ccpc nanyang"）
    # 与同类命名相邻，而不是按 ASCII 排到全部大写命名之后
    xlsx_files = sorted(
        (p for p in year_dir.glob("*.xlsx") if not p.name.startswith("~$")),
        key=lambda p: p.name.lower(),
    )
    if not xlsx_files:
        print(f"警告: {year} 目录下未找到 xlsx 文件")
        return []

    # 加载该年份的 OI 记录
    oi_records = load_oi_records(year)

    seen_ids = {}
    converted = []
    failures = []

    for xlsx_path in xlsx_files:
        # 解析文件名获取赛区信息
        override_key = f"{year}/{xlsx_path.name}"
        if override_key in FILENAME_OVERRIDES:
            org, contest_id, city_cn, name = FILENAME_OVERRIDES[override_key]
        else:
            result = parse_contest_filename(xlsx_path.name)
            if result is None:
                print(f"跳过: {xlsx_path.name} (无法解析赛区)")
                continue
            org, contest_id, city_cn, name = result

        if contest_id in seen_ids:
            print(f"错误: {xlsx_path.name} 的赛区 id '{contest_id}' 与 {seen_ids[contest_id]} 重复")
            failures.append(f"{xlsx_path.name}: 赛区 id '{contest_id}' 与 {seen_ids[contest_id]} 重复")
            continue
        seen_ids[contest_id] = xlsx_path.name

        print(f"处理: {xlsx_path.name} -> {contest_id}.json")

        try:
            data = convert_file(xlsx_path, contest_id, org, city_cn, name, oi_records)
        except Exception as e:
            print(f"错误: 转换 {xlsx_path.name} 失败: {e}")
            failures.append(f"{xlsx_path.name}: {e}")
            continue

        converted.append((contest_id, org, city_cn, name, data))

    if failures:
        print(f"\n错误: {year} 年有 {len(failures)} 个文件处理失败，本次不写入该年份的任何输出:")
        for msg in failures:
            print(f"  - {msg}")
        return None

    if not converted:
        print(f"错误: {year} 年没有成功转换任何赛区，不写入任何输出")
        return None

    # 创建年份输出目录
    year_output = OUTPUT_DIR / year
    year_output.mkdir(parents=True, exist_ok=True)

    # 清理旧输出（保留 oi_records.json），使已删除的源文件不再留下孤儿 JSON
    for old in year_output.glob("*.json"):
        if old.name != "oi_records.json":
            old.unlink()

    contests_index = []
    for contest_id, org, city_cn, name, data in converted:
        # 写入单赛区 JSON
        output_path = year_output / f"{contest_id}.json"
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        # 构建索引
        total_teams = len(data["sheets"].get("正式队伍", []))
        top_team = data["sheets"].get("正式队伍", [{}])[0] if data["sheets"].get("正式队伍") else {}

        contests_index.append({
            "id": contest_id,
            "name": name,
            "org": org,
            "city": city_cn,
            "teams": total_teams,
            "champion": {
                "school": top_team.get("school", ""),
                "team": top_team.get("team", ""),
                "solved": top_team.get("solved", 0),
                "penalty": top_team.get("penalty", 0),
            } if top_team else None
        })

    # 写入该年份的索引文件
    index_path = year_output / "contests.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(contests_index, f, ensure_ascii=False, indent=2)

    print(f"\n{year} 年完成! 共转换 {len(contests_index)} 个赛区")
    return contests_index


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 查找所有年份目录
    xcpc_dir = ROOT / "xcpc"
    if not xcpc_dir.exists():
        print("错误: xcpc 目录不存在")
        return

    year_dirs = sorted([d for d in xcpc_dir.iterdir() if d.is_dir() and d.name.isdigit()])
    if not year_dirs:
        print("错误: xcpc 下未找到年份目录")
        return

    print(f"找到年份目录: {[d.name for d in year_dirs]}")

    # 处理每个年份；失败的年份不写入任何输出，最后统一报错退出
    all_years = []
    failed_years = []
    for year_dir in year_dirs:
        contests = process_year(year_dir)
        if contests is None:
            failed_years.append(year_dir.name)
        elif contests:
            all_years.append({
                "year": int(year_dir.name),
                "contest_count": len(contests),
                "total_teams": sum(c["teams"] for c in contests),
            })

    if failed_years:
        print(f"\n错误: 以下年份处理失败，未写入任何输出: {', '.join(failed_years)}")
        sys.exit(1)

    # 生成全局 years.json 索引
    years_path = OUTPUT_DIR / "years.json"
    with open(years_path, "w", encoding="utf-8") as f:
        json.dump(all_years, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*50}")
    print(f"全部完成! 共处理 {len(all_years)} 个年份")
    print(f"年份索引: {years_path}")


if __name__ == "__main__":
    main()
