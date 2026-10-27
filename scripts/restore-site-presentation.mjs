import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, lstat, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Neither account data nor listings/articles/community posts are restored.
export const presentationCollections = Object.freeze([
  'cms_homepage_sections', 'cms_homepage_metrics', 'cms_population_values',
  'cms_population_source_cache', 'cms_about_blocks', 'cms_real_estate_tips',
  'cms_team_members', 'cms_team_categories', 'cms_team_photos',
  'property_taxonomy', 'taxonomy_photos', 'features_services', 'locations',
  'article_categories', 'community_categories', 'cms_banners',
  'cms_settings', 'cms_display_settings', 'ad_settings', 'ad_placements',
  'ad_banners', 'ad_banner_media'
]);
const protectedCollections = ['users', 'admin_credentials', 'properties', 'projects', 'articles', 'community_posts', 'community_comments', 'provider_profiles', 'organizations'];
const companyLink = value => typeof value === 'string' &&
  (/\/(?:developers|properties)\/[^/?#]+/u.test(value) ||
   !/^(?:\/(?!\/)|https:\/\/elsadatrealestate\.com(?:\/|$))/u.test(value));

export function mongoToolsRestoreUri(uri, database) {
  const parsed = /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(?:\?(.*))?$/u.exec(uri);
  if (!parsed) throw new Error('PRESENTATION_MONGO_URI_INVALID');
  const query = new URLSearchParams(parsed[2] ?? '');
  if (parsed[1].includes('@') && !query.has('authSource')) query.set('authSource', database);
  // A URI database implicitly adds a broad --db scope in mongorestore. Keep
  // authentication explicit so --nsInclude remains the entire restore scope.
  return `${parsed[1]}/${query.size ? '?' + query.toString() : ''}`;
}

export function selectPresentationRows(source, adminId, templateId) {
  const selected = new Map(presentationCollections.map(name => [name, (source.get(name) ?? []).map(row => {
    const copy = { ...row };
    delete copy.synthetic;
    delete copy.seedKey;
    for (const field of ['createdBy', 'updatedBy']) if (field in copy) copy[field] = adminId;
    if (name === 'cms_team_members' && copy.photoAssetId && !copy.imageUrl) copy.imageUrl = `/api/v1/public/team-photos/${copy.photoAssetId}`;
    return copy;
  })]));
  selected.set('ad_banners', selected.get('ad_banners').filter(row =>
    row.placementKey === 'homepage.hero' && !row.adRequestId && !row.featured?.advertiserProviderId && !companyLink(row.targetUrl)));
  const bannerIds = new Set(selected.get('ad_banners').map(row => String(row._id)));
  const mediaIds = new Set(selected.get('ad_banners').flatMap(row => row.mediaIds ?? (row.mediaId ? [row.mediaId] : [])).map(String));
  selected.set('ad_banner_media', selected.get('ad_banner_media').filter(row => bannerIds.has(String(row.bannerId)) && mediaIds.has(String(row._id))));
  const teamIds = new Set(selected.get('cms_team_members').flatMap(row => [row.photoAssetId, /\/team-photos\/([a-f0-9]{24})/u.exec(row.imageUrl ?? '')?.[1]]).filter(Boolean).map(String));
  const taxonomyIds = new Set(selected.get('property_taxonomy').flatMap(row => /\/taxonomy-photos\/([a-f0-9]{24})/u.exec(row.imageUrl ?? '')?.[1] ?? []).map(String));
  selected.set('cms_team_photos', selected.get('cms_team_photos').filter(row => teamIds.has(String(row._id))));
  selected.set('taxonomy_photos', selected.get('taxonomy_photos').filter(row => taxonomyIds.has(String(row._id))));
  selected.set('cms_banners', selected.get('cms_banners').filter(row => !companyLink(row.targetUrl) && !row.advertiserProviderId));
  if (!selected.get('cms_banners').some(row => row.key === 'platform_ad_template')) {
    selected.get('cms_banners').push({
      _id: templateId, key: 'platform_ad_template', presentation: 'featured',
      title: { ar: 'مساحتك الإعلانية هنا', en: 'Your advertising space' },
      eyebrow: { ar: 'عقارات السادات', en: 'Sadat Real Estate' },
      body: { ar: 'عرّف الزوار بخدماتك ومشروعاتك على منصة عقارات السادات.', en: 'Introduce your services and projects on Sadat Real Estate.' },
      ctaLabel: { ar: 'تصفح العقارات', en: 'Explore properties' },
      imageUrl: '/assets/canonical/public/home-hero-sadat-city.png', targetUrl: '/properties',
      order: 0, active: true, status: 'published', updatedBy: adminId,
      createdAt: new Date(), updatedAt: new Date(), version: 0
    });
  }
  return selected;
}

export function safeStorageKey(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_./-]+$/u.test(value) || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('PRESENTATION_STORAGE_KEY_INVALID');
  return value;
}

