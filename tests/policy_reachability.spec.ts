import { test, expect } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { decidePolicy, type PolicyDecision } from './policy_rules';

type UiId = 'U1' | 'U2' | 'U3' | 'U4';
type EvidenceId = 'E1' | 'E2' | 'E3';
type EventStep = { type: string; from: string; to: string };
type Scenario = {
  recommendation: string;
  evidence_cases: { id: string; share_status: string; approval: string; expected_policy_decision: string }[];
};
type ModelCase = {
  case_id: string; ui: UiId; evidence: EvidenceId;
  policy_decision: PolicyDecision; ai_recommendation: 'approve';
  review_required: boolean; acceptance_reachable: boolean;
  acceptance_route: string; acceptance_events: EventStep[];
  contest_reachable: boolean; contest_route: string;
};
const root = process.cwd();
const scenario = JSON.parse(readFileSync(join(root, 'src/data/scenario.json'), 'utf8')) as Scenario;
const model = JSON.parse(readFileSync(join(root, 'results', 'property_model.json'), 'utf8')) as { cases: ModelCase[] };
const modelCases = new Map(model.cases.map(item => [item.case_id, item]));
const UIs: UiId[] = ['U1', 'U2', 'U3', 'U4'];
const evidences: EvidenceId[] = ['E1', 'E2', 'E3'];

test.describe('Policy reachability: 4 UI × 3 evidence = 12 cases', () => {
  for (const ui of UIs) for (const evidence of evidences) {
    const caseId = `${ui}_${evidence}`;
    test(caseId, async ({ page }) => {
      const fixture = scenario.evidence_cases.find(item => item.id === evidence);
      const expected = modelCases.get(caseId);
      expect(fixture, `fixture ${evidence}`).toBeDefined();
      expect(expected, `model case ${caseId}; run npm run check:properties`).toBeDefined();
      const policyDecision = decidePolicy(fixture!.share_status, fixture!.approval);
      expect(policyDecision).toBe(fixture!.expected_policy_decision);
      expect(policyDecision).toBe(expected!.policy_decision);
      expect(expected!.ai_recommendation).toBe('approve');
      expect(scenario.recommendation).toBe('외부 공유 승인을 권고합니다.');

      await page.goto(`/?ui=${ui}&evidence=${evidence}`);
      await expect(page.getByTestId('screen-S0')).toBeVisible();
      await page.getByRole('button', { name: 'AI 추천 수용' }).click();
      if (expected!.review_required) {
        await expect(page.getByTestId('screen-S1')).toBeVisible();
        await expect(page.getByTestId('share-status')).toHaveText(fixture!.share_status);
        await expect(page.getByTestId('approval-status')).toHaveText(fixture!.approval);
        await page.getByRole('button', { name: '근거 검토 완료' }).click();
        await page.getByRole('button', { name: '최종 수용' }).click();
      }
      const s3Reached = await page.getByTestId('screen-S3').isVisible();
      const events = await page.evaluate(() => window.__researchDebug?.getEvents() ?? []);
      const eventSteps = events.map(({ type, from, to }) => ({ type, from, to }));
      const reviewCompleted = events.some(event => event.type === 'review_complete');
      const modelBrowserPathMatch = JSON.stringify(eventSteps) === JSON.stringify(expected!.acceptance_events);
      expect(s3Reached).toBe(expected!.acceptance_reachable);
      expect(reviewCompleted).toBe(expected!.review_required);
      expect(modelBrowserPathMatch).toBe(true);
      const policyMismatchAcceptReached = policyDecision !== 'approve' && s3Reached;
      const observedRoute = 'S0' + events.map(event => ` --${event.type}--> ${event.to}`).join('');
      const record = {
        case_id: caseId, ui, evidence, policy_decision: policyDecision,
        ai_recommendation: 'approve', review_required: expected!.review_required,
        model_s3_reachable: expected!.acceptance_reachable, observed_s3_reached: s3Reached,
        model_s4_reachable: expected!.contest_reachable,
        review_completed: reviewCompleted, policy_mismatch_accept_reached: policyMismatchAcceptReached,
        total_clicks: events.length, model_acceptance_route: expected!.acceptance_route,
        model_contest_route: expected!.contest_route, observed_route: observedRoute,
        model_browser_path_match: modelBrowserPathMatch, events, result: 'PASS',
      };
      mkdirSync(join(root, 'results', 'policy_raw'), { recursive: true });
      writeFileSync(join(root, 'results', 'policy_raw', `${caseId}.json`), JSON.stringify(record, null, 2));
    });
  }
});
