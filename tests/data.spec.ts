import { test, expect } from '@playwright/test';
const evidenceValues = {E1:'허용',E2:'제한',E3:'미확인'};
for (const [id, expected] of Object.entries(evidenceValues)) {
  test(`근거 상태 ${id} 값 출력 검증`, async ({page})=>{
    await page.goto(`/?ui=U2&evidence=${id}`);
    await page.getByRole('button',{name:'추천 근거 보기'}).click();
    await expect(page.getByTestId('share-status')).toHaveText(expected);
    await expect(page.getByTestId('approval-status')).toHaveText('완료');
    await page.getByRole('button',{name:'추천 화면으로 돌아가기'}).click();
    await expect(page.getByTestId('screen-S0')).toBeVisible();
  });
}
