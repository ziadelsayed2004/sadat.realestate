import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { AdminAccountUserData, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Modal } from '../design_system/index.ts';
import { deleteAdminAccount, type AdminAccountsAuthorizationSource } from './data.ts';

export function DeleteAccount({ user, locale, authorization, apiOrigin, onDeleted }: {
  readonly user: AdminAccountUserData; readonly locale: SupportedLocale;
  readonly authorization?: AdminAccountsAuthorizationSource | undefined; readonly apiOrigin?: string | undefined;
  readonly onDeleted?: (() => void) | undefined;
}) {
  const ar = locale === 'ar';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user.canManage !== true) return null;
  const close = () => { if (!busy) { setOpen(false); setReason(''); setConfirmed(false); setError(''); } };
  async function remove() {
    if (busy || !confirmed || reason.trim().length < 3) return;
    setBusy(true); setError('');
    try {
      await deleteAdminAccount(user.id, { version: user.version, reason: reason.trim(), confirmed: true }, { authorization, apiOrigin });
      setOpen(false);
      if (onDeleted) onDeleted();
      else window.location.assign(`/admin/users?lang=${locale}&deleted=1`);
    } catch (cause) {
      setError(cause instanceof ApiClientError && cause.status === 409 ? (ar ? 'تغيّرت بيانات الحساب. حدّث الصفحة وراجع الحساب قبل الحذف.' : 'The account changed. Reload and review it before deleting.')
        : cause instanceof ApiClientError && cause.status === 403 ? (ar ? 'ليس لديك صلاحية حذف هذا الحساب.' : 'You cannot delete this account.')
        : ar ? 'تعذر حذف الحساب. بيانات التأكيد محفوظة؛ حاول مرة أخرى.' : 'Unable to delete. Your confirmation is preserved; retry.');
    } finally { setBusy(false); }
  }
  return <>
    <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>{ar ? 'حذف الحساب' : 'Delete account'}</Button>
    {open ? createPortal(<Modal open title={ar ? 'تأكيد حذف الحساب' : 'Confirm account deletion'} closeLabel={ar ? 'إغلاق' : 'Close'} onClose={close}>
      <form className="admin-accounts__delete-form" onSubmit={event => { event.preventDefault(); void remove(); }}>
        <p><strong>{user.displayName ?? user.email ?? user.id}</strong><br /><bdi>{user.email ?? user.phone ?? user.id}</bdi></p>
        <p>{ar ? 'سيُحذف الحساب من قوائم الاستخدام ولن يستطيع صاحبه تسجيل الدخول. تُحفظ الطلبات وسجلات المعاملات للمراجعة، ويظل البريد محجوزًا لهذا الحساب.' : 'The account is removed from operating lists and can no longer sign in. Requests and transaction history are retained for review; its email remains reserved.'}</p>
        {user.roleType === 'provider' ? <p>{ar ? 'سيُوقف عرض عقاراته ومشروعاته المنشورة وصفحة الشركة.' : 'Its published properties, projects, and company page will be hidden.'}</p> : null}
        <label>{ar ? 'سبب الحذف (مطلوب)' : 'Deletion reason (required)'}<textarea required minLength={3} maxLength={1000} rows={3} value={reason} disabled={busy} onChange={event => setReason(event.currentTarget.value)} /></label>
        <label className="admin-accounts__delete-confirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.currentTarget.checked)} />{ar ? 'أؤكد حذف الحساب الموضح أعلاه وإلغاء وصوله' : 'Confirm deletion and revoke access for the account above'}</label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="admin-accounts__actions"><Button type="submit" variant="danger" loading={busy} disabled={busy || !confirmed || reason.trim().length < 3}>{ar ? 'تأكيد الحذف' : 'Confirm deletion'}</Button><Button type="button" variant="secondary" disabled={busy} onClick={close}>{ar ? 'إلغاء' : 'Cancel'}</Button></div>
      </form>
    </Modal>, document.body) : null}
  </>;
}
