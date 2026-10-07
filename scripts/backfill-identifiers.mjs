import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import mongoose from 'mongoose';
import { parseEnvironmentFile } from './environment-file.mjs';
import { generateIdentifier } from '../apps/api/dist/modules/shared/identifiers.js';

export const targets = [
  ['articles', 'slug', 'article', 'title'], ['article_categories', 'slug', 'category', 'name'],
  ['locations', 'slug', 'location', 'name'], ['property_taxonomy', 'slug', 'type', 'name'],
  ['features_services', 'slug', 'feature', 'name'], ['properties', 'slug', 'property', 'name'],
  ['projects', 'slug', 'project', 'name'], ['organizations', 'slug', 'organization', 'name'],
  ['cms_about_blocks', 'key', 'about', 'title'], ['cms_team_members', 'key', 'team', 'name'],
  ['cms_real_estate_tips', 'key', 'tip', 'title'], ['commission_policies', 'key', 'policy', 'label']
];

const missing = field => ({ $or: [{ [field]: { $exists: false } }, { [field]: null }, { [field]: { $regex: '^\\s*$' } }] });

/** Missing identifiers only; existing links, ObjectIds and foreign keys are untouched. */
export async function backfillIdentifiers(connection, { apply = false } = {}) {
  const report = [];
  for (const [collectionName, field, prefix, textField] of targets) {
    const collection = connection.collection(collectionName);
    const rows = collection.find(missing(field), { projection: { _id: 1, [field]: 1, [textField]: 1, version: 1 } });
    let found = 0; let changed = 0;
    for await (const row of rows) {
      found++;
      if (!apply) continue;
      const session = await connection.startSession();
      try {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            let modified = 0;
            await session.withTransaction(async () => {
              const identifier = generateIdentifier(prefix, row[textField], field === 'key' ? '_' : '-');
              const result = await collection.updateOne({ _id: row._id, ...missing(field), ...(typeof row.version === 'number' ? { version: row.version } : {}) }, {
                $set: { [field]: identifier, updatedAt: new Date() },
                ...(typeof row.version === 'number' ? { $inc: { version: 1 } } : {})
              }, { session });
              if (result.modifiedCount) await connection.collection('identifier_backfill_history').insertOne({
                targetCollection: collectionName, targetId: row._id, field, before: row[field] ?? null,
                after: identifier, occurredAt: new Date(), operation: 'fill_missing_identifier'
              }, { session });
              modified = result.modifiedCount;
            });
            changed += modified;
            break;
          } catch (error) { if (error?.code !== 11000 || attempt === 4) throw error; }
        }
      } finally { await session.endSession(); }
    }
    report.push({ collection: collectionName, field, missing: found, updated: changed });
  }
  return { mode: apply ? 'apply' : 'plan', collections: report };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) { console.log('node scripts/backfill-identifiers.mjs [--env-file path] [--apply]\nDefault: read-only plan. Build the API first. Uses MONGODB_URI; existing identifiers are preserved.'); return; }
  const envIndex = args.indexOf('--env-file');
  const file = envIndex >= 0 ? args[envIndex + 1] : process.env.PRODUCTION_ENV_FILE;
  if (envIndex >= 0 && !file) throw new Error('ENV_FILE_REQUIRED');
  const fileEnv = file ? parseEnvironmentFile(await readFile(file, 'utf8')) : {};
  const uri = process.env.MONGODB_URI ?? fileEnv.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI_REQUIRED');
  const connection = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 10000 }).asPromise();
  try { console.log(JSON.stringify(await backfillIdentifiers(connection, { apply: args.includes('--apply') }), null, 2)); }
  finally { await connection.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('IDENTIFIER_BACKFILL_FAILED: check database access and replica-set configuration. No credentials are printed.'); process.exitCode = 1; });
}
