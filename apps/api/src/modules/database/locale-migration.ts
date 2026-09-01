import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose, { type Connection } from 'mongoose';
import type { AppEnvironment } from '../config/environment.js';

export const LOCALE_MIGRATION_ID = 'ar-en-only-localized-fields-v1';
export const RETIRED_LOCALE = 'zh-CN';
export const CANONICAL_LOCALES = Object.freeze(['ar', 'en'] as const);

type PlainRecord = Record<string, unknown>;

interface LocaleCursor<T> {
  toArray(): Promise<readonly T[]>;
}

interface LocaleCollection {
  find(filter?: unknown, options?: unknown): LocaleCursor<PlainRecord>;
  countDocuments(filter?: unknown): Promise<number>;
  updateMany(filter: unknown, update: unknown, options?: unknown): Promise<{ matchedCount: number; modifiedCount: number }>;
  listIndexes(): LocaleCursor<PlainRecord>;
  createIndex(keys: Record<string, unknown>, options?: PlainRecord): Promise<string>;
  dropIndex(name: string): Promise<unknown>;
  insertMany(documents: readonly PlainRecord[], options?: PlainRecord): Promise<unknown>;
}

interface LocaleDatabase {
  databaseName: string;
  listCollections(filter?: unknown, options?: unknown): LocaleCursor<{ name: string }>;
  collection(name: string): LocaleCollection;
  createCollection?(name: string): Promise<LocaleCollection>;
  command?(command: PlainRecord): Promise<PlainRecord>;
  admin(): { command(command: PlainRecord): Promise<PlainRecord> };
}

interface EjsonCodec {
  stringify(value: unknown, options?: { relaxed?: boolean }): string;
  parse(value: string, options?: { relaxed?: boolean }): unknown;
}

const EJSON_CODEC = (mongoose.mongo as unknown as { BSON: { EJSON: EjsonCodec } }).BSON.EJSON;

export const LOCALIZED_FIELD_ALLOWLIST: Readonly<Record<string, readonly string[]>> = Object.freeze({
  article_categories: ['name', 'description'],
  articles: ['title', 'body'],
  cms_about_blocks: ['title', 'body'],
  cms_banners: ['title', 'eyebrow', 'body', 'highlight'],
  cms_homepage_metrics: ['title', 'unit'],
  cms_homepage_sections: ['title', 'body'],
  cms_population_values: ['sourceLabel'],
  cms_real_estate_tips: ['title', 'body'],
  features_services: ['name', 'detail', 'distanceLabel'],
  locations: ['name'],
  notifications: ['title', 'message'],
  organizations: ['name', 'description'],
  projects: ['name', 'description'],
  properties: ['name', 'description'],
  property_taxonomy: ['name']
});

export const PREFERRED_LOCALE_ALLOWLIST: Readonly<Record<string, readonly string[]>> = Object.freeze({
  users: ['locale'],
  provider_applications: ['preferredLocale'],
  properties: ['contact.preferredLocale']
});

export interface TextIndexDefinition {
  readonly collection: string;
  readonly name: string;
  readonly weights: Readonly<Record<string, number>>;
  readonly defaultLanguage: 'none' | 'english';
}

export const TEXT_INDEX_DEFINITIONS: readonly TextIndexDefinition[] = Object.freeze([
  { collection: 'article_categories', name: 'article_category_localized_search', weights: { 'name.ar': 1, 'name.en': 1, 'description.ar': 1, 'description.en': 1 }, defaultLanguage: 'none' },
  { collection: 'articles', name: 'article_localized_search', weights: { 'title.ar': 1, 'title.en': 1, 'body.ar': 1, 'body.en': 1 }, defaultLanguage: 'none' },
  { collection: 'features_services', name: 'features_name_search', weights: { 'name.ar': 1, 'name.en': 1 }, defaultLanguage: 'none' },
  { collection: 'locations', name: 'locations_localized_name_search', weights: { 'name.ar': 1, 'name.en': 1 }, defaultLanguage: 'none' },
  { collection: 'projects', name: 'projects_name_search', weights: { 'name.ar': 1, 'name.en': 1 }, defaultLanguage: 'none' },
  { collection: 'properties', name: 'properties_search_text', weights: { 'name.ar': 3, 'name.en': 3, slug: 5 }, defaultLanguage: 'english' },
  { collection: 'property_taxonomy', name: 'property_taxonomy_name_search', weights: { 'name.ar': 1, 'name.en': 1 }, defaultLanguage: 'none' }
]);

