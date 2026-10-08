import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';
import { createMongoosePublicHomepageRepository, publicHomepageProjection } from '../apps/api/src/modules/public/homepage.ts';

const database = `qa_home_content_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`).asPromise();
try {
  const actor = new mongoose.Types.ObjectId().toHexString();
  const repository = createMongooseAdBannerRepository(connection);
  const now = new Date();
  const body = { ar: 'نص البانر الذي كتبه صاحب الموقع', en: 'Banner copy written by the owner' };
  await connection.collection('ad_placements').insertOne({ key: 'homepage.hero', surface: 'homepage', active: true, targetUrlRequired: false });
  await connection.collection('ad_settings').insertOne({ enabled: true, allowedSurfaces: ['homepage'], maxActiveBanners: 100 });
  const draft = await repository.createBanner(actor, { placementKey: 'homepage.hero', title: { ar: 'عنوان البانر', en: 'Banner title' }, body, startAt: new Date(now.getTime() - 1000).toISOString(), endAt: new Date(now.getTime() + 3600000).toISOString() }, now);
  assert.deepEqual((await repository.listBanners({ page: 1, limit: 20 })).items[0].body, body);
  const imageId = new mongoose.Types.ObjectId();
  await connection.collection('ad_banner_media').insertOne({ _id: imageId, bannerId: new mongoose.Types.ObjectId(draft.id), active: true, url: 'https://example.test/banner.png' });
  const editedBody = { ...body, en: 'Edited and published banner copy' };
  const active = await repository.updateBanner(actor, draft.id, { expectedVersion: draft.version, reason: 'Publish edited copy', body: editedBody, mediaId: imageId.toHexString(), status: 'active' }, now);
  const publicRepository = createMongoosePublicHomepageRepository(connection);
  const published = publicHomepageProjection(await publicRepository.read());
  assert.deepEqual(published.banners[0].body, editedBody);
  const cleared = await repository.updateBanner(actor, draft.id, { expectedVersion: active.version, reason: 'Clear banner content', body: null }, now);
  assert.equal(cleared.body, undefined);
  assert.equal(publicHomepageProjection(await publicRepository.read()).banners[0].body, undefined);
  assert.equal((await connection.collection('ad_banners').findOne({ _id: new mongoose.Types.ObjectId(draft.id) })).body, undefined);
  console.log('PASS: real Mongo saves, reopens, edits, publishes and clears banner body through the public homepage projection.');
} finally { await connection.dropDatabase(); await connection.close(); }
