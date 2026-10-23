# AI recommendation friction — Research prototype (Steps 3–4)

This is a **functional research prototype** for structural inspection of AI recommendation acceptance and contestation paths. No real user study, production AI, personal data, or real document sharing is involved.

## Requirements
- Node.js 22.12+ and npm
- Python 3.9+; Playwright Chromium renders both PNG figures without matplotlib

## Run locally
```bash
npm install
npx playwright install chromium
npm run dev
```
Open `http://127.0.0.1:5173/?ui=U1&evidence=E1` (replace U1 with U1-U4 and E1 with E1-E3).
For the researcher-only Preview Dashboard, open `http://127.0.0.1:5173/` and select a UI condition and evidence fixture. The dashboard is outside the experiment flow, so its selection clicks are not included in the research event log. Direct condition URLs remain available for reproducible tests and screenshots.

## Run research pipeline
```bash
npm run research:all
```
This runs the TypeScript build, the 8-path graph reference, the independent policy/BFS checks, the original 36 Playwright tests, the separate 12 policy reachability tests, both CSV analyses, and both PNG figures. For individual runs, use `npm run check:properties`, `npm run test:legacy`, `npm run test:policy`, `npm run analyze`, `npm run analyze:policy`, and `npm run figures` in that order after `python3 scripts/graph_model.py`.

The Chrome binary is installed by `npx playwright install chromium`. On Linux you can alternatively set `CHROMIUM_PATH=/usr/bin/chromium` if that executable is available.

## Results
- `results/screenshots/U1.png` ... `U4.png`: controlled UI screenshots (requires `npm run test:figures`)
- `results/graph_expected.csv`: 8 structurally derived paths (NOT empirical data)
- `results/raw/U1_E1_ACCEPT.json` etc.: 24 Playwright browser logs (created only after successfully running tests)
- `results/cases.csv`: 24 case rows from observed browser tests
- `results/comparison.csv`: per-UI path cost comparison
- `results/figure_path_costs.png`: grouped path-cost figure rendered from browser logs
- `results/property_matrix.csv`: P1–P4 finite-graph checks for 12 UI × evidence cases
- `results/property_model.json`: model routes consumed by the separate browser tests
- `results/policy_raw/U1_E1.json` etc.: 12 policy reachability browser logs, separate from the 24 original paths
- `results/policy_reachability.csv`: model/browser comparison and S3/S4 reachability
- `results/counterexamples.csv`: policy-mismatched E2/E3 acceptance paths only
- `results/figure_policy_vs_review.png`: required review, mismatch acceptance, and contestation path matrix
- `results/playwright-report-legacy.json`, `results/html-report-legacy/`: original 36-test reports
- `results/playwright-report-policy.json`, `results/html-report-policy/`: separate 12-test reports
- `results/playwright-report.json`, `results/html-report/`: combined report if `npm test` is run

## Scientific caution
The browser records synthetic automated actions, not human decisions. Clicking more times is not equivalent to a measured cognitive burden or fairness impact. The prototype is designed to test whether specified procedures are implemented and whether observable paths match registered specifications. There are 8 unique planned action paths; three evidence data cases multiply this to 24 functional checks, not 24 independent experiments. Step 4's 12 policy cases are additional functional checks; a policy-mismatched S3 route is an observed interface/model counterexample, not evidence of actual user behavior or harm.

## Data protection
No analytics tracking or Clarity is enabled. Browser event logs remain in client memory; Playwright collects deterministic test cases. Do not present these as participants' records. Completion states are held in memory only and reset on page reload. The absence of a server means this prototype is not suitable for security-critical approvals.

See `research/STEP3_SPEC.md` for the original contract and `research/STEP4_COUNTEREXAMPLE_SPEC.md` for the extension scope and limitations.
