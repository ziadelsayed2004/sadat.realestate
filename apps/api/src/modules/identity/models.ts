import {
  Schema,
  type Connection,
  type HydratedDocument,
  type Model,
  type Types
} from 'mongoose';
import {
  ACCOUNT_STATES,
  PROVIDER_PROFILE_STATES,
  PROVIDER_TYPES,
  USER_ROLE_TYPES,
  type AccountState,
  type ProviderProfileState,
  type ProviderType,
  type UserRoleType
} from './account-state.js';

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const NORMALIZED_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NORMALIZED_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const TOKEN_HASH_PATTERN = /^[A-Za-z0-9_-]{43,128}$/;

export interface UserRecord {
  normalizedEmail?: string;
  normalizedPhone?: string;
  roleType: UserRoleType;
  status: AccountState;
  locale: SupportedLocale;
  statusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SeekerProfileRecord {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  preferences?: {
    propertyTypes?: string[];
    locations?: string[];
    purpose?: 'buy' | 'rent';
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    maxArea?: number;
    bedroomsMin?: number;
    bedroomsMax?: number;
    paymentMethod?: 'cash' | 'installment' | 'any';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderProfileRecord {
  userId: Types.ObjectId;
  providerType: ProviderType;
  status: ProviderProfileState;
  statusChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminProfileRecord {
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionRecord {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  replacedBySessionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<UserRecord>;
export type SeekerProfileDocument = HydratedDocument<SeekerProfileRecord>;
export type ProviderProfileDocument = HydratedDocument<ProviderProfileRecord>;
export type AdminProfileDocument = HydratedDocument<AdminProfileRecord>;
export type SessionDocument = HydratedDocument<SessionRecord>;

export interface IdentityModels {
  User: Model<UserRecord>;
  SeekerProfile: Model<SeekerProfileRecord>;
  ProviderProfile: Model<ProviderProfileRecord>;
  AdminProfile: Model<AdminProfileRecord>;
  Session: Model<SessionRecord>;
}

const strictOptions = {
  strict: 'throw' as const,
  timestamps: true,
  versionKey: 'version'
};

const userSchema = new Schema<UserRecord>(
  {
    normalizedEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: NORMALIZED_EMAIL_PATTERN
    },
    normalizedPhone: {
      type: String,
      trim: true,
      maxlength: 16,
      match: NORMALIZED_PHONE_PATTERN
    },
    roleType: { type: String, enum: USER_ROLE_TYPES, required: true, immutable: true },
    status: { type: String, enum: ACCOUNT_STATES, required: true, default: 'unverified' },
    locale: { type: String, enum: SUPPORTED_LOCALES, required: true, default: 'ar' },
    statusChangedAt: { type: Date, required: true, default: Date.now }
  },
  { ...strictOptions, collection: 'users', optimisticConcurrency: true }
);

userSchema.pre('validate', function validateIdentifier() {
  if (!this.normalizedEmail) {
    this.invalidate(
      'normalizedEmail',
      'A normalized email address is required for every user identity'
    );
  }
});
userSchema.index(
  { normalizedEmail: 1 },
  {
    name: 'users_normalized_email_unique',
    unique: true,
    partialFilterExpression: { normalizedEmail: { $type: 'string' } }
  }
);
userSchema.index(
  { normalizedPhone: 1 },
  {
    name: 'users_normalized_phone_unique',
    unique: true,
    partialFilterExpression: { normalizedPhone: { $type: 'string' } }
  }
);
userSchema.index({ roleType: 1, status: 1 }, { name: 'users_role_status' });

const seekerProfileSchema = new Schema<SeekerProfileRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
    firstName: { type: String, trim: true, maxlength: 80 },
    lastName: { type: String, trim: true, maxlength: 80 },
    preferences: {
      propertyTypes: { type: [String], default: undefined },
      locations: { type: [String], default: undefined },
      purpose: { type: String, enum: ['buy', 'rent'] },
      minPrice: { type: Number, min: 0 },
      maxPrice: { type: Number, min: 0 },
      minArea: { type: Number, min: 0, max: 1_000_000 },
      maxArea: { type: Number, min: 0, max: 1_000_000 },
      bedroomsMin: { type: Number, min: 0, max: 100 },
      bedroomsMax: { type: Number, min: 0, max: 100 },
      paymentMethod: { type: String, enum: ['cash', 'installment', 'any'] }
    }
  },
  { ...strictOptions, collection: 'seeker_profiles' }
);
seekerProfileSchema.index({ userId: 1 }, { name: 'seeker_profiles_user_unique', unique: true });

const providerProfileSchema = new Schema<ProviderProfileRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
    providerType: { type: String, enum: PROVIDER_TYPES, required: true, immutable: true },
    status: {
      type: String,
      enum: PROVIDER_PROFILE_STATES,
      required: true,
      default: 'draft'
    },
    statusChangedAt: { type: Date, required: true, default: Date.now }
  },
  { ...strictOptions, collection: 'provider_profiles', optimisticConcurrency: true }
);
providerProfileSchema.index(
  { userId: 1 },
  { name: 'provider_profiles_user_unique', unique: true }
);
providerProfileSchema.index(
  { status: 1, updatedAt: -1 },
  { name: 'provider_profiles_status_updated' }
);

const adminProfileSchema = new Schema<AdminProfileRecord>(
  { userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' } },
  { ...strictOptions, collection: 'admin_profiles' }
);
adminProfileSchema.index({ userId: 1 }, { name: 'admin_profiles_user_unique', unique: true });

const sessionSchema = new Schema<SessionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
    tokenHash: {
      type: String,
      required: true,
      immutable: true,
      select: false,
      minlength: 43,
      maxlength: 128,
      match: TOKEN_HASH_PATTERN
    },
    expiresAt: { type: Date, required: true },
    lastUsedAt: Date,
    revokedAt: Date,
    replacedBySessionId: { type: Schema.Types.ObjectId, ref: 'Session' }
  },
  { ...strictOptions, collection: 'sessions' }
);
sessionSchema.index({ tokenHash: 1 }, { name: 'sessions_token_hash_unique', unique: true });
sessionSchema.index({ expiresAt: 1 }, { name: 'sessions_expiry_ttl', expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, createdAt: -1 }, { name: 'sessions_user_created' });
sessionSchema.set('toJSON', {
  transform: (_document, returned) => {
    Reflect.deleteProperty(returned, 'tokenHash');
    return returned;
  }
});

function modelFor<T>(
  connection: Connection,
  name: string,
  schema: Schema<T>
): Model<T> {
  return (connection.models[name] as Model<T> | undefined) ?? connection.model<T>(name, schema);
}

export function createIdentityModels(connection: Connection): IdentityModels {
  return {
    User: modelFor(connection, 'User', userSchema),
    SeekerProfile: modelFor(connection, 'SeekerProfile', seekerProfileSchema),
    ProviderProfile: modelFor(connection, 'ProviderProfile', providerProfileSchema),
    AdminProfile: modelFor(connection, 'AdminProfile', adminProfileSchema),
    Session: modelFor(connection, 'Session', sessionSchema)
  };
}
