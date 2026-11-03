"""Build a reviewable workbook from downloaded public Shanghai 2021 sources.

This is an import preparation artifact. It does not modify xcpc/ or run pipelines.
"""

from collections import Counter, defaultdict
from hashlib import sha256
import json
from pathlib import Path
import sys

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "scripts"))
from convert_xlsx import detect_problem_columns, parse_team  # noqa: E402


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_file(path, url, role):
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "url": url,
        "retrieved_on": "2026-11-03",
        "sha256": sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "role": role,
    }


srk = read_json(HERE / "rankland.srk.json")
board_teams = read_json(HERE / "team.json")
board_runs = read_json(HERE / "run.json")
board_config = read_json(HERE / "config.json")
audit_paths = sorted((ROOT / "output").glob("cpcfinder-48-audit-*.json"))
members = [row for path in audit_paths for row in read_json(path)]
members.sort(key=lambda row: row["index"])
assert len(members) == 682
assert [row["index"] for row in members] == list(range(682))
assert all(row["count"] == 3 and len(row["names"]) == 3 for row in members)
assert all(all(isinstance(name, str) and name.strip() == name and name for name in row["names"]) for row in members)

# These two school aliases affect exactly the six explicitly listed source IDs.
# The contest's school and team text remain unchanged in the workbook.
SCHOOL_ALIASES = {
    "齐鲁工业大学": "齐鲁工业大学（山东省科学院）",
    "中国石油大学(北京)": "中国石油大学（北京）",
}
EXPECTED_ALIAS_IDS = {
    "1030006489", "1030006488", "1030006782",
    "1030006486", "1030006487", "1030006485",
}
member_index = defaultdict(list)
for row in members:
    member_index[row["school"], row["team"]].append(row)
assert all(len(rows) == 1 for rows in member_index.values())

all_rows = srk["rows"]
assert len(all_rows) == 682
assert len({row["user"]["id"] for row in all_rows}) == 682
source_row_index = {row["user"]["id"]: row for row in all_rows}
assert [(-row["score"]["value"], row["score"]["time"][0]) for row in all_rows] == sorted(
    (-row["score"]["value"], row["score"]["time"][0]) for row in all_rows
)
assert srk["sorter"] == {"algorithm": "ICPC", "config": {"penalty": [20, "min"]}}
assert srk["series"][0]["rule"]["options"]["count"]["value"] == [35, 70, 105]
letters = [problem["alias"] for problem in srk["problems"]]
assert letters == list("ABCDEFGHIJKLM")
board_team_index = {str(row["team_id"]): row for row in board_teams}
assert set(board_team_index) == {row["user"]["id"] for row in all_rows}
run_index = defaultdict(list)
for run in board_runs:
    run_index[str(run["team_id"]), int(run["problem_id"])].append(run)

