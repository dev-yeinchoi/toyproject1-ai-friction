#!/usr/bin/env python3
"""Finite-graph BFS checks for the registered UI paths and policy fixtures."""

from collections import deque
import csv
import json
from pathlib import Path

from graph_model import conditions, edges, shortest
from policy_rules import AI_RECOMMENDATION, validate_scenario

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'results'
DISPLAY_STATE = {'S1_OPTIONAL': 'S1', 'S1_REQUIRED': 'S1'}


def browser_events(path):
    """Convert graph nodes to the IDs exposed by window.__researchDebug."""
    events = []
    previous = 'S0'
    for action, next_state in path:
        events.append({
            'type': action,
            'from': DISPLAY_STATE.get(previous, previous),
            'to': DISPLAY_STATE.get(next_state, next_state),
        })
        previous = next_state
    return events


def route(path):
    if path is None:
        return 'UNREACHABLE'
    return 'S0' + ''.join(f' --{action}--> {state}' for action, state in path)


def reachable_shortest(graph, goal):
    try:
        return shortest(graph, 'S0', goal)
    except ValueError:
        return None


def shortest_review_violation(graph, violation):
    """BFS over graph node × visit flags, so cycles cannot hide a bypass."""
    queue = deque([('S0', False, False, [])])
    visited = {('S0', False, False)}
    while queue:
        node, saw_required, saw_confirmation, path = queue.popleft()
        if node == 'S3' and violation(saw_required, saw_confirmation):
            return path
        for action, next_state in graph.get(node, []):
            required = saw_required or next_state == 'S1_REQUIRED'
            confirmed = saw_confirmation or action == 'review_complete'
            state = (next_state, required, confirmed)
            if state not in visited:
                visited.add(state)
                queue.append((next_state, required, confirmed, path + [(action, next_state)]))
    return None


def main():
    scenario = json.loads((ROOT / 'src/data/scenario.json').read_text(encoding='utf-8'))
    policy = validate_scenario(scenario)
    cases = []
    matrix = []
    for ui, (direct, review_required) in conditions.items():
        graph = edges(direct, review_required)
        accept_path = reachable_shortest(graph, 'S3')
        contest_path = reachable_shortest(graph, 'S4')
        p2_witness = shortest_review_violation(graph, lambda required, confirmed: not (required and confirmed)) if review_required else None
        p4_witness = shortest_review_violation(graph, lambda _required, confirmed: not confirmed) if review_required else None
        for evidence in ('E1', 'E2', 'E3'):
            mismatch = policy[evidence] != AI_RECOMMENDATION
            case_id = f'{ui}_{evidence}'
            case = {
                'case_id': case_id,
                'ui': ui,
                'evidence': evidence,
                'policy_decision': policy[evidence],
                'ai_recommendation': AI_RECOMMENDATION,
                'review_required': review_required,
                'acceptance_reachable': accept_path is not None,
                'acceptance_route': route(accept_path),
                'acceptance_events': browser_events(accept_path) if accept_path is not None else [],
                'contest_reachable': contest_path is not None,
                'contest_route': route(contest_path),
                'contest_events': browser_events(contest_path) if contest_path is not None else [],
                'p2_all_accept_paths_reviewed': p2_witness is None if review_required else None,
                'p3_mismatch_accept_reachable': accept_path is not None if mismatch else None,
                'p4_review_bypass_reachable': p4_witness is not None if review_required else None,
                'p2_witness': route(p2_witness) if p2_witness is not None else None,
                'p4_witness': route(p4_witness) if p4_witness is not None else None,
            }
            cases.append(case)
            matrix.append({
                'case_id': case_id,
                'ui': ui,
                'evidence': evidence,
                'policy_decision': policy[evidence],
                'review_required': review_required,
                'P1_S4_reachable': case['contest_reachable'],
                'P2_all_S3_paths_reviewed': case['p2_all_accept_paths_reviewed'] if review_required else 'N/A',
                'P3_mismatch_S3_reachable': case['p3_mismatch_accept_reachable'] if mismatch else 'N/A',
                'P4_review_bypass_S3_reachable': case['p4_review_bypass_reachable'] if review_required else 'N/A',
                'shortest_S3_route': case['acceptance_route'],
                'shortest_S4_route': case['contest_route'],
                'P2_counterexample_route': case['p2_witness'] or '',
                'P3_counterexample_route': case['acceptance_route'] if mismatch else '',
                'P4_counterexample_route': case['p4_witness'] or '',
            })
    OUT.mkdir(exist_ok=True)
    (OUT / 'property_model.json').write_text(json.dumps({'schema_version': 1, 'cases': cases}, ensure_ascii=False, indent=2), encoding='utf-8')
    with (OUT / 'property_matrix.csv').open('w', newline='', encoding='utf-8-sig') as file:
        writer = csv.DictWriter(file, fieldnames=list(matrix[0]))
        writer.writeheader()
        writer.writerows(matrix)
    candidates = [case for case in cases if case['p3_mismatch_accept_reachable']]
    p2_violations = [case for case in cases if case['p2_witness']]
    p4_violations = [case for case in cases if case['p4_witness']]
    print('Policy:', ', '.join(f'{key}={policy[key]}' for key in ('E1', 'E2', 'E3')))
    print(f'P1 S4 reachable: {sum(case["contest_reachable"] for case in cases)}/12')
    print(f'P2 required-review path violations: {len(p2_violations)}/6')
    print(f'P3 mismatch acceptance candidates: {len(candidates)}/8')
    print(f'P4 required-review bypass paths: {len(p4_violations)}/6')
    for case in candidates:
        print(f'P3 shortest counterexample {case["case_id"]}: {case["acceptance_route"]}')
    for label, violations, witness in [('P2', p2_violations, 'p2_witness'), ('P4', p4_violations, 'p4_witness')]:
        for case in violations:
            print(f'{label} shortest counterexample {case["case_id"]}: {case[witness]}')
    print('Saved:', OUT / 'property_model.json', OUT / 'property_matrix.csv')


if __name__ == '__main__':
    main()
