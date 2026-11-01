import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import extract_oi_records as oi


class OIRecordsTest(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        self.raw = root / "raw.txt"
        self.players = root / "players.json"
        self.output = root / "data"
        self.schools = ["西安交通大学", "中国科学技术大学", "北京大学", "中国科学院大学"]
        self.players.write_text(json.dumps([[s, "同名选手"] for s in self.schools]), encoding="utf-8")

    def extract(self, year):
        with patch.multiple(oi, RAW=self.raw, PLAYERS=self.players, OUTPUT_DIR=self.output):
            with contextlib.redirect_stdout(io.StringIO()):
                result = oi.extract_oi_records_for_year(year)
        saved = json.loads((self.output / str(year) / "oi_records.json").read_text(encoding="utf-8"))
        self.assertEqual(result, saved)
        return result

    def test_school_specific_window_boundaries(self):
        self.raw.write_text("CSP-S2020,一等奖,同名选手,高一,某高中\n", encoding="utf-8")
        # CSP-S2020 高一 -> 2023 入大学；覆盖初三、高一、高二、高三、大一、大五、大六。
        for year, expected_schools in [
            (2019, []), (2020, self.schools[:2]), (2021, self.schools[:2]),
            (2022, self.schools[:2]), (2023, self.schools),
            (2027, self.schools), (2028, []),
        ]:
            with self.subTest(year=year):
                result = self.extract(year)
                self.assertEqual(set(result), {f"同名选手@{s}" for s in expected_schools})

    def test_spring_adjustment_and_record_isolation(self):
        self.raw.write_text(
            "CSP-S2020,一等奖,同名选手,高一,某高中\n"
            "NOI2020,金牌,同名选手,高一,某高中\n", encoding="utf-8"
        )
        # 2022 年：秋季记录推算高三，夏季记录按原有规则推算大一。
        result = self.extract(2022)
        for school in self.schools[:2]:
            self.assertEqual([r["比赛"] for r in result[f"同名选手@{school}"]], ["CSP-S2020", "NOI2020"])
        for school in self.schools[2:]:
            self.assertEqual([r["比赛"] for r in result[f"同名选手@{school}"]], ["NOI2020"])

    def test_award_grade_is_not_the_exception_condition(self):
        # OI 获奖时是初三，但 XCPC 当年推算为高一，两校仍适用扩展窗口。
        self.raw.write_text("CSP-S2019,一等奖,同名选手,初三,某初中\n", encoding="utf-8")
        self.assertEqual(set(self.extract(2020)), {f"同名选手@{s}" for s in self.schools[:2]})

    def test_unknown_grade_does_not_match(self):
        self.raw.write_text("CSP-S2020,一等奖,同名选手,未知,某学校\n", encoding="utf-8")
        self.assertEqual(self.extract(2023), {})


if __name__ == "__main__":
    unittest.main()
