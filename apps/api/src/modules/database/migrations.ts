import type { Connection } from 'mongoose';
import {
  databaseMigrationRecordSchema,
  databaseMigrationSchema,
  type DatabaseMigration,
  type DatabaseMigrationRecord
} from '@sadat-real-estate/contracts';
import type { AppEnvironment } from '../config/environment.js';

export interface DatabaseMigrationContext {
  readonly connection: Connection;
  readonly migration: DatabaseMigration;
  readonly now: Date;
}

export interface DatabaseMigrationDefinition extends DatabaseMigration {
  up(context: DatabaseMigrationContext): Promise<void>;
}

export interface DatabaseMigrationLedger {
  listApplied(): Promise<readonly DatabaseMigrationRecord[]>;
  markApplied(record: DatabaseMigrationRecord): Promise<void>;
}

export type MigrationRunMode = 'plan' | 'apply';

export interface MigrationRunOptions {
  readonly environment: AppEnvironment;
  readonly mode?: MigrationRunMode;
  readonly confirm?: boolean;
  readonly now?: Date;
  readonly ledger?: DatabaseMigrationLedger;
}

export interface MigrationRunResult {
  readonly status: 'planned' | 'applied';
  readonly mode: MigrationRunMode;
  readonly environment: AppEnvironment;
  readonly pending: readonly DatabaseMigration[];
  readonly applied: readonly DatabaseMigrationRecord[];
}

export class DatabaseMigrationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DatabaseMigrationError';
    this.code = code;
  }
}

function toIsoDate(value: Date): string {
  if (Number.isNaN(value.getTime())) throw new DatabaseMigrationError('MIGRATION_TIME_INVALID', 'Migration timestamp is invalid');
  return value.toISOString();
}

export function validateMigrationDefinitions(
  definitions: readonly DatabaseMigrationDefinition[]
): readonly DatabaseMigrationDefinition[] {
  const parsed = definitions.map((definition) => {
    databaseMigrationSchema.parse({
      id: definition.id,
      version: definition.version,
      checksum: definition.checksum,
      description: definition.description
    });
    if (typeof definition.up !== 'function') throw new DatabaseMigrationError('MIGRATION_HANDLER_INVALID', `Migration ${definition.id} has no executable handler`);
    return definition;
  }).sort((left, right) => left.version - right.version);

  const ids = new Set<string>();
  const versions = new Set<number>();
  for (const definition of parsed) {
    if (ids.has(definition.id)) throw new DatabaseMigrationError('MIGRATION_ID_DUPLICATE', `Migration ${definition.id} is declared more than once`);
    if (versions.has(definition.version)) throw new DatabaseMigrationError('MIGRATION_VERSION_DUPLICATE', `Migration version ${definition.version} is declared more than once`);
    ids.add(definition.id);
    versions.add(definition.version);
  }
  return Object.freeze(parsed);
}

export function createMongooseMigrationLedger(connection: Connection): DatabaseMigrationLedger {
  if (!connection.db) throw new DatabaseMigrationError('MIGRATION_DATABASE_UNAVAILABLE', 'Database connection is not ready');
  const collection = connection.db.collection<{
    id: string;
    version: number;
    checksum: string;
    description: string;
    appliedAt: Date;
  }>('database_migrations');
  let indexPromise: Promise<unknown> | undefined;
  const ensureIndex = (): Promise<unknown> => {
    indexPromise ??= collection.createIndex({ id: 1 }, { unique: true, name: 'database_migrations_id_unique' });
    return indexPromise;
  };
  return {
    async listApplied() {
      await ensureIndex();
      const rows = await collection.find({}).sort({ version: 1 }).toArray();
      return rows.map((row) => databaseMigrationRecordSchema.parse({
        id: row.id,
        version: row.version,
        checksum: row.checksum,
        description: row.description,
        appliedAt: new Date(row.appliedAt).toISOString()
      }));
    },
    async markApplied(record) {
      await ensureIndex();
      await collection.updateOne(
        { id: record.id },
        { $setOnInsert: { ...record, appliedAt: new Date(record.appliedAt) } },
        { upsert: true }
      );
    }
  };
}

function resolveLedger(connection: Connection, ledger: DatabaseMigrationLedger | undefined): DatabaseMigrationLedger {
  return ledger ?? createMongooseMigrationLedger(connection);
}

export async function runMigrations(
  connection: Connection,
  definitions: readonly DatabaseMigrationDefinition[],
  options: MigrationRunOptions
): Promise<MigrationRunResult> {
  const mode = options.mode ?? 'plan';
  const migrations = validateMigrationDefinitions(definitions);
  const ledger = resolveLedger(connection, options.ledger);
  const appliedRows = await ledger.listApplied();
  const definitionsById = new Map(migrations.map((migration) => [migration.id, migration]));
  const appliedIds = new Set<string>();

  for (const applied of appliedRows) {
    const definition = definitionsById.get(applied.id);
    if (!definition) throw new DatabaseMigrationError('MIGRATION_LEDGER_UNKNOWN', `Applied migration ${applied.id} is not present in the runner`);
    if (definition.version !== applied.version || definition.checksum !== applied.checksum) {
      throw new DatabaseMigrationError('MIGRATION_CHECKSUM_MISMATCH', `Applied migration ${applied.id} does not match the checked-in checksum`);
    }
    appliedIds.add(applied.id);
  }

  const pending = migrations.filter((migration) => !appliedIds.has(migration.id));
  if (mode === 'plan') {
    return { status: 'planned', mode, environment: options.environment, pending, applied: appliedRows };
  }
  if (options.confirm !== true) {
    throw new DatabaseMigrationError('MIGRATION_CONFIRMATION_REQUIRED', 'Applying migrations requires explicit confirmation');
  }

  const applied: DatabaseMigrationRecord[] = [...appliedRows];
  for (const migration of pending) {
    const now = options.now ?? new Date();
    try {
      await migration.up({ connection, migration, now });
    } catch {
      throw new DatabaseMigrationError('MIGRATION_FAILED', `Migration ${migration.id} failed`);
    }
    const record = databaseMigrationRecordSchema.parse({
      id: migration.id,
      version: migration.version,
      checksum: migration.checksum,
      description: migration.description,
      appliedAt: toIsoDate(now)
    });
    await ledger.markApplied(record);
    applied.push(record);
  }
  return { status: 'applied', mode, environment: options.environment, pending: [], applied };
}
