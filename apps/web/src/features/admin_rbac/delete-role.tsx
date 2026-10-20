import { z } from 'zod';
import { useContext, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClient } from '../contracts/index.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';
import { Button, Input, Modal } from '../design_system/index.ts';

export function DeleteRole({ id, version, locale, onDeleted }: { id: string; version: number; locale: SupportedLocale; onDeleted: () => void }) {
  const auth = useContext(RouteShellAuthContext), ar = locale === 'ar';
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [reason, setReason] = useState('');
  async function remove() {
    setBusy(true); setError('');
    try {
      await new ApiClient().request(`/admin/roles/${id}`, { method: 'DELETE', responseSchema: z.object({ data: z.object({ id: z.string(), deleted: z.literal(true) }) }), json: { version, reason: reason.trim() }, headers: { authorization: auth?.getAuthorizationHeader?.() ?? '' } });
      setOpen(false); onDeleted();
    } catch { setError(ar ? 'تعذر الحذف. انقل الموظفين المرتبطين بهذا الدور إلى دور آخر، ثم حدّث القائمة وحاول مجددًا.' : 'Could not delete. Assign staff using this role to another role, refresh and retry.'); }
    finally { setBusy(false); }
  }
  return <><Button variant="danger" onClick={() => { setError(''); setOpen(true); }}>{ar ? 'حذف الدور' : 'Delete role'}</Button>
    <Modal open={open} title={ar ? 'تأكيد حذف الدور' : 'Confirm role deletion'} closeLabel={ar ? 'إلغاء' : 'Cancel'} onClose={() => { if (!busy) setOpen(false); }} footer={<><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>{ar ? 'إلغاء' : 'Cancel'}</Button><Button variant="danger" disabled={busy || reason.trim().length < 3} onClick={() => { void remove(); }}>{ar ? 'تأكيد الحذف' : 'Confirm delete'}</Button></>}>
      <p>{ar ? 'احذف الدور بعد نقله من حسابات الموظفين المرتبطين به. حذف الدور لا يحذف حساباتهم.' : 'Remove this role from assigned staff accounts first. Deleting a role does not delete their accounts.'}</p>
      <Input id={`delete-role-${id}`} label={ar ? 'سبب الحذف' : 'Deletion reason'} value={reason} maxLength={500} disabled={busy} onChange={event => setReason(event.target.value)} />
      {error ? <p role="alert">{error}</p> : null}
    </Modal></>;
}
