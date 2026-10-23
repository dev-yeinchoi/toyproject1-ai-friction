# Step 4 — Counterexample analysis and state-transition verification

## Question and unchanged design

Can the interface reach acceptance completion (`S3`) when the AI recommends approval but the registered document-sharing policy says `reject` or `hold`, including in U3/U4 where evidence review is mandatory? The existing 2×2 UI factors, E1–E3 fixtures, reason-submission contestation, and completion rules remain unchanged. This extension does not block E2/E3 acceptance or implement an improved U4.

## Independent policy rule

`scripts/policy_rules.py` classifies the registered fixture domain from `src/data/scenario.json`, without importing the React state machine. Under the written policy, `허용/완료` is `approve` (E1), `제한/완료` is `reject` (E2), and `미확인/완료` is `hold` (E3). The script checks those results against each fixture's `expected_policy_decision`, and checks that the written policy and AI recommendation text have not drifted. Other approval or sharing statuses are outside this registered rule and cause an error rather than an invented classification. The AI recommendation is `approve` for all three fixtures.

## Finite model and BFS scope

`scripts/check_properties.py` reuses the action-labeled graph from `scripts/graph_model.py`: `S0` recommendation, `M1` indirect menu, `S1_OPTIONAL` evidence viewed without pending acceptance, `S1_REQUIRED` required acceptance evidence, `R1` review confirmation, `S2` reason choice, `S2R` reason selected, `S3` acceptance complete, and `S4` contestation complete. The graph includes modeled back actions and their cycles. BFS gives the shortest path to `S3` and `S4`. For review checks, BFS searches the finite product of graph state and flags recording whether `S1_REQUIRED` and `review_complete` were visited. Visited product states prevent infinite traversal of back cycles while preserving shortest witnesses.

The four properties are evaluated per UI × evidence fixture:

- **P1:** `S4` is reachable through reason selection and submission.
- **P2:** in U3/U4, every modeled path to `S3` visits required evidence and review confirmation. A shortest violating path would be reported; the statement is vacuous if `S3` is unreachable.
- **P3:** when policy is `reject` or `hold`, `S3` is reachable. This is a counterexample to policy-aligned acceptance, not a test failure. E1 is not a P3 violation.
- **P4:** in U3/U4, a path to `S3` without `review_complete` exists. This is the existential counterpart to the review-confirmation part of P2.

`results/property_matrix.csv` contains the model properties and shortest routes, with `N/A` for inapplicable conditions. `results/property_model.json` carries normalized event paths (`S1_REQUIRED` → browser state ID `S1`) for exact browser comparison.

## Browser reproduction and outputs

`tests/policy_reachability.spec.ts` performs 12 scripted acceptance runs (4 UI × 3 fixtures). A separate pure TypeScript policy function checks fixture decisions against both JSON expectations and the Python-generated model. The test replays acceptance, verifies `S3`, compares every recorded event type/from/to with the shortest model path, and checks `review_complete` for U3/U4. A reachable E2/E3 acceptance is saved with `policy_mismatch_accept_reached: true`; it does not fail the test. Raw events are in `results/policy_raw/`, separate from the original 24 path logs.

`scripts/analyze_policy.py` requires exactly 12 passing policy logs, the model output, and the original 12 passing contestation logs. It validates event chains and model/browser equality before writing `policy_reachability.csv` and `counterexamples.csv`. This lets the new Figure distinguish mandatory review, policy-mismatched acceptance, and an `S4` path verified by the original browser suite. `scripts/render_figures.mjs` uses Playwright to render both PNG figures from validated browser logs, so matplotlib is not required.

## Reproduced result (2026-10-23)

The full `npm run research:all` pipeline completed: TypeScript build passed; the original 36 tests and 12 new policy tests passed separately. P1 was reachable in 12/12 fixture–UI cases. P2 had no violating path in the six U3/U4 cases, and P4 found no required-review bypass in those six cases. P3 produced eight policy-mismatched acceptance counterexamples: E2 and E3 in each U1–U4. The browser replay reached `S3` in all eight and matched the model event sequence. U3/U4 included `review_complete`; the review checkpoint did not enforce a policy-aligned result. E1 acceptance was excluded from the counterexample count.

Representative shortest browser witness for U4/E2: `S0 --accept_click--> S1 --review_complete--> R1 --final_accept--> S3` (three clicks). U1/E2 has the one-click witness `S0 --accept_click--> S3`. The model labels the first evidence state `S1_REQUIRED`; the browser records it as `S1`.

## Interpretation limits

The state graph enumerates the specified research controls and modeled back transitions. It does not enumerate every possible browser action, accessibility command, developer-tool manipulation, script injection, direct URL, reload sequence, server behavior, or future UI change. The new browser suite replays one shortest acceptance path per case; it is not exhaustive browser model checking. Existing guards cover some ordinary reload and forged-location cases, but neither suite proves security or that a person understood the evidence. E1/E2/E3 are functional fixtures, not independent participant observations or causal factors. Eight UI × fixture counterexamples share two distinct acceptance route shapes (optional-review one-click and required-review three-click); they should not be described as eight independent mechanisms. The result supports a narrow structural claim: in the modeled and replayed interface, a mandatory review checkpoint can coexist with an acceptance completion that conflicts with the registered policy. It does not establish real-world error rates, cognitive effects, user fairness, or safety of an operational sharing system.
