import { useEffect, useState } from 'react';
import type { PaymentProofData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import type { AdminAdsPaymentProofFileLoader } from './data.ts';

export function PaymentProofPreview({ proof, locale, load }: { readonly proof: PaymentProofData; readonly locale: SupportedLocale; readonly load: AdminAdsPaymentProofFileLoader }) {
  const copy = locale === 'ar' ? {
    title: 'إثبات الدفع المرفوع', loading: 'جارٍ تحميل إثبات الدفع…', open: 'فتح الملف بالحجم الكامل', download: 'تنزيل الملف', retry: 'إعادة المحاولة',
    missing: 'ملف إثبات الدفع غير موجود. اطلب من مقدم العقار رفعه مرة أخرى.', blocked: 'لا يمكن عرض الملف قبل اكتمال فحصه واعتماده آمنًا.', forbidden: 'حسابك لا يملك صلاحية عرض إثبات الدفع. سجّل الدخول أو راجع صلاحياتك.', error: 'تعذر تحميل إثبات الدفع. أعد المحاولة.', pdf: 'إثبات الدفع بصيغة PDF. افتح الملف أو نزّله لعرضه.'
  } : {
    title: 'Uploaded payment proof', loading: 'Loading payment proof…', open: 'Open full-size file', download: 'Download file', retry: 'Retry',
    missing: 'The payment proof file is missing. Ask the provider to upload it again.', blocked: 'The file cannot be displayed until it has passed its security scan.', forbidden: 'You cannot view this payment proof. Sign in or check your permissions.', error: 'The payment proof could not load. Try again.', pdf: 'This payment proof is a PDF. Open or download it to view it.'
  };
  const [file, setFile] = useState<{ url: string; mime: string }>();
  const [error, setError] = useState<number | null>();
  const [attempt, setAttempt] = useState(0);
  const allowed = proof.active && proof.securityState === 'clean';
  useEffect(() => {
    setFile(undefined); setError(undefined);
    if (!allowed) return;
    const controller = new AbortController();
    let url: string | undefined;
    void load(proof.id, controller.signal).then(blob => {
      if (controller.signal.aborted) return;
      url = URL.createObjectURL(blob);
      setFile({ url, mime: blob.type });
    }).catch(cause => {
      if (!controller.signal.aborted) setError(cause instanceof ApiClientError ? cause.status ?? null : null);
    });
    return () => { controller.abort(); if (url) URL.revokeObjectURL(url); };
  }, [allowed, proof.id, proof.version, load, attempt]);
  const message = !allowed || error === 409 ? copy.blocked : error === 404 ? copy.missing : error === 401 || error === 403 ? copy.forbidden : copy.error;
  return <section className="admin-ads__proof-preview" data-testid="admin-payment-proof-preview" aria-label={copy.title}>
    <h4>{copy.title}</h4>
    {!allowed || error !== undefined ? <><p role="alert">{message}</p>{allowed ? <Button type="button" variant="secondary" size="sm" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</Button> : null}</> : file === undefined ? <p role="status">{copy.loading}</p> : <>
      {file.mime.startsWith('image/') ? <img src={file.url} alt={copy.title} onError={() => setError(null)} /> : <p>{copy.pdf}</p>}
      <div className="admin-ads__proof-file-actions"><a className="ui-button ui-button--secondary" href={file.url} target="_blank" rel="noopener noreferrer">{copy.open}</a><a className="ui-button ui-button--secondary" href={file.url} download={proof.originalFilename}>{copy.download}</a></div>
    </>}
  </section>;
}
