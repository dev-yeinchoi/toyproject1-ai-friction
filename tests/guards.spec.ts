import { test, expect } from '@playwright/test';

test('이의제기 사유 미선택이면 제출할 수 없다', async ({ page }) => {
  await page.goto('/?ui=U2&evidence=E2');
  await page.getByRole('button',{name:'이의제기 시작'}).click();
  await expect(page.getByRole('button',{name:'이의제기 제출'})).toBeDisabled();
  await expect(page.getByTestId('screen-S4')).toHaveCount(0);
});
for (const ui of ['U3','U4'] as const) for (const evidence of ['E1','E2','E3'] as const) {
  test(`${ui}/${evidence} 강제 검토 및 새로고침 우회 차단`, async ({ page }) => {
    await page.goto(`/?ui=${ui}&evidence=${evidence}`);
    await page.getByRole('button',{name:'AI 추천 수용'}).click();
    await expect(page.getByTestId('screen-S1')).toBeVisible();
    await expect(page.getByRole('button',{name:'최종 수용'})).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('screen-S0')).toBeVisible();
    await expect(page.getByTestId('screen-S3')).toHaveCount(0);
    await page.getByRole('button',{name:'AI 추천 수용'}).click();
    await page.getByRole('button',{name:'근거 검토 완료'}).click();
    await page.getByRole('button',{name:'추천 화면으로 돌아가기'}).click();
    await page.getByRole('button',{name:'AI 추천 수용'}).click();
    await expect(page.getByRole('button',{name:'최종 수용'})).toHaveCount(0);
  });
}
test('완료 화면 주소를 임의로 입력해도 S0에서 시작한다',async ({page}) => {
  await page.goto('/?ui=U4&evidence=E2&screen=S3#/S4');
  await expect(page.getByTestId('screen-S0')).toBeVisible();
  await expect(page.getByTestId('screen-S3')).toHaveCount(0);
  await expect(page.getByTestId('screen-S4')).toHaveCount(0);
});
