import type { Connection } from 'mongoose';
import {
  databaseIndexDefinitionSchema,
  databaseIndexRolloutResultSchema,
  type DatabaseIndexDefinition,
  type DatabaseIndexRolloutResult
} from '@sadat-real-estate/contracts';
import type { AppEnvironment } from '../config/environment.js';
import { resolveDatabaseIndexPolicy } from './index-policy.js';
import { PROPERTY_INDEX_CATALOG } from '../performance/property-indexes.js';
import { propertySchema } from '../properties/models.js';

export interface IndexRolloutAdapter {
  listIndexes(collection: string): Promise<readonly { name?: string; key: Record<string, unknown> }[]>;
  createIndex(collection: string, definition: DatabaseIndexDefinition): Promise<void>;
}

export interface IndexRolloutOptions {
  readonly environment: AppEnvironment;
  readonly mode?: 'plan' | 'apply';
  readonly confirm?: boolean;
}

export class DatabaseIndexRolloutError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DatabaseIndexRolloutError';
    this.code = code;
  }
}

function stableKey(key: Record<string, unknown>): string {
  return JSON.stringify(Object.entries(key).sort(([left], [right]) => left.localeCompare(right)));
}

export function validateIndexDefinitions(
  definitions: readonly DatabaseIndexDefinition[]
): readonly DatabaseIndexDefinition[] {
  const parsed = definitions.map((definition) => databaseIndexDefinitionSchema.parse(definition));
  const names = new Set<string>();
  for (const definition of parsed) {
    const identity = `${definition.collection}:${definition.name}`;
    if (names.has(identity)) throw new DatabaseIndexRolloutError('INDEX_DEFINITION_DUPLICATE', `Index ${identity} is declared more than once`);
    names.add(identity);
  }
  return Object.freeze([...parsed].sort((left, right) => `${left.collection}:${left.name}`.localeCompare(`${right.collection}:${right.name}`)));
}

export function buildPropertyIndexRolloutPlan(): readonly DatabaseIndexDefinition[] {
  const catalogNames = new Set(PROPERTY_INDEX_CATALOG.map((entry) => entry.name));
  return validateIndexDefinitions(propertySchema.indexes().flatMap(([key, options]) => {
    const name = typeof options.name === 'string' ? options.name : undefined;
    if (!name || !catalogNames.has(name)) return [];
    const indexOptions: { unique?: boolean; sparse?: boolean } = {};
    if (options.unique === true) indexOptions.unique = true;
    if (options.sparse === true) indexOptions.sparse = true;
    return [databaseIndexDefinitionSchema.parse({ collection: 'properties', name, key, ...(Object.keys(indexOptions).length > 0 ? { options: indexOptions } : {}) })];
  }));
}

export function createMongooseIndexRolloutAdapter(connection: Connection): IndexRolloutAdapter {
  if (!connection.db) throw new DatabaseIndexRolloutError('INDEX_DATABASE_UNAVAILABLE', 'Database connection is not ready');
  return {
    async listIndexes(collectionName) {
      const rows = await connection.db!.collection(collectionName).listIndexes().toArray();
      return rows.map((row) => ({ name: typeof row.name === 'string' ? row.name : undefined, key: { ...(row.key ?? {}) } }));
    },
    async createIndex(collectionName, definition) {
      const options: { name: string; unique?: boolean; sparse?: boolean; background?: boolean } = { name: definition.name };
      if (definition.options?.unique !== undefined) options.unique = definition.options.unique;
      if (definition.options?.sparse !== undefined) options.sparse = definition.options.sparse;
      if (definition.options?.background !== undefined) options.background = definition.options.background;
      await connection.db!.collection(collectionName).createIndex(
        definition.key as never,
        options
      );
    }
  };
}

export function planIndexRollout(
  definitions: readonly DatabaseIndexDefinition[],
  options: IndexRolloutOptions
): DatabaseIndexRolloutResult {
  validateIndexDefinitions(definitions);
  return databaseIndexRolloutResultSchema.parse({
    status: 'planned',
    mode: resolveDatabaseIndexPolicy(options.environment).mode,
    created: [],
    alreadyPresent: []
  });
}

export async function applyIndexRollout(
  definitions: readonly DatabaseIndexDefinition[],
  options: IndexRolloutOptions,
  adapter: IndexRolloutAdapter
): Promise<DatabaseIndexRolloutResult> {
  const validated = validateIndexDefinitions(definitions);
  const policy = resolveDatabaseIndexPolicy(options.environment);
  if (options.mode !== 'apply') return planIndexRollout(validated, options);
  if (options.confirm !== true) {
    return databaseIndexRolloutResultSchema.parse({
      status: 'blocked',
      mode: policy.mode,
      created: [],
      alreadyPresent: [],
      reason: 'INDEX_ROLLOUT_CONFIRMATION_REQUIRED'
    });
  }

  const existingByCollection = new Map<string, Map<string, Record<string, unknown>>>();
  for (const collection of new Set(validated.map((definition) => definition.collection))) {
    const indexes = await adapter.listIndexes(collection);
    existingByCollection.set(collection, new Map(indexes.flatMap((index) => index.name ? [[index.name, index.key] as const] : [])));
  }

  const created: string[] = [];
  const alreadyPresent: string[] = [];
  for (const definition of validated) {
    const existing = existingByCollection.get(definition.collection)?.get(definition.name);
    if (existing) {
      if (stableKey(existing) !== stableKey(definition.key)) {
        throw new DatabaseIndexRolloutError('INDEX_DEFINITION_MISMATCH', `Existing index ${definition.collection}:${definition.name} has a different key`);
      }
      alreadyPresent.push(definition.name);
      continue;
    }
    await adapter.createIndex(definition.collection, definition);
    created.push(definition.name);
  }

  return databaseIndexRolloutResultSchema.parse({
    status: 'applied',
    mode: policy.mode,
    created,
    alreadyPresent
  });
}
