import { Schema, type Connection, type Model, type Types } from 'mongoose';
import {
  OTP_PURPOSES,
  OTP_ROLE_TYPES,
  type OtpPurpose,
  type OtpRoleType
} from '@sadat-real-estate/contracts';

const ARGON2ID_HASH_PATTERN = /^\$argon2id\$/;

export interface AdminCredentialRecord {
  userId: Types.ObjectId;
  passwordHash: string;
  passwordChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthModels {
  AdminCredential: Model<AdminCredentialRecord>;
  OtpChallenge: Model<OtpChallengeRecord>;
}

export const OTP_CHALLENGE_STATES = [
  'pending',
  'verified',
  'consumed',
  'failed',
  'replaced',
  'delivery_failed'
] as const;
export type OtpChallengeState = (typeof OTP_CHALLENGE_STATES)[number];

export interface OtpChallengeRecord {
  publicId: string;
  activeKey?: string;
  normalizedPhone: string;
  roleType: OtpRoleType;
  purpose: OtpPurpose;
  codeHash: string;
  attemptsRemaining: number;
  status: OtpChallengeState;
  expiresAt: Date;
  verifiedAt?: Date;
  verificationTokenHash?: string;
  consumedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adminCredentialSchema = new Schema<AdminCredentialRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
    passwordHash: {
      type: String,
      required: true,
      select: false,
      minlength: 50,
      maxlength: 512,
      match: ARGON2ID_HASH_PATTERN
    },
    passwordChangedAt: { type: Date, required: true, default: Date.now }
  },
  {
    collection: 'admin_credentials',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version'
  }
);

adminCredentialSchema.index(
  { userId: 1 },
  { name: 'admin_credentials_user_unique', unique: true }
);
adminCredentialSchema.set('toJSON', {
  transform: (_document, returned) => {
    Reflect.deleteProperty(returned, 'passwordHash');
    return returned;
  }
});

const otpChallengeSchema = new Schema<OtpChallengeRecord>(
  {
    publicId: {
      type: String,
      required: true,
      immutable: true,
      match: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    },
    activeKey: { type: String, select: false, minlength: 1, maxlength: 128 },
    normalizedPhone: {
      type: String,
      required: true,
      immutable: true,
      maxlength: 16,
      match: /^\+[1-9]\d{7,14}$/
    },
    roleType: { type: String, enum: OTP_ROLE_TYPES, required: true, immutable: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true, immutable: true },
    codeHash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      minlength: 43,
      maxlength: 43,
      match: /^[A-Za-z0-9_-]{43}$/
    },
    attemptsRemaining: { type: Number, required: true, min: 0, max: 10 },
    status: { type: String, enum: OTP_CHALLENGE_STATES, required: true, default: 'pending' },
    expiresAt: { type: Date, required: true },
    verifiedAt: Date,
    verificationTokenHash: {
      type: String,
      select: false,
      minlength: 43,
      maxlength: 43,
      match: /^[A-Za-z0-9_-]{43}$/
    },
    consumedAt: Date
  },
  {
    collection: 'otp_challenges',
    strict: 'throw',
    timestamps: true,
    versionKey: 'version'
  }
);

otpChallengeSchema.index(
  { publicId: 1 },
  { name: 'otp_challenges_public_id_unique', unique: true }
);
otpChallengeSchema.index(
  { activeKey: 1 },
  {
    name: 'otp_challenges_active_key_unique',
    unique: true,
    partialFilterExpression: { status: 'pending', activeKey: { $type: 'string' } }
  }
);
otpChallengeSchema.index(
  { normalizedPhone: 1, roleType: 1, purpose: 1, createdAt: -1 },
  { name: 'otp_challenges_target_created' }
);
otpChallengeSchema.index(
  { verificationTokenHash: 1 },
  {
    name: 'otp_challenges_verification_token_unique',
    unique: true,
    partialFilterExpression: { verificationTokenHash: { $type: 'string' } }
  }
);
otpChallengeSchema.index(
  { expiresAt: 1 },
  { name: 'otp_challenges_expiry_ttl', expireAfterSeconds: 0 }
);
otpChallengeSchema.set('toJSON', {
  transform: (_document, returned) => {
    Reflect.deleteProperty(returned, 'activeKey');
    Reflect.deleteProperty(returned, 'codeHash');
    Reflect.deleteProperty(returned, 'verificationTokenHash');
    return returned;
  }
});

export function createAuthModels(connection: Connection): AuthModels {
  return {
    AdminCredential: (connection.models.AdminCredential as Model<AdminCredentialRecord> | undefined)
      ?? connection.model<AdminCredentialRecord>('AdminCredential', adminCredentialSchema),
    OtpChallenge: (connection.models.OtpChallenge as Model<OtpChallengeRecord> | undefined)
      ?? connection.model<OtpChallengeRecord>('OtpChallenge', otpChallengeSchema)
  };
}
