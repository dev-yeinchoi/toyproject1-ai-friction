type StorageDecision = 'granted' | 'denied';
type ConsentChoice = StorageDecision | 'unset';
type ConsentV2 = { ad_Storage: StorageDecision; analytics_Storage: StorageDecision };
type ClarityFunction = ((command: 'consentv2', consent: ConsentV2) => void) & { q?: IArguments[] };

declare global {
  interface Window { clarity?: ClarityFunction }
}

export const CONSENT_KEY = 'research-clarity-consent-v1';
const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID?.trim() ?? '';

export function isClarityConfigured(): boolean {
  return import.meta.env.PROD &&
    import.meta.env.VITE_VERCEL_ENV === 'production' &&
    import.meta.env.VITE_ENABLE_CLARITY === 'true' &&
    /^[a-zA-Z0-9]+$/.test(PROJECT_ID);
}

function isResearchUrl(): boolean {
  if (window.location.pathname !== '/' || window.location.hash) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.size === 0) return true;
  if (params.size !== 2 || !params.has('ui') || !params.has('evidence')) return false;
  return ['U1', 'U2', 'U3', 'U4'].includes(params.get('ui') ?? '') &&
    ['E1', 'E2', 'E3'].includes(params.get('evidence') ?? '');
}

export function canLoadClarity(): boolean {
  return isClarityConfigured() && isResearchUrl();
}

export function readConsent(): ConsentChoice {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function saveConsent(value: StorageDecision): void {
  try { window.localStorage.setItem(CONSENT_KEY, value); } catch { /* Use the choice for this page only. */ }
}

export function loadClarityAfterConsent(): void {
  if (!canLoadClarity() || document.querySelector('script[data-clarity-project]')) return;
  const queued = (function () {
    (queued.q ??= []).push(arguments);
  }) as ClarityFunction;
  window.clarity ??= queued;
  // Analytics is the only permission requested. Advertising storage stays denied.
  window.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'granted' });
  const script = document.createElement('script');
  script.async = true;
  script.dataset.clarityProject = PROJECT_ID;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(PROJECT_ID)}`;
  document.head.appendChild(script);
}

export function revokeClarityConsent(): void {
  saveConsent('denied');
  window.clarity?.('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
  // Consent V2 alone switches Clarity to cookieless tracking. Reloading removes
  // the already-running script; denied storage prevents it loading again.
  window.location.reload();
}
