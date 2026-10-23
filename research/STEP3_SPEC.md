# Step 3 — Technical / Evaluation Specification (2026-10-23)

## Purpose
Explore structural friction allocation in AI-assisted recommendation acceptance and reason-submission contestation, using an explicit 2×2 prototype design and automated browser functional tests. **Not a randomized human-subject experiment.**

## Design
- IV1: contestation entry, indirect (`U1`, `U3`) vs direct (`U2`, `U4`)
- IV2: evidence-review checkpoint, optional (`U1`, `U2`) vs required (`U3`, `U4`)
- Common synthetic scenario: a project document is recommended for external sharing
- Three data fixtures: E1=allowed/completed; E2=restricted/completed; E3=unknown/completed
- AI recommendation identical in all: approve external sharing
- Acceptance target: reach S3; Contestation target: choose 1 predefined reason and reach S4
- S1 = evidence display; S2 = reason choice; M1 = extra menu; R1 = review confirmation state; S2R = reason-selected state

## State transitions (per click)
- U1/U2: S0 -> S3 via acceptance action
- U3/U4: S0 -> S1 -> R1 -> S3 via acceptance, review confirmation, final acceptance
- U1/U3: S0 -> M1 -> S2 -> S2R(reason selected) -> S4
- U2/U4: S0 -> S2 -> S2R(reason selected) -> S4
- All UIs: S0 -> S1 -> S0 through optional evidence viewing and return
- Cancel/back from S1/S2 returns S0; unfinished mandatory review never counts as completed

## Predefined minimal click costs
| UI | Accept | Contest | Contest-entry | Review required |
|---|---:|---:|---:|---|
| U1 | 1 | 4 | 2 | No |
| U2 | 1 | 3 | 1 | No |
| U3 | 3 | 4 | 2 | Yes |
| U4 | 3 | 3 | 1 | Yes |

Independent expected minimum paths are computed by `scripts/graph_model.py` using breadth-first search on an explicitly defined directed state graph. Browser traces are collected separately using Playwright. No statistical inference on N=24: these are functional test cases, not observations of independent participants.

## Metrics
Primary: minimal acceptance clicks `C_A`, minimal contestation clicks `C_C`, contest entry clicks `C_E`, acceptance-contestation raw difference (`C_C-C_A`). Secondary: state transitions; successful reaching of expected completion screens; mandated-review enforcement and bypass attempts. Explain that raw difference includes intrinsically necessary reason selection and submit clicks; do not interpret as fairness score.

## Acceptance criteria
AC01 optional-review UI acceptance in one click; AC02 mandatory-review acceptance in three clicks; AC03 indirect contest entry in two clicks; AC04 direct contest entry in one click; AC05 contest completed only after reason selection and submit; AC06 blank contest cannot submit; AC07 evidence statuses correctly displayed; AC08 required acceptance review cannot be skipped via ordinary UI; AC09 browser reload and forged location do not produce a completed/reviewed state; AC10 compare actual browser logs against the predefined route model.

## Test matrix
4 UI × 3 evidence fixtures × 2 target actions = 24 nominal functional test cases. Guards/data tests are **additional** and not counted within the 24.

## Implementation invariants
- Same typography/layout/colors and recommendation information, except the two interface manipulations
- Same contest reason choices in same order, same confirmation outcome
- No real LLM call, no backend, no user analytics; no participant recruitment
- Recorded click = one successfully dispatched research UI control interaction (including radio choice)
- State transition = event changes state ID; radio choice is a click and internal state transition (S2→S2R), but not a screen transition
- Screen changes are tracked by React in-memory state; reload resets to S0
- E1/E2/E3 are input fixtures, **not** causal independent variables under this analysis

## Pre-specified output
Figure 1: screenshots of U1-U4. Figure 2: directed state/route diagram. Figure 3: grouped bars for measured automated click counts, plus a companion pass/fail requirements table.

## Red-team limitations
Click number differences are deliberately engineered, not a discovered user effect. Review confirmation demonstrates an enforced interaction checkpoint rather than comprehension. Contestation simulated with predefined reasons is narrower than procedural justice or official appeal mechanisms. Browser tests only check modelled user flows and cannot prove unexploitable security. Do not describe expected numbers as observed before running tests.
