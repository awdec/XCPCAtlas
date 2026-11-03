import unittest
from collections import Counter

from convert_xlsx import (
    ROOT,
    FILENAME_OVERRIDES,
    apply_school_rank_medals,
    convert_file,
    parse_contest_filename,
)


class ConvertXlsxTest(unittest.TestCase):
    def test_2022_ccpc_guangzhou_school_rank_medals(self):
        source = ROOT / "xcpc/2022/ccpc final.xlsx"
        org, contest_id, city, name = FILENAME_OVERRIDES["2022/ccpc final.xlsx"]
        data = convert_file(source, contest_id, org, city, name, {})
        teams = data["sheets"]["正式队伍"]

        self.assertEqual(data["name"], "CCPC 广州（总决赛）")
        self.assertEqual(data["id"], "final")
        self.assertEqual(len(teams), 129)
        self.assertEqual(Counter(team["medal"] for team in teams),
                         {"Gold": 13, "Silver": 24, "Bronze": 35, "Honorable": 57})
        by_rank = {team["rank"]: team for team in teams}
        for rank, school_rank, medal, next_medal in (
            (13, 10, "Gold", "Silver"),
            (37, 30, "Silver", "Bronze"),
            (72, 60, "Bronze", "Honorable"),
        ):
            self.assertEqual(by_rank[rank]["org_rank"], school_rank)
            self.assertEqual(by_rank[rank]["medal"], medal)
            self.assertEqual(by_rank[rank + 1]["medal"], next_medal)
        # 同校第二队不能继承第一队的金牌。
        self.assertEqual(by_rank[6]["school"], by_rank[14]["school"])
        self.assertEqual(by_rank[6]["medal"], "Gold")
        self.assertEqual(by_rank[14]["medal"], "Silver")

    def test_other_2022_guangzhou_contest_keeps_source_medals(self):
        source = ROOT / "xcpc/2022/ccpc guangzhou.xlsx"
        org, contest_id, city, name = parse_contest_filename(source.name)
        data = convert_file(source, contest_id, org, city, name, {})
        self.assertEqual(Counter(team["medal"] for team in data["sheets"]["正式队伍"]),
                         {"Gold": 24, "Silver": 48, "Bronze": 71, "Honorable": 97})

    def test_equal_scores_share_medal_and_starred_teams_are_excluded(self):
        teams = [
            {"org_rank": 10, "solved": 6, "penalty": 810, "unofficial": False},
            {"org_rank": None, "solved": 6, "penalty": 810, "unofficial": False},
            {"org_rank": 30, "solved": 5, "penalty": 676, "unofficial": False},
            {"org_rank": 60, "solved": 4, "penalty": 505, "unofficial": False},
            {"org_rank": None, "solved": 4, "penalty": 506, "unofficial": False},
            {"org_rank": 10, "solved": 12, "penalty": 100, "unofficial": True},
        ]
        apply_school_rank_medals(teams, (10, 30, 60))
        self.assertEqual([team.get("medal") for team in teams],
                         ["Gold", "Gold", "Silver", "Bronze", "Honorable", None])

    def test_missing_school_rank_rejected(self):
        with self.assertRaisesRegex(ValueError, "缺少校排 10"):
            apply_school_rank_medals([], (10, 30, 60))


if __name__ == "__main__":
    unittest.main()
