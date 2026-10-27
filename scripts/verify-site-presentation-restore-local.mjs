import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import sharp from 'sharp';
import { mergePresentation, mongoToolsRestoreUri, presentationCollections, restorePresentationFile, selectPresentationRows } from '../scripts/restore-site-presentation.mjs';
import { verifyProductionBackup } from '../apps/api/src/modules/database/production-launch.ts';
import { createMongoosePublicHomepageRepository, publicHomepageProjection } from '../apps/api/src/modules/public/homepage.ts';
import { publicTeamMember } from '../apps/api/src/modules/cms/about-team.ts';
const uri = process.env.PRESENTATION_QA_MONGODB_URI ?? 'mongodb://127.0.0.1:27029/';
assert.match(uri, /^mongodb:\/\/127\.0\.0\.1:27029\/$/u, 'ISOLATED_QA_MONGODB_REQUIRED');
const bootstrap = await mongoose.createConnection(uri, { directConnection: true }).asPromise();
try { await bootstrap.db.admin().command({ replSetInitiate: { _id: 'presentationqa', members: [{ _id: 0, host: '127.0.0.1:27029' }] } }); } catch (error) { if (error.code !== 23) throw error; }
for (let i = 0; i < 60; i++) { if ((await bootstrap.db.admin().command({ hello: 1 })).isWritablePrimary) break; await new Promise(resolve => setTimeout(resolve, 250)); }
await bootstrap.close();
const name = `presentation_verify_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(uri + name + '?replicaSet=presentationqa').asPromise();
const db = connection.db;
const rootId = new mongoose.Types.ObjectId(), trialId = new mongoose.Types.ObjectId();
const categoryId = new mongoose.Types.ObjectId(), typeId = new mongoose.Types.ObjectId();
const teamPhotoId = new mongoose.Types.ObjectId(), taxonomyPhotoId = new mongoose.Types.ObjectId();
const bannerId = new mongoose.Types.ObjectId(), mediaId = new mongoose.Types.ObjectId();
const local = { ar: 'بيانات المنصة', en: 'Platform content' };
const at = new Date();
const temporary = path.resolve('.tmp', name);
const backup = path.join(temporary, 'backup');
const privateSource = path.join(temporary, 'source/private');
const privateTarget = path.join(temporary, 'destination');
const tools = process.env.PRESENTATION_QA_MONGO_TOOLS ?? path.resolve('.local/presentation-mongodb-tools/mongodb-database-tools-windows-x86_64-100.20.0/bin');
const executable = name => path.join(tools, process.platform === 'win32' ? name + '.exe' : name);
const tar = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/tar.exe' : 'tar';
if (process.platform === 'win32') process.env.PATH = `C:/Program Files/Git/usr/bin;${process.env.PATH}`;
const evidence = { status: 'RUNNING', environment: 'isolated-local-replica-set', checks: [], cleanup: false };
try {
  await mkdir(backup, { recursive: true });
  await mkdir(path.join(privateSource, 'quarantine'), { recursive: true });
  await mkdir(privateTarget);
  const image = await sharp({ create: { width: 120, height: 80, channels: 3, background: '#19253c' } }).webp().toBuffer();
  for (const key of ['team', 'taxonomy', 'hero', 'property']) await writeFile(path.join(privateSource, 'quarantine', key), image);
  const seed = {
    users: [{ _id: rootId, normalizedEmail: 'root@example.invalid', roleType: 'admin', status: 'verified' }, { _id: trialId, normalizedEmail: 'trial@example.invalid' }],
    admin_credentials: [{ userId: rootId, passwordHash: 'preserved-test-hash' }],
    properties: [{ _id: trialId, slug: 'removed-property', status: 'published', active: true }],
    articles: [{ _id: trialId, status: 'published' }], community_posts: [{ _id: trialId, status: 'published' }],
    cms_homepage_sections: [{ _id: new mongoose.Types.ObjectId(), key: 'hero', title: local, order: 0, status: 'published', visible: true }],
    cms_homepage_metrics: [{ key: 'housing_units', title: local, value: 1200, order: 1, status: 'published', visible: true }],
    cms_population_values: [{ status: 'available', value: 342800, sourceLabel: local, sourceUrl: 'https://example.invalid/city-report', asOf: at, updatedAt: at }],
    property_taxonomy: [
      { _id: categoryId, kind: 'category', slug: 'residential', name: local, imageUrl: `/api/v1/public/taxonomy-photos/${taxonomyPhotoId}`, active: true, order: 0, synthetic: true },
      { _id: typeId, categoryId, kind: 'type', slug: 'apartments', name: local, active: true, order: 1, synthetic: true }
    ],
    article_categories: [{ key: 'guides', slug: 'guides', name: local, active: true, synthetic: true }],
    community_categories: [{ key: 'question', name: local, active: true, synthetic: true }],
    taxonomy_photos: [{ _id: taxonomyPhotoId, storageKey: 'quarantine/taxonomy', mime: 'image/webp' }],
    cms_team_members: [{ key: 'member', name: local, title: local, photoAssetId: teamPhotoId, order: 0, active: true, status: 'published', updatedBy: trialId, synthetic: true }],
    cms_team_photos: [{ _id: teamPhotoId, storageKey: 'quarantine/team', mime: 'image/webp', createdBy: trialId }],
    cms_banners: [{ key: 'home_hero', title: local, imageUrl: '/assets/canonical/public/home-hero-sadat-city.png', order: 0, status: 'published', active: true }],
    ad_settings: [{ enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 }],
    ad_placements: [{ key: 'homepage.hero', active: true, surface: 'homepage', sortOrder: 0 }],
    ad_banners: [
      { _id: bannerId, placementKey: 'homepage.hero', status: 'active', startAt: new Date('2020-01-01'), endAt: new Date('2030-01-01'), title: local, mediaIds: [mediaId], targetUrl: '/properties' },
      { placementKey: 'homepage.featured', featured: { advertiserProviderId: String(trialId) }, adRequestId: trialId, title: local }
    ],
    ad_banner_media: [{ _id: mediaId, bannerId, active: true, storageKey: 'quarantine/hero', url: `/api/v1/public/banner-media/${mediaId}`, mime: 'image/webp' }]
  };
  for (const [collection, rows] of Object.entries(seed)) await db.collection(collection).insertMany(rows);
  const config = path.join(temporary, 'mongo.yml');
  await writeFile(config, `uri: ${JSON.stringify(uri + name + '?replicaSet=presentationqa')}\n`);
  execFileSync(executable('mongodump'), ['--config', config, `--archive=${path.join(backup, 'mongodb.archive.gz')}`, '--gzip'], { stdio: 'pipe' });
  execFileSync(tar, ['--create', '--gzip', '--force-local', '--file', path.join(backup, 'private-files.tar.gz'), '-C', path.dirname(privateSource), 'private']);
  const sums = [];
  for (const file of ['mongodb.archive.gz', 'private-files.tar.gz']) sums.push(`${createHash('sha256').update(await readFile(path.join(backup, file))).digest('hex')}  ${file}`);
  await writeFile(path.join(backup, 'SHA256SUMS'), sums.join('\n') + '\n');
  await verifyProductionBackup(backup, temporary);
  evidence.checks.push('real MongoDB archive and private tar backup pass checksum verification');
  for (const collection of Object.keys(seed)) if (!['users', 'admin_credentials'].includes(collection)) await db.collection(collection).deleteMany({});
  await db.collection('users').deleteMany({ _id: { $ne: rootId } });
  await db.collection('cms_homepage_sections').insertOne({ ...seed.cms_homepage_sections[0], title: { ar: 'تعديل جديد' } });
  const prefix = '__presentation_restore_fixture_';
  await writeFile(config, `uri: ${JSON.stringify(mongoToolsRestoreUri(uri + name + '?replicaSet=presentationqa', name))}\n`);
  const restoreRun = spawnSync(executable('mongorestore'), [
    '--config', config, `--archive=${path.join(backup, 'mongodb.archive.gz')}`, '--gzip', '--noIndexRestore', '--noOptionsRestore', '--stopOnError',
    ...presentationCollections.map(collection => `--nsInclude=${name}.${collection}`), `--nsFrom=${name}.*`, `--nsTo=${name}.${prefix}*`
  ], { encoding: 'utf8' });
  assert.equal(restoreRun.status, 0, restoreRun.stderr);
  assert.equal(await db.collection(prefix + 'users').countDocuments({}), 0);
  assert.equal(await db.collection(prefix + 'properties').countDocuments({}), 0);
  evidence.checks.push('real mongorestore imports only the selected namespaces into temporary collections');
  const source = new Map();
  for (const collection of presentationCollections) source.set(collection, await db.collection(prefix + collection).find({}).toArray());
  const templateId = new mongoose.Types.ObjectId();
  const selected = selectPresentationRows(source, rootId, templateId);
  const result = await mergePresentation(connection, selected, key => restorePresentationFile(privateTarget, path.join(backup, 'private-files.tar.gz'), key, tar));
  assert.equal(await db.collection('users').countDocuments({}), 1);
  assert.equal((await db.collection('admin_credentials').findOne({ userId: rootId })).passwordHash, 'preserved-test-hash');
  for (const collection of ['properties', 'articles', 'community_posts', 'projects', 'provider_profiles', 'organizations']) assert.equal(await db.collection(collection).countDocuments({}), 0);
  assert.equal((await db.collection('cms_homepage_sections').findOne({ key: 'hero' })).title.ar, 'تعديل جديد');
  assert.equal(await db.collection('property_taxonomy').countDocuments({}), 2);
  assert.equal(await db.collection('article_categories').countDocuments({}), 1);
  assert.equal(await db.collection('community_categories').countDocuments({}), 1);
  for (const key of ['team', 'taxonomy', 'hero']) assert.deepEqual(await readFile(path.join(privateTarget, 'quarantine', key)), image);
  await assert.rejects(readFile(path.join(privateTarget, 'quarantine/property')), /ENOENT/);
  evidence.checks.push('all categories and selected image bytes recover while listings, articles, community posts and accounts remain cleared');
  const team = await db.collection('cms_team_members').findOne({ key: 'member' });
  assert.equal(publicTeamMember({ ...team, photoAssetId: String(team.photoAssetId) }).imageUrl, `/api/v1/public/team-photos/${teamPhotoId}`);
  const home = publicHomepageProjection(await createMongoosePublicHomepageRepository(connection).read());
  assert.equal(home.properties.length, 0);
  assert.equal(home.developers.length, 0);
  assert.equal(home.metrics.find(metric => metric.key === 'population').value, 342800);
  assert.equal(home.categories.length, 2);
  assert.equal(home.banners.some(banner => banner.presentation === 'featured' && banner.key === 'platform_ad_template'), true);
  assert.equal(home.banners.some(banner => banner.key.startsWith('banner_')), true);
  evidence.checks.push('real public homepage projection shows hero banners, platform featured template, population and taxonomy with zero listings');
  const repeated = await mergePresentation(connection, selected, async () => {});
  assert.equal(repeated.collections.reduce((total, row) => total + row.insert, 0), 0);
  evidence.checks.push('re-running the recovery adds no duplicates and preserves post-reset edits');
  const companyId = new mongoose.Types.ObjectId(), featuredId = new mongoose.Types.ObjectId(), featuredMedia = new mongoose.Types.ObjectId();
  await db.collection('users').insertOne({ _id: trialId, roleType: 'provider', status: 'verified' });
  await db.collection('provider_profiles').insertOne({ userId: trialId, providerType: 'developer_company', status: 'approved' });
  await db.collection('provider_applications').insertOne({ userId: trialId, providerType: 'developer_company', status: 'approved', brandName: 'QA company' });
  await db.collection('organizations').insertOne({ _id: companyId, providerId: trialId, kind: 'developer_company', slug: 'qa-company', name: local, status: 'approved' });
  await db.collection('ad_placements').insertOne({ key: 'homepage.featured', surface: 'homepage', active: true, sortOrder: 1 });
  await db.collection('ad_banners').insertOne({ _id: featuredId, placementKey: 'homepage.featured', status: 'active', startAt: new Date('2020-01-01'), endAt: new Date('2030-01-01'), title: local, mediaIds: [featuredMedia], featured: { advertiserProviderId: String(trialId), destination: { kind: 'organization', id: String(companyId) } } });
  await db.collection('ad_banner_media').insertOne({ _id: featuredMedia, bannerId: featuredId, active: true, url: '/assets/canonical/public/home-hero-sadat-city.png' });
  const advertisedHome = publicHomepageProjection(await createMongoosePublicHomepageRepository(connection).read());
  assert.equal(advertisedHome.banners.some(banner => banner.key === 'platform_ad_template'), false);
  assert.equal(advertisedHome.banners.some(banner => banner.key.startsWith(`featured_${featuredId}_`)), true);
  evidence.checks.push('a genuinely published featured ad automatically replaces the platform template');
  evidence.restored = result;
  evidence.status = 'PASS';
} finally {
  assert(connection.name.startsWith('presentation_verify_'));
  await connection.dropDatabase();
  await connection.close();
  await rm(temporary, { recursive: true, force: true });
  evidence.cleanup = true;
  await writeFile('docs/quality/guide-runs/presentation-restore-local-latest.json', JSON.stringify(evidence, null, 2) + '\n');
}
console.log('PRESENTATION_REAL_BACKUP_RESTORE_PASS checks=' + evidence.checks.length);
