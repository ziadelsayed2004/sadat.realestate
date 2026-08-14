import { Schema, type Connection, type Model, type Types } from 'mongoose';
import {
  RBAC_PERMISSIONS,
  RBAC_ROLE_ACCESS_MODES,
  type RbacPermission,
  type RbacRoleAccessMode
} from '@sadat-real-estate/contracts';

export interface RbacRoleRecord {
  name: string;
  nameKey: string;
  description?: string;
  accessMode: RbacRoleAccessMode;
  permissions: RbacPermission[];
  active: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminRoleAssignmentRecord {
  adminUserId: Types.ObjectId;
  roleIds: Types.ObjectId[];
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RbacModels {
  Role: Model<RbacRoleRecord>;
  AdminRoleAssignment: Model<AdminRoleAssignmentRecord>;
}

const roleSchema = new Schema<RbacRoleRecord>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    nameKey: {
      type: String,
      required: true,
      minlength: 2,
      maxlength: 120
    },
    description: { type: String, trim: true, minlength: 1, maxlength: 500 },
    accessMode: { type: String, enum: RBAC_ROLE_ACCESS_MODES, required: true },
    permissions: {
      type: [{ type: String, enum: RBAC_PERMISSIONS }],
      required: true,
      validate: {
        validator: (permissions: RbacPermission[]) => permissions.length >= 1
          && permissions.length <= RBAC_PERMISSIONS.length
          && new Set(permissions).size === permissions.length,
        message: 'Role permissions must be non-empty and unique'
      }
    },
    active: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' }
  },
  {
    collection: 'roles',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version',
    optimisticConcurrency: true
  }
);

roleSchema.pre('validate', function validateViewOnlyPermissions() {
  if (
    this.accessMode === 'view_only'
    && this.permissions.some((permission) => !permission.endsWith('.view'))
  ) {
    this.invalidate('permissions', 'View Only roles may contain only view permissions');
  }
});

roleSchema.index({ nameKey: 1 }, { name: 'roles_name_key_unique', unique: true });
roleSchema.index({ active: 1, nameKey: 1 }, { name: 'roles_active_name' });

const assignmentSchema = new Schema<AdminRoleAssignmentRecord>(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: 'User'
    },
    roleIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'RbacRole' }],
      required: true,
      validate: {
        validator: (roleIds: Types.ObjectId[]) => roleIds.length >= 1
          && roleIds.length <= 10
          && new Set(roleIds.map((roleId) => roleId.toHexString())).size === roleIds.length,
        message: 'Administrator role assignments must be non-empty and unique'
      }
    },
    assignedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    assignedAt: { type: Date, required: true }
  },
  {
    collection: 'admin_role_assignments',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version',
    optimisticConcurrency: true
  }
);

assignmentSchema.index(
  { adminUserId: 1 },
  { name: 'admin_role_assignments_admin_unique', unique: true }
);
assignmentSchema.index(
  { roleIds: 1, updatedAt: -1 },
  { name: 'admin_role_assignments_roles_updated' }
);

export function createRbacModels(connection: Connection): RbacModels {
  return {
    Role: (connection.models.RbacRole as Model<RbacRoleRecord> | undefined)
      ?? connection.model<RbacRoleRecord>('RbacRole', roleSchema),
    AdminRoleAssignment:
      (connection.models.AdminRoleAssignment as Model<AdminRoleAssignmentRecord> | undefined)
      ?? connection.model<AdminRoleAssignmentRecord>(
        'AdminRoleAssignment',
        assignmentSchema
      )
  };
}
