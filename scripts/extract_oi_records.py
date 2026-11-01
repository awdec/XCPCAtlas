#!/usr/bin/env python3
"""
为 players.json 中的每个选手，从 raw.txt 中提取有效 OI 奖项记录。
规则：按 OI 比赛年级推算 XCPC 当年年级；通常为大一~大五，
西安交通大学、中国科学技术大学放宽为高一~大五。
输出：web/public/data/{year}/oi_records.json
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "raw.txt"
PLAYERS = ROOT / "players.json"
OUTPUT_DIR = ROOT / "web" / "public" / "data"

# 按 XCPC 所属学校应用；大学年级 0/-1/-2 分别对应推算高三/高二/高一。
HIGH_SCHOOL_WINDOW_SCHOOLS = {"西安交通大学", "中国科学技术大学"}


def parse_grade(grade_str):
    """解析年级，返回学制编号（高一=10, 高二=11, 高三=12, 初三=9, 初二=8, 初一=7）。"""
    grade_str = grade_str.strip()
    if not grade_str:
        return None
    cn_map = {'一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6}
    # 高中: 高一~高三
    if '高' in grade_str:
        for ch, num in cn_map.items():
            if ch in grade_str:
                return num + 9
        if grade_str.isdigit() and 9 <= int(grade_str) <= 12:
            return int(grade_str)
    # 初中: 初一~初四
    if '初' in grade_str:
        for ch, num in cn_map.items():
            if ch in grade_str:
                return num + 6  # 初一=7, 初二=8, 初三=9, 初四=10
    # 数字年级: 七~九年级
    grade_map = {'七': 7, '八': 8, '九': 9}
    for ch, num in grade_map.items():
        if ch in grade_str:
            return num
    # 阿拉伯数字（6~9 可能是初中）
    if grade_str.isdigit():
        v = int(grade_str)
        if 7 <= v <= 12:
            return v
    return None


def is_spring_competition(comp_name):
    """判断是否为上半年比赛（WC/APIO/NOI），此时年级尚未升级。"""
    name = comp_name.upper()
    return name.startswith('WC') or name.startswith('APIO') or name.startswith('NOI')


def calc_college_year(target_year, comp_year, grade_num, comp_name=''):
    """
    根据比赛年份和年级，推算目标年份的大学年级。
    毕业年 = comp_year + (13 - grade_num)；上半年比赛（WC/APIO/NOI）年级尚未升级，
    先对 grade_num +1 对齐秋季年级，等价于按 (12 - grade_num) 计算。
    大学年级 = target_year - 毕业年 + 1
    """
    if is_spring_competition(comp_name):
        grade_num += 1
    grad_year = comp_year + (13 - grade_num)
    college_year = target_year - grad_year + 1
    return college_year


def extract_oi_records_for_year(target_year):
    """为指定年份提取 OI 记录。"""
    print(f"\n处理 {target_year} 年 OI 记录...")

    with open(PLAYERS, 'r', encoding='utf-8') as f:
        players = json.load(f)

    records = {}
    extended_records = {}
    with open(RAW, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(',')
            if len(parts) < 5:
                continue
            comp_name = parts[0]
            award = parts[1]
            name = parts[2].strip()
            grade = parts[3]
            school = parts[4].strip()

            grade_num = parse_grade(grade)
            if grade_num is None:
                continue

            year_match = re.search(r'(\d{4})', comp_name)
            if not year_match:
                continue
            comp_year = int(year_match.group(1))

            college_year = calc_college_year(target_year, comp_year, grade_num, comp_name)
            if not (-2 <= college_year <= 5):
                continue

            record = {
                "比赛": comp_name,
                "奖项": award,
                "学校": school,
                "年级": grade,
            }
            extended_records.setdefault(name, []).append(record)
            if 1 <= college_year <= 5:
                records.setdefault(name, []).append(record)

    # 已知取舍：上面 records 仅按姓名聚合，因此跨校同名选手会把同一份 OI 记录
    # 挂到每所学校的同名选手上（raw.txt 中无唯一身份标识，无法区分）。
    # 扩展窗口仅按 XCPC 学校选用，不能把两校的额外记录混入普通学校。
    result = {}
    matched = 0
    for school, name in players:
        school_records = extended_records if school in HIGH_SCHOOL_WINDOW_SCHOOLS else records
        if name in school_records:
            key = f"{name}@{school}"
            result[key] = school_records[name]
            matched += 1

    # 输出到年份目录
    year_output = OUTPUT_DIR / str(target_year)
    year_output.mkdir(parents=True, exist_ok=True)
    output_path = year_output / "oi_records.json"

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"选手总数: {len(players)}")
    print(f"符合 OI 年级窗口（两校高一~大五，其他大一~大五）: {matched}")
    print(f"输出: {output_path}")

    return result


def main():
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

    for year_dir in year_dirs:
        year = int(year_dir.name)
        extract_oi_records_for_year(year)

    print(f"\n全部完成! 共处理 {len(year_dirs)} 个年份")


if __name__ == "__main__":
    main()
