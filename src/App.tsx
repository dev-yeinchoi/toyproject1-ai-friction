import { useRef, useState } from 'react';
import scenario from './data/scenario.json';
import PreviewDashboard from './PreviewDashboard';

type UICondition = 'U1' | 'U2' | 'U3' | 'U4';
type Screen = 'S0' | 'S1' | 'S2' | 'S3' | 'S4';
type StateId = Screen | 'M1' | 'R1' | 'S2R';
type Reason = 'mismatch' | 'insufficient' | 'disagree' | '';
type InteractionEvent = {index: number; type: string; from: StateId; to: StateId};
declare global {
  interface Window { __researchDebug?: { getEvents: () => InteractionEvent[]; getState: () => StateId } }
}

const uiSettings: Record<UICondition, {directContest: boolean; reviewRequired: boolean}> = {
  U1: { directContest: false, reviewRequired: false },
  U2: { directContest: true, reviewRequired: false },
  U3: { directContest: false, reviewRequired: true },
  U4: { directContest: true, reviewRequired: true },
};
const reasonLabels: Record<Exclude<Reason,''>,string> = {
  mismatch:'AI 추천이 문서의 공유 정책과 일치하지 않습니다.',
  insufficient:'승인 여부를 판단하기 위한 정보가 부족합니다.',
  disagree:'제시된 근거를 확인했지만 AI의 추천 결론에 동의하지 않습니다.',
};

function readParam<T extends string>(param: string, valid: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(param);
  return valid.includes(value as T) ? (value as T) : fallback;
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('ui') && !params.has('evidence')) return <PreviewDashboard />;

  const ui = readParam('ui', ['U1','U2','U3','U4'] as const, 'U1');
  const evidenceId = readParam('evidence', ['E1','E2','E3'] as const, 'E1');
  const condition = uiSettings[ui];
  const evidence = scenario.evidence_cases.find(e => e.id === evidenceId)!;

  const [screen, setScreen] = useState<Screen>('S0');
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingAccept, setPendingAccept] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState<Reason>('');
  const events = useRef<InteractionEvent[]>([]);
  const currentState: StateId = screen === 'S0' && menuOpen ? 'M1' :
      screen === 'S1' && pendingAccept && reviewed ? 'R1' :
      screen === 'S2' && reason !== '' ? 'S2R' : screen;

  function log(type: string, to: StateId) {
    events.current.push({ index: events.current.length+1, type, from: currentState, to });
  }
  window.__researchDebug = { getEvents: () => [...events.current], getState: () => currentState };

  function accept() {
    if (condition.reviewRequired) {
      log('accept_click', 'S1'); setPendingAccept(true); setReviewed(false); setScreen('S1'); setMenuOpen(false);
    } else {
      log('accept_click', 'S3'); setScreen('S3'); setMenuOpen(false);
    }
  }
  function enterContest() { log('contest_entry', 'S2'); setScreen('S2'); setMenuOpen(false); setReason(''); }
  function openEvidence() { log('evidence_open', 'S1'); setPendingAccept(false); setReviewed(false); setScreen('S1'); }
  function back() { log('back', 'S0'); setScreen('S0'); setPendingAccept(false); setReviewed(false); setMenuOpen(false); }
  function markReviewed() { if (screen === 'S1' && pendingAccept && !reviewed) {log('review_complete', 'R1'); setReviewed(true);} }
  function finishAccept() { if (screen === 'S1' && pendingAccept && reviewed) {log('final_accept', 'S3'); setScreen('S3');} }
  function chooseReason(value: Reason) { if (screen === 'S2') {log('reason_select', 'S2R'); setReason(value);} }
  function submitContest() { if (screen === 'S2' && reason) {log('contest_submit', 'S4'); setScreen('S4');} }

  return <div className="site">
    <main className="main">
      <div className="heading"><h1>프로젝트 문서 공유 심사</h1><p className="muted">AI의 권고를 검토하고 최종 행동을 선택하세요.</p></div>

      {screen === 'S0' && <div className="layout" data-testid="screen-S0">
        <section className="panel request-panel"><div className="section-kicker">검토 요청</div><h2>{scenario.request_title}</h2><div className="request-description">{scenario.request_description.map((paragraph, index) => <p key={paragraph} className={index === 1 ? 'request-task' : undefined}>{paragraph}</p>)}</div></section>
        <section className="panel emphasis"><div className="recommendation-hero"><div className="ai-response"><span className="ai-avatar" aria-hidden="true">AI</span><div className="ai-conversation"><span className="ai-sender">AI 의사결정 지원 시스템</span><div className="ai-message"><p>{scenario.recommendation}</p></div></div></div></div>
          <div className="action-stack recommendation-actions"><button className="primary" onClick={accept}>AI 추천 수용</button><button data-testid="evidence-link" className="secondary" onClick={openEvidence}>추천 근거 보기</button>
            {condition.directContest ? <button className="outline" onClick={enterContest}>이의제기 시작</button> : <><button className="outline" onClick={()=>{log('menu_open','M1');setMenuOpen(true)}} aria-expanded={menuOpen}>기타 선택 ···</button>{menuOpen && <div className="menu" data-testid="menu-M1"><button onClick={enterContest}>AI 추천에 이의제기</button></div>}</>}
          </div>
        </section>
      </div>}

      {screen === 'S1' && <section className="panel narrow" data-testid="screen-S1"><div className="section-kicker">AI 추천 근거 확인</div><h2>문서 공유 승인 기준</h2><div className="policy"><strong>공유 정책</strong><p>{scenario.policy}</p></div><div className="evidence-list"><div className="evidence-item"><span>외부 공유 등급</span><strong data-testid="share-status">{evidence.share_status}</strong></div><div className="evidence-item"><span>담당자 승인</span><strong data-testid="approval-status">{evidence.approval}</strong></div></div>
          <div className="action-stack">
            {pendingAccept && !reviewed && <button className="primary" onClick={markReviewed}>근거 검토 완료</button>}
            {pendingAccept && reviewed && <button className="primary" onClick={finishAccept}>최종 수용</button>}
            <button className="secondary" onClick={back}>추천 화면으로 돌아가기</button>
          </div>
      </section>}

      {screen === 'S2' && <section className="panel narrow" data-testid="screen-S2"><div className="section-kicker">AI 추천 이의제기</div><h2>이의제기 사유 선택</h2><p className="muted">사유 한 가지를 선택하면 제출할 수 있습니다.</p><fieldset className="reasons"><legend className="sr-only">이의제기 사유</legend>{(Object.keys(reasonLabels) as Exclude<Reason,''>[]).map((value, index) => <label className="radio-row" key={value}><input type="radio" name="reason" value={value} checked={reason===value} onChange={()=>chooseReason(value)}/><span>{index + 1}. {reasonLabels[value]}</span></label>)}</fieldset><div className="action-stack"><button className="primary" disabled={!reason} onClick={submitContest}>이의제기 제출</button><button className="secondary" onClick={back}>추천 화면으로 돌아가기</button></div></section>}

      {(screen === 'S3' || screen === 'S4') && <section className="panel narrow finish" data-testid={`screen-${screen}`}><div className="finish-icon">✓</div><h2>{screen === 'S3' ? 'AI 추천이 수용되었습니다' : '이의제기가 제출되었습니다'}</h2><button className="secondary" onClick={()=>window.location.reload()}>다시 시작하기</button></section>}
    </main>
  </div>;
}
