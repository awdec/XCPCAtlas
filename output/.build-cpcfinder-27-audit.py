import collections
import json
from pathlib import Path

base = Path(__file__).resolve().parent
sources = [base / f'cpcfinder-27-audit-{part}.json' for part in ('0-69', '70-139', '140-209')]
rows = []
placeholder_names = {'无', '未知', '待定', '空', '暂无', '不详', '待补充', '-', '?', '？', ''}
for source in sources:
    data = json.loads(source.read_text(encoding='utf-8'))
    for original in data if isinstance(data, list) else data['results']:
        names = original.get('names')
        if names is None:
            names = [member['name'] for member in original['members']]
        names = [name.strip() for name in names]
        placeholders = [name for name in names if name in placeholder_names]
        markers = [name for name in names if name == '两人队']
        actual = [name for name in names if name not in placeholder_names and name != '两人队']
        if placeholders:
            classification = '姓名含占位值'
        elif markers:
            classification = '两人队标记'
        elif len(actual) == 3:
            classification = '三名具体姓名'
        elif actual:
            classification = '其他人数'
        else:
            classification = '无具体姓名'
        rows.append({
            'index': original['index'], 'rank': str(original['rank']),
            'school': original['school'], 'team': original['team'],
            'names': names, 'concreteNames': actual,
            'placeholderNames': placeholders, 'teamSizeMarkers': markers,
            'classification': classification,
        })
rows.sort(key=lambda row: row['index'])
assert [row['index'] for row in rows] == list(range(210))
assert len({row['index'] for row in rows}) == 210
counts = collections.Counter(row['classification'] for row in rows)
summary = {
    'checkedTeams': len(rows),
    'teamsWithAtLeastOneConcreteName': sum(bool(row['concreteNames']) for row in rows),
    'threeConcreteNames': counts['三名具体姓名'],
    'twoPersonTeamMarkers': counts['两人队标记'],
    'teamsWithPlaceholderNames': counts['姓名含占位值'],
    'teamsWithoutConcreteNames': counts['无具体姓名'],
    'memberEntries': sum(len(row['names']) for row in rows),
    'concreteNameEntries': sum(len(row['concreteNames']) for row in rows),
    'placeholderEntries': sum(len(row['placeholderNames']) for row in rows),
    'teamSizeMarkerEntries': sum(len(row['teamSizeMarkers']) for row in rows),
}
document = {
    'checkedDate': '2026-11-03', 'source': 'https://cpcfinder.com/contest/27',
    'contest': '第 46 届 ICPC 国际大学生程序设计竞赛亚洲区域赛昆明站',
    'contestDate': '2022-04-17',
    'method': '在所有队伍视图逐一点击页面所列210支队伍的队名，读取各队详情中的成员姓名链接，保留原始文字，识别无及两人队等非姓名项目。',
    'scope': '仅该页面当前列出的210支获奖队伍，页面提示当前缺少完整数据，不能据此判断比赛全部参赛队伍。',
    'summary': summary,
    'limitations': ['至少一个具体姓名不等于全部队员姓名完整。', '两人队按原始标记单列，不能据此自动认定第三人姓名缺失。', '原始姓名有疑似错字或识别错误，本次不核实姓名真伪或擅自改名。'],
    'results': rows,
}
(base / 'cpcfinder-27-members-audit.json').write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
text = [
    '# CPC Finder 昆明站选手姓名检查', '',
    '检查日期：2026-11-03。', '',
    '来源：[第 46 届 ICPC 亚洲区域赛昆明站](https://cpcfinder.com/contest/27)，比赛日期 2022-04-17。', '',
    f"逐一点击页面当前所列的 {len(rows)} 支队伍，{summary['teamsWithAtLeastOneConcreteName']} 支都有至少一名具体姓名。", '',
    f"其中 {summary['threeConcreteNames']} 支列出三名具体姓名，{summary['twoPersonTeamMarkers']} 支列出两名姓名及“两人队”标记，{summary['teamsWithPlaceholderNames']} 支含“无”占位值，不能称为全部队员姓名完整。", '',
    f"共读取 {summary['memberEntries']} 个成员项目，剔除 {summary['placeholderEntries']} 个占位值和 {summary['teamSizeMarkerEntries']} 个队伍人数标记后，剩余 {summary['concreteNameEntries']} 个姓名项目。", '',
    '页面显示“获奖 210 项”，并提示当前缺少完整数据。本结论仅覆盖该页面所列队伍，不能扩展为全部参赛队伍。姓名疑似错字保留原样，未核实或改名。', '',
    '## 非三名具体姓名的队伍', '',
    '| 页面排名 | 学校 | 队伍 | 原样成员项目 | 结论 |', '|---|---|---|---|---|',
]
for row in rows:
    if row['classification'] != '三名具体姓名':
        text.append(f"| {row['rank']} | {row['school']} | {row['team']} | {' / '.join(row['names'])} | {row['classification']} |")
text += ['', '## 全部210队逐队记录', '', '| 页面排名 | 学校 | 队伍 | 原样成员项目 | 分类 |', '|---|---|---|---|---|']
for row in rows:
    text.append(f"| {row['rank']} | {row['school']} | {row['team']} | {' / '.join(row['names'])} | {row['classification']} |")
(base / 'cpcfinder-27-members-audit.md').write_text('\n'.join(text) + '\n', encoding='utf-8')
print(json.dumps(summary, ensure_ascii=True))
print(json.dumps([row for row in rows if row['classification'] != '三名具体姓名'], ensure_ascii=True))
