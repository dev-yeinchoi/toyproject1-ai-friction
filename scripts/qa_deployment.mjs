import { chromium } from '@playwright/test';

const base = process.argv[2]?.replace(/\/$/, '');
const mode = process.argv[3] ?? 'clarity-off';
if (!base || !['clarity-off', 'consent-mock'].includes(mode)) {
  console.error('Usage: node scripts/qa_deployment.mjs <base-url> [clarity-off|consent-mock]');
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const consoleErrors = [];
const networkErrors = [];
const clarityRequests = [];
page.on('pageerror', error => consoleErrors.push(error.message));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('response', response => {
  if (response.url().startsWith(base) && response.status() >= 400) networkErrors.push(`${response.status()} ${response.url()}`);
});
page.on('requestfailed', request => {
  if (request.url().startsWith(base)) networkErrors.push(`${request.failure()?.errorText ?? 'request failed'} ${request.url()}`);
});
page.on('request', request => {
  if (/https:\/\/(?:www\.)?clarity\.ms\//.test(request.url())) clarityRequests.push(request.url());
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
async function visible(testId) { await page.getByTestId(testId).waitFor({ state: 'visible' }); }
async function events() { return page.evaluate(() => window.__researchDebug?.getEvents() ?? []); }

try {
  if (mode === 'consent-mock') {
    await page.route('https://www.clarity.ms/tag/**', route => route.fulfill({
      contentType: 'application/javascript',
      body: `const pending=window.clarity?.q||[];
window.clarity=function(...args){const calls=JSON.parse(sessionStorage.getItem('qa-clarity-calls')||'[]');calls.push(args);sessionStorage.setItem('qa-clarity-calls',JSON.stringify(calls));};
for(const call of pending) window.clarity(...Array.from(call));
document.addEventListener('click',()=>fetch('https://www.clarity.ms/collect',{method:'POST',mode:'no-cors'}));`,
    }));
    await page.route('https://www.clarity.ms/collect', route => route.fulfill({ status: 204, body: '' }));
    await page.goto(`${base}/?ui=U4&evidence=E2`);
    await visible('screen-S0');
    assert(clarityRequests.length === 0, 'Clarity loaded before consent');
    await page.getByRole('button', { name: '분석 거부' }).click();
    await page.reload();
    assert(clarityRequests.length === 0, 'Clarity loaded after initial denial');
    await page.getByRole('button', { name: '분석 동의' }).click();
    await page.waitForFunction(() => sessionStorage.getItem('qa-clarity-calls') !== null);
    assert(clarityRequests.filter(url => url.includes('/tag/')).length === 1, 'Clarity did not load once after grant');
    let calls = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qa-clarity-calls') ?? '[]'));
    assert(calls.some(([name, value]) => name === 'consentv2' && value.ad_Storage === 'denied' && value.analytics_Storage === 'granted'), 'Consent V2 grant missing');
    assert((await events()).length === 0, 'Consent click entered research event log');
    await page.getByRole('button', { name: '동의 철회' }).click();
    await visible('screen-S0');
    calls = await page.evaluate(() => JSON.parse(sessionStorage.getItem('qa-clarity-calls') ?? '[]'));
    assert(calls.some(([name, value]) => name === 'consentv2' && value.ad_Storage === 'denied' && value.analytics_Storage === 'denied'), 'Consent V2 withdrawal missing');
    const requestCount = clarityRequests.length;
    await page.getByRole('button', { name: '추천 근거 보기' }).click();
    await visible('screen-S1');
    await page.waitForTimeout(300);
    assert(clarityRequests.length === requestCount, 'Clarity continued after withdrawal and reload');
    assert(await page.evaluate(() => !document.querySelector('script[data-clarity-project]') && !window.clarity), 'Clarity script persisted after withdrawal');
    console.log(JSON.stringify({ mode, consentV2: 'grant and withdrawal observed', preConsentRequests: 0, postWithdrawalNewRequests: 0, researchEventsFromConsentClicks: 0, consoleErrors, networkErrors }, null, 2));
  } else {
    const expectedEvidence = { E1: '허용', E2: '제한', E3: '미확인' };
    const reasons = { E1: 'disagree', E2: 'mismatch', E3: 'insufficient' };
    const clickCounts = { U1: [1, 4], U2: [1, 3], U3: [3, 4], U4: [3, 3] };
    const cases = [];
    await page.goto(`${base}/`);
    await page.getByRole('heading', { name: '실험 조건 설정' }).waitFor();
    await page.locator('.preview-condition').filter({ hasText: 'U4' }).click();
    await page.locator('.preview-evidence').filter({ hasText: 'E3' }).click();
    await page.getByRole('button', { name: /선택한 조건으로 진입/ }).click();
    await visible('screen-S0');
    assert(page.url().includes('ui=U4&evidence=E3'), 'Dashboard condition URL mismatch');

    for (const ui of ['U1', 'U2', 'U3', 'U4']) for (const evidence of ['E1', 'E2', 'E3']) {
      const url = `${base}/?ui=${ui}&evidence=${evidence}`;
      const response = await page.goto(url);
      assert(response?.status() === 200, `${ui}/${evidence}: direct URL status`);
      await visible('screen-S0');
      await page.getByRole('button', { name: '추천 근거 보기' }).click();
      await visible('screen-S1');
      assert((await page.getByTestId('share-status').textContent()) === expectedEvidence[evidence], `${ui}/${evidence}: evidence display`);
      await page.goto(url);
      await page.getByRole('button', { name: 'AI 추천 수용' }).click();
      if (ui === 'U3' || ui === 'U4') {
        await visible('screen-S1');
        assert((await page.getByRole('button', { name: '최종 수용' }).count()) === 0, `${ui}/${evidence}: review guard`);
        await page.getByRole('button', { name: '근거 검토 완료' }).click();
        await page.getByRole('button', { name: '최종 수용' }).click();
      }
      await visible('screen-S3');
      const accept = await events();
      assert(accept.length === clickCounts[ui][0], `${ui}/${evidence}: accept clicks`);
      await page.goto(url);
      if (ui === 'U1' || ui === 'U3') {
        await page.getByRole('button', { name: '기타 선택 ···' }).click();
        await page.getByRole('button', { name: 'AI 추천에 이의제기' }).click();
      } else await page.getByRole('button', { name: '이의제기 시작' }).click();
      await visible('screen-S2');
      assert(await page.getByRole('button', { name: '이의제기 제출' }).isDisabled(), `${ui}/${evidence}: reason guard`);
      await page.locator(`input[type="radio"][value="${reasons[evidence]}"]`).check();
      await page.getByRole('button', { name: '이의제기 제출' }).click();
      await visible('screen-S4');
      assert((await events()).length === clickCounts[ui][1], `${ui}/${evidence}: contest clicks`);
      cases.push(`${ui}/${evidence}`);
    }
    await page.goto(`${base}/?ui=U4&evidence=E2`);
    await page.getByRole('button', { name: 'AI 추천 수용' }).click();
    await visible('screen-S1');
    await page.reload();
    await visible('screen-S0');
    await page.goto(`${base}/?ui=U4&evidence=E2&screen=S3#/S4`);
    await visible('screen-S0');
    for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.goto(`${base}/?ui=U4&evidence=E2`);
      await visible('screen-S0');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(scrollWidth <= viewport.width + 1, `Horizontal overflow at ${viewport.width}px: ${scrollWidth}`);
    }
    assert(clarityRequests.length === 0, 'Clarity request observed while disabled');
    assert(consoleErrors.length === 0, `Console errors: ${consoleErrors}`);
    assert(networkErrors.length === 0, `Network errors: ${networkErrors}`);
    console.log(JSON.stringify({ mode, qaCases: cases, directUrls: cases.length, dashboard: 'PASS', acceptContestEvidence: 'PASS', guards: 'PASS', desktopMobile: 'PASS', clarityRequests: 0, consoleErrors, networkErrors }, null, 2));
  }
  assert(consoleErrors.length === 0 && networkErrors.length === 0, 'Console or first-party network errors');
} finally {
  await browser.close();
}
