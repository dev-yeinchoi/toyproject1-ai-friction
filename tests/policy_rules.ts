/** Registered fixture policy, independent of the React state machine. */
export type PolicyDecision = 'approve' | 'reject' | 'hold';

export function decidePolicy(shareStatus: string, approval: string): PolicyDecision {
  if (approval !== '완료') throw new Error(`Unspecified approval status: ${approval}`);
  switch (shareStatus) {
    case '허용': return 'approve';
    case '제한': return 'reject';
    case '미확인': return 'hold';
    default: throw new Error(`Unspecified share status: ${shareStatus}`);
  }
}
