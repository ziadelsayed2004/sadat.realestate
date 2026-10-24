import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

// Configuration, administrators, taxonomies, city statistics and audit history are never candidates.
export const TRIAL_COLLECTIONS = Object.freeze([
  'properties', 'projects', 'organizations', 'articles', 'community_posts', 'community_comments',
  'community_reactions', 'community_reports', 'ad_banners', 'ad_banner_media', 'ad_requests', 'ad_quotes',
  'ad_schedules', 'payment_proofs', 'requests', 'request_issues', 'viewings', 'viewing_schedule_locks',
  'favorites', 'property_reports', 'property_media', 'property_media_drafts', 'property_view_events', 'notifications',
  'provider_applications', 'provider_profiles', 'provider_documents', 'provider_settings',
  'provider_identity_subscriptions', 'seeker_profiles', 'account_reports', 'account_state_transitions',
  'commission_account_overrides', 'commission_confirmations', 'commission_exceptions',
  'cms_banners', 'cms_real_estate_tips', 'cms_team_members', 'cms_about_blocks',
  'cms_article_photos', 'cms_team_photos', 'organization_photos', 'organization_reconciliations',
  'uploads', 'outbox_events', 'sessions', 'otp_challenges', 'admin_credentials', 'users'
]);
const EJSON = mongoose.mongo.BSON.EJSON;
const encode = value => EJSON.stringify(value, { relaxed: false });
const digest = value => createHash('sha256').update(encode(value)).digest('hex');
const filterFor = name => name === 'users' || name === 'otp_challenges' ? { roleType: { $ne: 'admin' } } : ['sessions', 'notifications', 'admin_credentials', 'account_state_transitions'].includes(name) ? undefined : {};

async function candidateRows(connection, name, session) {
  const options = session ? { session } : {};
  const admins = await connection.collection('users').find({ roleType: 'admin' }, { ...options, projection: { _id: 1 } }).toArray();
  const adminIds = admins.flatMap(row => [row._id, String(row._id)]);
  const filter = filterFor(name) ?? { [name === 'notifications' ? 'recipientId' : 'userId']: { $nin: adminIds } };
  // Keep administrator account state and sessions regardless of BSON/string identifier representation.
  return connection.collection(name).find(filter, options).sort({ _id: 1 }).toArray();
}

export async function planTrialCleanup(connection) {
  const records = [];
  for (const collection of TRIAL_COLLECTIONS) for (const row of await candidateRows(connection, collection)) {
    if (row._id === undefined) throw new Error('TRIAL_CLEANUP_ID_REQUIRED');
    const label = row.name ?? row.title ?? row.displayName ?? row.email ?? row.originalFilename ?? row.purpose ?? row.slug ?? row.type ?? row.mime ?? row.status ?? '';
    records.push({ collection, id: encode(row._id), ...(typeof row.id === 'string' ? { referenceId: row.id } : {}), label, slug: row.slug ?? '', status: row.status ?? '',
      ownerId: String(row.userId ?? row.providerId ?? row.authorId ?? row.createdBy ?? ''), createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : '',
      classification: row.synthetic === true || row.seedKey ? 'known-demo' : 'manual-review-required',
      selected: false, fingerprint: digest(row) });
  }
  const preservedCollections = [];
  for (const row of await connection.db.listCollections({}, { nameOnly: true }).toArray()) {
    if (!TRIAL_COLLECTIONS.includes(row.name) && !row.name.startsWith('system.')) preservedCollections.push({ collection: row.name, count: await connection.collection(row.name).countDocuments({}), policy: 'preserved-not-deleted' });
  }
  return { format: 'sadat-trial-cleanup-v1', database: connection.name, createdAt: new Date().toISOString(), preservedCollections,
    instructions: 'Review EVERY record. Set selected=true only for trial records. All selected records are backed up before deletion. Administrators, settings, taxonomies and city statistics are preserved. Uploaded files remain on disk.', records };
}

