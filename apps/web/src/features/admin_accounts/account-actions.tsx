import { useEffect, useState } from 'react';
import type { AccountTransitionAction, AdminAccountUserData, AdminProviderData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { communicateAdminAccount, loadAdminProvider, reviewAdminProvider, transitionAdminAccount, type AdminAccountsAuthorizationSource } from './data.ts';
import { DeleteAccount } from './delete-account.tsx';

export function AccountActions({ user, locale, authorization, apiOrigin, onChanged }: {
  readonly user: AdminAccountUserData; readonly locale: SupportedLocale;
  readonly authorization: AdminAccountsAuthorizationSource | undefined; readonly apiOrigin: string | undefined;
  readonly onChanged: () => void;
}) {
  const ar = locale === 'ar';
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [messageFeedback, setMessageFeedback] = useState('');
  const [provider, setProvider] = useState<AdminProviderData>();
  const [providerLoading, setProviderLoading] = useState(false);
  const [providerError, setProviderError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const blocked = user.status === 'suspended' || user.status === 'restricted';
  const providerReviewNeeded = user.roleType === 'provider' && (user.status === 'verified' || user.status === 'suspended');
  useEffect(() => {
    setProvider(undefined); setProviderError(false);
    if (!providerReviewNeeded || user.canManage === false) { setProviderLoading(false); return; }
    const controller = new AbortController(); setProviderLoading(true);
    void loadAdminProvider(user.id, { authorization, apiOrigin, signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setProvider(value);
    }).catch(() => { if (!controller.signal.aborted) setProviderError(true); })
      .finally(() => { if (!controller.signal.aborted) setProviderLoading(false); });
    return () => controller.abort();
  }, [user.id, user.status, user.version, user.canManage, providerReviewNeeded, authorization, apiOrigin, attempt]);
  if (user.canManage === false) return <p>{ar ? 'حسابك يملك صلاحية العرض فقط. اطلب صلاحية إدارة الحسابات لتنفيذ الإجراءات.' : 'Your account has view access only. Account management permission is required for actions.'}</p>;
  const providerActions = provider?.accountStatus === user.status ? provider.availableActions.filter(action =>
    (action === 'verify' && user.status === 'suspended' && provider.applicationStatus === 'suspended')
    || (action === 'suspend' && user.status === 'verified' && provider.applicationStatus === 'approved')) : [];
  const actions = [...new Set([...user.availableActions, ...providerActions])];
  const labels: Record<AccountTransitionAction, string> = ar
    ? { verify: blocked ? 'إعادة تفعيل الحساب' : 'تفعيل الحساب', reject: 'رفض الحساب', needs_information: 'طلب معلومات', suspend: 'تعطيل الحساب', restrict: 'تقييد الحساب' }
    : { verify: blocked ? 'Reactivate account' : 'Activate account', reject: 'Reject account', needs_information: 'Request information', suspend: 'Disable account', restrict: 'Restrict account' };
  async function run(action: AccountTransitionAction | 'notify' | 'logout') {
    const text = action === 'notify' ? message.trim() : reason.trim();
    const setResult = action === 'notify' ? setMessageFeedback : setFeedback;
    if (busy || text.length < 3 || (action !== 'notify' && !confirmation)) return;
    setBusy(true); setResult('');
    try {
      const options = { authorization, apiOrigin };
      if (action === 'notify' || action === 'logout') await communicateAdminAccount(user.id, {
        action, reason: text, ...(action === 'notify' && title.trim() ? { title: title.trim() } : {}),
        ...(action === 'notify' && propertyCode.trim() ? { propertyCode: propertyCode.trim() } : {})
      }, options);
      else if (provider && (action === 'verify' || action === 'suspend') && providerActions.includes(action)) { await reviewAdminProvider(provider.id, { action, reason: text }, options); setProvider(undefined); }
      else await transitionAdminAccount(user.id, { action, reason: text }, options);
      setResult(action === 'verify' && blocked ? (ar ? 'تمت إعادة تفعيل الحساب. يمكن لصاحبه تسجيل الدخول من جديد.' : 'Account reactivated. Its owner can sign in again.') : ar ? (action === 'notify' ? 'تم إرسال الرسالة داخل حسابه.' : 'تم تنفيذ الإجراء.') : (action === 'notify' ? 'Message sent to their account.' : 'Action completed.'));
      if (action === 'notify') { setMessage(''); setTitle(''); setPropertyCode(''); }
      else { setReason(''); setConfirmation(false); }
      onChanged();
    } catch (error) {
      setResult(error instanceof ApiClientError && error.status === 403 ? (ar ? 'لا توجد صلاحية لإدارة الحسابات.' : 'Account management permission is required.')
        : error instanceof ApiClientError && error.status === 404 ? (ar ? 'تأكد من رمز العقار وأنه منشور.' : 'Check that the property code belongs to a published property.')
        : ar ? 'تعذر تنفيذ الإجراء. البيانات المكتوبة محفوظة؛ حاول مرة أخرى.' : 'Could not complete the action. Your input is preserved; retry.');
    } finally { setBusy(false); }
  }
  return <><section className="admin-accounts__detail-card admin-account-reports">
    <h2>{ar ? 'إرسال رسالة لصاحب الحساب' : 'Message the account holder'}</h2>
    <p>{ar ? 'الرسالة تظهر في إشعارات حسابه على المنصة، ولا تُرسل بالبريد الإلكتروني.' : 'Your message appears in their platform notifications. It is not sent by email.'}</p>
    <form onSubmit={event => { event.preventDefault(); void run('notify'); }}>
      <label className="admin-account-reports__reason-label">{ar ? 'نص الرسالة' : 'Message'}<textarea value={message} required minLength={3} maxLength={1000} rows={4} onChange={event => setMessage(event.currentTarget.value)} disabled={busy} placeholder={ar ? 'اكتب الرسالة التي تريد إرسالها…' : 'Write your message…'} /></label>
      <details><summary>{ar ? 'إضافة عنوان أو عقار للرسالة (اختياري)' : 'Add a title or property (optional)'}</summary>
        <label className="admin-account-reports__reason-label">{ar ? 'عنوان الرسالة (اختياري)' : 'Message title (optional)'}<input value={title} maxLength={160} onChange={event => setTitle(event.currentTarget.value)} disabled={busy} /></label>
        <label className="admin-account-reports__reason-label">{ar ? 'رمز العقار المنشور (اختياري)' : 'Published property code (optional)'}<input value={propertyCode} dir="ltr" maxLength={80} placeholder="SDT-1234" onChange={event => setPropertyCode(event.currentTarget.value)} disabled={busy} /></label>
        <p>{ar ? 'اكتب رمز العقار الظاهر في صفحة العقار لإرفاق رابطه بالرسالة.' : 'Enter the code shown on the published property page to include its link.'}</p>
      </details>
      <Button type="submit" disabled={busy || message.trim().length < 3}>{ar ? 'إرسال الرسالة' : 'Send message'}</Button>
      {messageFeedback ? <p role="status">{messageFeedback}</p> : null}
    </form>
  </section><section className="admin-accounts__detail-card admin-account-reports">
    <h2>{ar ? 'إجراءات الحساب' : 'Account actions'}</h2>
    <p>{ar ? 'تغيير حالة الحساب أو تسجيل خروجه. هذه الإجراءات مستقلة عن إرسال الرسائل.' : 'Change account status or sign out its current sessions. These actions are separate from messaging.'}</p>
    <details open={blocked || undefined}><summary>{ar ? 'تغيير الحالة أو إنهاء الجلسات' : 'Change status or end sessions'}</summary>
    <label className="admin-account-reports__reason-label">{ar ? 'سبب الإجراء الإداري (مطلوب)' : 'Administrative action reason (required)'}<textarea value={reason} minLength={3} maxLength={1000} rows={3} onChange={event => setReason(event.currentTarget.value)} disabled={busy} /></label>
    <p>{ar ? 'التعطيل يمنع استخدام الحساب ويخرج صاحبه، مع الاحتفاظ بطلباته وسجل المعاملات.' : 'Disabling blocks access and ends sessions while preserving requests and transaction history.'}</p>
    {blocked ? <p>{ar ? 'إعادة التفعيل تسمح لصاحب الحساب بتسجيل الدخول من جديد وتحتفظ بطلباته وسجل معاملاته.' : 'Reactivation lets the account holder sign in again and keeps their requests and transaction history.'}</p> : null}
    {providerLoading ? <p role="status">{ar ? 'جارٍ تحميل إجراءات حساب مقدم العقار…' : 'Loading provider account actions…'}</p> : null}
    {providerError ? <p role="alert">{ar ? 'تعذر تحميل إجراءات مقدم العقار. تحقق من صلاحية عرض ومراجعة مقدمي العقارات أو أعد المحاولة.' : 'Could not load provider actions. Check provider viewing and review permissions or retry.'} <Button variant="secondary" size="sm" disabled={busy} onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</Button></p> : null}
    {user.roleType === 'provider' && user.status === 'suspended' && !providerLoading && !actions.includes('verify') ? <p><a href={`/admin/providers/${user.id}?lang=${locale}`}>{ar ? 'مراجعة حساب مقدم العقار وصلاحية إعادة تفعيله' : 'Review provider account and reactivation permission'}</a></p> : null}
    <label><input type="checkbox" checked={confirmation} onChange={event => setConfirmation(event.currentTarget.checked)} disabled={busy} /> {ar ? 'أؤكد تنفيذ إجراء على الحساب' : 'Confirm account action'}</label>
    <div className="admin-account-reports__actions">
      {actions.map(action => <Button key={action} variant={action === 'verify' ? 'success' : 'danger'} disabled={busy || !confirmation || reason.trim().length < 3} onClick={() => { void run(action); }}>{labels[action]}</Button>)}
      <Button variant="secondary" disabled={busy || !confirmation || reason.trim().length < 3} onClick={() => { void run('logout'); }}>{ar ? 'إنهاء الجلسات الحالية' : 'End current sessions'}</Button>
    </div>
    </details>
    <DeleteAccount user={user} locale={locale} authorization={authorization} apiOrigin={apiOrigin} />
    <a href={`/admin/viewing-requests?lang=${locale}&seekerId=${user.id}`}>{ar ? 'إدارة معاينات العميل' : 'Manage customer viewings'}</a>
    {feedback ? <p role="status">{feedback}</p> : null}
  </section></>;
}
