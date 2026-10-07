import { useState } from 'react';
import type { AccountTransitionAction, AdminAccountUserData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { communicateAdminAccount, transitionAdminAccount, type AdminAccountsAuthorizationSource } from './data.ts';
import { DeleteAccount } from './delete-account.tsx';

export function AccountActions({ user, locale, authorization, apiOrigin, onChanged }: {
  readonly user: AdminAccountUserData; readonly locale: SupportedLocale;
  readonly authorization: AdminAccountsAuthorizationSource | undefined; readonly apiOrigin: string | undefined;
  readonly onChanged: () => void;
}) {
  const ar = locale === 'ar';
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  if (user.canManage === false) return <p>{ar ? 'حسابك يملك صلاحية العرض فقط. اطلب صلاحية إدارة الحسابات لتنفيذ الإجراءات.' : 'Your account has view access only. Account management permission is required for actions.'}</p>;
  const labels: Record<AccountTransitionAction, string> = ar
    ? { verify: 'تفعيل الحساب', reject: 'رفض الحساب', needs_information: 'طلب معلومات', suspend: 'تعطيل الحساب', restrict: 'تقييد الحساب' }
    : { verify: 'Activate account', reject: 'Reject account', needs_information: 'Request information', suspend: 'Disable account', restrict: 'Restrict account' };
  async function run(action: AccountTransitionAction | 'notify' | 'logout') {
    if (busy || reason.trim().length < 3 || (action !== 'notify' && !confirmation)) return;
    setBusy(true); setFeedback('');
    try {
      const options = { authorization, apiOrigin };
      if (action === 'notify' || action === 'logout') await communicateAdminAccount(user.id, {
        action, reason: reason.trim(), ...(action === 'notify' && title.trim() ? { title: title.trim() } : {}),
        ...(action === 'notify' && propertyCode.trim() ? { propertyCode: propertyCode.trim() } : {})
      }, options);
      else await transitionAdminAccount(user.id, { action, reason: reason.trim() }, options);
      setFeedback(ar ? (action === 'notify' ? 'تم إرسال الإشعار داخل الحساب.' : 'تم تنفيذ الإجراء.') : 'Action completed.');
      setReason(''); setConfirmation(false); onChanged();
    } catch (error) {
      setFeedback(error instanceof ApiClientError && error.status === 403 ? (ar ? 'لا توجد صلاحية لإدارة الحسابات.' : 'Account management permission is required.')
        : error instanceof ApiClientError && error.status === 404 ? (ar ? 'تأكد من رمز العقار وأنه منشور.' : 'Check that the property code belongs to a published property.')
        : ar ? 'تعذر تنفيذ الإجراء. البيانات المكتوبة محفوظة؛ حاول مرة أخرى.' : 'Could not complete the action. Your input is preserved; retry.');
    } finally { setBusy(false); }
  }
  return <section className="admin-accounts__detail-card admin-account-reports">
    <h2>{ar ? 'إدارة الحساب والتواصل' : 'Account management and communication'}</h2>
    <label className="admin-account-reports__reason-label">{ar ? 'الرسالة أو سبب الإجراء (مطلوب)' : 'Message or action reason (required)'}<textarea value={reason} minLength={3} maxLength={1000} rows={4} onChange={event => setReason(event.currentTarget.value)} disabled={busy} /></label>
    <label className="admin-account-reports__reason-label">{ar ? 'عنوان الإشعار (اختياري)' : 'Notification title (optional)'}<input value={title} maxLength={160} onChange={event => setTitle(event.currentTarget.value)} disabled={busy} /></label>
    <label className="admin-account-reports__reason-label">{ar ? 'رمز عقار منشور لإرساله للعميل (اختياري)' : 'Published property code to share (optional)'}<input value={propertyCode} dir="ltr" maxLength={80} placeholder="SDT-1234" onChange={event => setPropertyCode(event.currentTarget.value)} disabled={busy} /></label>
    <Button disabled={busy || reason.trim().length < 3} onClick={() => { void run('notify'); }}>{ar ? 'إرسال إشعار' : 'Send notification'}</Button>
    <p>{ar ? 'التعطيل يمنع استخدام الحساب ويخرج صاحبه، مع الاحتفاظ بطلباته وسجل المعاملات.' : 'Disabling blocks access and ends sessions while preserving requests and transaction history.'}</p>
    <label><input type="checkbox" checked={confirmation} onChange={event => setConfirmation(event.currentTarget.checked)} disabled={busy} /> {ar ? 'أؤكد تنفيذ إجراء على الحساب' : 'Confirm account action'}</label>
    <div className="admin-account-reports__actions">
      {user.availableActions.map(action => <Button key={action} variant={action === 'verify' ? 'success' : 'danger'} disabled={busy || !confirmation || reason.trim().length < 3} onClick={() => { void run(action); }}>{labels[action]}</Button>)}
      <Button variant="secondary" disabled={busy || !confirmation || reason.trim().length < 3} onClick={() => { void run('logout'); }}>{ar ? 'إنهاء الجلسات الحالية' : 'End current sessions'}</Button>
      <DeleteAccount user={user} locale={locale} authorization={authorization} apiOrigin={apiOrigin} />
    </div>
    <a href={`/admin/viewing-requests?lang=${locale}&seekerId=${user.id}`}>{ar ? 'إدارة معاينات العميل' : 'Manage customer viewings'}</a>
    {feedback ? <p role="status">{feedback}</p> : null}
  </section>;
}