matches = []
alias_matches = []
checked_statuses = 0
official_records = []
seen_schools = set()
previous_score = None
last_rank = 0
for source_position, row in enumerate(all_rows, 1):
    user = row["user"]
    key = (user["organization"], user["name"])
    method = "exact_school_and_team"
    if key not in member_index:
        assert user["id"] in EXPECTED_ALIAS_IDS, user
        key = (SCHOOL_ALIASES[user["organization"]], user["name"])
        method = "explicit_school_alias_and_exact_team"
    candidates = member_index[key]
    assert len(candidates) == 1
    member_row = candidates[0]
    match = {
        "source_user_id": user["id"],
        "source_position": source_position,
        "official": user["official"],
        "source_school": user["organization"],
        "source_team": user["name"],
        "member_source_school": member_row["school"],
        "member_source_team": member_row["team"],
        "member_source_index": member_row["index"],
        "match_method": method,
        "members": member_row["names"],
    }
    matches.append(match)
    if method != "exact_school_and_team":
        alias_matches.append(match)

    board_team = board_team_index[user["id"]]
    assert board_team["name"] == user["name"]
    assert board_team["organization"] == user["organization"]
    assert bool(board_team.get("official", False)) == user["official"]
    assert not any(key in row for key in ("markers", "marker"))
    assert not any(key in user for key in ("markers", "marker", "female", "girl"))
    solved = 0
    seconds = 0
    problem_cells = []
    assert len(row["statuses"]) == len(letters)
    for problem_index, status in enumerate(row["statuses"]):
        checked_statuses += 1
        runs = run_index[user["id"], problem_index]
        accepted = [run for run in runs if run["status"] == "ACCEPTED"]
        rejected = [run for run in runs if run["status"] == "REJECTED"]
        assert len(accepted) <= 1
        assert len(accepted) + len(rejected) == len(runs)
        assert status["tries"] == len(runs)
        assert (status["result"] in ("AC", "FB")) == bool(accepted)
        if accepted:
            assert status["time"][1] == "s"
            assert accepted[0]["timestamp"] == status["time"][0]
            assert 0 <= status["time"][0] <= 18000
            solved += 1
            seconds += status["time"][0] + len(rejected) * 1200
            problem_cells.append(f"+{status['tries'] - 1}({status['time'][0] // 60})")
        elif status["tries"]:
            assert status["result"] == "RJ"
            problem_cells.append(f"-{status['tries']}")
        else:
            assert status["result"] is None
            problem_cells.append("-")
    assert row["score"]["value"] == solved
    assert row["score"]["time"] == [seconds, "s"]

    if not user["official"]:
        continue
    position = len(official_records) + 1
    score = (solved, seconds)
    if score != previous_score:
        last_rank = position
        previous_score = score
    school_rank = None
    if user["organization"] not in seen_schools:
        seen_schools.add(user["organization"])
        school_rank = len(seen_schools)
    medal = next((label for cutoff, label in ((35, "Gold"), (105, "Silver"), (210, "Bronze")) if last_rank <= cutoff), None)
    official_records.append({
        "source_user_id": user["id"],
        "rank": last_rank,
        "organization_rank": school_rank,
        "school": user["organization"],
        "team": user["name"],
        "solved": solved,
        "penalty_seconds": seconds,
        "penalty": seconds // 60,
        "problems": problem_cells,
        "medal": medal,
        "members": member_row["names"],
    })

assert len(official_records) == 632
assert len(alias_matches) == 6
assert {match["source_user_id"] for match in alias_matches} == EXPECTED_ALIAS_IDS
assert len({match["member_source_index"] for match in matches}) == 682
assert len(seen_schools) == 253
assert Counter(row["medal"] for row in official_records) == {"Gold": 35, "Silver": 70, "Bronze": 105, None: 422}

title = "第 46 届 ICPC 国际大学生程序设计竞赛亚洲区域赛（上海）- 正式赛（2021-11-28）"
headers = ["Rank", "Organization Rank", "Organization", "Team", "Solved", "Penalty"] + letters + [
    "Medal", "Member1", "Member2", "Member3", "Unofficial", "Girl", "ICPC ID"
]
workbook = Workbook()
sheet = workbook.active
sheet.title = "正式队伍"
sheet.append([title])
sheet.append(headers)
sheet.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
sheet["A1"].font = Font(size=14, bold=True)
sheet.row_dimensions[1].height = 26
for cell in sheet[2]:
    cell.font = Font(bold=True, color="FFFFFF")
    cell.fill = PatternFill("solid", fgColor="24445F")
    cell.alignment = Alignment(vertical="center")
for row in official_records:
    sheet.append([
        row["rank"], row["organization_rank"], row["school"], row["team"], row["solved"], row["penalty"],
        *row["problems"], row["medal"], *row["members"], "N", "N", None,
    ])
sheet.freeze_panes = "E3"
sheet.auto_filter.ref = f"A2:{get_column_letter(len(headers))}{sheet.max_row}"
for index, header in enumerate(headers, 1):
    sheet.column_dimensions[get_column_letter(index)].width = (
        32 if header == "Organization" else 46 if header == "Team" else 20 if header == "Organization Rank" else 13
    )
