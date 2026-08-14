import { z } from 'zod';

export const RBAC_PERMISSIONS = [
  'admin:account-reports.manage',
  'admin:account-reports.view',
  'admin:ads.price',
  'admin:ads.schedule',
  'admin:ads.view',
  'admin:audit.view',
  'admin:banners.manage',
  'admin:banners.view',
  'admin:commissions.manage',
  'admin:commissions.view',
  'admin:community.moderate',
  'admin:community.view',
  'admin:content.manage',
  'admin:content.publish',
  'admin:content.view',
  'admin:documents.review',
  'admin:features.manage',
  'admin:features.view',
  'admin:locations.manage',
  'admin:locations.view',
  'admin:overview.view',
  'admin:payments.review',
  'admin:projects.review',
  'admin:projects.view',
  'admin:properties.manage',
  'admin:properties.review',
  'admin:properties.view',
  'admin:property-reports.manage',
  'admin:property-reports.view',
  'admin:providers.review',
  'admin:providers.view',
  'admin:request-issues.manage',
  'admin:request-issues.view',
  'admin:requests.assign',
  'admin:requests.manage',
  'admin:requests.notes',
  'admin:requests.view',
  'admin:roles.manage',
  'admin:roles.view',
  'admin:settings.manage',
  'admin:settings.view',
  'admin:staff.manage',
  'admin:staff.view',
  'admin:taxonomy.manage',
  'admin:taxonomy.view',
  'admin:users.manage',
  'admin:users.view',
  'admin:viewings.view'
] as const;

export const RBAC_ROLE_ACCESS_MODES = ['custom', 'view_only'] as const;
export const RBAC_ROLE_AVAILABLE_ACTIONS = ['update'] as const;
export const RBAC_OBJECT_SCOPE_RELATIONS = [
  'owner',
  'assigned',
  'review_scope',
  'global'
] as const;

export const rbacPermissionSchema = z.enum(RBAC_PERMISSIONS);
export const rbacRoleAccessModeSchema = z.enum(RBAC_ROLE_ACCESS_MODES);
export const rbacRoleAvailableActionSchema = z.enum(RBAC_ROLE_AVAILABLE_ACTIONS);
export const rbacObjectScopeRelationSchema = z.enum(RBAC_OBJECT_SCOPE_RELATIONS);
export const rbacAvailableActionKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
export const rbacResourceStateKeySchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/);
export const rbacObjectIdSchema = z.string().regex(/^[a-f0-9]{24}$/);

const roleNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: 'Role name must not contain control characters'
  });

const roleDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: 'Role description must not contain control characters'
  });

export const rbacMutationReasonSchema = z
  .string()
  .trim()
  .min(3)
  .max(1_000)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), {
    message: 'RBAC mutation reason must not contain control characters'
  });

const rolePermissionsSchema = z.array(rbacPermissionSchema).min(1).max(RBAC_PERMISSIONS.length)
  .superRefine((permissions, context) => {
    if (new Set(permissions).size !== permissions.length) {
      context.addIssue({ code: 'custom', message: 'Role permissions must be unique' });
    }
  });

function enforceViewOnly(
  value: {
    accessMode?: 'custom' | 'view_only' | undefined;
    permissions?: readonly string[] | undefined;
  },
  context: z.RefinementCtx
): void {
  if (
    value.accessMode === 'view_only'
    && value.permissions?.some((permission) => !permission.endsWith('.view'))
  ) {
    context.addIssue({
      code: 'custom',
      path: ['permissions'],
      message: 'View Only roles may contain only view permissions'
    });
  }
}

export const rbacRoleCreateRequestSchema = z.object({
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
  accessMode: rbacRoleAccessModeSchema,
  permissions: rolePermissionsSchema,
  reason: rbacMutationReasonSchema
}).strict().superRefine(enforceViewOnly);

