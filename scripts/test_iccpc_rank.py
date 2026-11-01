import json
import tempfile
import unittest
from datetime import datetime, timedelta
from pathlib import Path

from iccpc_rank import read_iccpc_teams


class ICCPCRankTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.path = Path(temp.name) / "contest.rank.json"
        self.data = {
            "contest": {"start_time": "2026-10-18 09:00:00", "end_time": "2026-10-18 14:00:00",
                        "award_ratio": 30020010, "flg_award_base": 1, "flg_award_qty_mode": 0},
            "ccpc_meta": {"view": "referee"},
            "team": [], "problem": [{"problem_id": 1, "num": 0}, {"problem_id": 2, "num": 1}],
            "solution": [],
        }

    def team(self, team_id, kind=0):
        self.data["team"].append({"team_id": team_id, "tkind": kind, "name": team_id,
                                  "school": f"学校{team_id}", "tmember": "甲、乙、丙", "coach": "教练"})

    def submission(self, team_id, problem, seconds, result):
        self.data["solution"].append({
            "solution_id": len(self.data["solution"]) + 1, "team_id": team_id,
            "problem_id": problem, "result": result,
            "in_date": (datetime(2026, 10, 18, 9) + timedelta(seconds=seconds)).isoformat(sep=" "),
        })

    def read(self):
        self.path.write_text(json.dumps(self.data), encoding="utf-8")
        return read_iccpc_teams(self.path)

    def test_penalty_accumulates_seconds_and_ignores_ce_and_post_ac(self):
        self.team("A")
        self.submission("A", 1, 10, 11)
        self.submission("A", 1, 20, 6)
        self.submission("A", 1, 119, 4)
        self.submission("A", 1, 150, 6)
        self.submission("A", 2, 179, 4)
        row = self.read()[0]
        self.assertEqual((row["solved"], row["penalty"]), (2, 24))
        self.assertEqual(row["problems"]["A"], {"status": "solved", "attempts": 2, "time": 1})

    def test_female_ce_only_star_and_no_submission(self):
        for team_id, kind in [("female", 1), ("star", 2), ("empty", 0), ("ce", 0)]:
            self.team(team_id, kind)
        self.submission("female", 1, 60, 4)
        self.submission("star", 1, 30, 4)
        self.submission("ce", 1, 90, 11)
        rows = self.read()
        self.assertEqual([r["team_id"] for r in rows], ["female", "ce"])
        self.assertTrue(rows[0]["girl"])
        self.assertEqual(rows[1]["problems"]["A"]["attempts"], 0)

    def test_ties_use_total_minutes_and_competition_rank(self):
        for team_id, seconds in [("C", 120), ("B", 119), ("A", 61)]:
            self.team(team_id)
            self.submission(team_id, 1, seconds, 4)
        rows = self.read()
        self.assertEqual([r["team_id"] for r in rows], ["A", "B", "C"])
        self.assertEqual([r["rank"] for r in rows], [1, 1, 3])

    def test_medal_cutoffs_are_cumulative_integer_ceil(self):
        for i in range(10):
            self.team(str(i))
            self.submission(str(i), 1, (i + 1) * 60, 4)
        self.assertEqual([r["medal"] for r in self.read()],
                         ["Gold"] + ["Silver"] * 2 + ["Bronze"] * 3 + ["Honorable"] * 4)

    def test_hidden_results_rejected(self):
        self.team("A")
        self.submission("A", 1, 60, -1)
        with self.assertRaisesRegex(ValueError, "隐藏结果"):
            self.read()

    def test_unknown_problem_rejected(self):
        self.team("A")
        self.submission("A", 99, 60, 4)
        with self.assertRaisesRegex(ValueError, "未知队伍或题目"):
            self.read()


if __name__ == "__main__":
    unittest.main()
