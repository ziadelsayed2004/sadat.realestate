import { Schema, type Connection, type Model, type Types } from 'mongoose';
import {
  ADMIN_ACCESS_LEVELS,
  FIRST_SUPER_ADMIN_BOOTSTRAP_KEY,
  type AdminAccessLevel
} from '@sadat-real-estate/contracts';

export interface AdminBootstrapRecord {
  bootstrapKey: typeof FIRST_SUPER_ADMIN_BOOTSTRAP_KEY;
  userId: Types.ObjectId;
  accessLevel: AdminAccessLevel;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAccountRecord {
  userId: Types.ObjectId;
  displayName: string;
  accessLevel: AdminAccessLevel;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminModels {
  AdminBootstrap: Model<AdminBootstrapRecord>;
  AdminAccount: Model<AdminAccountRecord>;
}

const adminBootstrapSchema = new Schema<AdminBootstrapRecord>(
  {
    bootstrapKey: {
      type: String,
      required: true,
      immutable: true,
      enum: [FIRST_SUPER_ADMIN_BOOTSTRAP_KEY]
    },
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: 'User'
    },
    accessLevel: {
      type: String,
      required: true,
      immutable: true,
      enum: ADMIN_ACCESS_LEVELS
    },
    completedAt: { type: Date, required: true, immutable: true }
  },
  {
    collection: 'admin_bootstrap',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version'
  }
);

adminBootstrapSchema.index(
  { bootstrapKey: 1 },
  { name: 'admin_bootstrap_key_unique', unique: true }
);
adminBootstrapSchema.index(
  { userId: 1 },
  { name: 'admin_bootstrap_user_unique', unique: true }
);

const adminAccountSchema = new Schema<AdminAccountRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      immutable: true,
      ref: 'User'
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
      validate: {
        validator: (value: string) => !/[\u0000-\u001f\u007f]/.test(value),
        message: 'Display name must not contain control characters'
      }
    },
    accessLevel: {
      type: String,
      required: true,
      enum: ADMIN_ACCESS_LEVELS
    }
  },
  {
    collection: 'admin_accounts',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version'
  }
);

adminAccountSchema.index(
  { userId: 1 },
  { name: 'admin_accounts_user_unique', unique: true }
);
adminAccountSchema.index(
  { accessLevel: 1 },
  { name: 'admin_accounts_access_level' }
);

export function createAdminModels(connection: Connection): AdminModels {
  return {
    AdminBootstrap:
      (connection.models.AdminBootstrap as Model<AdminBootstrapRecord> | undefined)
      ?? connection.model<AdminBootstrapRecord>('AdminBootstrap', adminBootstrapSchema),
    AdminAccount:
      (connection.models.AdminAccount as Model<AdminAccountRecord> | undefined)
      ?? connection.model<AdminAccountRecord>('AdminAccount', adminAccountSchema)
  };
}
