#!/usr/bin/env python3
"""Validate 12 browser reproductions against the model and export Step 4 tables."""

import csv
import json
from pathlib import Path

from policy_rules import AI_RECOMMENDATION, validate_scenario

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'results'
UIS = ('U1', 'U2', 'U3', 'U4')
EVIDENCE = ('E1', 'E2', 'E3')
IDS = {f'{ui}_{evidence}' for ui in UIS for evidence in EVIDENCE}


def read_json(path):
    if not path.exists():
        raise SystemExit(f'Missing required record: {path}')
    return json.loads(path.read_text(encoding='utf-8'))


def write_csv(path, fields, rows):
    with path.open('w', encoding='utf-8-sig', newline='') as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    scenario = read_json(ROOT / 'src/data/scenario.json')
    decisions = validate_scenario(scenario)
    model_cases = read_json(OUT / 'property_model.json')['cases']
    model = {case['case_id']: case for case in model_cases}
    if len(model_cases) != 12 or set(model) != IDS:
        raise SystemExit('Expected exactly 12 distinct model cases; run npm run check:properties')
    with (OUT / 'property_matrix.csv').open(encoding='utf-8-sig', newline='') as file:
        matrix = list(csv.DictReader(file))
    if len(matrix) != 12 or {row['case_id'] for row in matrix} != IDS:
        raise SystemExit('Property matrix is incomplete; run npm run check:properties')

    raw_files = sorted((OUT / 'policy_raw').glob('*.json'))
    if len(raw_files) != 12 or {path.stem for path in raw_files} != IDS:
        raise SystemExit(f'Expected exactly 12 policy browser logs, got {len(raw_files)}; run npm run test:policy')

    reachability = []
    counterexamples = []
    for case_id in sorted(IDS):
        ui, evidence = case_id.split('_')
        expected = model[case_id]
        observed = read_json(OUT / 'policy_raw' / f'{case_id}.json')
        contest = read_json(OUT / 'raw' / f'{ui}_{evidence}_CONTEST.json')
        events = observed['events']
        actual_steps = [{key: event[key] for key in ('type', 'from', 'to')} for event in events]
        contest_steps = [{key: event[key] for key in ('type', 'from', 'to')} for event in contest['events']]
        for index, event in enumerate(events):
            if event['index'] != index + 1 or event['from'] != (events[index - 1]['to'] if index else 'S0'):
                raise SystemExit(f'Broken browser event chain in {case_id}')
        if any([
            observed['result'] != 'PASS',
            observed['case_id'] != case_id,
            observed['policy_decision'] != decisions[evidence],
            observed['ai_recommendation'] != AI_RECOMMENDATION,
            observed['total_clicks'] != len(events),
            actual_steps != expected['acceptance_events'],
            observed['observed_s3_reached'] != expected['acceptance_reachable'],
            observed['review_completed'] != expected['review_required'],
            not observed['model_browser_path_match'],
            contest['result'] != 'PASS',
            contest['test_case_id'] != f'{ui}_{evidence}_CONTEST',
            not contest['events'] or contest['events'][-1]['to'] != 'S4',
            contest['total_clicks'] != len(contest['events']),
            contest_steps != expected['contest_events'],
        ]):
            raise SystemExit(f'Model/browser/baseline mismatch in {case_id}')
        mismatch = decisions[evidence] != AI_RECOMMENDATION and observed['observed_s3_reached']
        if mismatch != observed['policy_mismatch_accept_reached']:
            raise SystemExit(f'Mismatch classification error in {case_id}')
        row = {
            'case_id': case_id,
            'ui': ui,
            'evidence': evidence,
            'policy_decision': decisions[evidence],
            'ai_recommendation': AI_RECOMMENDATION,
            'review_required': expected['review_required'],
            'model_S3_reachable': expected['acceptance_reachable'],
            'browser_S3_reached': observed['observed_s3_reached'],
            'model_S4_reachable': expected['contest_reachable'],
            'browser_S4_reached': True,
            'review_event_present': observed['review_completed'],
            'model_browser_path_match': True,
            'policy_mismatch_accept_reached': mismatch,
            'accept_clicks': observed['total_clicks'],
            'model_acceptance_route': expected['acceptance_route'],
            'browser_acceptance_route': observed['observed_route'],
            'model_contest_route': expected['contest_route'],
        }
        reachability.append(row)
        if mismatch:
            counterexamples.append({
                'case_id': case_id,
                'ui': ui,
                'evidence': evidence,
                'policy_decision': decisions[evidence],
                'ai_recommendation': AI_RECOMMENDATION,
                'review_required': expected['review_required'],
                'review_event_present': observed['review_completed'],
                'shortest_model_route': expected['acceptance_route'],
                'observed_browser_route': observed['observed_route'],
                'accept_clicks': observed['total_clicks'],
            })
    write_csv(OUT / 'policy_reachability.csv', list(reachability[0]), reachability)
    write_csv(OUT / 'counterexamples.csv', list(counterexamples[0]) if counterexamples else [
        'case_id', 'ui', 'evidence', 'policy_decision', 'ai_recommendation',
        'review_required', 'review_event_present', 'shortest_model_route',
        'observed_browser_route', 'accept_clicks',
    ], counterexamples)
    print(f'Validated policy cases: {len(reachability)}; policy-mismatched S3 counterexamples: {len(counterexamples)}')
    for row in counterexamples:
        print(f"{row['case_id']}: {row['observed_browser_route']}")
    print('Saved:', OUT / 'policy_reachability.csv', OUT / 'counterexamples.csv')


if __name__ == '__main__':
    main()
