"""Prepare a reviewable 2021 Kunming source workbook; never modifies xcpc/ or web/."""
from collections import Counter, defaultdict
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import sys

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
from openpyxl.utils import get_column_letter


WORK = Path(__file__).resolve().parent
ROOT = WORK.parent.parent
SOURCE = WORK / "icpc2021kunming.srk.json"
AUDIT = ROOT / "output/cpcfinder-27-members-audit.json"
CONFIRMED = WORK / "confirmed-member-mappings.json"
OUTPUT = WORK / "ICPC kunming.xlsx"

PAGE_URL = "https://rl.algoux.cn/collection/official?rankId=icpc2021kunming"
SRK_URL = "https://cdn.algoux.cn/rankland/file/70792638223093760/icpc2021kunming.srk.json"
RETRIEVED_DATE = "2026-11-03"


def file_record(path, url=None, retrieved_date=None):
    result = {
        "file": str(path.relative_to(ROOT)).replace("\\", "/"),
        "sha256": sha256(path.read_bytes()).hexdigest(),
        "bytes": path.stat().st_size,
        "savedAtUtc": datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
    }
    if url:
        result["url"] = url
    if retrieved_date:
        result["retrievedDate"] = retrieved_date
    return result


def main():
    source = json.loads(SOURCE.read_bytes())
    member_source = json.loads(AUDIT.read_bytes())
    official = [row for row in source["rows"] if row["user"]["official"]]
    assert len(source["rows"]) == 887 and len(official) == 753
    assert official == sorted(official, key=lambda row: (-row["score"]["value"], row["score"]["time"][0]))
    assert all(any(status["tries"] for status in row["statuses"]) for row in source["rows"])
    by_key = defaultdict(list)
    by_id = {}
    for row in official:
        user = row["user"]
        by_key[(user["organization"], user["name"])].append(row)
        assert user["id"] not in by_id
        by_id[user["id"]] = row

    confirmed = {}
    mapping_source = None
    if CONFIRMED.exists():
        mapping_source = json.loads(CONFIRMED.read_text(encoding="utf-8"))
        used_source_ids = set()
        for item in mapping_source["mappings"]:
            assert item.get("evidence"), "Confirmed mappings require reviewable evidence."
            assert item["cpcfinderIndex"] not in confirmed
            assert item["sourceUserId"] in by_id
            assert item["sourceUserId"] not in used_source_ids
            confirmed[item["cpcfinderIndex"]] = item
            used_source_ids.add(item["sourceUserId"])

    members_by_id = {}
    match_audit = []
    for entry in member_source["results"]:
        hits = by_key[(entry["school"], entry["team"])]
        mapping = confirmed.get(entry["index"])
        assert not (mapping and hits), "Explicit mappings must only resolve otherwise unmatched entries."
        method = None
        row = None
        if len(hits) == 1:
            row, method = hits[0], "exact-school-and-team"
        elif mapping:
            row, method = by_id[mapping["sourceUserId"]], "reviewed-explicit-mapping"
        names = entry["concreteNames"]
        assert len(names) <= 3
        assert all(name.strip() and name not in {"无", "两人队"} for name in names)
        item = {
            "cpcfinderIndex": entry["index"],
            "cpcfinderRank": entry["rank"],
            "cpcfinderSchool": entry["school"],
            "cpcfinderTeam": entry["team"],
            "rawMemberEntries": entry["names"],
            "concreteNames": names,
            "excludedPlaceholders": entry["placeholderNames"] + entry["teamSizeMarkers"],
            "status": "matched" if row else "unmatched",
        }
        if row:
            user = row["user"]
            assert user["id"] not in members_by_id
            members_by_id[user["id"]] = names
            item.update({"method": method, "sourceUserId": user["id"],
                         "sourceSchool": user["organization"], "sourceTeam": user["name"]})
            if mapping:
                item["mappingEvidence"] = mapping["evidence"]
        match_audit.append(item)

    assert set(confirmed) <= {entry["index"] for entry in member_source["results"]}

    problem_letters = [problem["alias"] for problem in source["problems"]]
    headers = ["Rank", "Organization Rank", "Organization", "Team", "Solved", "Penalty",
               "Unofficial", "Girl", "Medal", "Member1", "Member2", "Member3",
               "Source User ID", *problem_letters]
    wb = Workbook()
    ws = wb.active
    ws.title = "正式队伍"
    ws.append([source["contest"]["title"]["zh-CN"]])
    ws.append(headers)
    previous_score, rank, school_order = None, 0, {}
    medal_counts = Counter()
    score_validation_errors = []
    problem_validation_errors = []
    for ordinal, row in enumerate(official, start=1):
        user, score = row["user"], row["score"]
        assert score["time"][1] == "s"
        score_key = (score["value"], score["time"][0])
        if score_key != previous_score:
            rank, previous_score = ordinal, score_key
        school_rank = None
        if user["organization"] not in school_order:
            school_rank = len(school_order) + 1
            school_order[user["organization"]] = school_rank
        medal = "Gold" if rank <= 35 else "Silver" if rank <= 105 else "Bronze" if rank <= 210 else None
        if medal:
            medal_counts[medal] += 1
        names = members_by_id.get(user["id"], [])
        names = names + [None] * (3 - len(names))
        cells = [rank, school_rank, user["organization"], user["name"], score["value"],
                 score["time"][0] // 60, "N", "N", medal, *names, user["id"]]
        assert len(row["statuses"]) == len(problem_letters)
        solved_count = 0
        recomputed_source_seconds = 0
        for status in row["statuses"]:
            tries, result = status["tries"], status["result"]
            if result in {"AC", "FB"}:
                assert status["time"][1] == "s" and tries >= 1
                cells.append(f"+{tries - 1}({status['time'][0] // 60})")
                solved_count += 1
                recomputed_source_seconds += status["time"][0] + (tries - 1) * 1200
            elif result is None:
                assert tries == 0
                cells.append("-")
            else:
                assert result == "RJ" and tries >= 1
                cells.append(f"-{tries}")
        if solved_count != score["value"]:
            problem_validation_errors.append(user["id"])
        if recomputed_source_seconds != score["time"][0]:
            score_validation_errors.append(user["id"])
        ws.append(cells)

    ws.freeze_panes = "E3"
    ws.auto_filter.ref = f"A2:{get_column_letter(len(headers))}{ws.max_row}"
    for cell in ws[2]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor="245B80")
    for i, name in enumerate(headers, 1):
        ws.column_dimensions[get_column_letter(i)].width = (
            34 if name == "Organization" else 50 if name == "Team" else
            19 if name == "Source User ID" else 17 if name.startswith("Member") else 13)
    assert not score_validation_errors and not problem_validation_errors
    wb.save(OUTPUT)

    # Use the repository's unchanged reader to verify that this standard workbook
    # survives the real import path before it is copied into xcpc/.
    sys.path.insert(0, str(ROOT / "scripts"))
    from convert_xlsx import convert_file
    normalized = convert_file(OUTPUT, "kunming", "ICPC", "昆明", "ICPC 昆明", {})
    converted = normalized["sheets"]["正式队伍"]
    assert len(converted) == len(official)
    last_score, converted_rank = None, 0
    for ordinal, (team, row) in enumerate(zip(converted, official), start=1):
        user, score = row["user"], row["score"]
        score_key = (score["value"], score["time"][0])
        if score_key != last_score:
            converted_rank, last_score = ordinal, score_key
        assert team["rank"] == converted_rank
        assert (team["school"], team["team"]) == (user["organization"].strip(), user["name"].strip())
        assert team["solved"] == score["value"] and team["penalty"] == score["time"][0] // 60
        assert not team["unofficial"] and not team["girl"] and team["icpc_id"] is None
        assert [member["name"] for member in team["members"]] == members_by_id.get(user["id"], [])
        assert team.get("medal") == ("Gold" if converted_rank <= 35 else "Silver" if converted_rank <= 105 else "Bronze" if converted_rank <= 210 else None)
        assert list(team["problems"]) == problem_letters
        for letter, status in zip(problem_letters, row["statuses"]):
            problem = team["problems"][letter]
            expected_status = "solved" if status["result"] in {"AC", "FB"} else "none" if status["result"] is None else "unsolved"
            assert problem["status"] == expected_status and problem["attempts"] == status["tries"]
            assert problem["time"] == (status["time"][0] // 60 if expected_status == "solved" else None)
    preview = WORK / "normalized-preview.json"
    preview.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    match_audit_path = WORK / "member-match-audit.json"
    match_audit_path.write_text(json.dumps(match_audit, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    counts = {
        "publicSourceRows": len(source["rows"]), "includedOfficialTeams": len(official),
        "excludedUnofficialTeams": len(source["rows"]) - len(official),
        "problems": len(problem_letters), "officialSchools": len(school_order),
        "medals": dict(medal_counts),
        "cpcfinderAwardTeams": len(member_source["results"]),
        "matchedMemberTeams": len(members_by_id),
        "memberTeamsExact": sum(item.get("method") == "exact-school-and-team" for item in match_audit),
        "memberTeamsReviewedMapping": sum(item.get("method") == "reviewed-explicit-mapping" for item in match_audit),
        "unmatchedMemberTeams": sum(item["status"] == "unmatched" for item in match_audit),
        "knownMemberNames": sum(len(names) for names in members_by_id.values()),
        "teamsWithThreeConcreteNames": sum(len(names) == 3 for names in members_by_id.values()),
        "teamsWithTwoConcreteNames": sum(len(names) == 2 for names in members_by_id.values()),
        "teamsWithOneConcreteName": sum(len(names) == 1 for names in members_by_id.values()),
        "includedTeamsWithoutKnownMemberNames": len(official) - len(members_by_id),
        "officialTeamsWithZeroSolves": sum(row["score"]["value"] == 0 for row in official),
        "officialProblemAccepts": sum(row["score"]["value"] for row in official),
        "officialPenaltySeconds": sum(row["score"]["time"][0] for row in official),
        "excludedNonNameEntries": sum(len(entry["placeholderNames"]) + len(entry["teamSizeMarkers"]) for entry in member_source["results"]),
    }
    metadata = {
        "season": 2021, "contestDate": "2022-04-17", "preparedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sourcePage": PAGE_URL,
        "retrievedDate": RETRIEVED_DATE,
        "sourceRanklist": file_record(SOURCE, SRK_URL, RETRIEVED_DATE),
        "sourcePageSnapshot": file_record(WORK / "rankland-page.html", PAGE_URL, RETRIEVED_DATE),
        "originalContestLink": "https://ac.nowcoder.com/acm/contest/32708#rank",
        "memberSource": {**file_record(AUDIT, member_source["source"], RETRIEVED_DATE),
                         "checkedDate": member_source["checkedDate"], "method": member_source["method"]},
        "confirmedMemberMappings": {**file_record(CONFIRMED), **mapping_source} if mapping_source else None,
        "output": file_record(OUTPUT),
        "normalizedPreview": file_record(preview),
        "memberMappingAudit": file_record(match_audit_path),
        "counts": counts,
        "medalRule": source["series"][0],
        "transformations": [
            "Include only rows whose source user.official is true; exclude all 134 starred teams.",
            "Solved and total penalty come directly from source score.value and score.time; floor total penalty seconds once to minutes.",
            "Official ICPC competition ranks are derived in source order using the unrounded source (score.value, score.time seconds); ties share rank.",
            "Organization Rank is the first official appearance of each exact source organization, matching source S# rule.",
            "Problem AC/FB => +wrongAttempts(flooredMinutes), RJ => -tries, no submission => '-'; source raw SRK preserves seconds and FB.",
            "Keep source organization and team spelling. Do not use Nowcoder source user IDs as ICPC IDs; preserve IDs in an ignored Source User ID column only.",
            "Supplement Member1-3 only through unique exact school/team match or separately reviewed explicit mappings; no rank-only or fuzzy automatic matching.",
            "Use concreteNames from audited CPCFinder UI; omit 无 and 两人队 markers; leave unknown names empty.",
            "Female participation is not identifiable from source rows; Girl=N without inference.",
        ],
        "limitations": [
            "RankLand source has no team members; CPCFinder currently lists only 210 award teams.",
            "CPCFinder audit preserves the UI transcription and contains potentially incorrect personal-name characters; names have not been silently corrected.",
            f"CPCFinder covers only award teams; {counts['includedTeamsWithoutKnownMemberNames']} official teams have empty member cells. Among the {counts['matchedMemberTeams']} matched teams, {counts['teamsWithThreeConcreteNames']} contain three concrete names, {counts['teamsWithTwoConcreteNames']} contain two, and {counts['teamsWithOneConcreteName']} contain one. This does not establish the complete roster of every team.",
            "The temporary xlsx floors per-problem times and total penalty to the project's minute units; original second precision remains in the raw SRK.",
            "All 887 public source rows have at least one submission, so no no-submission team is removed from the public data.",
            "This preparation does not modify production xcpc sources, scripts, or web data.",
        ],
        "validation": {"problemSolvedCountMismatches": problem_validation_errors,
                       "sourcePenaltyArithmeticMismatches": score_validation_errors,
                       "checkedOfficialTeams": len(converted),
                       "checkedProblemStates": len(converted) * len(problem_letters),
                       "unchangedConvertFileRoundTrip": "passed",
                       "sourceOrderUsesUnroundedSeconds": True,
                       "noSubmissionRowsAcrossPublicSource": 0},
    }
    (WORK / "source.metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(counts, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
