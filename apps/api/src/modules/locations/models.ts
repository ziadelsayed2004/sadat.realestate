import { Schema, type Connection, type Model, type Types } from 'mongoose';
import { LOCATION_KINDS, SUPPORTED_LOCALES, type LocalizedText, type LocationKind } from '@sadat-real-estate/contracts';

export interface LocationRecord {
  kind: LocationKind;
  name: LocalizedText;
  slug: string;
  parentLocationId?: Types.ObjectId;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  order: number;
  active: boolean;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface LocationModels {
  Location: Model<LocationRecord>;
}

const localizedTextSubschema = new Schema<LocalizedText>({
  ar: { type: String, trim: true, minlength: 1, maxlength: 20_000 },
  en: { type: String, trim: true, minlength: 1, maxlength: 20_000 },
  'zh-CN': { type: String, trim: true, minlength: 1, maxlength: 20_000 }
}, { _id: false, strict: 'throw' });

const coordinatesSubschema = new Schema({
  type: { type: String, enum: ['Point'], required: true, immutable: true },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: (value: number[]) => value.length === 2
        && Number.isFinite(value[0]) && value[0]! >= -180 && value[0]! <= 180
        && Number.isFinite(value[1]) && value[1]! >= -90 && value[1]! <= 90,
      message: 'Coordinates must be [longitude, latitude] in valid ranges'
    }
  }
}, { _id: false, strict: 'throw' });

const locationSchema = new Schema<LocationRecord>({
  kind: { type: String, enum: LOCATION_KINDS, required: true, immutable: true },
  name: { type: localizedTextSubschema, required: true },
  slug: {
    type: String, required: true, trim: true, lowercase: true,
    minlength: 2, maxlength: 80, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  },
  parentLocationId: { type: Schema.Types.ObjectId, ref: 'Location' },
  coordinates: coordinatesSubschema,
  order: { type: Number, required: true, min: 0, max: 1_000_000, default: 0 },
  active: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, required: true, immutable: true, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' }
}, {
  collection: 'locations',
  strict: 'throw',
  timestamps: true,
  versionKey: 'version',
  optimisticConcurrency: true
});

locationSchema.pre('validate', function validateLocationHierarchy() {
  const presentNames = SUPPORTED_LOCALES.filter((locale) => this.name?.[locale]?.trim());
  if (presentNames.length === 0) this.invalidate('name', 'At least one localized name is required');
  if (this.kind === 'location' && this.parentLocationId) {
    this.invalidate('parentLocationId', 'Top-level location cannot have a parent');
  }
  if (this.kind === 'neighborhood' && !this.parentLocationId) {
    this.invalidate('parentLocationId', 'Neighborhood parent is required');
  }
});

locationSchema.index({ slug: 1 }, { name: 'locations_slug_unique', unique: true });
locationSchema.index(
  { kind: 1, parentLocationId: 1, active: 1, order: 1, slug: 1 },
  { name: 'locations_hierarchy_active_order' }
);
locationSchema.index(
  { 'name.ar': 'text', 'name.en': 'text', 'name.zh-CN': 'text' },
  { name: 'locations_localized_name_search', default_language: 'none' }
);
locationSchema.index(
  { coordinates: '2dsphere' },
  { name: 'locations_coordinates_geo', sparse: true }
);

export function createLocationModels(connection: Connection): LocationModels {
  return {
    Location: (connection.models.Location as Model<LocationRecord> | undefined)
      ?? connection.model<LocationRecord>('Location', locationSchema)
  };
}