export const rbacRolePatchRequestSchema = z.object({
  version: z.number().int().min(0),
  reason: rbacMutationReasonSchema,
  name: roleNameSchema.optional(),
  description: roleDescriptionSchema.nullable().optional(),
  accessMode: rbacRoleAccessModeSchema.optional(),
  permissions: rolePermissionsSchema.optional(),
  active: z.boolean().optional()
}).strict().superRefine((value, context) => {
  if (
    value.name === undefined
    && value.description === undefined
    && value.accessMode === undefined
    && value.permissions === undefined
    && value.active === undefined
  ) {
    context.addIssue({ code: 'custom', message: 'At least one role field must be changed' });
  }
  enforceViewOnly(value, context);
});

export const rbacRoleIdParamsSchema = z.object({ roleId: rbacObjectIdSchema }).strict();

export const rbacRoleDataSchema = z.object({
  id: rbacObjectIdSchema,
  name: roleNameSchema,
  description: roleDescriptionSchema.optional(),
  accessMode: rbacRoleAccessModeSchema,
  permissions: z.array(rbacPermissionSchema),
  active: z.boolean(),
  version: z.number().int().min(0),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  availableActions: z.array(rbacRoleAvailableActionSchema)
}).strict();

export const rbacRoleListDataSchema = z.object({
  items: z.array(rbacRoleDataSchema),
  permissionCatalog: z.array(rbacPermissionSchema).length(RBAC_PERMISSIONS.length),
  effectivePermissions: z.array(rbacPermissionSchema)
}).strict();

export const rbacRoleSuccessEnvelopeSchema = z.object({
  data: rbacRoleDataSchema,
  meta: z.object({ requestId: z.string().min(1).max(128) }).passthrough()
}).strict();

export const rbacRoleListSuccessEnvelopeSchema = z.object({
  data: rbacRoleListDataSchema,
  meta: z.object({ requestId: z.string().min(1).max(128) }).passthrough()
}).strict();

export const adminRoleAssignmentRequestSchema = z.object({
  adminId: rbacObjectIdSchema,
  roleIds: z.array(rbacObjectIdSchema).min(1).max(10)
    .superRefine((roleIds, context) => {
      if (new Set(roleIds).size !== roleIds.length) {
        context.addIssue({ code: 'custom', message: 'Assigned role identifiers must be unique' });
      }
    }),
  version: z.number().int().min(0),
  reason: rbacMutationReasonSchema
}).strict();

export const adminRoleAssignmentDataSchema = z.object({
  adminId: rbacObjectIdSchema,
  roleIds: z.array(rbacObjectIdSchema).min(1).max(10),
  effectivePermissions: z.array(rbacPermissionSchema),
  version: z.number().int().min(0),
  assignedAt: z.string().datetime({ offset: true })
}).strict();

export type RbacPermission = z.infer<typeof rbacPermissionSchema>;
export type RbacRoleAccessMode = z.infer<typeof rbacRoleAccessModeSchema>;
export type RbacRoleAvailableAction = z.infer<typeof rbacRoleAvailableActionSchema>;
export type RbacObjectScopeRelation = z.infer<typeof rbacObjectScopeRelationSchema>;
export type RbacAvailableActionKey = z.infer<typeof rbacAvailableActionKeySchema>;
export type RbacResourceStateKey = z.infer<typeof rbacResourceStateKeySchema>;
export type RbacRoleCreateRequest = z.infer<typeof rbacRoleCreateRequestSchema>;
export type RbacRolePatchRequest = z.infer<typeof rbacRolePatchRequestSchema>;
export type RbacRoleData = z.infer<typeof rbacRoleDataSchema>;
export type RbacRoleListData = z.infer<typeof rbacRoleListDataSchema>;
export type AdminRoleAssignmentRequest = z.infer<typeof adminRoleAssignmentRequestSchema>;
export type AdminRoleAssignmentData = z.infer<typeof adminRoleAssignmentDataSchema>;