export async function mergePresentation(connection, selected, restoreFile) {
  const db = connection.db;
  const inserts = new Map();
  const report = [];
  // Detect natural-key collisions before restoring bytes or writing any rows.
  for (const [collection, rows] of selected) {
    if (!presentationCollections.includes(collection)) throw new Error('PRESENTATION_COLLECTION_FORBIDDEN');
    const missing = [];
    for (const row of rows) {
      if (await db.collection(collection).findOne({ _id: row._id })) continue;
      const natural = row.slug ? { slug: row.slug } : row.key ? { ...(row.namespace ? { namespace: row.namespace } : {}), key: row.key } : null;
      if (natural && await db.collection(collection).findOne(natural)) throw new Error(`PRESENTATION_KEY_CONFLICT:${collection}`);
      missing.push(row);
    }
    inserts.set(collection, missing);
    report.push({ collection, source: rows.length, insert: missing.length, existing: rows.length - missing.length });
  }
  for (const [collection, rows] of inserts) {
    const parent = collection === 'locations' ? 'parentLocationId' : collection === 'property_taxonomy' ? 'categoryId' : null;
    if (!parent) continue;
    for (const row of rows) if (row[parent] &&
      !selected.get(collection).some(candidate => String(candidate._id) === String(row[parent])) &&
      !await db.collection(collection).findOne({ _id: row[parent] })) throw new Error('PRESENTATION_PARENT_MISSING');
  }
  const keys = new Set([...selected.values()].flat().filter(row => typeof row.storageKey === 'string').map(row => safeStorageKey(row.storageKey)));
  for (const key of keys) await restoreFile(key);
  await connection.transaction(async session => {
    const before = [];
    for (const name of protectedCollections) before.push(await db.collection(name).countDocuments({}, { session }));
    for (const [collection, rows] of inserts) for (const row of rows) {
      const { _id, ...fields } = row;
      await db.collection(collection).updateOne({ _id }, { $setOnInsert: fields }, { upsert: true, session });
    }
    const after = [];
    for (const name of protectedCollections) after.push(await db.collection(name).countDocuments({}, { session }));
    if (before.some((count, index) => count !== after[index])) throw new Error('PRESENTATION_PROTECTED_DATA_CHANGED');
  });
  return { collections: report, files: keys.size };
}