workbook_path = HERE / "icpc shanghai.xlsx"
workbook.save(workbook_path)

# Read the actual saved workbook using the production row parser.
saved = load_workbook(workbook_path, read_only=True, data_only=True)
saved_rows = list(saved["正式队伍"].values)
assert len(saved_rows) == 634
assert list(saved_rows[1]) == headers
parsed = [parse_team(dict(zip(headers, values)), detect_problem_columns(headers)) for values in saved_rows[2:]]
for actual, expected in zip(parsed, official_records):
    assert actual["rank"] == expected["rank"]
    assert actual["org_rank"] == expected["organization_rank"]
    assert actual["school"] == expected["school"]
    assert actual["team"] == expected["team"]
    assert actual["solved"] == expected["solved"]
    assert actual["penalty"] == expected["penalty"]
    assert actual.get("medal") == expected["medal"]
    assert [member["name"] for member in actual["members"]] == expected["members"]
    assert not actual["unofficial"] and not actual["girl"]
    for letter, status in zip(letters, source_row_index[expected["source_user_id"]]["statuses"]):
        actual_status = actual["problems"][letter]
        assert actual_status["attempts"] == status["tries"]
        assert (actual_status["status"] == "solved") == (status["result"] in ("AC", "FB"))
        assert actual_status["time"] == (status["time"][0] // 60 if status["result"] in ("AC", "FB") else None)
saved.close()

write_json(HERE / "member_matches.json", matches)
files = [
    source_file(HERE / "rankland.srk.json", "https://cdn.algoux.cn/rankland/file/70792633718411264/icpc2021shanghai.srk.json", "Primary complete scoreboard: official flags, raw second scores, statuses, medal rules"),
    source_file(HERE / "rankland.html", "https://rl.algoux.cn/collection/official?rankId=icpc2021shanghai", "Public page identifying the downloadable SRK and contest date; first row displays 1486 penalty minutes"),
]
for filename in ("config.json", "team.json", "run.json"):
    files.append(source_file(HERE / filename, f"https://board.xcpcio.com/data/icpc/46th/shanghai/{filename}", "Independent public XCPCIO scoreboard cross-check"))
for path in audit_paths:
    files.append(source_file(path, "https://cpcfinder.com/contest/48", "Public team-dialog member audit"))
if (HERE / "rankland-styled.js").exists():
    files.append(source_file(HERE / "rankland-styled.js", "https://cdn.algoux.cn/rankland/dist/assets/StyledRanklist.vue_vue_type_script_setup_true_lang-b05f16b5.js", "Public renderer used to confirm equal-score ranks and first-school-only organization ranks"))

score_groups = defaultdict(list)
for row in official_records:
    score_groups[row["solved"], row["penalty_seconds"]].append(row)
provenance = {
    "contest": {"season": 2021, "organization": "ICPC", "edition": 46, "city": "上海", "date": "2021-11-28", "title": title},
    "created_on": "2026-11-03",
    "status": "Prepared workbook for review; not installed in xcpc/; pipeline not run by this builder",
    "sources": files,
    "output": {"path": workbook_path.relative_to(ROOT).as_posix(), "sha256": sha256(workbook_path.read_bytes()).hexdigest(), "sheet": "正式队伍", "header_row": 2},
    "counts": {
        "source_teams": 682, "official_teams_in_workbook": 632, "excluded_starred_teams": 50,
        "problems": 13, "official_schools_raw_names": 253,
        "official_teams_with_zero_solved_retained": sum(row["solved"] == 0 for row in official_records),
        "gold": 35, "silver": 70, "bronze": 105, "no_medal": 422,
        "member_source_teams": 682, "exact_school_team_matches_all_teams": 676,
        "explicit_alias_school_team_matches_all_teams": 6,
        "official_teams_with_three_member_names": 632,
        "official_member_entries": 1896,
        "team_level_female_markers_present": 0,
    },
    "identity_matching": {
        "rule": "Exact school AND exact team, otherwise only the two explicitly listed school aliases AND exact team. No rank, position, or team-only fallback.",
        "school_aliases_for_matching_only": SCHOOL_ALIASES,
        "affected_matches": alias_matches,
        "full_audit": (HERE / "member_matches.json").relative_to(ROOT).as_posix(),
        "full_audit_sha256": sha256((HERE / "member_matches.json").read_bytes()).hexdigest(),
        "workbook_school_team_text": "Unchanged SRK source text; aliases are only used to locate member names.",
    },
    "transformation": {
        "official_filter": "Include only user.official == true; retain official zero-solved teams.",
        "rank": "Source row order, official teams only; equal (score.value, score.time seconds) share the first position rank, then skip positions, matching RankLand ICPC renderer.",
        "organization_rank": "Only the first official team of each exact source organization is assigned its school rank; remaining rows blank. No tied first-school rows occur here.",
        "medal": "SRK ICPC count rule [35,70,105] => Gold rank<=35, Silver<=105, Bronze<=210; no medal otherwise.",
        "penalty": "floor(original SRK score.time in seconds / 60), without summing independently floored per-problem minutes.",
        "problem": "AC/FB => +(tries-1)(floor(AC seconds/60)); RJ => -tries; null/zero => -.",
        "female": "Girl=N for every row: the SRK defines a global female filter but no team has an explicit female marker. This means unmarked, not proof of mixed gender.",
        "icpc_id": "Blank: SRK user.id is retained in member_matches.json but its status as an official ICPC ID is not established.",
    },
    "validation": {
        "all_source_team_ids_unique_and_equal_to_xcpcio": True,
        "all_source_school_team_strings_equal_to_xcpcio": True,
        "all_source_official_flags_equal_to_xcpcio": True,
        "all_source_statuses_verified_against_xcpcio": checked_statuses,
        "official_statuses_round_trip_verified": 632 * 13,
        "all_solved_counts_equal_statuses": True,
        "all_raw_score_seconds_equal_sum_of_ac_seconds_plus_wrong_attempt_penalties": True,
        "all_members_matched_one_to_one": True,
        "production_parse_team_round_trip_teams": len(parsed),
        "first_team_example": {"source_user_id": official_records[0]["source_user_id"], "raw_score_seconds": 89209, "penalty_minutes": 1486, "individually_floored_problem_sum_minutes": sum(status["time"][0] // 60 + 20 * (status["tries"] - 1) for status in all_rows[0]["statuses"])},
        "tied_official_scores": [{"solved": solved, "seconds": seconds, "rank": group[0]["rank"], "teams": len(group), "source_user_ids": [row["source_user_id"] for row in group]} for (solved, seconds), group in score_groups.items() if len(group) > 1],
    },
    "known_limitations": [
        "This workbook is reconstructed from a public complete scoreboard plus CPCFinder member dialogs, not an original organizer-issued XLSX.",
        "No team-level female markers are supplied. The global female marker definition alone cannot identify female teams.",
        "Per-problem AC times are floored to the standard workbook's integer-minute format; raw second totals are floored only after summing, so they may differ from summed displayed problem minutes.",
        "The public run/status solution lists are reconstructed final-score summaries (rejected timestamps may be 0 or synthetic). They do not preserve actual submission chronology.",
        "CPCFinder ranks are audit context only and are never used for identity matching; official ranks are reconstructed from the complete score source.",
        "SRK user IDs are source identifiers and are not assumed to be official ICPC IDs.",
    ],
}
write_json(HERE / "provenance.json", provenance)
print(json.dumps({"workbook": str(workbook_path), "teams": len(parsed), "schools": len(seen_schools), "medals": dict(Counter(row["medal"] or "None" for row in official_records)), "source_statuses_verified": checked_statuses, "member_matches": len(matches), "alias_matches": len(alias_matches), "sha256": provenance["output"]["sha256"]}, ensure_ascii=False, indent=2))
