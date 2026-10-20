import { useState } from 'react';
import { passwordChangeRequestSchema, passwordChangeSuccessEnvelopeSchema, requestDataSchema, successEnvelopeSchema, type SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient, ApiClientError } from '../contracts/index.ts';
import { Button, Input, Modal } from '../design_system/index.ts';
import type { ProviderAuthorizationSource } from './data.ts';
import { getProviderSettingsCopy } from './settings-copy.ts';

export function ProviderSecurity({ locale, authorization, apiOrigin }: { locale: SupportedLocale; authorization?: ProviderAuthorizationSource | undefined; apiOrigin?: string | undefined }) {
  const ar = locale === 'ar', copy = getProviderSettingsCopy(locale).security;
  const [currentPassword, setCurrent] = useState(''), [newPassword, setNext] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [changed, setChanged] = useState(false);
  const [deleting, setDeleting] = useState(false), [reason, setReason] = useState(''), [requestId, setRequestId] = useState('');
  const client = () => new ApiClient(apiOrigin ? { baseUrl: apiOrigin } : {});
  const headers = () => ({ authorization: authorization?.getAuthorizationHeader() ?? '' });
  async function changePassword(event: React.FormEvent) {
    event.preventDefault(); setError('');
    const parsed = passwordChangeRequestSchema.safeParse({ currentPassword, newPassword });
    if (!parsed.success || newPassword !== confirm) {
      setError(ar ? 'راجع كلمة المرور الجديدة وتأكيدها: استخدم 8 أحرف على الأقل، وحرفًا إنجليزيًا كبيرًا وصغيرًا، ورقمًا ورمزًا.' : 'Check the new password and confirmation: use at least 8 characters with uppercase, lowercase, a number and a symbol.'); return;
    }
    setBusy(true);
    try {
      await client().request('/auth/account-access/change', { method: 'POST', responseSchema: passwordChangeSuccessEnvelopeSchema, json: parsed.data, headers: headers() });
      setCurrent(''); setNext(''); setConfirm(''); setChanged(true);
      await authorization?.logout?.().catch(() => undefined);
    } catch (failure) { setError(failure instanceof ApiClientError && failure.status === 401
      ? ar ? 'كلمة المرور الحالية غير صحيحة أو انتهت الجلسة. راجعها وحاول مجددًا.' : 'The current password is incorrect or the session expired. Check and retry.'
      : ar ? 'تعذر تغيير كلمة المرور. حاول مجددًا.' : 'Could not change the password. Please retry.'); }
    finally { setBusy(false); }
  }
  async function requestDeletion() {
    setBusy(true); setError('');
    try {
      const response = await client().request('/provider/account-deletion-requests', { method: 'POST', responseSchema: successEnvelopeSchema(requestDataSchema),
        headers: headers(), json: { reason: reason.trim(), locale } });
      setRequestId(response.data.data.id); setDeleting(false); setReason('');
    } catch { setError(ar ? 'تعذر إرسال الطلب. بيانات حسابك كما هي؛ حاول مجددًا.' : 'Could not send the request. Your account is unchanged; please retry.'); }
    finally { setBusy(false); }
  }
  return <div className="provider-settings__security-grid">
    <form className="provider-settings__panel" onSubmit={event => { void changePassword(event); }} aria-labelledby="provider-settings-security-heading">
      <h2 id="provider-settings-security-heading">{copy.password}</h2>
      {changed ? <p role="status">{ar ? 'تم تغيير كلمة المرور وإنهاء الجلسات. سجّل الدخول بكلمة المرور الجديدة.' : 'Password changed and sessions ended. Sign in with your new password.'} <a href={`/auth/login?lang=${locale}`}>{ar ? 'تسجيل الدخول' : 'Sign in'}</a></p> : <>
        <Input id="provider-settings-current-password" type="password" label={copy.current} value={currentPassword} onChange={event => setCurrent(event.target.value)} required disabled={busy} autoComplete="current-password" />
        <Input id="provider-settings-new-password" type="password" label={copy.next} value={newPassword} onChange={event => setNext(event.target.value)} required disabled={busy} autoComplete="new-password" />
        <Input id="provider-settings-confirm-password" type="password" label={copy.confirm} value={confirm} onChange={event => setConfirm(event.target.value)} required disabled={busy} autoComplete="new-password" />
        <p>{ar ? 'استخدم 8 أحرف على الأقل، وحرفًا إنجليزيًا كبيرًا وصغيرًا، ورقمًا ورمزًا. بعد التغيير ستنتهي جلسات الحساب.' : 'Use at least 8 characters with uppercase, lowercase, a number and a symbol. Changing it ends account sessions.'}</p>
        <Button type="submit" loading={busy}>{copy.update}</Button>
      </>}
    </form>
    <section className="provider-settings__panel provider-settings__panel--danger" aria-labelledby="provider-settings-delete-heading">
      <h2 id="provider-settings-delete-heading">{copy.deleteHeading}</h2>
      <p>{ar ? 'أرسل طلب حذف الحساب للإدارة لمراجعة الإعلانات والطلبات والمستحقات المرتبطة به. إرسال الطلب لا يحذف بياناتك فورًا.' : 'Ask administration to delete your account after reviewing linked ads, requests and outstanding payments. Sending the request does not immediately delete your data.'}</p>
      {requestId ? <p role="status">{ar ? 'تم إرسال طلب حذف الحساب للإدارة. رقم الطلب:' : 'Account deletion request sent to administration. Request number:'} <code>{requestId}</code></p> : <Button variant="danger" disabled={busy || changed} onClick={() => { setError(''); setDeleting(true); }}>{copy.deleteAction}</Button>}
    </section>
    {error ? <p role="alert">{error}</p> : null}
    <Modal open={deleting} title={copy.deleteAction} closeLabel={ar ? 'إلغاء' : 'Cancel'} onClose={() => { if (!busy) setDeleting(false); }} footer={<><Button variant="secondary" disabled={busy} onClick={() => setDeleting(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button variant="danger" disabled={busy || reason.trim().length < 5} onClick={() => { void requestDeletion(); }}>{ar ? 'إرسال طلب الحذف' : 'Send deletion request'}</Button></>}>
      <label htmlFor="provider-deletion-reason">{ar ? 'سبب طلب حذف الحساب' : 'Reason for account deletion'}</label>
      <textarea id="provider-deletion-reason" value={reason} onChange={event => setReason(event.target.value)} minLength={5} maxLength={1500} disabled={busy} rows={4} style={{ width: '100%', boxSizing: 'border-box' }} />
      {error ? <p role="alert">{error}</p> : null}
    </Modal>
  </div>;
}
