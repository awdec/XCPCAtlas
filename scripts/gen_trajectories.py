#!/usr/bin/env python3
"""
从 web/public/data 的各年份赛区 JSON 预计算「选手五年奖牌轨迹」表，
供数据分析页「轨迹分析」tab 直接读取（前端只读不算）。

口径：
- 选手判重：学校+姓名（name@school），与全站一致
- 统计范围：页面年 Y 的前五年窗口 [Y-4, Y]，窗口外的年份一律不进数据
- 人群：当年（Y）获奖（金/银/铜）的选手；当年未参赛或最高仅铁牌者不计入
  （从未获奖的选手不会出现在任何一页）
- 第一年 = 选手在窗口内首次参赛的年份；从该年起连续 5 个年度，
  每格取该年所有赛区的最高奖牌档（与前端 analysis.js 的 medalTier 一致，
  Honorable / 无奖牌 = 铁），未参赛记 'none'（前端显示为 \\）
- 至今累计数（选手分析）：自 2020 年至页面年（含），按学校+姓名取截至该年的
  最高金/银/铜，不受五年窗口限制，不计入页面年之后的记录
- 行按选手数降序，并列按 金>银>铜>铁>\\ 稳定排序；count 为 0 的组合不输出

注意：convert_xlsx.py 重跑会清空年份目录（仅保留 oi_records.json），
本脚本须在 convert 之后运行，否则轨迹数据缺失（页面显示「暂不可用」）。
"""

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "web" / "public" / "data"

TIER_RANK = {"gold": 0, "silver": 1, "bronze": 2, "iron": 3}
NONE_RANK = 4  # 'none'（未参赛）排在所有奖牌档之后，仅用于排序


def medal_tier(medal):
    """与前端 analysis.js 的 medalTier 完全一致：Honorable/缺失 -> iron"""
    if not medal:
        return "iron"
    m = medal.lower()
    if "gold" in m:
        return "gold"
    if "silver" in m:
        return "silver"
    if "bronze" in m:
        return "bronze"
    return "iron"


def load_year_players(year):
    """读某年全部赛区，返回 {name@school: 当年最高奖牌档}"""
    players = {}
    index_path = DATA_DIR / str(year) / "contests.json"
    if not index_path.exists():
        return players
    index = json.loads(index_path.read_text(encoding="utf-8"))
    for contest in index:
        path = DATA_DIR / str(year) / f"{contest['id']}.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        for row in data.get("sheets", {}).get("正式队伍", []):
            tier = medal_tier(row.get("medal"))
            for member in row.get("members", []):
                key = f"{member['name']}@{row['school']}"
                if key not in players or TIER_RANK[tier] < TIER_RANK[players[key]]:
                    players[key] = tier
    return players


def compute_all_time_best_tiers(year_players, end_year):
    """2020 至 end_year（含），每个学校+姓名身份只计入区间最高奖牌档。"""
    best_tiers = {}
    for year, players in year_players.items():
        if not 2020 <= year <= end_year:
            continue
        for key, tier in players.items():
            if key not in best_tiers or TIER_RANK[tier] < TIER_RANK[best_tiers[key]]:
                best_tiers[key] = tier

    counts = {t: 0 for t in ("gold", "silver", "bronze")}
    for tier in best_tiers.values():
        if tier in counts:
            counts[tier] += 1
    return counts


def main():
    year_dirs = sorted([d for d in DATA_DIR.iterdir() if d.is_dir() and d.name.isdigit()])
    if not year_dirs:
        print("错误: web/public/data 下未找到年份目录")
        return
    years = [int(d.name) for d in year_dirs]
    print(f"找到年份: {years}")

    # 每年 {选手: 当年最高档} 只加载一次，供各页面年窗口复用
    year_players = {y: load_year_players(y) for y in years}

    for page_year in years:
        window_start = page_year - 4
        avail = [y for y in years if window_start <= y <= page_year]
        all_time_best_tiers = compute_all_time_best_tiers(year_players, page_year)

        # 仅统计当年获奖（金/银/铜）的选手；轨迹仍从窗口内首次参赛年锚定
        counter = defaultdict(list)
        total = 0
        for key, tier_now in year_players[page_year].items():
            if tier_now == "iron":
                continue  # 当年最高仅铁牌（未获奖）；当年未参赛者本就不在其中
            by_year = {y: year_players[y][key] for y in avail if key in year_players[y]}
            first = min(by_year)  # 当年必有参赛记录，by_year 非空
            tiers = tuple(by_year.get(first + i, "none") for i in range(5))
            name, school = key.rsplit("@", 1)
            counter[tiers].append([school, name])
            total += 1

        rows = [
            {
                "tiers": list(tiers),
                "count": len(players),
                "players": sorted(players),
            }
            for tiers, players in sorted(
                counter.items(),
                key=lambda kv: (
                    -len(kv[1]),
                    tuple(NONE_RANK if t == "none" else TIER_RANK[t] for t in kv[0]),
                ),
            )
        ]

        # 「第一次最高获奖」：当年获奖（金/银/铜）且当年档位严格超过此前所有年份
        # （数据范围内 Y 之前的全部年份，不限窗口）的选手数，供选手分析页使用。
        # 即当年为个人历史最好成绩（含首次获奖）；当年最高仅铁牌者不计入。
        first_best_tiers = {t: 0 for t in ("gold", "silver", "bronze")}
        for key, tier_now in year_players[page_year].items():
            if tier_now == "iron":
                continue
            prior_best_rank = min(
                (
                    TIER_RANK[year_players[y][key]]
                    for y in years
                    if y < page_year and key in year_players[y]
                ),
                default=TIER_RANK["iron"],
            )
            if TIER_RANK[tier_now] < prior_best_rank:
                first_best_tiers[tier_now] += 1

        output = {
            "window": [window_start, page_year],
            "years": avail,
            "total": total,
            "first_best_tiers": first_best_tiers,
            "all_time_best_tiers": all_time_best_tiers,
            "rows": rows,
        }
        out_path = DATA_DIR / str(page_year) / "trajectories.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print(
            f"{page_year}: 窗口 {window_start}-{page_year}（有数据 {avail}），"
            f"当年获奖选手 {total} 人，非零轨迹 {len(rows)} 行，"
            f"截至当年累计 {all_time_best_tiers}"
        )

    print(f"\n输出: {DATA_DIR}/<year>/trajectories.json")


if __name__ == "__main__":
    main()
