# Vercel 배포 및 Microsoft Clarity 연동

## 버전과 범위

- 연구 기준 버전: `8281475f9885673ef9b9ec2f725497f080686dc8`, annotated tag `research-baseline-20261023`.
- 배포 브랜치: `deploy/clarity-vercel`. Production은 이 문서가 포함된 브랜치 HEAD에서 빌드한다. 정확한 SHA는 최종 배포 기록 및 Vercel deployment metadata로 확인한다.
- 배포 브랜치는 기존 연구 App의 UI 조건, 시나리오 fixture, 상태 전이 및 테스트 기대값을 변경하지 않는다. Clarity 방문 분석은 논문의 Playwright 결과와 별도로 취급한다.
- 이 사이트는 연구용 프로토타입이며 실제 AI 승인, 문서 공유, 연구 참가자 모집 또는 개인정보 입력 기능이 없다.

## Vercel 프로젝트 및 배포 URL

| 항목 | 값 |
| --- | --- |
| Vercel 프로젝트 | `yeinchoi/toyproject1-ai-friction` (`prj_wUSuVp00YfkpMpRWwK7TNcsdMr2U`) |
| Preview URL | https://toyproject1-ai-friction-gh11xur9j-yeinchoi.vercel.app |
| Production URL | https://toyproject1-ai-friction.vercel.app |
| Production 커밋 | 이 문서가 포함된 `deploy/clarity-vercel` HEAD. 최종 SHA는 배포 기록에서 확인 |

## 빌드 및 배포 절차

`vercel.json`은 Framework `vite`, 설치 `npm ci`, 빌드 `npm run build`, 출력 `dist`를 지정한다. Node.js는 Vite 7과 호환되는 Vercel 지원 버전을 사용한다. 이 앱은 `/` 경로의 query parameter(`ui`, `evidence`)만 읽고 클라이언트 경로 라우터가 없으므로 SPA deep-link rewrite는 필요하지 않다. 정적 파일은 Vite가 생성한 `/assets/` 경로로 제공된다.

1. `deploy/clarity-vercel` 브랜치에서 `npm ci`, `npm run research:all`을 실행한다.
2. Vercel 계정에 로그인하고 이 프로젝트를 연결한다. `.vercel/`은 Git에서 제외된다.
3. Vercel Preview를 배포한다. 12개 `/?ui=U1..U4&evidence=E1..E3` URL과 연구자용 `/` 대시보드를 확인한다.
4. Preview 기능·모바일·데스크톱·Console·Network·Clarity 비활성을 확인한 뒤 Production을 배포한다.
5. 배포 URL, 프로젝트, SHA 및 QA 결과를 이 문서와 최종 보고에 기록한다.

CLI 예시:

```bash
vercel link
vercel deploy --logs
node scripts/qa_deployment.mjs https://<preview-url> clarity-off
vercel deploy --prod --logs
node scripts/qa_deployment.mjs https://<production-url> clarity-off
```

`scripts/qa_deployment.mjs`는 기존 연구 테스트와 별개의 배포 QA다. Clarity ID가 설정되지 않은 Production에서는 `clarity-off`가 예상 결과다. 실제 ID를 설정한 뒤에는 `clarity-off` 대신 방문자 동의 시나리오를 네트워크 패널 및 Clarity 대시보드에서 검증한다.

## 환경 변수

| 이름 | 범위·값 | 용도 |
| --- | --- | --- |
| `VITE_VERCEL_ENV` | Vercel의 Vite 시스템 변수. Production=`production` | Development/Preview에서 로딩 차단 |
| `VITE_ENABLE_CLARITY` | **Production에만** `true` | 명시적 분석 활성화 |
| `VITE_CLARITY_PROJECT_ID` | **Production에만** 실제 Clarity 프로젝트 ID | 공식 `www.clarity.ms/tag/<ID>` 스크립트 |

Vite의 `VITE_` 변수는 브라우저 번들에 포함된다. Clarity 프로젝트 ID는 비밀키가 아니지만 임의 값으로 대체해서 실제 서비스를 활성화하지 않는다. ID나 활성화 값이 없으면 동의 UI와 Clarity 스크립트가 모두 나타나지 않는다. ID를 추가하거나 환경 변수 범위를 바꾼 뒤에는 새 Production 빌드·배포가 필요하다. Preview와 Development에는 위 두 사용자 설정 변수를 넣지 않는다. 코드도 `VITE_VERCEL_ENV === 'production'`을 검사한다.

현재 Vercel 프로젝트에는 사용자 환경 변수가 설정되지 않았다. Clarity 프로젝트 ID가 아직 없으므로 실제 Clarity 연결 및 대시보드 확인은 보류 중이다.

## 동의, 철회 및 개인정보 보호