export interface LocaleCounters {
  readonly recordsWithValidArAndEn: number;
  readonly recordsWithAnyValidArOrEn: number;
  readonly recordsWithRetiredLocale: number;
  readonly recordsWithRetiredLocaleAndAnyArOrEn: number;
  readonly recordsWithRetiredLocaleAndNeitherArNorEn: number;
  readonly recordsWithRetiredLocaleAndArEn: number;
  readonly recordsWithRetiredLocaleOnly: number;
  readonly recordsWithRetiredFieldWithoutValue: number;
  readonly recordsWithRetiredPreferredLocale: number;
  readonly recordsWithLocalizedObjectButNoArOrEn: number;
  readonly localizedObjectCount: number;
}

export interface IndexSnapshot {
  readonly name: string;
  readonly key: PlainRecord;
  readonly unique?: boolean;
  readonly sparse?: boolean;
  readonly expireAfterSeconds?: number;
  readonly partialFilterExpression?: PlainRecord;
  readonly weights?: Readonly<Record<string, number>>;
  readonly default_language?: string;
}

export interface LocaleCollectionReport {
  readonly collection: string;
  readonly exists: boolean;
  readonly totalDocuments: number;
  readonly counters: LocaleCounters;
  readonly retiredFieldPaths: readonly string[];
  readonly preferredLocalePaths: readonly string[];
  readonly indexes: readonly IndexSnapshot[];
  readonly localeIndexCandidates: readonly {
    name: string;
    present: boolean;
    arEnWeights: boolean;
  }[];
}

export interface LocaleInspectionReport {
  readonly schemaVersion: 1;
  readonly migrationId: typeof LOCALE_MIGRATION_ID;
  readonly database: string;
  readonly topology: ReplicaSetSummary;
  readonly activeLocales: readonly ['ar', 'en'];
  readonly retiredLocales: readonly ['zh-CN'];
  readonly collectionReports: readonly LocaleCollectionReport[];
  readonly aggregateCounters: LocaleCounters;
  readonly retiredFieldPathsObserved: readonly string[];
  readonly localeIndexCandidatesObserved: readonly string[];
  readonly noRecordIdsOrPiiEmitted: true;
}

export interface ReplicaSetSummary {
  readonly setName: string;
  readonly primary: string;
  readonly isWritablePrimary: boolean;
  readonly host: string;
  readonly port: number;
}

export interface BackupResult {
  readonly backupId: string;
  readonly archivePath: string;
  readonly checksumPath: string;
  readonly sha256: string;
  readonly collectionCount: number;
  readonly documentCount: number;
  readonly sourceDatabase: string;
}

export interface RestoreResult {
  readonly status: 'verified' | 'failed';
  readonly restoreDatabase: string;
  readonly archiveSha256: string;
  readonly collectionCount: number;
  readonly documentCount: number;
  readonly collectionCountMismatch: number;
  readonly documentCountMismatch: number;
  readonly indexDefinitionMismatch: number;
}

export interface IndexMigrationAction {
  readonly collection: string;
  readonly name: string;
  readonly action: 'created' | 'rebuilt' | 'unchanged';
}

export interface LocaleIndexExplainResult {
  readonly collection: string;
  readonly expectedIndexName: string;
  readonly plannerStage: string;
  readonly winningIndexName: string;
  readonly executionTimeMillis: number;
  readonly totalKeysExamined: number;
  readonly totalDocsExamined: number;
  readonly verified: boolean;
}

export interface LocaleMigrationResult {
  readonly status: 'planned' | 'applied';
  readonly migrationId: typeof LOCALE_MIGRATION_ID;
  readonly environment: AppEnvironment;
  readonly before: LocaleInspectionReport;
  readonly after?: LocaleInspectionReport;
  readonly localizedFieldMatched: number;
  readonly localizedFieldModified: number;
  readonly preferredLocaleMatched: number;
  readonly preferredLocaleModified: number;
  readonly indexActions: readonly IndexMigrationAction[];
  readonly indexExplain: readonly LocaleIndexExplainResult[];
  readonly idempotentReplayReady: boolean;
}

