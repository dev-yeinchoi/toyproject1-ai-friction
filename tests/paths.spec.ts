import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type UiId = 'U1'|'U2'|'U3'|'U4';
type EvidenceId = 'E1'|'E2'|'E3';
type Action = 'ACCEPT'|'CONTEST';
const UIs: UiId[] = ['U1','U2','U3','U4'];
const evidences: EvidenceId[] = ['E1','E2','E3'];
const actions: Action[] = ['ACCEPT','CONTEST'];
const expectedCounts: Record<UiId,{ACCEPT: number;CONTEST: number}> = {
  U1: {ACCEPT:1, CONTEST:4}, U2:{ACCEPT:1,CONTEST:3},
  U3: {ACCEPT:3, CONTEST:4}, U4:{ACCEPT:3,CONTEST:3},
};
const reasons:Record<EvidenceId,string> = {E1:'disagree',E2:'mismatch',E3:'insufficient'};

test.describe('Main paths: 4 UI × 3 evidence × 2 action = 24 tests', () => {
  for (const ui of UIs) for (const evidence of evidences) for (const action of actions) {
    const id = `${ui}_${evidence}_${action}`;
    test(id, async ({ page }) => {
      await page.goto(`/?ui=${ui}&evidence=${evidence}`);
      await expect(page.getByTestId('screen-S0')).toBeVisible();
      if (action === 'ACCEPT') {
        await page.getByRole('button', {name:'AI 추천 수용'}).click();
        if (ui==='U3'||ui==='U4') {
          await expect(page.getByTestId('screen-S1')).toBeVisible();
          await expect(page.getByTestId('screen-S3')).toHaveCount(0);
          await page.getByRole('button',{name:'근거 검토 완료'}).click();
          await page.getByRole('button',{name:'최종 수용'}).click();
        }
        await expect(page.getByTestId('screen-S3')).toBeVisible();
      } else {
        if (ui==='U1'||ui==='U3') {
          await page.getByRole('button',{name:'기타 선택 ···'}).click();
          await page.getByRole('button',{name:'AI 추천에 이의제기'}).click();
        } else {
          await page.getByRole('button',{name:'이의제기 시작'}).click();
        }
        await expect(page.getByTestId('screen-S2')).toBeVisible();
        await page.locator(`input[type="radio"][value="${reasons[evidence]}"]`).check();
        await page.getByRole('button',{name:'이의제기 제출'}).click();
        await expect(page.getByTestId('screen-S4')).toBeVisible();
      }
      const events = await page.evaluate(() => window.__researchDebug?.getEvents() ?? []);
      const totalClicks = events.length;
      expect(totalClicks, `recorded clicks for ${id}`).toBe(expectedCounts[ui][action]);
      const entryEventIdx = events.findIndex(e => e.type === 'contest_entry');
      const entryClicks = action === 'CONTEST' && entryEventIdx >= 0 ? entryEventIdx+1 : null;
      const reviewCompleted = events.some(e => e.type === 'review_complete');
      const uiStateTransitions = events.filter(e => e.from !== e.to).length;
      const screenOf = (state: string) => state === 'M1' ? 'S0' : state === 'R1' ? 'S1' : state === 'S2R' ? 'S2' : state;
      const screenTransitions = events.filter(e => screenOf(e.from) !== screenOf(e.to)).length;
      const reviewRequired = (ui === 'U3'||ui === 'U4');
      const record = {
        test_case_id:id, ui_condition:ui, evidence_status:evidence, target_action:action.toLowerCase(),
        total_clicks:totalClicks, expected_clicks:expectedCounts[ui][action],
        entry_clicks:entryClicks,
        ui_state_transitions:uiStateTransitions, screen_transitions:screenTransitions,
        review_required:reviewRequired,
        review_completed:reviewCompleted,
        result:'PASS',
        events
      };
      mkdirSync(join(process.cwd(),'results','raw'),{recursive:true});
      writeFileSync(join(process.cwd(),'results','raw',`${id}.json`), JSON.stringify(record,null,2));
    });
  }
});
