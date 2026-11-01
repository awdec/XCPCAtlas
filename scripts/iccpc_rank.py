"""读取 rank.iccpc.cn 的完整赛后 JSON 快照（单赛事归属）。

对齐其 rank_core.js / rank_tool.js：CE 不计提交，首次 AC 后忽略提交，
罚时先按秒求和再取整分钟；打星不排名，无提交队伍不进入榜单。
"""

import json
import re
from datetime import datetime
from pathlib import Path


def read_iccpc_teams(path):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    contest = data["contest"]
    if data.get("is_multi_group") or len(data.get("contest_group", [])) > 1:
        raise ValueError("暂不支持多赛事归属榜单")
    if data.get("ccpc_meta", {}).get("view") != "referee":
        raise ValueError("需要题号及判题结果完整公开的赛后快照")
    start = datetime.fromisoformat(contest["start_time"])
    end = datetime.fromisoformat(contest["end_time"])
    problems = {p["problem_id"]: chr(65 + p["num"]) for p in data["problem"]}
    if sorted(problems.values()) != [chr(65 + i) for i in range(len(problems))]:
        raise ValueError("题号缺失或重复")
    teams = {t["team_id"]: t for t in data["team"]}
    if len(teams) != len(data["team"]):
        raise ValueError("队伍编号重复")
    active = set()
    stats = {}
    for submission in sorted(data["solution"], key=lambda s: (s["in_date"], s["solution_id"])):
        team_id, problem_id = submission["team_id"], submission["problem_id"]
        if team_id not in teams or problem_id not in problems:
            raise ValueError("提交引用了未知队伍或题目")
        submitted_at = datetime.fromisoformat(submission["in_date"])
        if not start <= submitted_at < end:
            raise ValueError("提交时间不在比赛范围内")
        active.add(team_id)  # CE 也算有提交，保留这类零题队伍。
        result = submission["result"]
        if result < 4 or result > 11:
            raise ValueError("榜单包含未判定或隐藏结果，不能导入为最终成绩")
        if result == 11:
            continue
        key = (team_id, problem_id)
        p = stats.setdefault(key, {"status": "unsolved", "attempts": 0, "seconds": None})
        if p["status"] == "solved":
            continue
        p["attempts"] += 1
        if result == 4:
            p["status"] = "solved"
            p["seconds"] = int((submitted_at - start).total_seconds())

    ranked = []
    for team_id, team in teams.items():
        if team["tkind"] not in (0, 1, 2):
            raise ValueError("未知队伍类型")
        if team_id not in active or team["tkind"] == 2:
            continue
        solved, penalty_seconds = 0, 0
        submissions = {}
        for problem_id, letter in sorted(problems.items(), key=lambda item: item[1]):
            p = stats.get((team_id, problem_id))
            submissions[letter] = {
                "status": p["status"] if p else "none",
                "attempts": p["attempts"] if p else 0,
                "time": p["seconds"] // 60 if p and p["seconds"] is not None else None,
            }
            if p and p["status"] == "solved":
                solved += 1
                penalty_seconds += p["seconds"] + (p["attempts"] - 1) * 1200
        members = [n.strip() for n in re.split(r"[、,，]", team["tmember"]) if n.strip()]
        if not 1 <= len(members) <= 3:
            raise ValueError(f"队员人数异常: {team_id}")
        record = {
            "rank": None, "org_rank": None,
            "school": team["school"].strip(), "team": team["name"].strip(),
            "solved": solved, "penalty": penalty_seconds // 60,
            "problems": submissions, "members": members,
            "unofficial": False, "girl": team["tkind"] == 1,
            "icpc_id": None, "team_id": team_id,
            "coaches": [n.strip() for n in re.split(r"[、,，]", team.get("coach", "")) if n.strip()],
        }
        ranked.append((record, penalty_seconds))
    ranked.sort(key=lambda item: (-item[0]["solved"], item[1], item[0]["team_id"]))

    mode = int(contest.get("flg_award_base", 0))
    if mode == 0:
        base = sum(r["solved"] > 0 for r, _ in ranked)
    elif mode == 1:
        base = len(ranked)
    elif mode == 2:
        base = sum(t["tkind"] != 2 for t in teams.values())
    else:
        raise ValueError("未知奖牌基数口径")
    packed = int(contest["award_ratio"])
    ratios = [packed % 1000, packed // 1000 % 1000, packed // 1000000 % 1000]
    quantity_mode = int(contest.get("flg_award_qty_mode", 0))
    if quantity_mode not in (0, 1):
        raise ValueError("未知奖牌名额模式")
    cutoffs, cumulative = [], 0
    for ratio in ratios:
        cumulative += ratio if quantity_mode else min(100, ratio)
        cutoffs.append(min(base, cumulative) if quantity_mode else (base * cumulative + 99) // 100)
    last_key, last_rank, schools = None, 0, set()
    for order, (record, _) in enumerate(ranked, 1):
        key = (record["solved"], record["penalty"])
        if key != last_key:
            last_rank, last_key = order, key
        record["rank"] = last_rank
        if record["school"] not in schools:
            schools.add(record["school"])
            record["org_rank"] = len(schools)
        record["medal"] = next(
            (medal for cutoff, medal in zip(cutoffs, ("Gold", "Silver", "Bronze")) if last_rank <= cutoff),
            "Honorable",
        )
    return [record for record, _ in ranked]
