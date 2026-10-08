import type { AdvertisingFinancialRecord } from './advertising-ledger.js';

/** Accepted quote totals backed by an approved receipt; once per request, not per event. */
export function advertisingSummary(records: readonly AdvertisingFinancialRecord[], range?: { from: string; to: string }) {
  const totals = new Map<string, number>();
  const counted = new Set<string>();
  let pendingRequests = 0;
  let approvedRequests = 0;
  for (const { request, quote, paymentProofs = [] } of records) {
    if (counted.has(request.id)) continue;
    counted.add(request.id);
    const proofs = paymentProofs.filter(proof => proof.active && proof.securityState === 'clean' && proof.adRequestId === request.id && proof.providerId === request.providerId);
    const approved = proofs.filter(proof => proof.status === 'approved').sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt))[0];
    if (!approved) { if (proofs.some(proof => proof.status === 'pending_review')) pendingRequests++; continue; }
    if (!quote || quote.status !== 'accepted' || quote.requestId !== request.id || quote.providerId !== request.providerId || request.paymentWaiver) continue;
    const approvedAt = [...approved.reviewHistory].reverse().find(review => review.action === 'approve')?.createdAt ?? approved.uploadedAt;
    if (range && (Date.parse(approvedAt) < Date.parse(range.from) || Date.parse(approvedAt) >= Date.parse(range.to))) continue;
    approvedRequests++;
    totals.set(quote.currency, (totals.get(quote.currency) ?? 0) + quote.totalMinor);
  }
  return { approvedRequests, pendingRequests, totals: [...totals].map(([currency, amountMinor]) => ({ currency, amountMinor })) };
}
