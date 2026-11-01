"""从成绩表旁的 .members.json 补充缺失队员，供选手提取和成绩转换共用。"""

import json
from pathlib import Path

import pandas as pd


def supplement_members(df, xlsx_path):
    """按学校＋队名精确匹配；原表已有姓名时以原表为准，不混用两份名单。"""
    path = Path(xlsx_path).with_suffix(".members.json")
    if not path.exists():
        return df

    data = json.loads(path.read_text(encoding="utf-8"))
    roster = {}
    for team in data["teams"]:
        key = (team["school"].strip(), team["team"].strip())
        names = team["members"]
        if key in roster:
            raise ValueError(f"{path}: 重复队伍 {key}")
        if not 1 <= len(names) <= 3 or any(not isinstance(n, str) or not n.strip() for n in names):
            raise ValueError(f"{path}: 队员名单无效 {key}")
        roster[key] = [n.strip() for n in names]

    df = df.copy()
    columns = ["Member1", "Member2", "Member3"]
    for col in columns:
        if col not in df.columns:
            df[col] = None
    for idx, row in df.iterrows():
        if any(pd.notna(row[col]) and str(row[col]).strip() for col in columns):
            continue
        key = (str(row["Organization"]).strip(), str(row["Team"]).strip())
        if key not in roster:
            raise ValueError(f"{path}: 未找到队伍 {key} 的补充名单")
        for col, name in zip(columns, roster[key]):
            df.at[idx, col] = name
    return df
