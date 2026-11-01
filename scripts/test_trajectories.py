import unittest

from gen_trajectories import compute_all_time_best_tiers


class AllTimeBestTiersTest(unittest.TestCase):
    def test_each_player_counts_only_in_their_highest_tier_across_years(self):
        year_players = {
            2026: {
                "甲@学校甲": "gold",
                "乙@学校甲": "silver",
                "丙@学校乙": "bronze",
                "丁@学校乙": "iron",
            },
            2020: {
                "甲@学校甲": "bronze",
                "乙@学校甲": "silver",
                "丙@学校乙": "bronze",
                "丁@学校乙": "iron",
            },
            2024: {
                "甲@学校甲": "silver",
                "乙@学校甲": "bronze",
                "丙@学校乙": "iron",
                "丁@学校乙": "iron",
            },
        }

        self.assertEqual(
            compute_all_time_best_tiers(year_players, 2026),
            {"gold": 1, "silver": 1, "bronze": 1},
        )

    def test_same_name_at_different_schools_counts_as_separate_players(self):
        year_players = {
            2020: {"同名@学校甲": "gold", "同名@学校乙": "silver"},
            2026: {"同名@学校甲": "gold", "同名@学校乙": "bronze"},
        }

        self.assertEqual(
            compute_all_time_best_tiers(year_players, 2026),
            {"gold": 1, "silver": 1, "bronze": 0},
        )

    def test_empty_input_and_years_before_2020_do_not_add_medalists(self):
        cases = [
            ({}, {"gold": 0, "silver": 0, "bronze": 0}),
            (
                {2019: {"甲@学校甲": "gold"}},
                {"gold": 0, "silver": 0, "bronze": 0},
            ),
            (
                {
                    2019: {"甲@学校甲": "gold", "乙@学校乙": "silver"},
                    2020: {"甲@学校甲": "bronze"},
                },
                {"gold": 0, "silver": 0, "bronze": 1},
            ),
        ]
        for year_players, expected in cases:
            with self.subTest(year_players=year_players):
                self.assertEqual(compute_all_time_best_tiers(year_players, 2026), expected)

    def test_page_year_limits_upgrades_and_excludes_future_players(self):
        year_players = {
            2019: {"甲@学校甲": "gold", "早年选手@学校乙": "gold"},
            2020: {"甲@学校甲": "bronze"},
            2024: {"甲@学校甲": "silver"},
            2026: {"甲@学校甲": "gold", "新选手@学校乙": "bronze"},
            2027: {"未来选手@学校丙": "gold"},
        }
        expected_by_year = {
            2020: {"gold": 0, "silver": 0, "bronze": 1},
            2024: {"gold": 0, "silver": 1, "bronze": 0},
            2026: {"gold": 1, "silver": 0, "bronze": 1},
        }
        for end_year, expected in expected_by_year.items():
            with self.subTest(end_year=end_year):
                self.assertEqual(compute_all_time_best_tiers(year_players, end_year), expected)


if __name__ == "__main__":
    unittest.main()
