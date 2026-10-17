import { useContext, useEffect, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { loadAdminRbacUsers } from '../admin_rbac/data.ts';
import { RouteShellAuthContext } from '../routing/shells.tsx';

export function StaffPicker({ value, onChange, disabled, locale }: { value: string; onChange: (id: string) => void; disabled: boolean; locale: SupportedLocale }) {
  const auth = useContext(RouteShellAuthContext), ar = locale === 'ar';
  const [users, setUsers] = useState<Awaited<ReturnType<typeof loadAdminRbacUsers>>['items']>([]), [error, setError] = useState(false), [attempt, setAttempt] = useState(0);
  const header = auth?.getAuthorizationHeader?.();
  useEffect(() => { if (!header) return; let current = true; setError(false); void loadAdminRbacUsers({ page: 1, limit: 100 }, { authorization: { getAuthorizationHeader: () => auth?.getAuthorizationHeader?.() } }).then(data => { if (current) setUsers(data.items); }, () => { if (current) setError(true); }); return () => { current = false; }; }, [auth, header, attempt]);
  return <><select id="admin-request-assignee" value={value} disabled={disabled} onChange={event => onChange(event.target.value)}><option value="">{ar ? 'اختر الموظف المسؤول' : 'Choose responsible employee'}</option>{value && !users.some(user => user.id === value) ? <option value={value}>{ar ? 'المسؤول الحالي' : 'Current assignee'}</option> : null}{users.filter(user => user.status === 'active').map(user => <option key={user.id} value={user.id}>{user.displayName} — {user.email}</option>)}</select>{error ? <p>{ar ? 'تعذر تحميل الموظفين. يتطلب الاختيار صلاحية عرض الموظفين.' : 'Could not load staff. Staff-view permission is required.'}<button type="button" onClick={() => setAttempt(value => value + 1)}>{ar ? 'إعادة المحاولة' : 'Retry'}</button></p> : null}</>;
}
