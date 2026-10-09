import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { createMongooseRequestRepository } from '../apps/api/src/modules/requests/repository.ts';
import { createRequestService } from '../apps/api/src/modules/requests/service.ts';
import { createApiServer, startApiServer, stopApiServer } from '../apps/api/src/server.ts';

const database = `qa_platform_contact_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`, { serverSelectionTimeoutMS: 15000 }).asPromise();
let server;
try {
  const propertyId = new mongoose.Types.ObjectId('6700000000000000000000c0');
  const organizationId = new mongoose.Types.ObjectId('67000000000000000000007f');
  const projectId = new mongoose.Types.ObjectId('670000000000000000000006');
  const seekerId = new mongoose.Types.ObjectId();
  await connection.collection('users').insertOne({ _id: seekerId, roleType: 'seeker', status: 'verified' });
  await connection.collection('properties').insertOne({ _id: propertyId, slug: 'demo-central-office', kind: 'property', name: { en: 'Local office fixture' }, transactionType: 'sale', sourceType: 'developer_company', organizationId, projectId, status: 'published', active: true });
  await connection.collection('organizations').insertOne({ _id: organizationId, status: 'approved', providerId: new mongoose.Types.ObjectId(), name: { en: 'Local company fixture' }, slug: 'local-company' });
  // A legacy project association and absent provider profile must not block the platform team.
  await connection.collection('projects').insertOne({ _id: projectId, organizationId: new mongoose.Types.ObjectId(), status: 'published' });
  const service = createRequestService({ repository: createMongooseRequestRepository(connection) });
  const tokens = { issue: () => 'local', verify(token) {
    if (!['seeker', 'provider'].includes(token)) throw new Error('Invalid local token');
    return { iss: 'sadat-real-estate-api', aud: 'sadat-real-estate', sub: String(seekerId), sid: String(seekerId), role: token, status: 'verified', iat: 1, exp: 9999999999, jti: 'local' };
  } };
  server = createApiServer({ database: { isReady: async () => true }, requests: { accessTokens: tokens, service } });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  const url = `http://127.0.0.1:${address.port}/api/v1/seeker/contact-requests`;
  const payload = { propertyId: String(propertyId), organizationId: String(organizationId), projectId: String(projectId), contactChannel: 'platform', fullName: 'Local QA seeker', phone: '01039938831', preferredContactTime: 'morning', message: 'Local QA contact request', locale: 'ar' };
  const send = (body, token = 'seeker') => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  assert.equal((await send(payload, '')).status, 401);
  assert.equal((await send(payload, 'provider')).status, 403);
  const response = await send(payload);
  assert.equal(response.status, 201);
  const created = (await response.json()).data;
  const stored = await connection.collection('requests').findOne({ _id: new mongoose.Types.ObjectId(created.id) });
  assert.equal(stored.status, 'new');
  assert.deepEqual(stored.payload, { ...payload, organizationSlug: 'local-company', organizationNameEn: 'Local company fixture' });
  assert.equal(stored.providerId, undefined);
  assert.equal(await connection.collection('notifications').countDocuments({ audience: 'provider' }), 0);
  assert.equal((await send(payload)).status, 409);
  assert.equal((await send({ ...payload, contactChannel: 'provider' })).status, 404);
  assert.equal((await send({ ...payload, projectId: String(new mongoose.Types.ObjectId()) })).status, 404);
  assert.equal((await send({ ...payload, organizationId: String(new mongoose.Types.ObjectId()) })).status, 404);
  assert.equal(await connection.collection('requests').countDocuments(), 1);
  console.log('PASS: platform property request persists through the real HTTP/Mongo flow; direct, forged, duplicate and wrong-role requests stay protected.');
} finally {
  if (server) await stopApiServer(server);
  await connection.dropDatabase();
  await connection.close();
}