export class LocaleMigrationError extends Error {
  readonly code: string;
  readonly report: LocaleInspectionReport | undefined;

  constructor(code: string, message: string, report?: LocaleInspectionReport) {
    super(message);
    this.name = 'LocaleMigrationError';
    this.code = code;
    this.report = report;
  }
}

export class LocaleMigrationBlockedError extends LocaleMigrationError {
  constructor(report: LocaleInspectionReport) {
    super(
      'LOCALE_MIGRATION_BLOCKED_ORPHANS',
      'Locale migration is blocked because one or more localized records lack valid Arabic and English values',
      report
    );
    this.name = 'LocaleMigrationBlockedError';
  }
}

function asDatabase(connection: Connection): LocaleDatabase {
  if (!connection.db) throw new LocaleMigrationError('DATABASE_UNAVAILABLE', 'Database connection is not ready');
  return connection.db as unknown as LocaleDatabase;
}

function nestedValue(value: PlainRecord, fieldPath: string): unknown {
  return fieldPath.split('.').reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as PlainRecord)[part];
  }, value);
}

function validText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isLocalizedObject(value: unknown): value is PlainRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function emptyCounters(): LocaleCounters {
  return {
    recordsWithValidArAndEn: 0,
    recordsWithAnyValidArOrEn: 0,
    recordsWithRetiredLocale: 0,
    recordsWithRetiredLocaleAndAnyArOrEn: 0,
    recordsWithRetiredLocaleAndNeitherArNorEn: 0,
    recordsWithRetiredLocaleAndArEn: 0,
    recordsWithRetiredLocaleOnly: 0,
    recordsWithRetiredFieldWithoutValue: 0,
    recordsWithRetiredPreferredLocale: 0,
    recordsWithLocalizedObjectButNoArOrEn: 0,
    localizedObjectCount: 0
  };
}

function addCounters(target: Record<keyof LocaleCounters, number>, source: LocaleCounters): void {
  for (const key of Object.keys(target) as (keyof LocaleCounters)[]) target[key] += source[key];
}

function sanitizedIndex(raw: PlainRecord): IndexSnapshot | undefined {
  if (typeof raw.name !== 'string' || !raw.key || typeof raw.key !== 'object') return undefined;
  const output: PlainRecord = { name: raw.name, key: { ...(raw.key as PlainRecord) } };
  for (const key of ['unique', 'sparse', 'expireAfterSeconds', 'default_language'] as const) {
    if (raw[key] !== undefined) output[key] = raw[key];
  }
  if (raw.partialFilterExpression && typeof raw.partialFilterExpression === 'object') {
    output.partialFilterExpression = structuredClone(raw.partialFilterExpression);
  }
  if (raw.weights && typeof raw.weights === 'object') output.weights = { ...(raw.weights as Record<string, number>) };
  return output as unknown as IndexSnapshot;
}

function expectedWeights(definition: TextIndexDefinition): Record<string, number> {
  return { ...definition.weights };
}

function sameWeights(actual: Readonly<Record<string, number>> | undefined, expected: Readonly<Record<string, number>>): boolean {
  if (!actual) return false;
  const left = Object.entries(actual).sort(([a], [b]) => a.localeCompare(b));
  const right = Object.entries(expected).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(left) === JSON.stringify(right);
}

function collectionNames(db: LocaleDatabase): Promise<readonly string[]> {
  return db.listCollections({}, { nameOnly: true }).toArray().then((rows) => rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === 'string' && !name.startsWith('system.'))
    .sort((left, right) => left.localeCompare(right)));
}

function reportForMissingCollection(collection: string): LocaleCollectionReport {
  return {
    collection,
    exists: false,
    totalDocuments: 0,
    counters: emptyCounters(),
    retiredFieldPaths: [],
    preferredLocalePaths: [],
    indexes: [],
    localeIndexCandidates: TEXT_INDEX_DEFINITIONS
      .filter((definition) => definition.collection === collection)
      .map(({ name }) => ({ name, present: false, arEnWeights: false }))
  };
}

