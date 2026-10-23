# 연구 기준 버전 (2026-10-23)

## 연구 및 프로젝트 개요

이 프로젝트는 React, TypeScript, Vite, Playwright로 만든 AI 의사결정 지원 인터페이스의 기능 검증용 프로토타입이다. 연구 질문은 (RQ1) UI 조건에 따른 권고 수용과 이의제기의 구조적 상호작용 비용, (RQ2) 근거 검토 요건과 이의제기 접근성이 구현에서 보장되는지 및 절차 우회 가능성이다. 사람을 대상으로 한 실험이나 실제 AI 판단, 문서 공유, 개인정보 수집을 구현한 시스템은 아니다.

설계상 독립변수는 이의제기 진입 접근성(간접/직접)과 수용 전 근거 검토(선택/필수)다. 네 UI 조건에서 AI 권고 문구는 외부 공유 승인으로 고정된다. E1–E3은 기능 검증 입력이며 별도의 독립변수나 참여자 관찰값이 아니다. 설계 명세는 `research/STEP3_SPEC.md`, `research/STEP3_DEVELOPER_BRIEF_KO.md`, `research/STEP4_COUNTEREXAMPLE_SPEC.md`에 있다.

## 실제 구현된 UI 조건

조건 설정과 상태 전이, 버튼 표시는 `src/App.tsx`의 `uiSettings`, `accept`, `enterContest`, 화면별 JSX에 있다. 독립적인 기대 경로 그래프는 `scripts/graph_model.py`의 `conditions`와 `edges`에 있다.

| 조건 | 이의제기 진입 | 수용 전 검토 | 구현된 수용 최단 경로 | 구현된 이의제기 최단 경로 |
| --- | --- | --- | --- | --- |
| U1 | `기타 선택 ···` 메뉴 안의 이의제기 | 선택 | 수용 버튼 → S3 (1회) | 메뉴 → 이의제기 진입 → 사유 선택 → 제출 → S4 (4회) |
| U2 | 추천 화면의 이의제기 버튼 | 선택 | 수용 버튼 → S3 (1회) | 이의제기 진입 → 사유 선택 → 제출 → S4 (3회) |
| U3 | `기타 선택 ···` 메뉴 안의 이의제기 | 필수 | 수용 시작 → 근거 화면의 검토 완료 → 최종 수용 → S3 (3회) | 메뉴 → 이의제기 진입 → 사유 선택 → 제출 → S4 (4회) |
| U4 | 추천 화면의 이의제기 버튼 | 필수 | 수용 시작 → 근거 화면의 검토 완료 → 최종 수용 → S3 (3회) | 이의제기 진입 → 사유 선택 → 제출 → S4 (3회) |

이의제기는 세 가지 미리 정의한 사유 중 하나를 선택해야 제출 버튼이 활성화된다. `S0`은 추천, `S1`은 근거, `S2`는 이의제기 사유, `S3`은 수용 완료, `S4`는 이의제기 제출 완료 화면이다. `M1`, `R1`, `S2R`은 이벤트 기록에 쓰이는 보조 상태다. `window.__researchDebug.getEvents()`는 현재 브라우저 메모리의 조작 기록을 제공한다. URL의 `ui`와 `evidence` 매개변수로 조건을 선택하며, 둘 다 없는 루트 URL은 연구자용 `src/PreviewDashboard.tsx`를 보여준다.

## 실제 구현된 근거 상태

시나리오와 세 근거 fixture는 `src/data/scenario.json`에 있고, `src/App.tsx`의 근거 화면에서 표시된다. 등록된 정책 분류는 `scripts/policy_rules.py`와 `tests/policy_rules.ts`에 있다.

| 상태 | 공유 등급 / 담당자 승인 | 등록된 정책 판단 | AI 권고 | 이의제기 테스트에서 선택하는 사유 |
| --- | --- | --- | --- | --- |
| E1 (충분) | 허용 / 완료 | 승인 (`approve`) | 외부 공유 승인 | 결론에 동의하지 않음 (`disagree`) |
| E2 (상충) | 제한 / 완료 | 거절 (`reject`) | 외부 공유 승인 | 정책과 불일치 (`mismatch`) |
| E3 (부족) | 미확인 / 완료 | 보류 (`hold`) | 외부 공유 승인 | 정보 부족 (`insufficient`) |

현재 UI의 수용 완료 여부는 정책 판단에 따라 차단되지 않는다. 따라서 E2와 E3에서도 S3에 도달하는 경로가 코드와 모델에 있다. U3/U4의 필수 검토는 `근거 검토 완료` 버튼을 누르게 하는 절차이며, 근거를 이해했는지 확인하거나 정책에 맞는 수용만 허용하는 기능은 아니다. `research/STEP4_COUNTEREXAMPLE_SPEC.md`는 이 차이를 분석 대상으로 명시한다.