`src/analytics/AnalyticsConsent.tsx`는 연구 App 바깥에 작은 안내를 표시한다. `src/analytics/clarity.ts`는 허용된 `/` 또는 유효한 `ui`/`evidence` URL에서만, Production·ID·활성화·저장된 명시적 동의가 모두 확인된 뒤 스크립트를 로드한다. 동의 상태는 `localStorage`에 `granted`/`denied`로 보관한다. 동의 전과 거부 상태에는 Clarity 코드 자체를 로드하지 않는다.

허용 시 [Microsoft Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)에 `ad_Storage: denied`, `analytics_Storage: granted`를 전달한다. 철회 시 두 저장소를 `denied`로 갱신하고 즉시 페이지를 새로고침한다. Clarity는 V2 거부 후에도 쿠키 없는 수집 모드가 가능하므로, 새 문서에서는 스크립트를 재로딩하지 않는 방식으로 후속 수집을 끊는다. 철회 버튼 직후 발생할 수 있는 네트워크 요청까지 실제 서비스에서 0개인지 확인하려면 실제 프로젝트 ID로 Network QA를 해야 한다.

`index.html`의 `#root`에 `data-clarity-mask="True"`를 설정해 [Clarity의 명시적 마스킹](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking)을 적용한다. 프로젝트 대시보드에서도 Settings → Masking을 **Strict**로 설정하고, 공개 전에 Recordings/Network에서 실제 마스킹을 확인한다. 이 앱은 Clarity 커스텀 태그를 전송하지 않는다. 추적 가능한 URL은 루트와 등록된 연구 조건 ID 두 개만 허용한다. 테스트 fixture는 독립 참여자 자료가 아니며 Clarity 방문 분석을 논문 데이터에 자동 합산하지 않는다.

방문자에게는 동의 시 방문 화면과 클릭 동작을 Clarity가 분석한다는 안내를 보여준다. 거부·철회는 연구 기능을 막지 않으며, 동의 버튼은 `window.__researchDebug` 이벤트에 기록되지 않는다. 운영 시 실제 사용자 개인정보나 연구 참가자 정보를 입력받는 기능을 추가하지 않는다.

## 검증 기록

- 로컬 배포 브랜치 `npm run research:all`: 기존 기본 테스트 36개와 정책 테스트 12개 모두 통과.
- 로컬 비활성 빌드: 12개 조건 직접 URL, 대시보드, 수용·이의제기, 근거 표시, 사유 가드, 검토, 완료·새로고침·주소 가드, 1280px/390px 기본 표시 통과. Clarity 요청 0, Console/동일 출처 Network 오류 0.
- 가상 Production 빌드(시험용 `qaonly` ID와 가로챈 가짜 스크립트): 동의 전 요청 0, 거부 후 요청 0, 허용 시 Consent V2 호출과 스크립트 요청 확인, 철회 후 새 문서에서 추가 요청 0. 동의 클릭은 연구 이벤트 로그에 기록되지 않음. 실제 Microsoft 서비스 검증은 아님.
- 가상 Preview 빌드: ID와 활성화 값을 넣어도 Clarity 요청 0이며 12개 조건 QA 통과.
- Vercel Preview: 12개 직접 URL, 대시보드, 수용·이의제기, 사유 및 검토 가드, 완료·새로고침·주소 가드, 1280px/390px 기본 표시 통과. Clarity 요청 0, Console/동일 출처 Network 오류 0.
- 첫 Vercel 배포는 플랫폼 동작에 따라 자동으로 Production에 지정되었다. 이 공개 URL에서도 위 12개 조합 QA가 통과했다. 최종 문서 커밋을 기준으로 Production을 다시 배포한다.
- 실제 Clarity Dashboard: 프로젝트 ID가 아직 없어 확인하지 못함.

## 발견한 문제와 처리

- 연구 기준 버전에는 배포용 `.git` 브랜치가 없었으므로 별도 worktree에서 `deploy/clarity-vercel`을 생성했다. `main`과 baseline tag는 보존한다.
- Clarity V2의 단순 거부는 쿠키 없는 추적을 계속할 수 있어, 로딩 전 동의 게이트와 철회 후 새로고침을 함께 사용한다.
- Vercel CLI 65.2.0의 기기 로그인을 완료하고 `yeinchoi` 범위에 전용 프로젝트를 생성했다. Framework는 Vite, Build `npm run build`, Install `npm ci`, Output `dist`, Node 24.x로 설정했다.
- 전용 프로젝트의 Preview URL은 기본 SSO 보호가 걸려 브라우저 QA에 접근할 수 없었다. 프로젝트 전체 보호 해제는 처음에 자동 승인 검토에서 거절됐고, 사용자가 범위를 명시적으로 승인한 뒤 SSO를 해제했다. 이 프로젝트의 Preview와 Production URL은 공개 접근이 가능하다.

## 공식 문서

- [Vercel CLI 배포](https://vercel.com/docs/projects/deploy-from-cli)
- [Vite 환경 변수](https://vercel.com/docs/environment-variables/framework-environment-variables)
- [Clarity 설치](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-setup)
- [Clarity Consent V2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)
- [Clarity 마스킹](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking)
