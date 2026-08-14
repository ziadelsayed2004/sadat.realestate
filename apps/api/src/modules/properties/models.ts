import { Schema, type Connection, type Model, type Types } from 'mongoose';
import type { LocalizedText, PropertyArea, PropertyContact, PropertyKind, PropertyLayout, PropertyMoney, PropertyPaymentPlan, PropertySource, PropertyStatus, PropertyTransactionType } from '@sadat-real-estate/contracts';

export interface PropertyRecord {
  providerId: Types.ObjectId;
  sourceType: PropertySource['sourceType'];
  organizationId?: Types.ObjectId;
  kind: PropertyKind;
  name: LocalizedText;
  slug: string;
  transactionType: PropertyTransactionType;
  projectId?: Types.ObjectId;
  parentPropertyId?: Types.ObjectId;
  locationId?: Types.ObjectId;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  description?: LocalizedText;
  propertyTypeId?: Types.ObjectId;
  area?: PropertyArea;
  layout?: PropertyLayout;
  price?: PropertyMoney;
  paymentPlans?: PropertyPaymentPlan[];
  featureIds?: Types.ObjectId[];
  serviceIds?: Types.ObjectId[];
  contact?: PropertyContact;
  submittedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewedAt?: Date;
  reviewReason?: string;
  publishedAt?: Date;
  status: PropertyStatus;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface PropertyModels { Property: Model<PropertyRecord>; }

const localized = new Schema<LocalizedText>({
  ar: { type: String, trim: true, maxlength: 20_000 },
  en: { type: String, trim: true, maxlength: 20_000 },
  'zh-CN': { type: String, trim: true, maxlength: 20_000 }
}, { _id: false, strict: 'throw' });
const area = new Schema<PropertyArea>({ value: { type: Number, min: 0, max: 1_000_000 }, unit: { type: String, enum: ['sqm'], immutable: true } }, { _id: false, strict: 'throw' });
const layout = new Schema<PropertyLayout>({ bedrooms: { type: Number, min: 0, max: 100 }, bathrooms: { type: Number, min: 0, max: 100 }, floor: { type: Number, min: 0, max: 1_000 }, totalFloors: { type: Number, min: 1, max: 1_000 } }, { _id: false, strict: 'throw' });
const money = new Schema<PropertyMoney>({ amount: { type: Number, min: 0, max: 1_000_000_000_000_000 }, currency: { type: String, match: /^[A-Z]{3}$/ } }, { _id: false, strict: 'throw' });
const paymentPlan = new Schema<PropertyPaymentPlan>({ name: { type: localized, required: true }, installments: { type: Number, min: 1, max: 120, required: true }, frequency: { type: String, enum: ['monthly', 'quarterly', 'annually'], required: true }, downPayment: money, installmentAmount: { type: money, required: true } }, { _id: false, strict: 'throw' });
const contact = new Schema<PropertyContact>({
  contactName: { type: String, trim: true, maxlength: 160 },
  phone: { type: String, trim: true, match: /^\+[1-9]\d{7,14}$/ },
  whatsappNumber: { type: String, trim: true, match: /^\+[1-9]\d{7,14}$/ },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  preferredLocale: { type: String, enum: ['ar', 'en', 'zh-CN'] }
}, { _id: false, strict: 'throw' });

export const propertySchema = new Schema<PropertyRecord>({
  providerId: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  sourceType: { type: String, required: true, enum: ['individual_broker', 'brokerage_office', 'developer_company'], immutable: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', immutable: true },
  kind: { type: String, required: true, enum: ['property', 'unit'], immutable: true, default: 'property' },
  name: { type: localized, required: true },
  slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  transactionType: { type: String, required: true, enum: ['sale', 'rent'] },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  parentPropertyId: { type: Schema.Types.ObjectId, ref: 'Property' },
  locationId: { type: Schema.Types.ObjectId, ref: 'Location' },
  coordinates: {
    type: { type: String, enum: ['Point'], immutable: true },
    coordinates: { type: [Number], validate: { validator: (value: number[]) => value.length === 2 && Number.isFinite(value[0]) && Number.isFinite(value[1]), message: 'Coordinates must contain longitude and latitude' } }
  },
  description: localized,
  propertyTypeId: { type: Schema.Types.ObjectId, ref: 'PropertyTaxonomy' },
  area: area,
  layout: layout,
  price: money,
  paymentPlans: { type: [paymentPlan], default: undefined },
  featureIds: { type: [Schema.Types.ObjectId], ref: 'FeatureService', default: undefined },
  serviceIds: { type: [Schema.Types.ObjectId], ref: 'FeatureService', default: undefined },
  contact: { type: contact, default: undefined },
  submittedAt: { type: Date },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewReason: { type: String, trim: true, maxlength: 500 },
  publishedAt: { type: Date },
  status: { type: String, required: true, enum: ['draft', 'pending_review', 'needs_changes', 'approved', 'published', 'rejected', 'hidden', 'archived'], default: 'draft' },
  active: { type: Boolean, required: true, default: true }
}, { collection: 'properties', strict: 'throw', timestamps: true, versionKey: 'version', optimisticConcurrency: true });

propertySchema.pre('validate', function validateRelationships() {
  if (this.sourceType === 'individual_broker' && this.organizationId) this.invalidate('organizationId', 'Individual brokers cannot link an organization');
  if (this.sourceType !== 'individual_broker' && !this.organizationId) this.invalidate('organizationId', 'An organization is required for office and developer sources');
  if (this.kind === 'property' && this.parentPropertyId) this.invalidate('parentPropertyId', 'Only units can have a parent property');
  if (this.kind === 'unit' && !this.parentPropertyId && !this.projectId) this.invalidate('parentPropertyId', 'Units require a parent property or project');
  if (this.layout?.floor !== undefined && this.layout.totalFloors !== undefined && this.layout.floor > this.layout.totalFloors) this.invalidate('layout.floor', 'Floor cannot exceed total floors');
  if (this.price && this.paymentPlans?.some(plan => [plan.downPayment?.currency, plan.installmentAmount.currency].some(currency => currency && currency !== this.price?.currency))) this.invalidate('paymentPlans', 'Payment plan currencies must match price currency');
  for (const [field, values] of [['featureIds', this.featureIds], ['serviceIds', this.serviceIds] ] as const) {
    if (values && new Set(values.map(value => value.toHexString())).size !== values.length) this.invalidate(field, 'Property references must be unique');
  }
  if (this.featureIds && this.serviceIds) {
    const services = new Set(this.serviceIds.map(value => value.toHexString()));
    if (this.featureIds.some(value => services.has(value.toHexString()))) this.invalidate('serviceIds', 'A reference cannot be both a feature and a service');
  }
});

propertySchema.index({ providerId: 1, updatedAt: -1 }, { name: 'properties_provider_updated' });
propertySchema.index({ providerId: 1, status: 1, updatedAt: -1, _id: -1 }, { name: 'properties_provider_status_updated' });
propertySchema.index({ providerId: 1, slug: 1 }, { unique: true, name: 'properties_provider_slug_unique' });
propertySchema.index({ projectId: 1, status: 1, active: 1 }, { name: 'properties_project_public' });
propertySchema.index({ status: 1, active: 1, updatedAt: -1 }, { name: 'properties_public_status' });
propertySchema.index({ locationId: 1, status: 1, active: 1 }, { name: 'properties_location_public' });
propertySchema.index({ coordinates: '2dsphere' }, { name: 'properties_coordinates_geo', sparse: true });
propertySchema.index({ 'name.ar': 'text', 'name.en': 'text', 'name.zh-CN': 'text', slug: 'text' }, { name: 'properties_search_text', weights: { slug: 5, 'name.en': 3, 'name.ar': 3, 'name.zh-CN': 3 } });
propertySchema.index({ featureIds: 1, status: 1, active: 1 }, { name: 'properties_feature_public', sparse: true });
propertySchema.index({ serviceIds: 1, status: 1, active: 1 }, { name: 'properties_service_public', sparse: true });

export function createPropertyModels(connection: Connection): PropertyModels {
  return { Property: (connection.models.Property as Model<PropertyRecord> | undefined) ?? connection.model<PropertyRecord>('Property', propertySchema) };
}