async function inspectCollection(db: LocaleDatabase, collection: string): Promise<LocaleCollectionReport> {
  const names = await collectionNames(db);
  if (!names.includes(collection)) return reportForMissingCollection(collection);
  const fields = LOCALIZED_FIELD_ALLOWLIST[collection] ?? [];
  const preferredFields = PREFERRED_LOCALE_ALLOWLIST[collection] ?? [];
  const projection: PlainRecord = {};
  for (const field of fields) projection[field.split('.')[0]!] = 1;
  for (const field of preferredFields) projection[field.split('.')[0]!] = 1;
  const counters = emptyCounters() as Record<keyof LocaleCounters, number>;
  const retiredFieldPaths = new Set<string>();
  const preferredLocalePaths = new Set<string>();
  const documents = await db.collection(collection).find({}, { projection }).toArray();
  for (const document of documents) {
    let recordHasLocalizedObject = false;
    let recordHasRetired = false;
    let recordHasAr = false;
    let recordHasEn = false;
    let recordHasRetiredOnly = false;
    for (const field of fields) {
      const localized = nestedValue(document, field);
      if (!isLocalizedObject(localized)) continue;
      recordHasLocalizedObject = true;
      counters.localizedObjectCount += 1;
      const ar = validText(localized.ar);
      const en = validText(localized.en);
      const retired = validText(localized[RETIRED_LOCALE]);
      recordHasAr ||= ar;
      recordHasEn ||= en;
      if (retired) {
        recordHasRetired = true;
        retiredFieldPaths.add(`$.${field}.${RETIRED_LOCALE}`);
      } else if (localized[RETIRED_LOCALE] !== undefined) {
        counters.recordsWithRetiredFieldWithoutValue += 1;
      }
      if (retired && !ar && !en) recordHasRetiredOnly = true;
    }
    for (const field of preferredFields) {
      if (nestedValue(document, field) === RETIRED_LOCALE) {
        counters.recordsWithRetiredPreferredLocale += 1;
        preferredLocalePaths.add(`$.${field}`);
      }
    }
    if (recordHasAr && recordHasEn) counters.recordsWithValidArAndEn += 1;
    if (recordHasAr || recordHasEn) counters.recordsWithAnyValidArOrEn += 1;
    if (recordHasLocalizedObject && !recordHasAr && !recordHasEn) counters.recordsWithLocalizedObjectButNoArOrEn += 1;
    if (recordHasRetired) {
      counters.recordsWithRetiredLocale += 1;
      if (recordHasAr || recordHasEn) counters.recordsWithRetiredLocaleAndAnyArOrEn += 1;
      if (!recordHasAr && !recordHasEn) counters.recordsWithRetiredLocaleAndNeitherArNorEn += 1;
      if (recordHasAr && recordHasEn) counters.recordsWithRetiredLocaleAndArEn += 1;
      if (recordHasRetiredOnly) counters.recordsWithRetiredLocaleOnly += 1;
    }
  }
  const indexes = (await db.collection(collection).listIndexes().toArray()).flatMap((raw) => {
    const index = sanitizedIndex(raw);
    return index ? [index] : [];
  });
  const localeIndexCandidates = TEXT_INDEX_DEFINITIONS
    .filter((definition) => definition.collection === collection)
    .map((definition) => {
      const index = indexes.find(({ name }) => name === definition.name);
      return { name: definition.name, present: Boolean(index), arEnWeights: sameWeights(index?.weights, expectedWeights(definition)) };
    });
  return {
    collection,
    exists: true,
    totalDocuments: documents.length,
    counters,
    retiredFieldPaths: [...retiredFieldPaths].sort(),
    preferredLocalePaths: [...preferredLocalePaths].sort(),
    indexes,
    localeIndexCandidates
  };
}

export async function inspectLocaleDatabase(db: LocaleDatabase): Promise<LocaleInspectionReport> {
  const targetCollections = new Set([...Object.keys(LOCALIZED_FIELD_ALLOWLIST), ...Object.keys(PREFERRED_LOCALE_ALLOWLIST)]);
  const collectionReports = await Promise.all([...targetCollections].sort().map((collection) => inspectCollection(db, collection)));
  const aggregate = emptyCounters() as Record<keyof LocaleCounters, number>;
  for (const report of collectionReports) addCounters(aggregate, report.counters);
  return {
    schemaVersion: 1,
    migrationId: LOCALE_MIGRATION_ID,
    database: db.databaseName,
    topology: { setName: 'unverified', primary: 'unverified', isWritablePrimary: false, host: 'unverified', port: 0 },
    activeLocales: ['ar', 'en'],
    retiredLocales: [RETIRED_LOCALE],
    collectionReports,
    aggregateCounters: aggregate,
    retiredFieldPathsObserved: [...new Set(collectionReports.flatMap(({ retiredFieldPaths }) => retiredFieldPaths))].sort(),
    localeIndexCandidatesObserved: [...new Set(collectionReports.flatMap(({ localeIndexCandidates }) => localeIndexCandidates.filter(({ present }) => present).map(({ name }) => name)))].sort(),
    noRecordIdsOrPiiEmitted: true
  };
}