export async function restorePresentationFile(root, archive, key, tar = 'tar') {
  safeStorageKey(key);
  const base = await realpath(root);
  if ((await lstat(root)).isSymbolicLink()) throw new Error('PRESENTATION_PRIVATE_ROOT_INVALID');
  const member = `private/${key}`;
  const flags = ['--force-local', '--gzip', '--file', archive, '--no-wildcards'];
  const listing = execFileSync(tar, ['--list', '--verbose', ...flags, '--', member], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (listing.trim().split('\n').length !== 1 || !listing.startsWith('-')) throw new Error('PRESENTATION_ARCHIVE_FILE_INVALID');
  const bytes = execFileSync(tar, ['--extract', '--to-stdout', ...flags, '--', member], { maxBuffer: 20 * 1024 * 1024 });
  let parent = base;
  for (const part of key.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    await mkdir(parent, { mode: 0o750 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const info = await lstat(parent);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error('PRESENTATION_PRIVATE_SYMLINK');
  }
  const target = path.join(base, key);
  const info = await lstat(target).catch(error => { if (error.code !== 'ENOENT') throw error; return null; });
  if (info) {
    if (!info.isFile() || info.isSymbolicLink() || !(await readFile(target)).equals(bytes)) throw new Error('PRESENTATION_PRIVATE_FILE_CONFLICT');
    return;
  }
  await writeFile(target, bytes, { flag: 'wx', mode: 0o640 });
}

async function main() {
  if (process.env.APP_ENV !== 'production' || !process.env.PRODUCTION_RESTORE_SOURCE_BACKUP || !process.env.KEEP_ADMIN_EMAIL) throw new Error('PRESENTATION_RESTORE_ENV_REQUIRED');
  const release = await realpath('/opt/elsadatrealestate/current');
  const { verifyProductionBackup } = await import(pathToFileURL(path.join(release, 'apps/api/dist/modules/database/production-launch.js')).href);
  const backup = await verifyProductionBackup(process.env.PRODUCTION_RESTORE_SOURCE_BACKUP);
  const require = createRequire(path.join(release, 'apps/api/package.json'));
  const mongoose = require('mongoose');
  const connection = await mongoose.createConnection(process.env.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 }).asPromise();
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'sadat-presentation-'));
  const prefix = `__presentation_restore_${randomUUID().replaceAll('-', '')}_`;
  try {
    const admin = await connection.db.collection('users').findOne({ normalizedEmail: process.env.KEEP_ADMIN_EMAIL.toLowerCase(), roleType: 'admin', status: 'verified' });
    if (!admin) throw new Error('PRESENTATION_ADMIN_NOT_FOUND');
    const config = path.join(temporary, 'mongo.yml');
    const name = connection.name;
    await writeFile(config, `uri: ${JSON.stringify(mongoToolsRestoreUri(process.env.MONGODB_URI, name))}\n`, { mode: 0o600 });
    execFileSync('mongorestore', [
      '--config', config, '--gzip', `--archive=${path.join(backup, 'mongodb.archive.gz')}`,
      '--noIndexRestore', '--noOptionsRestore', '--stopOnError',
      ...presentationCollections.map(collection => `--nsInclude=${name}.${collection}`),
      `--nsFrom=${name}.*`, `--nsTo=${name}.${prefix}*`
    ], { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024 });
    const imported = await connection.db.listCollections({ name: { $regex: `^${prefix}` } }).toArray();
    if (imported.some(row => !presentationCollections.some(collection => row.name === prefix + collection))) throw new Error('PRESENTATION_UNEXPECTED_STAGED_COLLECTION');
    const source = new Map();
    for (const collection of presentationCollections) source.set(collection, await connection.db.collection(prefix + collection).find({}).toArray());
    if (!source.get('property_taxonomy').length || !source.get('cms_team_members').length) throw new Error('PRESENTATION_BACKUP_CONTENT_MISSING');
    const currentTemplate = await connection.db.collection('cms_banners').findOne({ key: 'platform_ad_template' });
    const selected = selectPresentationRows(source, admin._id, currentTemplate?._id ?? new mongoose.Types.ObjectId());
    const result = await mergePresentation(connection, selected, key => restorePresentationFile('/var/lib/elsadatrealestate/private', path.join(backup, 'private-files.tar.gz'), key));
    console.log(JSON.stringify(result, null, 2));
    console.log('PRESENTATION_RESTORE_OK listings_articles_community_accounts=untouched');
  } finally {
    try {
      const staged = await connection.db.listCollections({ name: { $regex: `^${prefix}` } }).toArray();
      for (const collection of staged) await connection.db.collection(collection.name).drop();
    } finally {
      await connection.close();
      await rm(temporary, { recursive: true, force: true });
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const code = /^PRESENTATION_[A-Z_]+(?::[a-z_]+)?$/u.test(error.message) ? error.message : 'PRESENTATION_RESTORE_FAILED';
    console.error(`${code} no_credentials_emitted=true`);
    process.exitCode = 1;
  });
}
