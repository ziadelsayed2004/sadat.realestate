import {
  Schema,
  type Connection,
  type HydratedDocument,
  type Model,
  type Types
} from 'mongoose';
import {
  PROVIDER_APPLICATION_STATES,
  PROVIDER_TYPES,
  type ProviderApplicationState,
  type ProviderLocale,
  type ProviderRequirementSnapshot,
  type ProviderSocialLink,
  type ProviderType
} from '@sadat-real-estate/contracts';

export interface ProviderApplicationRecord {
  userId: Types.ObjectId;
  providerType: ProviderType;
  status: ProviderApplicationState;
  statusChangedAt: Date;
  requirementVersion: string;
  accountOwnerFullName?: string;
  displayName?: string;
  email?: string;
  primaryLocationId?: Types.ObjectId;
  serviceAreaIds?: Types.ObjectId[];
  preferredLocale?: ProviderLocale;
  termsAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  secondaryPhone?: string;
  whatsappNumber?: string;
  profileAssetId?: Types.ObjectId;
  biography?: string;
  website?: string;
  socialLinks?: ProviderSocialLink[];
  legalBusinessName?: string;
  tradeName?: string;
  businessAddress?: string;
  legalCompanyName?: string;
  brandName?: string;
  headOfficeAddress?: string;
  commercialRegistrationNumber?: string;
  taxRegistrationNumber?: string;
  authorizedRepresentativeFullName?: string;
  authorizedRepresentativeTitle?: string;
  accountOwnerHasRegisteredAuthority?: boolean;
  requirementsSnapshot?: ProviderRequirementSnapshot;
  submittedAt?: Date;
  reviewReason?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export type ProviderApplicationDocument = HydratedDocument<ProviderApplicationRecord>;

export interface ProviderModels {
  ProviderApplication: Model<ProviderApplicationRecord>;
}

const socialLinkSchema = new Schema<ProviderSocialLink>({
  kind: { type: String, required: true, maxlength: 40 },
  url: { type: String, required: true, maxlength: 2_048 }
}, { _id: false, strict: 'throw' });

const requirementConditionSchema = new Schema({
  key: { type: String, enum: ['account_owner_lacks_registered_authority'], required: true },
  field: { type: String, enum: ['accountOwnerHasRegisteredAuthority'], required: true },
  operator: { type: String, enum: ['equals'], required: true },
  value: { type: Boolean, required: true }
}, { _id: false, strict: 'throw' });

const requirementSchema = new Schema({
  key: { type: String, required: true },
  labelKey: { type: String, required: true },
  classification: { type: String, enum: ['required', 'optional', 'conditional'], required: true },
  condition: requirementConditionSchema,
  applies: { type: Boolean, required: true }
}, { _id: false, strict: 'throw' });

const requirementSnapshotSchema = new Schema({
  version: { type: String, required: true },
  providerType: { type: String, enum: PROVIDER_TYPES, required: true },
  requirements: { type: [requirementSchema], required: true }
}, { _id: false, strict: 'throw' });

const applicationSchema = new Schema<ProviderApplicationRecord>({
  userId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  providerType: { type: String, enum: PROVIDER_TYPES, required: true, immutable: true },
  status: { type: String, enum: PROVIDER_APPLICATION_STATES, required: true, default: 'draft' },
  statusChangedAt: { type: Date, required: true, default: Date.now },
  requirementVersion: { type: String, required: true, immutable: true },
  accountOwnerFullName: { type: String, trim: true, maxlength: 160 },
  displayName: { type: String, trim: true, maxlength: 160 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  primaryLocationId: Schema.Types.ObjectId,
  serviceAreaIds: { type: [Schema.Types.ObjectId], default: undefined },
  preferredLocale: { type: String, enum: ['ar', 'en', 'zh-CN'] },
  termsAcceptedAt: Date,
  privacyAcceptedAt: Date,
  secondaryPhone: { type: String, maxlength: 16 },
  whatsappNumber: { type: String, maxlength: 16 },
  profileAssetId: Schema.Types.ObjectId,
  biography: { type: String, trim: true, maxlength: 2_000 },
  website: { type: String, maxlength: 2_048 },
  socialLinks: { type: [socialLinkSchema], default: undefined },
  legalBusinessName: { type: String, trim: true, maxlength: 200 },
  tradeName: { type: String, trim: true, maxlength: 200 },
  businessAddress: { type: String, trim: true, maxlength: 500 },
  legalCompanyName: { type: String, trim: true, maxlength: 200 },
  brandName: { type: String, trim: true, maxlength: 200 },
  headOfficeAddress: { type: String, trim: true, maxlength: 500 },
  commercialRegistrationNumber: { type: String, trim: true, maxlength: 100 },
  taxRegistrationNumber: { type: String, trim: true, maxlength: 100 },
  authorizedRepresentativeFullName: { type: String, trim: true, maxlength: 160 },
  authorizedRepresentativeTitle: { type: String, trim: true, maxlength: 120 },
  accountOwnerHasRegisteredAuthority: Boolean,
  requirementsSnapshot: requirementSnapshotSchema,
  submittedAt: Date,
  reviewReason: { type: String, trim: true, maxlength: 1_000 }
}, {
  collection: 'provider_applications',
  strict: 'throw',
  timestamps: true,
  versionKey: 'version',
  optimisticConcurrency: true
});

applicationSchema.index(
  { userId: 1 },
  { name: 'provider_applications_user_unique', unique: true }
);
applicationSchema.index(
  { status: 1, updatedAt: -1 },
  { name: 'provider_applications_status_updated' }
);
applicationSchema.index(
  { providerType: 1, status: 1 },
  { name: 'provider_applications_type_status' }
);

export function createProviderModels(connection: Connection): ProviderModels {
  return {
    ProviderApplication: (connection.models.ProviderApplication as Model<ProviderApplicationRecord> | undefined)
      ?? connection.model<ProviderApplicationRecord>('ProviderApplication', applicationSchema)
  };
}
