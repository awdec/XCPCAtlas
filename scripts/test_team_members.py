import json
import tempfile
import unittest
from pathlib import Path

import pandas as pd

from team_members import supplement_members


class TeamMembersTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.xlsx = Path(self.temp.name) / "contest.xlsx"
        self.df = pd.DataFrame([
            {"Organization": "学校甲", "Team": "同名队", "Rank": 1},
            {"Organization": "学校乙", "Team": "同名队", "Rank": 2},
        ])
        self.teams = [
            {"school": "学校乙", "team": "同名队", "members": ["丙", "丁", "戊"]},
            {"school": "学校甲", "team": "同名队", "members": ["甲", "乙"]},
        ]

    def write_roster(self, teams):
        self.xlsx.with_suffix(".members.json").write_text(
            json.dumps({"teams": teams}, ensure_ascii=False), encoding="utf-8"
        )

    def test_no_roster_leaves_original_unchanged(self):
        pd.testing.assert_frame_equal(supplement_members(self.df, self.xlsx), self.df)

    def test_match_by_school_and_team_preserves_two_person_team(self):
        self.write_roster(self.teams)
        result = supplement_members(self.df, self.xlsx)
        self.assertEqual(result.loc[0, "Member1"], "甲")
        self.assertTrue(pd.isna(result.loc[0, "Member3"]))
        self.assertEqual(result.loc[1, "Member3"], "戊")
        pd.testing.assert_frame_equal(result[self.df.columns], self.df)
        self.assertNotIn("Member1", self.df.columns)

    def test_existing_members_take_precedence(self):
        self.write_roster(self.teams)
        self.df["Member1"] = ["原队员", None]
        result = supplement_members(self.df, self.xlsx)
        self.assertEqual(result.loc[0, "Member1"], "原队员")
        self.assertTrue(pd.isna(result.loc[0, "Member2"]))
        self.assertEqual(result.loc[1, "Member1"], "丙")

    def test_missing_team_is_rejected(self):
        self.write_roster(self.teams[:1])
        with self.assertRaisesRegex(ValueError, "未找到队伍"):
            supplement_members(self.df, self.xlsx)

    def test_duplicate_team_is_rejected(self):
        self.write_roster(self.teams + self.teams[:1])
        with self.assertRaisesRegex(ValueError, "重复队伍"):
            supplement_members(self.df, self.xlsx)


if __name__ == "__main__":
    unittest.main()
