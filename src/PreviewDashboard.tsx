import { useState } from 'react';
import scenario from './data/scenario.json';
import './PreviewDashboard.css';

type UICondition = 'U1' | 'U2' | 'U3' | 'U4';
type EvidenceId = 'E1' | 'E2' | 'E3';

const conditions: { id: UICondition; title: string; contest: string; review: string }[] = [
  { id: 'U1', title: '기본 경로', contest: '간접 진입', review: '선택 검토' },
  { id: 'U2', title: '직접 이의제기', contest: '직접 진입', review: '선택 검토' },
  { id: 'U3', title: '필수 근거 검토', contest: '간접 진입', review: '필수 검토' },
  { id: 'U4', title: '두 요인 결합', contest: '직접 진입', review: '필수 검토' },
];

export default function PreviewDashboard() {
  const [ui, setUi] = useState<UICondition>('U1');
  const [evidence, setEvidence] = useState<EvidenceId>('E1');
  const selected = conditions.find(condition => condition.id === ui)!;

  function enterExperiment() {
    window.location.assign(`/?ui=${ui}&evidence=${evidence}`);
  }

  return <div className="preview-shell">
    <main className="preview-main">
      <div className="preview-intro">
        <h1>실험 조건 설정</h1>
      </div>

      <div className="preview-grid">
        <div className="preview-choices">
          <section className="preview-section" aria-labelledby="ui-heading">
            <div className="preview-section-heading"><div><span className="preview-step">01</span><h2 id="ui-heading">UI 조건 선택</h2></div><span className="preview-count">4개 조건</span></div>
            <p className="preview-help">이의제기 진입과 수용 전 근거 검토의 2×2 조합</p>
            <div className="preview-condition-grid">
              {conditions.map(condition => <button key={condition.id} type="button" className={`preview-condition ${ui === condition.id ? 'selected' : ''}`} aria-pressed={ui === condition.id} onClick={() => setUi(condition.id)}>
                <span className="preview-condition-top"><span className="preview-code">{condition.id}</span><span className="preview-check" aria-hidden="true">✓</span></span>
                <strong>{condition.title}</strong>
                <span className="preview-tags"><span>{condition.contest}</span><span>{condition.review}</span></span>
              </button>)}
            </div>
          </section>

          <section className="preview-section" aria-labelledby="evidence-heading">
            <div className="preview-section-heading"><div><span className="preview-step">02</span><h2 id="evidence-heading">근거 상태 선택</h2></div><span className="preview-count">3개 상태</span></div>
            <div className="preview-evidence-grid">
              {scenario.evidence_cases.map(item => {
                const id = item.id as EvidenceId;
                return <button key={id} type="button" className={`preview-evidence ${evidence === id ? 'selected' : ''}`} aria-pressed={evidence === id} onClick={() => setEvidence(id)}>
                  <span className="preview-evidence-top"><span className="preview-code">{id}</span><span className="preview-radio" aria-hidden="true" /></span>
                  <strong>외부 공유 등급: {item.share_status}</strong>
                </button>;
              })}
            </div>
          </section>
        </div>

        <aside className="preview-summary" aria-label="선택한 조건 요약">
          <div className="preview-summary-top">선택한 조건</div>
          <div className="preview-pair">{ui}<span>×</span>{evidence}</div>
          <h2>{selected.title}</h2>
          <p>{scenario.document_title}의 외부 공유 승인 권고 시나리오</p>
          <dl>
            <div><dt>이의제기 진입</dt><dd>{selected.contest}</dd></div>
            <div><dt>수용 전 근거 검토</dt><dd>{selected.review}</dd></div>
            <div><dt>근거 상태</dt><dd>{scenario.evidence_cases.find(item => item.id === evidence)?.share_status} / 승인 완료</dd></div>
          </dl>
          <button className="preview-enter" type="button" onClick={enterExperiment}>선택한 조건으로 진입 <span aria-hidden="true">↗</span></button>
        </aside>
      </div>
    </main>
  </div>;
}