export async function getReplicaSetSummary(connection: Connection): Promise<ReplicaSetSummary> {
  const db = asDatabase(connection);
  const hello = await db.admin().command({ hello: 1 });
  const host = String(connection.host ?? '');
  const port = Number(connection.port ?? 0);
  const primary = typeof hello.primary === 'string' ? hello.primary : 'unknown';
  return {
    setName: typeof hello.setName === 'string' ? hello.setName : 'unknown',
    primary,
    isWritablePrimary: hello.isWritablePrimary === true || hello.ismaster === true,
    host,
    port
  };
}

export async function assertIsolatedReplicaSet(connection: Connection, environment: AppEnvironment): Promise<ReplicaSetSummary> {
  if (environment === 'production' || environment === 'preview') {
    throw new LocaleMigrationError('NON_PRODUCTION_REQUIRED', 'Locale migration is limited to local or isolated UAT databases');
  }
  const summary = await getReplicaSetSummary(connection);
  if (summary.setName !== 'rs0' || !summary.isWritablePrimary) {
    throw new LocaleMigrationError('REPLICA_SET_REQUIRED', 'A writable rs0 replica-set primary is required');
  }
  if (!['127.0.0.1', 'localhost', '::1'].includes(summary.host)) {
    throw new LocaleMigrationError('LOOPBACK_DATABASE_REQUIRED', 'Only a loopback MongoDB target is allowed for this task');
  }
  if (summary.port === 0) throw new LocaleMigrationError('DATABASE_PORT_UNAVAILABLE', 'The isolated MongoDB port could not be verified');
  return summary;
}

export async function inspectLocaleState(connection: Connection, environment: AppEnvironment): Promise<LocaleInspectionReport> {
  const topology = await assertIsolatedReplicaSet(connection, environment);
  const report = await inspectLocaleDatabase(asDatabase(connection));
  return { ...report, topology };
}

function assertExternalArchivePath(archivePath: string): string {
  const absolute = path.resolve(archivePath);
  const relative = path.relative(path.resolve(process.cwd()), absolute);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new LocaleMigrationError('BACKUP_MUST_BE_EXTERNAL', 'The locale backup must be outside the repository');
  }
  return absolute;
}

function safeBackupId(value: string): string {
  if (!/^backend151-[a-zA-Z0-9_-]{1,80}$/u.test(value)) throw new LocaleMigrationError('BACKUP_ID_INVALID', 'Backup id is invalid');
  return value;
}

function archiveHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

interface BackupPayload {
  readonly schemaVersion: 1;
  readonly backupId: string;
  readonly sourceDatabase: string;
  readonly capturedAt: string;
  readonly collections: readonly {
    name: string;
    documents: readonly PlainRecord[];
    indexes: readonly IndexSnapshot[];
  }[];
}

async function readBackupPayload(archivePath: string): Promise<{ payload: BackupPayload; content: string; sha256: string }> {
  const absolute = assertExternalArchivePath(archivePath);
  const content = await readFile(absolute, 'utf8');
  const sha256 = archiveHash(content);
  const parsed = EJSON_CODEC.parse(content, { relaxed: true });
  if (!parsed || typeof parsed !== 'object') throw new LocaleMigrationError('BACKUP_INVALID', 'Backup archive is not a valid object');
  const payload = parsed as BackupPayload;
  if (payload.schemaVersion !== 1 || typeof payload.backupId !== 'string' || !Array.isArray(payload.collections)) {
    throw new LocaleMigrationError('BACKUP_INVALID', 'Backup archive schema is invalid');
  }
  return { payload, content, sha256 };
}

