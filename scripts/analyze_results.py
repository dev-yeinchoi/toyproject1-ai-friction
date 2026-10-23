#!/usr/bin/env python3
"""Analyze REAL browser-collected Playwright logs. Refuse fabricated/incomplete datasets."""
import csv, json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / 'results' / 'raw'
OUT = ROOT / 'results'
UIs = ('U1','U2','U3','U4')
EVIDENCE = ('E1','E2','E3')
ACTIONS = ('ACCEPT','CONTEST')
ids = {f'{ui}_{evidence}_{action}' for ui in UIs for evidence in EVIDENCE for action in ACTIONS}
paths = sorted(RAW.glob('*.json'))
records = []
for path in paths:
    record = json.loads(path.read_text(encoding='utf-8'))
    records.append(record)
found = {r['test_case_id'] for r in records}
if len(records)!=24 or found!=ids:
    raise SystemExit(f'Expected exactly 24 distinct recorded browser paths, got {len(records)} files, {len(found)} distinct case IDs. Run: npm run test:paths')
if any(r['result']!='PASS' or r['total_clicks']!=len(r['events']) for r in records):
    raise SystemExit('Unverified case or click-log inconsistency; aborting analysis')
rows = sorted(records,key=lambda x:x['test_case_id'])
reference = OUT/'graph_expected.csv'
if not reference.exists():
    raise SystemExit('Missing graph_expected.csv. First run: python3 scripts/graph_model.py')
with reference.open(encoding='utf-8-sig',newline='') as f:
    expected = {(r['ui'],r['action']):int(r['shortest_clicks']) for r in csv.DictReader(f)}
for r in rows:
    key=(r['ui_condition'],r['target_action'])
    if key not in expected or expected[key] != r['total_clicks']:
        raise SystemExit(f'Model/browser mismatch for {r["test_case_id"]}: graph={expected.get(key)}, browser={r["total_clicks"]}')

fields = ['test_case_id','ui_condition','evidence_status','target_action','entry_clicks','total_clicks','expected_clicks','ui_state_transitions','screen_transitions','review_required','review_completed','result']
OUT.mkdir(exist_ok=True)
with (OUT/'cases.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows({k:r.get(k) for k in fields} for r in rows)
summary=[]
for ui in UIs:
    a=[r['total_clicks'] for r in rows if r['ui_condition']==ui and r['target_action']=='accept']
    c=[r['total_clicks'] for r in rows if r['ui_condition']==ui and r['target_action']=='contest']
    entries=[r['entry_clicks'] for r in rows if r['ui_condition']==ui and r['target_action']=='contest']
    required = ui in ('U3','U4')
    review = all(r['review_completed'] for r in rows if r['ui_condition']==ui and r['target_action']=='accept') if required else False
    summary.append({'ui':ui,'accept_mean_clicks':sum(a)/len(a),'contest_mean_clicks':sum(c)/len(c),'delta':sum(c)/len(c)-sum(a)/len(a),'contest_entry_mean':sum(entries)/len(entries),'review_required':required,'review_completed_when_required':review})
with (OUT/'comparison.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(summary[0]));w.writeheader();w.writerows(summary)
print('Browser path cases:',len(rows))
print('UI  Accept  Contest  Delta  Contest-entry  Required-review-pass')
for r in summary:
    print(f"{r['ui']:2}  {r['accept_mean_clicks']:>5.1f}  {r['contest_mean_clicks']:>7.1f}  {r['delta']:>5.1f}  {r['contest_entry_mean']:>7.1f}  {str(r['review_completed_when_required']):>8}")
print('Saved CSVs:',OUT/'cases.csv',OUT/'comparison.csv')
print('Render figures after policy analysis with: npm run figures')
