"""Read-only validation of installed source snapshots and generated application data."""
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "xcpc/2021"
DATA = ROOT / "web/public/data"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


oi = read(DATA / "2021/oi_records.json")
result = {}
for city, count, names_count in (("shanghai", 632, 1896), ("kunming", 753, 616)):
    meta = read(BASE / f"ICPC {city}.source.json")
    for field in ("ranklist_snapshot", "member_snapshot", "workbook"):
        rec = meta[field]
        path = BASE / rec["path"]
        assert path.stat().st_size == rec["bytes"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == rec["sha256"]
    source = read(BASE / meta["ranklist_snapshot"]["path"])
    official = [row for row in source["rows"] if row["user"]["official"]]
    rows = read(DATA / f"2021/{city}.json")["sheets"]["正式队伍"]
    roster = read(BASE / meta["member_snapshot"]["path"])["teams"]
    by_key = {(r["school"], r["team"]): r["members"] for r in roster}
    assert len(by_key) == len(roster)
    explicit = {}
    if city == "kunming":
        roster_by_index = {r["source_index"]: r for r in roster}
        for m in meta["member_matching"]["reviewed_mappings"]["mappings"]:
            assert m["sourceUserId"] not in explicit and m["evidence"]
            explicit[m["sourceUserId"]] = roster_by_index[m["cpcfinderIndex"]]["members"]
    aliases = meta["member_matching"].get("school_aliases_for_matching_only", {})
    assert len(official) == len(rows) == count
    previous = None
    rank = 0
    for position, (raw, actual) in enumerate(zip(official, rows), 1):
        user, score = raw["user"], raw["score"]
        score_key = (score["value"], score["time"][0])
        if score_key != previous:
            previous, rank = score_key, position
        assert actual["rank"] == rank
        assert actual["school"] == user["organization"].strip()
        assert actual["team"] == user["name"].strip()
        assert actual["solved"] == score["value"]
        assert actual["penalty"] == score["time"][0] // 60
        assert not actual["unofficial"] and not actual["girl"]
        assert actual["icpc_id"] is None
        expected_medal = "Gold" if rank <= 35 else "Silver" if rank <= 105 else "Bronze" if rank <= 210 else None
        assert actual.get("medal") == expected_medal
        assert set(actual["problems"]) == set("ABCDEFGHIJKLM")
        for problem, status in zip(source["problems"], raw["statuses"]):
            res = status["result"]
            expected = {
                "status": "solved" if res in ("AC", "FB") else "unsolved" if res == "RJ" else "none",
                "attempts": status["tries"],
                "time": status["time"][0] // 60 if res in ("AC", "FB") else None,
            }
            assert actual["problems"][problem["alias"]] == expected
        lookup_key = (aliases.get(user["organization"], user["organization"]), user["name"])
        expected_names = explicit.get(user["id"], by_key.get(lookup_key, []))
        assert [m["name"] for m in actual["members"]] == expected_names
        for member in actual["members"]:
            assert member["name"].strip() and member["name"] not in {"无", "两人队"}
            assert member["oi"] == oi.get(f"{member['name']}@{actual['school']}", [])
    assert sum(len(r["members"]) for r in rows) == names_count
    result[city] = {"teams": count, "member_entries": names_count,
                    "teams_by_member_count": dict(Counter(len(r["members"]) for r in rows)),
                    "medals": dict(Counter(r.get("medal", "none") for r in rows))}

index = read(DATA / "2021/contests.json")
assert len(index) == len({r["id"] for r in index}) == 9
assert sum(c["teams"] for c in index) == 3817
assert next(y for y in read(DATA / "years.json") if y["year"] == 2021) == {
    "year": 2021, "contest_count": 9, "total_teams": 3817,
}
baseline = read(ROOT / "output/import-2021-baseline.json")
changed = {p for p, digest in baseline.items()
           if hashlib.sha256((ROOT / p).read_bytes()).hexdigest() != digest}
expected_changes = {"players.json", "web/public/data/2021/contests.json", "web/public/data/2021/oi_records.json",
                    "web/public/data/years.json", *(f"web/public/data/{y}/trajectories.json" for y in range(2021, 2027))}
assert changed == expected_changes, changed ^ expected_changes
result["existing_files_changed"] = sorted(changed)
result["other_contest_files_and_2020_unchanged"] = True
(ROOT / "output/import-2021-validation.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(result, ensure_ascii=False, indent=2))
