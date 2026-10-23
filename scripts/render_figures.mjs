/** Render both research figures from verified browser logs using bundled Playwright. */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const root = process.cwd();
const results = join(root, 'results');
const uis = ['U1', 'U2', 'U3', 'U4'];
const evidences = ['E1', 'E2', 'E3'];
for (const name of ['comparison.csv', 'policy_reachability.csv', 'property_matrix.csv']) {
  if (!existsSync(join(results, name))) throw new Error(`Missing ${name}; run the analysis scripts first`);
}
const readRecord = path => JSON.parse(readFileSync(path, 'utf8'));
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const text = (x, y, value, size = 20, color = '#203445', weight = 500, extra = '') =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" ${extra}>${esc(value)}</text>`;
const rect = (x, y, width, height, fill, radius = 0, stroke = 'none') =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
const line = (x1, y1, x2, y2, color, width = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
const svg = (width, height, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">${rect(0, 0, width, height, '#ffffff')}${content}</svg>`;

const pathCounts = uis.map(ui => {
  const counts = { ui, accept: [], contest: [] };
  for (const evidence of evidences) for (const action of ['ACCEPT', 'CONTEST']) {
    const record = readRecord(join(results, 'raw', `${ui}_${evidence}_${action}.json`));
    if (record.result !== 'PASS' || record.total_clicks !== record.events.length) throw new Error(`Invalid baseline log: ${ui}_${evidence}_${action}`);
    counts[action.toLowerCase()].push(record.total_clicks);
  }
  return {
    ui,
    accept: counts.accept.reduce((sum, count) => sum + count, 0) / 3,
    contest: counts.contest.reduce((sum, count) => sum + count, 0) / 3,
  };
});

function pathFigure() {
  const parts = [
    text(100, 82, 'Structural path costs by interface condition', 34, '#172e40', 750),
    text(100, 123, 'Recorded clicks from 24 scripted browser paths · 3 evidence fixtures per UI', 19, '#647987'),
    rect(100, 162, 22, 22, '#27658d', 4), text(133, 180, 'Acceptance', 18),
    rect(285, 162, 22, 22, '#258875', 4), text(318, 180, 'Contestation', 18),
  ];
  const left = 160;
  const right = 1200;
  const top = 240;
  const bottom = 620;
  for (let tick = 0; tick <= 5; tick++) {
    const y = bottom - tick * ((bottom - top) / 5);
    parts.push(line(left, y, right, y, '#e0e8ec'));
    parts.push(text(140, y + 7, tick, 16, '#738690', 500, 'text-anchor="end"'));
  }
  const centers = [290, 550, 810, 1070];
  for (let index = 0; index < pathCounts.length; index++) {
    const row = pathCounts[index];
    const center = centers[index];
    const values = [row.accept, row.contest];
    const colors = ['#27658d', '#258875'];
    for (let series = 0; series < 2; series++) {
      const value = values[series];
      const height = value * ((bottom - top) / 5);
      const x = center + (series === 0 ? -74 : 8);
      parts.push(rect(x, bottom - height, 66, height, colors[series], 7));
      parts.push(text(x + 33, bottom - height - 13, value.toFixed(1), 17, colors[series], 700, 'text-anchor="middle"'));
    }
    parts.push(text(center, 658, row.ui, 21, '#203445', 750, 'text-anchor="middle"'));
  }
  parts.push(text(100, 710, 'Counts are designed path costs verified by automation, not observed participant behavior.', 16, '#768894'));
  return svg(1300, 760, parts.join(''));
}

const policyCases = new Map();
for (const ui of uis) for (const evidence of evidences) {
  const id = `${ui}_${evidence}`;
  const record = readRecord(join(results, 'policy_raw', `${id}.json`));
  const contest = readRecord(join(results, 'raw', `${id}_CONTEST.json`));
  if (record.result !== 'PASS' || contest.result !== 'PASS' || contest.events.at(-1)?.to !== 'S4') throw new Error(`Invalid policy or contest log: ${id}`);
  policyCases.set(id, record);
}

function policyFigure() {
  const parts = [
    text(90, 74, '정책 판정과 상태 도달 가능성', 36, '#172e40', 760),
    text(90, 111, '4개 UI × 3개 근거 상태 · 유한 상태 모델과 Playwright 재현 결과', 19, '#627784'),
    rect(90, 144, 18, 18, '#32749b', 4), text(118, 160, '필수 근거 검토', 17),
    rect(325, 144, 18, 18, '#c75b58', 4), text(353, 160, '정책 불일치 수용 완료', 17),
    rect(625, 144, 18, 18, '#248a69', 4), text(653, 160, '이의제기 완료 경로', 17),
  ];
  const columns = [190, 505, 820, 1135];
  const rows = [238, 423, 608];
  const headings = ['간접 진입 · 선택 검토', '직접 진입 · 선택 검토', '간접 진입 · 필수 검토', '직접 진입 · 필수 검토'];
  const policies = { E1: 'approve', E2: 'reject', E3: 'hold' };
  for (let col = 0; col < 4; col++) {
    parts.push(text(columns[col] + 135, 203, uis[col], 23, '#173e55', 760, 'text-anchor="middle"'));
    parts.push(text(columns[col] + 135, 224, headings[col], 14, '#687d88', 500, 'text-anchor="middle"'));
  }
  for (let row = 0; row < 3; row++) {
    const evidence = evidences[row];
    parts.push(text(90, rows[row] + 49, evidence, 23, '#203445', 750));
    parts.push(text(90, rows[row] + 75, policies[evidence], 15, '#748792'));
    for (let col = 0; col < 4; col++) {
      const ui = uis[col];
      const record = policyCases.get(`${ui}_${evidence}`);
      const x = columns[col];
      const y = rows[row];
      const violation = record.policy_mismatch_accept_reached;
      parts.push(rect(x, y, 270, 159, violation ? '#fff9f8' : '#f9fbfc', 13, violation ? '#eccac8' : '#dce6ea'));
      parts.push(text(x + 20, y + 28, `${evidence} · ${policies[evidence]}`, 16, '#203445', 730));
      const indicators = [
        { label: record.review_required ? '필수 검토 있음' : '필수 검토 없음', color: record.review_required ? '#32749b' : '#b9c8cf' },
        { label: violation ? '불일치 수용 도달' : '불일치 수용 해당 없음', color: violation ? '#c75b58' : '#b9c8cf' },
        { label: '이의제기 완료 도달', color: '#248a69' },
      ];
      indicators.forEach((item, index) => {
        const yy = y + 58 + index * 31;
        parts.push(rect(x + 20, yy - 12, 14, 14, item.color, 3));
        parts.push(text(x + 45, yy, item.label, 15, '#38515e', 570));
      });
    }
  }
  const count = [...policyCases.values()].filter(record => record.policy_mismatch_accept_reached).length;
  parts.push(text(90, 820, `붉은 표시 ${count}건은 정책상 reject/hold인 E2·E3에서 S3 도달이 재현된 경우입니다. E1의 정상 수용은 제외했습니다.`, 16, '#637985'));
  return svg(1500, 865, parts.join(''));
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const [filename, figure] of [
    ['figure_path_costs.png', pathFigure()],
    ['figure_policy_vs_review.png', policyFigure()],
  ]) {
    await page.setContent(`<html><body style="margin:0">${figure}</body></html>`);
    await page.locator('svg').screenshot({ path: join(results, filename) });
    console.log('Saved figure:', join(results, filename));
  }
} finally {
  await browser.close();
}