export async function applyTrialCleanup(connection, manifest, backupDirectory) {
  if (manifest?.format !== 'sadat-trial-cleanup-v1' || manifest.database !== connection.name || !Array.isArray(manifest.records)) throw new Error('TRIAL_CLEANUP_MANIFEST_INVALID');
  const fresh = await planTrialCleanup(connection);
  const key = row => `${row.collection}:${row.id}`;
  const expected = new Map(manifest.records.map(row => [key(row), row.fingerprint]));
  if (expected.size !== manifest.records.length || fresh.records.length !== expected.size || fresh.records.some(row => expected.get(key(row)) !== row.fingerprint)) throw new Error('TRIAL_CLEANUP_PLAN_STALE_REGENERATE');
  const selected = manifest.records.filter(row => row.selected === true);
  if (!selected.length) throw new Error('TRIAL_CLEANUP_NOTHING_SELECTED');
  const selection = new Set(selected.map(key));
  // A full trial-account removal must include its owned content. Partial content-only plans remain possible.
  const selectedUsers = new Set(selected.filter(row => row.collection === 'users').map(row => String(EJSON.parse(row.id))));
  const selectedIds = new Map(TRIAL_COLLECTIONS.map(name => [name, new Set(fresh.records.filter(row => row.collection === name && selection.has(key(row))).flatMap(row => [String(EJSON.parse(row.id)), ...(row.referenceId ? [row.referenceId] : [])]))]));
  const references = { userId: ['users'], providerId: ['users', 'provider_profiles', 'provider_applications'], authorId: ['users'], recipientId: ['users'],
    organizationId: ['organizations'], projectId: ['projects'], propertyId: ['properties'], requestId: ['requests'], adRequestId: ['ad_requests'],
    quoteId: ['ad_quotes'], bannerId: ['ad_banners'], postId: ['community_posts'], parentCommentId: ['community_comments'],
    mediaId: ['ad_banner_media', 'property_media'], mediaIds: ['ad_banner_media', 'property_media'], coverAssetId: ['cms_article_photos', 'uploads'],
    galleryAssetIds: ['cms_article_photos'], photoAssetId: ['cms_team_photos', 'uploads'] };
  const backup = [];
  for (const name of TRIAL_COLLECTIONS) for (const row of await candidateRows(connection, name)) {
    const rowKey = `${name}:${encode(row._id)}`;
    if (selectedUsers.size && ['userId', 'providerId', 'authorId', 'recipientId', 'accountId'].some(field => selectedUsers.has(String(row[field]))) && !selection.has(rowKey)) throw new Error('TRIAL_CLEANUP_ACCOUNT_HAS_UNSELECTED_RECORDS');
    if (!selection.has(rowKey)) {
      for (const [field, parents] of Object.entries(references)) for (const value of Array.isArray(row[field]) ? row[field] : [row[field]]) {
        if (value != null && parents.some(parent => selectedIds.get(parent)?.has(String(value)))) throw new Error(`TRIAL_CLEANUP_UNSELECTED_DEPENDENT:${name}:${field}`);
      }
      for (const field of ['imageUrl', 'logoUrl', 'publicImageUrl', 'companyImageUrl', 'companyLogoUrl']) {
        const photoId = typeof row[field] === 'string' ? row[field].match(/\/organization-photos\/([a-f0-9]{24})$/)?.[1] : undefined;
        if (photoId && selectedIds.get('organization_photos').has(photoId)) throw new Error(`TRIAL_CLEANUP_UNSELECTED_DEPENDENT:${name}:${field}`);
      }
    }
    if (selection.has(rowKey)) backup.push({ collection: name, document: row });
  }
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  const backupFile = path.join(backupDirectory, `trial-content-${Date.now()}.ejson`);
  await writeFile(backupFile, encode({ database: connection.name, manifest, records: backup }), { flag: 'wx', mode: 0o600 });
  // Confirm the durable backup can be parsed before entering the deletion transaction.
  if (EJSON.parse(await readFile(backupFile, 'utf8')).records.length !== selected.length) throw new Error('TRIAL_CLEANUP_BACKUP_FAILED');
  await connection.transaction(async session => {
    for (const record of selected) {
      if (!TRIAL_COLLECTIONS.includes(record.collection)) throw new Error('TRIAL_CLEANUP_COLLECTION_FORBIDDEN');
      const collection = connection.collection(record.collection), id = EJSON.parse(record.id);
      const row = await collection.findOne({ _id: id }, { session });
      if (!row || digest(row) !== record.fingerprint || record.collection === 'users' && row.roleType === 'admin') throw new Error('TRIAL_CLEANUP_PLAN_STALE_REGENERATE');
      const removed = await collection.deleteOne({ _id: id }, { session });
      if (removed.deletedCount !== 1) throw new Error('TRIAL_CLEANUP_DELETE_FAILED');
    }
    await connection.collection('audit_logs').insertOne({ action: 'production.trial_content_cleanup', targetType: 'database', targetId: connection.name,
      actorType: 'system', reason: 'Explicitly reviewed trial-content manifest', occurredAt: new Date(), after: { deleted: selected.length, backupFile, manifestDigest: digest(manifest) } }, { session });
  });
  return { deleted: selected.length, backupFile, privateFilesDeleted: false };
}

async function main() {
  const [mode = 'plan', manifestFile, confirmation] = process.argv.slice(2);
  if (!manifestFile || !['plan', 'show', 'select-all', 'apply'].includes(mode)) throw new Error('Usage: trial-content-cleanup.mjs plan|show|select-all|apply /absolute/manifest.json [DELETE_REVIEWED_TRIAL_CONTENT]');
  if (mode === 'show' || mode === 'select-all') {
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (manifest.format !== 'sadat-trial-cleanup-v1') throw new Error('TRIAL_CLEANUP_MANIFEST_INVALID');
    if (mode === 'select-all') {
      if (confirmation !== 'SELECT_ALL_LISTED_TRIAL_CONTENT') throw new Error('Review the complete show output, then pass SELECT_ALL_LISTED_TRIAL_CONTENT.');
      manifest.records.forEach(row => { row.selected = true; });
      await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
    }
    console.log(JSON.stringify(manifest, null, 2)); return;
  }
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI_REQUIRED');
  if (mode === 'apply' && confirmation !== 'DELETE_REVIEWED_TRIAL_CONTENT') throw new Error('TRIAL_CLEANUP_CONFIRMATION_REQUIRED');
  const connection = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    if (mode === 'plan') {
      const plan = await planTrialCleanup(connection);
      await writeFile(manifestFile, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      const counts = Object.fromEntries(TRIAL_COLLECTIONS.map(name => [name, plan.records.filter(row => row.collection === name).length]).filter(([, count]) => count));
      console.log(JSON.stringify({ status: 'PLAN_ONLY_NO_DELETION', manifestFile, records: plan.records.length, counts, preservedCollections: plan.preservedCollections }, null, 2));
    } else {
      const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
      console.log(JSON.stringify(await applyTrialCleanup(connection, manifest, process.env.TRIAL_CLEANUP_BACKUP_DIR ?? '/var/backups/elsadatrealestate/trial-content'), null, 2));
    }
  } finally { await connection.close(); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main().catch(error => { console.error(error.message); process.exitCode = 1; });
