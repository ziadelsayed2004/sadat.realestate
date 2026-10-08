import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createMongooseAdBannerRepository } from '../apps/api/src/modules/ads/banner-repository.ts';
import { createMongoosePublicHomepageRepository, publicHomepageProjection } from '../apps/api/src/modules/public/homepage.ts';
import { createMongooseAdCalendarRepository } from '../apps/api/src/modules/ads/repository.ts';
import { createProviderAdvertisingModels } from '../apps/api/src/modules/provider/advertising-models.ts';

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
  const second = await repository.createBanner(actor, { placementKey: 'homepage.hero', title: { en: 'Second concurrent banner' }, body: { en: 'Second content' }, startAt: draft.startAt, endAt: draft.endAt, sortOrder: 1, displaySeconds: 5 }, now);
  const secondImage = new mongoose.Types.ObjectId();
  await connection.collection('ad_banner_media').insertOne({ _id: secondImage, bannerId: new mongoose.Types.ObjectId(second.id), active: true, url: 'https://example.test/second.png' });
  await repository.updateBanner(actor, second.id, { expectedVersion: second.version, reason: 'Publish a concurrent homepage banner', mediaId: secondImage.toHexString(), status: 'active' }, now);
  const rotating = publicHomepageProjection(await publicRepository.read());
  assert.equal(rotating.banners.length, 2);
  assert.equal(rotating.banners[1].title.en, 'Second concurrent banner');
  assert.equal(rotating.banners[1].displaySeconds, 5);
  const cleared = await repository.updateBanner(actor, draft.id, { expectedVersion: active.version, reason: 'Clear banner content', body: null }, now);
  assert.equal(cleared.body, undefined);
  assert.equal(publicHomepageProjection(await publicRepository.read()).banners[0].body, undefined);
  assert.equal((await connection.collection('ad_banners').findOne({ _id: new mongoose.Types.ObjectId(draft.id) })).body, undefined);
  const models = createProviderAdvertisingModels(connection);
  const calendar = createMongooseAdCalendarRepository(connection, models);
  for (const [index, placementKey] of ['homepage.hero', 'homepage.hero', 'homepage.fixed', 'homepage.fixed'].entries()) {
    const providerId = new mongoose.Types.ObjectId();
    const request = await models.AdRequest.create({ providerId, placementKey, purpose: 'QA concurrent campaign', intervalStart: new Date(draft.startAt), intervalEnd: new Date(draft.endAt), status: 'waiting_payment', version: 0, createdAt: now, updatedAt: now, history: [{ status: 'waiting_payment', version: 0, changedAt: now }] });
    await connection.collection('payment_proofs').insertOne({ adRequestId: request._id, providerId, active: true, status: 'approved', securityState: 'clean' });
    if (index === 3) await assert.rejects(() => calendar.schedule(request._id.toHexString(), 0), /PLACEMENT_CONFLICT/);
    else assert.equal((await calendar.schedule(request._id.toHexString(), 0)).status, 'scheduled');
  }
  console.log('PASS: real Mongo publishes two overlapping homepage banners with order and durations, schedules overlapping approved homepage campaigns, keeps other placement conflicts and supports edited content.');
} finally { await connection.dropDatabase(); await connection.close(); }
