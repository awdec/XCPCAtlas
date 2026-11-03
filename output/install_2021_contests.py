"""Install the reviewed local scoreboard and member snapshots into 2021 sources."""
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / "xcpc/2021"
SOURCES = DEST / "sources"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def record(path, url=None):
    value = {"path": path.relative_to(DEST).as_posix(),
             "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
             "bytes": path.stat().st_size}
    if url:
        value.update(url=url, retrieved_date="2026-11-03")
    return value


SOURCES.mkdir(parents=True, exist_ok=True)
shanghai_roster = []
for path in sorted((ROOT / "output").glob("cpcfinder-48-audit-*.json")):
    shanghai_roster.extend(read(path))
shanghai_roster.sort(key=lambda row: row["index"])
assert [r["index"] for r in shanghai_roster] == list(range(682))
kunming_roster = read(ROOT / "output/cpcfinder-27-members-audit.json")["results"]
assert [r["index"] for r in kunming_roster] == list(range(210))

for city, date, contest_id, roster, raw_file, workbook in [
    ("shanghai", "2021-11-28", 48, shanghai_roster, "rankland.srk.json", "icpc shanghai.xlsx"),
    ("kunming", "2022-04-17", 27, kunming_roster, "icpc2021kunming.srk.json", "ICPC kunming.xlsx"),
]:
    work = ROOT / f"output/import-2021-{city}"
    source_xlsx = work / workbook
    target_xlsx = DEST / f"ICPC {city}.xlsx"
    assert not target_xlsx.exists(), f"Existing contest source: {target_xlsx}"
    shutil.copyfile(source_xlsx, target_xlsx)
    raw_target = SOURCES / f"icpc2021{city}.srk.json"
    shutil.copyfile(work / raw_file, raw_target)
    member_target = SOURCES / f"cpcfinder-{city}.members.json"
    member_url = f"https://cpcfinder.com/contest/{contest_id}"
    write(member_target, {
        "source_url": member_url,
        "retrieved_date": "2026-11-03",
        "method": "逐队打开队伍详情，记录学校、队名和成员姓名，保留页面原文。",
        "teams": [{"source_index": row["index"], "rank": row["rank"],
                   "school": row["school"], "team": row["team"],
                   "members": row.get("concreteNames", row["names"]),
                   "raw_members": row["names"]} for row in roster],
    })
    if city == "shanghai":
        prepared = read(work / "provenance.json")
        counts = prepared["counts"]
        matching = prepared["identity_matching"]
        score_url = "https://cdn.algoux.cn/rankland/file/70792633718411264/icpc2021shanghai.srk.json"
        original_url = "https://board.xcpcio.com/icpc/46th/shanghai"
        limitations = [
            "全部632支正式队伍均有三名具体选手姓名；源682队中的50支打星队伍不纳入。",
            "完整榜单只定义女队图例，未标明任何具体队伍为女队，未据此推断女队。",
        ]
    else:
        prepared = read(work / "source.metadata.json")
        counts = prepared["counts"]
        matching = {"rule": "学校+队名唯一精确匹配，差异仅通过逐条审核的显式映射；不按排名或相似度自动配对。",
                    "reviewed_mappings": read(work / "confirmed-member-mappings.json")}
        score_url = "https://cdn.algoux.cn/rankland/file/70792638223093760/icpc2021kunming.srk.json"
        original_url = "https://ac.nowcoder.com/acm/contest/32708#rank"
        limitations = [
            "753支正式队伍中，CPCFinder仅提供210支获奖队的名单，共616条具体姓名；543队姓名留空。",
            "210队中202队有三名具体姓名，2队有两名，6队有一名；已过滤7个无及1个两人队占位/备注。",
            "完整榜单未提供具体女队标记，未推断女队。",
        ]
    metadata = {
        "season": 2021,
        "edition": 46,
        "contest_date": date,
        "source_page": f"https://rl.algoux.cn/collection/official?rankId=icpc2021{city}",
        "original_scoreboard": original_url,
        "ranklist_snapshot": record(raw_target, score_url),
        "member_snapshot": record(member_target, member_url),
        "workbook": record(target_xlsx),
        "counts": counts,
        "member_matching": matching,
        "rules": [
            "仅收录user.official为true的队伍，保留正式队伍中零题但有提交的队伍；打星队不参与站内统计。",
            "保留完整榜单的学校和队名；队员姓名按CPCFinder原文补入，不擅自纠正疑似录入错字。",
            "排名按原始秒级得分判定并保留并列；总罚时从score.time总秒数向下取整为分钟，不按舍入后的分钟重排。",
            "按源13题状态保留通过情况、尝试次数，AC/FB用时向下取整为分钟；原始秒数和FB信息保留在SRK快照。",
            "金/银/铜按源正式排名和35/70/105奖额配置保留；其他队伍不标奖牌。",
            "原始榜单队伍ID不冒充ICPC官方ID；源表Source User ID列用于溯源，不输出为icpc_id。",
        ],
        "limitations": limitations + ["名单核查确认的是页面提供的姓名字段，未逐人核验姓名真实性或拼写。"],
        "validation": prepared["validation"],
    }
    write(DEST / f"ICPC {city}.source.json", metadata)
    print(city, record(target_xlsx), counts)
