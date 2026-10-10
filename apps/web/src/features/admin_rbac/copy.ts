import { getEditableCopyCatalog, localizeCopy } from '../localization/copy-catalog.ts';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import type { AdminRbacState } from './views.tsx';

export interface AdminRbacCopy {
  readonly eyebrow: string;
  readonly users: string;
  readonly roles: string;
  readonly usersDescription: string;
  readonly rolesDescription: string;
  readonly addUser: string;
  readonly createRole: string;
  readonly edit: string;
  readonly save: string;
  readonly saving: string;
  readonly retry: string;
  readonly back: string;
  readonly reason: string;
  readonly reasonPlaceholder: string;
  readonly reasonRequired: string;
  readonly email: string;
  readonly displayName: string;
  readonly accessLevel: string;
  readonly status: string;
  readonly version: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly roleName: string;
  readonly description: string;
  readonly accessMode: string;
  readonly permissions: string;
  readonly active: string;
  readonly permissionCatalog: string;
  readonly noActions: string;
  readonly noUsers: string;
  readonly noRoles: string;
  readonly filterStatus: string;
  readonly filterAccess: string;
  readonly all: string;
  readonly activeStatus: string;
  readonly disabledStatus: string;
  readonly superAdmin: string;
  readonly standardAdmin: string;
  readonly custom: string;
  readonly viewOnly: string;
  readonly enable: string;
  readonly disable: string;
  readonly validation: string;
  readonly saved: string;
  readonly states: Readonly<Record<AdminRbacState, { readonly title: string; readonly body: string }>>;
  readonly directionNote: string;
}

export function getAdminRbacCopy(locale: SupportedLocale): AdminRbacCopy {
  return localizeCopy('admin_rbac/copy#getAdminRbacCopy', locale, getEditableCopyCatalog(locale)['admin_rbac/copy#getAdminRbacCopy'] as unknown as AdminRbacCopy);
}
