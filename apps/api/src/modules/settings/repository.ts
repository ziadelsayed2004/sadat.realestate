import { Types, type Connection } from 'mongoose';
import {
  adminSettingsDataSchema,
  adminSettingsNamespaceSchema,
  adminSettingsValuesSchema,
  type AdminSettingsData,
  type AdminSettingsNamespace
} from '@sadat-realestate/contracts';
import type { SettingsRepository, SettingsWriteResult } from './service.js';

type Row = Record<string, unknown>;

function id(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && typeof (value as { toHexString?: () => string }).toHexString === 'function') {
    return (value as { toHexString: () => string }).toHexString();
  }
  return undefined;
}

function output(row: Row): AdminSettingsData | undefined {
  const settingId = id(row.updatedBy);
  if (typeof row.namespace !== 'string' || typeof row.schemaVersion !== 'number' || typeof row.version !== 'number' || !settingId || !(row.updatedAt instanceof Date)) return undefined;
  const parsedNamespace = adminSettingsNamespaceSchema.safeParse(row.namespace);
  const parsedValues = adminSettingsValuesSchema.safeParse(row.values);
  if (!parsedNamespace.success || !parsedValues.success) return undefined;
  const parsed = adminSettingsDataSchema.safeParse({
    namespace: parsedNamespace.data,
    schemaVersion: row.schemaVersion,
    values: parsedValues.data,
    version: row.version,
    updatedBy: settingId,
    updatedAt: row.updatedAt.toISOString()
  });
  return parsed.success ? parsed.data : undefined;
}

export function createMongooseSettingsRepository(connection: Connection): SettingsRepository {
  const settings = connection.collection('admin_settings');
  let indexesReady: Promise<unknown> | undefined;
  function ensureIndexes(): Promise<unknown> {
    indexesReady ??= settings.createIndex({ namespace: 1 }, { name: 'admin_settings_namespace', unique: true });
    return indexesReady;
  }

  return {
    async find(namespace: AdminSettingsNamespace) {
      await ensureIndexes();
      const row = await settings.findOne({ namespace }, { projection: { _id: 0, namespace: 1, schemaVersion: 1, values: 1, version: 1, updatedBy: 1, updatedAt: 1 } });
      return row ? output(row as Row) : undefined;
    },

    async upsert(input): Promise<SettingsWriteResult> {
      await ensureIndexes();
      const before = await settings.findOne({ namespace: input.namespace });
      if (!before) {
        if (input.expectedVersion !== 0) return { kind: 'version_conflict' };
        try {
          await settings.insertOne({
            namespace: input.namespace,
            schemaVersion: input.data.schemaVersion,
            values: input.data.values,
            version: 0,
            updatedBy: new Types.ObjectId(input.actorId),
            updatedAt: new Date(input.now)
          });
        } catch (error) {
          if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) return { kind: 'version_conflict' };
          throw error;
        }
        const created = await settings.findOne({ namespace: input.namespace });
        const setting = created ? output(created as Row) : undefined;
        if (!setting) throw new Error('SETTINGS_RECORD_INVALID');
        return { kind: 'created', setting };
      }
      const updatedAt = new Date(input.now);
      const result = await settings.findOneAndUpdate(
        { namespace: input.namespace, version: input.expectedVersion },
        { $set: { schemaVersion: input.data.schemaVersion, values: input.data.values, updatedBy: new Types.ObjectId(input.actorId), updatedAt }, $inc: { version: 1 } },
        { returnDocument: 'after' }
      );
      if (!result) return { kind: 'version_conflict' };
      const setting = output(result as Row);
      if (!setting) throw new Error('SETTINGS_RECORD_INVALID');
      return { kind: 'updated', setting };
    }
  };
}