export async function createLocaleBackup(
  connection: Connection,
  archivePath: string,
  backupId: string,
  environment: AppEnvironment
): Promise<BackupResult> {
  await assertIsolatedReplicaSet(connection, environment);
  const absolute = assertExternalArchivePath(archivePath);
  const id = safeBackupId(backupId);
  const db = asDatabase(connection);
  const names = await collectionNames(db);
  const collections: BackupPayload['collections'][number][] = [];
  let documentCount = 0;
  for (const name of names) {
    const collection = db.collection(name);
    const documents = await collection.find({}).toArray();
    const indexes = (await collection.listIndexes().toArray()).flatMap((raw) => {
      const index = sanitizedIndex(raw);
      return index ? [index] : [];
    });
    collections.push({ name, documents, indexes });
    documentCount += documents.length;
  }
  const payload: BackupPayload = {
    schemaVersion: 1,
    backupId: id,
    sourceDatabase: db.databaseName,
    capturedAt: new Date().toISOString(),
    collections
  };
  const content = EJSON_CODEC.stringify(payload, { relaxed: false });
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
  const sha256 = archiveHash(content);
  const checksumPath = `${absolute}.sha256`;
  await writeFile(checksumPath, `${sha256}  ${path.basename(absolute)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { backupId: id, archivePath: absolute, checksumPath, sha256, collectionCount: collections.length, documentCount, sourceDatabase: db.databaseName };
}

function indexOptions(index: IndexSnapshot, name: string, weights?: Readonly<Record<string, number>>): PlainRecord {
  const options: PlainRecord = { name };
  for (const key of ['unique', 'sparse', 'expireAfterSeconds', 'partialFilterExpression'] as const) {
    if (index[key] !== undefined) options[key] = index[key];
  }
  if (weights) {
    options.weights = { ...weights };
    options.default_language = index.default_language ?? 'none';
  }
  return options;
}

function textIndexKeys(weights: Readonly<Record<string, number>>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(weights).map((field) => [field, 'text']));
}

async function restoreIndex(collection: LocaleCollection, index: IndexSnapshot): Promise<void> {
  const isText = Boolean(index.weights) || index.key._fts === 'text';
  if (isText) {
    const weights = index.weights ?? {};
    if (Object.keys(weights).length === 0) throw new LocaleMigrationError('BACKUP_TEXT_INDEX_INVALID', `Text index ${index.name} has no weights`);
    await collection.createIndex(textIndexKeys(weights), indexOptions(index, index.name, weights));
    return;
  }
  if (Object.keys(index.key).length > 0) await collection.createIndex({ ...index.key }, indexOptions(index, index.name));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as PlainRecord).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
}

function indexSignature(index: IndexSnapshot): string {
  return JSON.stringify(stableValue(index));
}

export async function restoreLocaleBackup(
  connection: Connection,
  archivePath: string,
  restoreDatabase: string,
  environment: AppEnvironment
): Promise<RestoreResult> {
  await assertIsolatedReplicaSet(connection, environment);
  if (!/^backend151_(?:restore|rollback)_[a-zA-Z0-9_-]{1,60}$/u.test(restoreDatabase)) {
    throw new LocaleMigrationError('RESTORE_DATABASE_INVALID', 'Restore database must be a fresh backend151 restore or rollback target');
  }
  const { payload, sha256 } = await readBackupPayload(archivePath);
  if (payload.sourceDatabase === restoreDatabase) throw new LocaleMigrationError('RESTORE_SOURCE_TARGET_EQUAL', 'Restore target must differ from the source database');
  const client = connection.getClient();
  const target = client.db(restoreDatabase) as unknown as LocaleDatabase;
  await (target as LocaleDatabase & { dropDatabase(): Promise<boolean> }).dropDatabase();
  let documentCount = 0;
  for (const saved of payload.collections) {
    if (target.createCollection) await target.createCollection(saved.name);
    const collection = target.collection(saved.name);
    const documents = [...saved.documents];
    if (documents.length > 0) {
      await collection.insertMany(documents);
      documentCount += documents.length;
    }
    for (const index of saved.indexes) {
      if (index.name === '_id_') continue;
      await restoreIndex(collection, index);
    }
  }
  const restoredNames = await collectionNames(target);
  const savedByName = new Map(payload.collections.map((item) => [item.name, item]));
  let collectionCountMismatch = 0;
  let documentCountMismatch = 0;
  let indexDefinitionMismatch = 0;
  for (const name of new Set([...savedByName.keys(), ...restoredNames])) {
    const saved = savedByName.get(name);
    const exists = restoredNames.includes(name);
    if (!saved || !exists) {
      collectionCountMismatch += 1;
      continue;
    }
    const restored = target.collection(name);
    const count = await restored.countDocuments({});
    if (count !== saved.documents.length) documentCountMismatch += 1;
    const restoredIndexes = (await restored.listIndexes().toArray()).flatMap((raw) => {
      const index = sanitizedIndex(raw);
      return index ? [index] : [];
    });
    const savedSignatures = saved.indexes.map(indexSignature).sort();
    const restoredSignatures = restoredIndexes.map(indexSignature).sort();
    if (JSON.stringify(savedSignatures) !== JSON.stringify(restoredSignatures)) indexDefinitionMismatch += 1;
  }
  return {
    status: collectionCountMismatch === 0 && documentCountMismatch === 0 && indexDefinitionMismatch === 0 ? 'verified' : 'failed',
    restoreDatabase,
    archiveSha256: sha256,
    collectionCount: restoredNames.length,
    documentCount,
    collectionCountMismatch,
    documentCountMismatch,
    indexDefinitionMismatch
  };
}

function desiredIndexOptions(definition: TextIndexDefinition): PlainRecord {
  return { name: definition.name, weights: expectedWeights(definition), default_language: definition.defaultLanguage };
}

async function rebuildTextIndexes(db: LocaleDatabase): Promise<readonly IndexMigrationAction[]> {
  const actions: IndexMigrationAction[] = [];
  for (const definition of TEXT_INDEX_DEFINITIONS) {
    const names = await collectionNames(db);
    if (!names.includes(definition.collection)) continue;
    const collection = db.collection(definition.collection);
    const current = (await collection.listIndexes().toArray()).flatMap((raw) => {
      const index = sanitizedIndex(raw);
      return index?.name === definition.name ? [index] : [];
    })[0];
    if (current && sameWeights(current.weights, definition.weights)) {
      actions.push({ collection: definition.collection, name: definition.name, action: 'unchanged' });
      continue;
    }
    if (current) await collection.dropIndex(definition.name);
    await collection.createIndex(textIndexKeys(definition.weights), desiredIndexOptions(definition));
    actions.push({ collection: definition.collection, name: definition.name, action: current ? 'rebuilt' : 'created' });
  }
  return actions;
}

function planNodes(value: unknown, output: PlainRecord[] = []): readonly PlainRecord[] {
  if (Array.isArray(value)) {
    for (const item of value) planNodes(item, output);
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  const node = value as PlainRecord;
  output.push(node);
  for (const [key, child] of Object.entries(node)) {
    if (key === 'parsedTextQuery' || key === 'indexPrefix' || key === 'keyPattern' || key === 'indexBounds') continue;
    if (child && typeof child === 'object') planNodes(child, output);
  }
  return output;
}

function safeMetric(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;
}

export async function explainLocaleTextIndexes(connection: Connection): Promise<readonly LocaleIndexExplainResult[]> {
  const db = asDatabase(connection);
  if (!db.command) throw new LocaleMigrationError('LOCALE_INDEX_EXPLAIN_UNAVAILABLE', 'The Mongo database command interface is required for index verification');
  const names = new Set(await collectionNames(db));
  const results: LocaleIndexExplainResult[] = [];
  for (const definition of TEXT_INDEX_DEFINITIONS) {
    if (!names.has(definition.collection)) continue;
    const filter: PlainRecord = { $text: { $search: 'backend151-locale-probe' } };
    const explain = await db.command({
      explain: { find: definition.collection, filter, projection: { _id: 0 } },
      verbosity: 'executionStats'
    });
    const winningPlan = (explain.queryPlanner as PlainRecord | undefined)?.winningPlan;
    const nodes = planNodes(winningPlan);
    const textMatch = nodes.find((node) => node.stage === 'TEXT_MATCH');
    const winningIndexName = nodes.find((node) => typeof node.indexName === 'string')?.indexName;
    const executionStats = explain.executionStats as PlainRecord | undefined;
    const verified = winningIndexName === definition.name && textMatch !== undefined;
    results.push({
      collection: definition.collection,
      expectedIndexName: definition.name,
      plannerStage: typeof textMatch?.stage === 'string' ? textMatch.stage : 'UNVERIFIED',
      winningIndexName: typeof winningIndexName === 'string' ? winningIndexName : 'UNVERIFIED',
      executionTimeMillis: safeMetric(executionStats?.executionTimeMillis),
      totalKeysExamined: safeMetric(executionStats?.totalKeysExamined),
      totalDocsExamined: safeMetric(executionStats?.totalDocsExamined),
      verified
    });
  }
  if (results.some(({ verified }) => !verified)) {
    throw new LocaleMigrationError('LOCALE_INDEX_EXPLAIN_FAILED', 'One or more localized text indexes were not selected by Mongo explain');
  }
  return results;
}

export async function runLocaleMigration(
  connection: Connection,
  options: { environment: AppEnvironment; mode?: 'dry-run' | 'apply'; confirm?: boolean }
): Promise<LocaleMigrationResult> {
  const mode = options.mode ?? 'dry-run';
  const before = await inspectLocaleState(connection, options.environment);
  if (before.aggregateCounters.recordsWithRetiredLocaleAndNeitherArNorEn > 0 || before.aggregateCounters.recordsWithLocalizedObjectButNoArOrEn > 0) {
    throw new LocaleMigrationBlockedError(before);
  }
  if (mode === 'dry-run') {
    return {
      status: 'planned', migrationId: LOCALE_MIGRATION_ID, environment: options.environment, before,
      localizedFieldMatched: 0, localizedFieldModified: 0, preferredLocaleMatched: 0, preferredLocaleModified: 0,
      indexActions: [], indexExplain: [], idempotentReplayReady: false
    };
  }
  if (options.confirm !== true) throw new LocaleMigrationError('MIGRATION_CONFIRMATION_REQUIRED', 'Applying the locale migration requires explicit confirmation', before);
  const db = asDatabase(connection);
  let localizedFieldMatched = 0;
  let localizedFieldModified = 0;
  let preferredLocaleMatched = 0;
  let preferredLocaleModified = 0;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const existingCollections = new Set(await collectionNames(db));
      for (const [collectionName, fields] of Object.entries(LOCALIZED_FIELD_ALLOWLIST)) {
        if (!existingCollections.has(collectionName)) continue;
        const collection = db.collection(collectionName);
        for (const field of fields) {
          const filter = {
            [`${field}.${RETIRED_LOCALE}`]: { $exists: true },
            $or: [
              { [`${field}.ar`]: { $type: 'string' } },
              { [`${field}.en`]: { $type: 'string' } }
            ]
          };
          const result = await collection.updateMany(filter, { $unset: { [`${field}.${RETIRED_LOCALE}`]: '' } }, { session });
          localizedFieldMatched += result.matchedCount;
          localizedFieldModified += result.modifiedCount;
        }
      }
      for (const [collectionName, fields] of Object.entries(PREFERRED_LOCALE_ALLOWLIST)) {
        if (!existingCollections.has(collectionName)) continue;
        const collection = db.collection(collectionName);
        for (const field of fields) {
          const result = await collection.updateMany({ [field]: RETIRED_LOCALE }, { $set: { [field]: 'ar' } }, { session });
          preferredLocaleMatched += result.matchedCount;
          preferredLocaleModified += result.modifiedCount;
        }
      }
    });
  } finally {
    await session.endSession();
  }
  const indexActions = await rebuildTextIndexes(db);
  const indexExplain = await explainLocaleTextIndexes(connection);
  const after = await inspectLocaleState(connection, options.environment);
  if (after.aggregateCounters.recordsWithRetiredLocale > 0 || after.aggregateCounters.recordsWithRetiredPreferredLocale > 0) {
    throw new LocaleMigrationError('MIGRATION_INCOMPLETE', 'Locale migration completed with retired values remaining', after);
  }
  return {
    status: 'applied', migrationId: LOCALE_MIGRATION_ID, environment: options.environment, before, after,
    localizedFieldMatched, localizedFieldModified, preferredLocaleMatched, preferredLocaleModified,
    indexActions, indexExplain, idempotentReplayReady: true
  };
}

export { type LocaleDatabase };
