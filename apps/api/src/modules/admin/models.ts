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

export interface AdminModels {
  AdminBootstrap: Model<AdminBootstrapRecord>;
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

export function createAdminModels(connection: Connection): AdminModels {
  return {
    AdminBootstrap:
      (connection.models.AdminBootstrap as Model<AdminBootstrapRecord> | undefined)
      ?? connection.model<AdminBootstrapRecord>('AdminBootstrap', adminBootstrapSchema)
  };
}
