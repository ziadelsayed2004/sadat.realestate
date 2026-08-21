import { Types, type Connection } from 'mongoose';
import {
  providerSettingsDataSchema,
  providerSettingsPatchSchema,
  type ProviderSettingsData
} from '@sadat-real-estate/contracts';
import type { ProviderSettingsRepository, ProviderSettingsWriteResult } from './provider-service.js';

type Row = Record<string, unknown>;
type ProviderApplicationBase = {
  email?: string;
  whatsappNumber?: string;
  officeAddress?: string;
  website?: string;
};

const PROVIDER_SETTINGS_ACTIONS = ['update_email', 'update_contact'] as const;

function objectId(value: string): Types.ObjectId | undefined {
  return /^[a-f0-9]{24}$/.test(value) ? new Types.ObjectId(value) : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function ownedValue(row: Row | undefined, key: string, fallback: string | undefined): string | undefined {
  if (row && Object.prototype.hasOwnProperty.call(row, key)) return stringValue(row[key]);
  return fallback;
}

function providerSettingsData(
  row: Row | undefined,
  phone: string,
  fallback: ProviderApplicationBase
): ProviderSettingsData {
  const parsed = providerSettingsDataSchema.safeParse({
    version: typeof row?.version === 'number' ? row.version : 0,
    email: ownedValue(row, 'email', fallback.email),
    phone,
    whatsappNumber: ownedValue(row, 'whatsappNumber', fallback.whatsappNumber),
    officeAddress: ownedValue(row, 'officeAddress', fallback.officeAddress),
    website: ownedValue(row, 'website', fallback.website),
    availableActions: [...PROVIDER_SETTINGS_ACTIONS]
  });
  if (!parsed.success) throw new Error('PROVIDER_SETTINGS_RECORD_INVALID');
  return parsed.data;
}

export function createMongooseProviderSettingsRepository(connection: Connection): ProviderSettingsRepository {
  const users = connection.collection('users');
  const applications = connection.collection('provider_applications');
  const settings = connection.collection('provider_settings');
  let indexesReady: Promise<unknown> | undefined;

  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= settings.createIndex(
      { userId: 1 },
      { name: 'provider_settings_user_unique', unique: true }
    );
    return indexesReady;
  }

  async function source(userId: string): Promise<{
    id: Types.ObjectId;
    phone: string;
    fallback: ProviderApplicationBase;
  } | undefined> {
    const id = objectId(userId);
    if (!id) return undefined;
    const [user, application] = await Promise.all([
      users.findOne(
        { _id: id, roleType: 'provider', status: 'verified' },
        { projection: { normalizedPhone: 1 } }
      ),
      applications.findOne(
        { userId: id },
        { projection: { email: 1, whatsappNumber: 1, businessAddress: 1, headOfficeAddress: 1, website: 1 } }
      )
    ]);
    const phone = stringValue(user?.normalizedPhone);
    if (!phone || !application) return undefined;
    const email = stringValue(application.email);
    const whatsappNumber = stringValue(application.whatsappNumber);
    const officeAddress = stringValue(application.businessAddress ?? application.headOfficeAddress);
    const website = stringValue(application.website);
    return {
      id,
      phone,
      fallback: {
        ...(email ? { email } : {}),
        ...(whatsappNumber ? { whatsappNumber } : {}),
        ...(officeAddress ? { officeAddress } : {}),
        ...(website ? { website } : {})
      }
    };
  }

  return {
    async find(userId) {
      const owner = await source(userId);
      if (!owner) return undefined;
      await ensureIndexes();
      const row = await settings.findOne(
        { userId: owner.id },
        { projection: { _id: 0, userId: 1, version: 1, email: 1, whatsappNumber: 1, officeAddress: 1, website: 1 } }
      );
      return providerSettingsData(row as Row | undefined, owner.phone, owner.fallback);
    },

    async update(input): Promise<ProviderSettingsWriteResult> {
      const owner = await source(input.userId);
      if (!owner) return { kind: 'not_found' };
      await ensureIndexes();
      const patch = providerSettingsPatchSchema.parse(input.patch);
      const current = await settings.findOne(
        { userId: owner.id },
        { projection: { _id: 0, userId: 1, version: 1, email: 1, whatsappNumber: 1, officeAddress: 1, website: 1 } }
      ) as Row | null;
      if (!current) {
        if (input.expectedVersion !== 0) return { kind: 'version_conflict' };
        const values: Row = { userId: owner.id, version: 1, createdAt: input.now, updatedAt: input.now };
        for (const key of ['email', 'whatsappNumber', 'officeAddress', 'website'] as const) {
          if (Object.prototype.hasOwnProperty.call(patch, key)) values[key] = patch[key];
        }
        try {
          await settings.insertOne(values);
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
            return { kind: 'version_conflict' };
          }
          throw error;
        }
      } else {
        if (current.version !== input.expectedVersion) return { kind: 'version_conflict' };
        const values: Row = { updatedAt: input.now };
        for (const key of ['email', 'whatsappNumber', 'officeAddress', 'website'] as const) {
          if (Object.prototype.hasOwnProperty.call(patch, key)) values[key] = patch[key];
        }
        const updated = await settings.findOneAndUpdate(
          { userId: owner.id, version: input.expectedVersion },
          { $set: values, $inc: { version: 1 } },
          { returnDocument: 'after' }
        );
        if (!updated) return { kind: 'version_conflict' };
      }
      const result = await settings.findOne(
        { userId: owner.id },
        { projection: { _id: 0, userId: 1, version: 1, email: 1, whatsappNumber: 1, officeAddress: 1, website: 1 } }
      );
      return {
        kind: 'updated',
        settings: providerSettingsData(result as Row | undefined, owner.phone, owner.fallback)
      };
    }
  };
}