## 코드와 테스트 위치

- `src/App.tsx`: 네 조건의 제어, 상태 전이, 이의제기 사유 제출, 메모리 이벤트 로그.
- `src/data/scenario.json`: 고정 시나리오, AI 권고, E1–E3 입력값.
- `src/PreviewDashboard.tsx`: 연구자용 조건 선택 화면. 직접 조건 URL과 구별된다.
- `scripts/graph_model.py`: UI별 기대 최단 경로의 유한 그래프.
- `scripts/check_properties.py`, `scripts/policy_rules.py`: 정책 분류 및 P1–P4 모델 경로 검사.
- `tests/paths.spec.ts`: 4 UI × 3 근거 × 2 행동의 24개 브라우저 경로와 클릭 수 기록.
- `tests/data.spec.ts`: E1–E3 근거 표시 3개 검증.
- `tests/guards.spec.ts`: 미선택 이의제기 제출 차단, U3/U4 검토 절차, 새로고침·주소 조작 관련 8개 검증.
- `tests/screenshots.spec.ts`: 동일 E2 fixture로 네 UI의 화면을 캡처하는 1개 검증.
- `tests/policy_reachability.spec.ts`, `tests/policy_rules.ts`: 4 UI × 3 근거의 정책 판단 및 수용 경로 12개 브라우저 재현.
- `playwright.config.ts`: Chromium 데스크톱 설정, 로컬 Vite 서버, JSON/HTML 리포터, 실패 시 trace·스크린샷 설정.
- `package.json`: 실행 및 검증 명령 정의.

`results/`는 그래프·브라우저 로그·CSV·그림·리포트가 생성되는 경로이며 `.gitignore`의 제외 대상이다. 기존 파일이 디스크에 있어도 이 문서는 새 실행으로 그 내용을 검증하거나 연구 결과로 확정하지 않는다.

## 실행 및 테스트 명령

프로젝트 루트에서 Node.js 22.12+, npm, Python 3.9+를 사용한다.

```bash
npm install
npx playwright install chromium
npm run dev
```

예시 조건 URL은 `http://127.0.0.1:5173/?ui=U1&evidence=E1`이다. 테스트는 `playwright.config.ts`가 포트 4173의 서버를 자동 실행한다.

```bash
npm run build
npm run check:properties
npm run test:legacy
npm run test:policy
npm test
npm run research:all
```

`test:legacy`는 24개 경로 테스트와 데이터·가드·화면 캡처 테스트를 실행한다. `test:policy`는 모델 생성 후 별도 12개 정책 경로 테스트를 실행한다. `research:all`은 빌드, 그래프/속성 검사, 두 Playwright 묶음, 결과 집계 및 그림 생성을 순서대로 수행한다. 이 명령들은 `results/`의 산출물을 생성하거나 정리하므로 기준 버전 문서 작성 중에는 실행하지 않았다.

## 확인된 상태와 남은 확인

- 소스 정적 검토로 2×2 조건, 세 fixture, 사유 제출 방식, Playwright 테스트 파일 및 설정을 확인했다.
- 설계 문서의 필수 검토는 실제 코드에서 클릭 기반 확인 단계로 구현되어 있다. `tests/guards.spec.ts`는 일반 UI 경로, 새로고침, 완료 화면 주소 조작의 일부 우회를 검사한다. 모든 브라우저 행위나 서버 보안을 검증하는 시험은 아니다.
- E2/E3의 정책 판단과 고정 AI 승인 권고가 충돌해도 수용 완료가 가능한 점은 현재 구현과 Step 4 명세가 일치한다. 이를 수정하거나 성공적인 정책 정합성으로 해석하지 않는다.
- 기존 `research/STEP4_COUNTEREXAMPLE_SPEC.md`에는 2026-10-23 파이프라인 실행 결과가 기재되어 있다. 이번 기준 버전 작업에서는 Playwright 테스트를 재실행하거나 결과 파일의 내용·재현성을 검증하지 않았다.
- 작업 시작 시 프로젝트 폴더에는 `.git`이 없었다. 사용자 확인을 받아 새 `main` 브랜치로 초기화하고 비어 있던 `dev-yeinchoi/toyproject1-ai-friction` 저장소를 `origin`으로 연결했다. 최종 기준 버전은 이 문서를 포함하는 커밋과 annotated tag `research-baseline-20261023`으로 식별한다.
