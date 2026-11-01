#!/usr/bin/env python3
"""
遍历所有年份的 xlsx 文件，提取 (学校, 姓名) 二元组，去重后输出到 players.json。
"""

import json
import pandas as pd
from pathlib import Path

from domjudge import is_domjudge_format, domjudge_sheet_name, read_domjudge_teams
from team_members import supplement_members
from iccpc_rank import read_iccpc_teams

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "players.json"


def main():
    xcpc_dir = ROOT / "xcpc"
    if not xcpc_dir.exists():
        print("错误: xcpc 目录不存在")
        return

    year_dirs = sorted([d for d in xcpc_dir.iterdir() if d.is_dir() and d.name.isdigit()])
    if not year_dirs:
        print("错误: xcpc 下未找到年份目录")
        return

    print(f"找到年份目录: {[d.name for d in year_dirs]}")

    pairs = set()

    for year_dir in year_dirs:
        year = year_dir.name
        xlsx_files = sorted([*year_dir.glob("*.xlsx"), *year_dir.glob("*.rank.json")])
        if not xlsx_files:
            print(f"跳过: {year} 目录下未找到 xlsx 文件")
            continue

        print(f"处理 {year} 年...")
        for xlsx_path in xlsx_files:
            if xlsx_path.name.startswith("~$"):
                continue  # Excel 锁文件
            try:
                if xlsx_path.name.endswith(".rank.json"):
                    for team in read_iccpc_teams(xlsx_path):
                        for member in team["members"]:
                            pairs.add((team["school"], member))
                    continue
                xls = pd.ExcelFile(xlsx_path)
                if "正式队伍" not in xls.sheet_names:
                    # DOMjudge 榜单导出: 从探测到的榜单表提取队员
                    sheet = domjudge_sheet_name(xls)
                    if sheet:
                        for t in read_domjudge_teams(xlsx_path, sheet):
                            for member in t["members"]:
                                pairs.add((t["school"], member))
                    continue
                for sheet_name in xls.sheet_names:
                    if sheet_name != "正式队伍":
                        continue
                    df = pd.read_excel(xls, sheet_name=sheet_name, header=1)
                    df = supplement_members(df, xlsx_path)
                    for _, row in df.iterrows():
                        school = row.get("Organization")
                        if pd.isna(school):
                            continue
                        school = str(school).strip()
                        for col in ["Member1", "Member2", "Member3"]:
                            name = row.get(col)
                            if pd.notna(name):
                                pairs.add((school, str(name).strip()))
            except Exception as e:
                print(f"  警告: 处理 {xlsx_path.name} 时出错: {e}")

    result = sorted(pairs, key=lambda x: (x[0], x[1]))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n共提取 {len(result)} 个去重选手 (学校+姓名)")
    print(f"输出: {OUTPUT}")


if __name__ == "__main__":
    main()
