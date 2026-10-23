"""Policy decision for the registered E1/E2/E3 fixtures, independent of UI flow."""

POLICY_TEXT = '외부 공유 등급이 ‘허용’이고 담당자 승인이 ‘완료’된 문서만 공유할 수 있습니다.'
AI_RECOMMENDATION = 'approve'
AI_RECOMMENDATION_TEXT = '외부 공유 승인을 권고합니다.'


def decide_policy(share_status: str, approval: str) -> str:
    """Classify the registered fixture domain; do not infer rules for other statuses."""
    if approval != '완료':
        raise ValueError(f'Unspecified approval status: {approval!r}')
    decisions = {'허용': 'approve', '제한': 'reject', '미확인': 'hold'}
    try:
        return decisions[share_status]
    except KeyError as error:
        raise ValueError(f'Unspecified share status: {share_status!r}') from error


def validate_scenario(scenario: dict) -> dict[str, str]:
    if scenario['policy'] != POLICY_TEXT:
        raise ValueError('Scenario policy text changed; review the independent decision rule')
    if scenario['recommendation'] != AI_RECOMMENDATION_TEXT:
        raise ValueError('AI recommendation changed; Step 4 assumes approve in every fixture')
    decisions = {}
    for fixture in scenario['evidence_cases']:
        decision = decide_policy(fixture['share_status'], fixture['approval'])
        if decision != fixture['expected_policy_decision']:
            raise ValueError(f"Policy/fixture mismatch for {fixture['id']}: {decision} != {fixture['expected_policy_decision']}")
        decisions[fixture['id']] = decision
    if set(decisions) != {'E1', 'E2', 'E3'}:
        raise ValueError(f'Expected E1/E2/E3, got {sorted(decisions)}')
    return decisions
