import { useEffect, useState } from 'react';
import { canLoadClarity, isClarityConfigured, loadClarityAfterConsent, readConsent, revokeClarityConsent, saveConsent } from './clarity';
import './AnalyticsConsent.css';

export default function AnalyticsConsent() {
  const [choice, setChoice] = useState(readConsent);
  const configured = isClarityConfigured();

  useEffect(() => {
    if (choice === 'granted' && canLoadClarity()) loadClarityAfterConsent();
  }, [choice]);

  if (!configured) return null;

  function grant() {
    saveConsent('granted');
    setChoice('granted');
  }

  function deny() {
    if (choice === 'granted') {
      revokeClarityConsent();
      return;
    }
    saveConsent('denied');
    setChoice('denied');
  }

  return <aside className="analytics-consent" aria-label="선택적 방문 분석">
    <p><strong>선택적 방문 분석</strong> · 이 사이트는 실제 승인 시스템이나 사용자 실험이 아닌 연구용 프로토타입입니다. 동의하면 Microsoft Clarity가 방문 화면과 클릭 동작을 분석합니다. 화면 내용은 마스킹하며, 거부하거나 철회해도 연구 기능을 이용할 수 있습니다.</p>
    <div className="analytics-consent-actions">
      <span aria-live="polite">{choice === 'granted' ? '분석 동의 중' : choice === 'denied' ? '분석 거부 중' : '선택 전: 수집하지 않음'}</span>
      {choice !== 'granted' && <button type="button" onClick={grant}>분석 동의</button>}
      {choice !== 'denied' && <button type="button" onClick={deny}>{choice === 'granted' ? '동의 철회' : '분석 거부'}</button>}
    </div>
  </aside>;
}
