import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { createArticleModels } from '../apps/api/src/modules/articles/models.ts';
import { createMongooseArticleRepository } from '../apps/api/src/modules/articles/repository.ts';
import { createArticleService } from '../apps/api/src/modules/articles/service.ts';
import { registerAboutTeamModels } from '../apps/api/src/modules/cms/about-team-models.ts';
import { registerPopulationTipsModels } from '../apps/api/src/modules/cms/population-models.ts';
import { registerHomepageDisplayModels } from '../apps/api/src/modules/cms/homepage-display-models.ts';
import { createMongooseCmsAdminContentRepository } from '../apps/api/src/modules/cms/admin-content-repository.ts';
import { createCmsAdminContentService } from '../apps/api/src/modules/cms/admin-content-service.ts';
import { createMongooseCommunityReportService } from '../apps/api/src/modules/community/report-service.ts';

const base = process.env.LOCAL_GUIDE_BASE_URL ?? 'http://127.0.0.1:4173';
const runId = `guide22-${Date.now()}-${randomUUID().slice(0, 8)}`;
const requestPrefix = `guide22-content-${runId}`;
const adminPassword = 'LocalPreview-Admin-Only-2026!';
const report = {
  status: 'RUNNING',
  journey: 'GUIDE-22',
  journeys: ['GUIDE-22'],
  environment: 'local-real-http-api-mongodb',
  mockedRoutes: false,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  startedAt: new Date().toISOString(),
  checks: [],
  http: [],
  mongo: {},
  cleanup: false
};

function parseEnvironment(source) {
  const values = {};
  for (const raw of source.split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[key] = value;
  }
  return values;
}

async function request(method, path, token, data, suffix = randomUUID().slice(0, 8)) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(data === undefined ? {} : { 'content-type': 'application/json' }),
      'x-request-id': `${requestPrefix}-${suffix}`
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) })
  });
  report.http.push({ method, path: path.replace(/\b[a-f0-9]{24}\b/gu, ':id'), status: response.status });
  let body;
  try { body = await response.json(); } catch { body = undefined; }
  return { status: response.status, body };
}

function expectStatus(result, expected, label) {
  assert.equal(result.status, expected, `${label}: expected ${expected}, received ${result.status}`);
  return result.body?.data;
}

async function login(email, suffix) {
  const result = await request('POST', '/api/v1/auth/login', undefined, { email, password: adminPassword }, suffix);
  const data = expectStatus(result, 200, `login ${email}`);
  assert.equal(data.user.roleType, 'admin');
  assert.ok(data.accessToken);
  return data.accessToken;
}

const env = parseEnvironment(await readFile('.env.local', 'utf8'));
assert.ok(env.MONGODB_URI, 'MONGODB_URI is missing from .env.local');
const parsedMongo = new URL(env.MONGODB_URI);
assert.ok(['127.0.0.1', 'localhost'].includes(parsedMongo.hostname), 'GUIDE-22 verifier only accepts local MongoDB');
const mongo = await mongoose.createConnection(env.MONGODB_URI).asPromise();
let rollbackMongo;
const created = { categoryId: undefined, articleId: undefined, aboutId: undefined, teamId: undefined, reportId: undefined };
let populationSnapshot = [];
let adminOriginalStatus;
let originalSessionIds = [];

try {
  const admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin' });
  const viewer = await mongo.collection('users').findOne({ normalizedEmail: 'admin.viewer@example.invalid', roleType: 'admin' });
  assert.ok(admin?._id && viewer?._id, 'Local admin fixtures are missing');
  adminOriginalStatus = admin.status;
  originalSessionIds = (await mongo.collection('sessions').find({ userId: { $in: [admin._id, viewer._id] } }, { projection: { _id: 1 } }).toArray()).map(row => row._id.toHexString());
  populationSnapshot = await mongo.collection('cms_population_values').find({}).toArray();

  const adminToken = await login(admin.normalizedEmail, 'admin-login');
  const viewerToken = await login(viewer.normalizedEmail, 'viewer-login');

  expectStatus(await request('GET', '/api/v1/admin/articles'), 401, 'articles require authentication');
  expectStatus(await request('POST', '/api/v1/admin/article-categories', viewerToken, {
    slug: `${runId}-denied`, name: { en: 'Denied' }, displayOrder: 99, active: true, reason: 'Limited administrator must not mutate content'
  }), 403, 'limited admin category mutation');
  expectStatus(await request('PUT', '/api/v1/admin/content/about', viewerToken, {
    key: `${runId.replaceAll('-', '_')}_denied`, title: { en: 'Denied' }, body: { en: 'Denied' }, order: 99, status: 'draft', reason: 'Limited administrator must not mutate CMS content'
  }), 403, 'limited admin CMS mutation');
  report.checks.push('authentication_401_and_limited_admin_403');

  const slug = runId.toLowerCase();
  const categoryInput = {
    slug, name: { ar: 'دليل اختبار محلي', en: 'Local verification guide' }, description: { en: 'Temporary GUIDE-22 evidence' },
    displayOrder: 99, active: true, reason: 'Create temporary GUIDE-22 article category'
  };
  const category = expectStatus(await request('POST', '/api/v1/admin/article-categories', adminToken, categoryInput, 'category-create'), 201, 'create category');
  created.categoryId = category.id;
  expectStatus(await request('POST', '/api/v1/admin/article-categories', adminToken, categoryInput, 'category-duplicate'), 409, 'duplicate category slug');

  const articleInput = {
    categoryId: category.id, slug, title: { ar: 'مقال تحقق محلي', en: 'Local verification article' },
    body: { ar: 'محتوى مؤقت لإثبات دورة النشر.', en: 'Temporary content proving the publication lifecycle.' },
    seoTitle: { en: 'GUIDE-22 local proof' }, seoDescription: { en: 'Safe temporary public projection' },
    reason: 'Create temporary GUIDE-22 editorial draft'
  };
  const draft = expectStatus(await request('POST', '/api/v1/admin/articles', adminToken, articleInput, 'article-create'), 201, 'create article draft');
  created.articleId = draft.id;
  assert.equal(draft.status, 'draft');
  expectStatus(await request('GET', `/api/v1/public/articles/${slug}?locale=en`), 404, 'draft remains private');
  expectStatus(await request('POST', `/api/v1/admin/articles/${draft.id}/transitions`, adminToken, {
    status: 'published', version: 0, reason: 'Publishing must not skip editorial review'
  }, 'article-invalid-transition'), 409, 'invalid direct publication');
  const submitted = expectStatus(await request('POST', `/api/v1/admin/articles/${draft.id}/transitions`, adminToken, {
    status: 'pending_review', version: 0, reason: 'Submit temporary article for editorial review'
  }, 'article-submit'), 200, 'submit article');
  const publishInput = { status: 'published', version: submitted.version, reason: 'Publish reviewed temporary GUIDE-22 article' };
  const concurrentPublish = await Promise.all([
    request('POST', `/api/v1/admin/articles/${draft.id}/transitions`, adminToken, publishInput, 'article-publish-a'),
    request('POST', `/api/v1/admin/articles/${draft.id}/transitions`, adminToken, publishInput, 'article-publish-b')
  ]);
  assert.deepEqual(concurrentPublish.map(item => item.status).sort(), [200, 409]);
  const publicArticle = expectStatus(await request('GET', `/api/v1/public/articles/${slug}?locale=en`), 200, 'published article is public');
  for (const internal of ['authorId', 'status', 'version', 'availableActions']) assert.equal(internal in publicArticle, false, `public article leaked ${internal}`);
  report.checks.push('article_category_duplicate_and_ordered_publication_with_concurrent_409');

  const key = runId.replaceAll('-', '_').slice(0, 60);
  const aboutInput = { key: `${key}_about`.slice(0, 63), title: { ar: 'عن الاختبار', en: 'Verification block' }, body: { ar: 'محتوى مؤقت', en: 'Temporary evidence' }, order: 99, status: 'draft', reason: 'Create temporary About evidence block' };
  expectStatus(await request('PUT', '/api/v1/admin/content/about', adminToken, { ...aboutInput, reason: undefined }, 'about-invalid'), 400, 'About reason validation');
  const aboutData = expectStatus(await request('PUT', '/api/v1/admin/content/about', adminToken, aboutInput, 'about-create'), 200, 'create About block');
  const about = aboutData.items.find(item => item.key === aboutInput.key);
  assert.ok(about);
  created.aboutId = about.id;
  const aboutUpdate = { id: about.id, version: about.version, order: about.order, status: 'published', reason: 'Publish temporary About evidence block' };
  const aboutConcurrent = await Promise.all([
    request('PUT', '/api/v1/admin/content/about', adminToken, aboutUpdate, 'about-publish-a'),
    request('PUT', '/api/v1/admin/content/about', adminToken, aboutUpdate, 'about-publish-b')
  ]);
  assert.deepEqual(aboutConcurrent.map(item => item.status).sort(), [200, 409]);

  const teamInput = { key: `${key}_team`.slice(0, 63), name: { ar: 'عضو مؤقت', en: 'Temporary member' }, title: { ar: 'اختبار', en: 'Verification' }, bio: { en: 'Temporary GUIDE-22 evidence' }, category: 'content', order: 99, status: 'draft', reason: 'Create temporary Team evidence member' };
  const teamData = expectStatus(await request('PUT', '/api/v1/admin/content/team', adminToken, teamInput, 'team-create'), 200, 'create Team member');
  const team = teamData.items.find(item => item.key === teamInput.key);
  assert.ok(team);
  created.teamId = team.id;
  expectStatus(await request('PUT', '/api/v1/admin/content/team', adminToken, { id: team.id, version: team.version, order: team.order, status: 'published', reason: 'Publish temporary Team evidence member' }, 'team-publish'), 200, 'publish Team member');

  const currentPopulation = expectStatus(await request('GET', '/api/v1/admin/content/population', adminToken), 200, 'read population').items[0];
  const populationInput = {
    ...(currentPopulation ? { version: currentPopulation.version } : {}), status: 'available', value: 342801,
    sourceLabel: { ar: 'مصدر اختبار محلي', en: 'Local verification source' }, sourceUrl: 'https://example.test/guide22-population',
    asOf: '2026-09-12T00:00:00.000Z', reason: 'Verify sourced population update for GUIDE-22'
  };
  expectStatus(await request('PUT', '/api/v1/admin/content/population', adminToken, { status: 'available', value: 1, reason: 'Reject unsourced population' }, 'population-invalid'), 400, 'population source validation');
  expectStatus(await request('PUT', '/api/v1/admin/content/population', adminToken, populationInput, 'population-write'), 200, 'write sourced population');
  expectStatus(await request('PUT', '/api/v1/admin/content/population', adminToken, populationInput, 'population-stale'), 409, 'stale population version');
  report.checks.push('cms_about_team_population_validation_publish_and_concurrent_409');

  const publishedPost = await mongo.collection('community_posts').findOne({ status: 'published' }, { projection: { id: 1 } });
  assert.ok(publishedPost?.id, 'No published community post exists for report verification');
  const reportInput = { reason: 'spam', details: `Temporary duplicate-report proof ${runId}` };
  const createdReport = expectStatus(await request('POST', `/api/v1/public/community/posts/${publishedPost.id}/reports`, adminToken, reportInput, 'report-create'), 201, 'create community report');
  created.reportId = createdReport.id;
  expectStatus(await request('POST', `/api/v1/public/community/posts/${publishedPost.id}/reports`, adminToken, reportInput, 'report-duplicate'), 409, 'duplicate community report');
  expectStatus(await request('GET', `/api/v1/admin/community/reports?postId=${publishedPost.id}&page=1&limit=20`, viewerToken), 403, 'limited report access');
  const resolution = { version: 0, action: 'resolve', reason: 'Resolve temporary GUIDE-22 community report' };
  const concurrentResolution = await Promise.all([
    request('POST', `/api/v1/admin/community/reports/${createdReport.id}/resolve`, adminToken, resolution, 'report-resolve-a'),
    request('POST', `/api/v1/admin/community/reports/${createdReport.id}/resolve`, adminToken, resolution, 'report-resolve-b')
  ]);
  assert.deepEqual(concurrentResolution.map(item => item.status).sort(), [200, 409]);
  report.checks.push('community_report_duplicate_rbac_resolve_and_concurrent_409');

  const articleRow = await mongo.collection('articles').findOne({ _id: new mongoose.Types.ObjectId(created.articleId) });
  const reportRow = await mongo.collection('community_reports').findOne({ id: created.reportId });
  const targetIds = Object.values(created).filter(Boolean);
  const audits = await mongo.collection('audit_logs').find({ $or: [
    { targetId: { $in: targetIds } },
    { requestId: { $regex: `^${requestPrefix}` } }
  ] }).sort({ occurredAt: 1 }).toArray();
  assert.equal(articleRow?.status, 'published');
  assert.equal(articleRow?.version, 2);
  assert.equal(reportRow?.status, 'resolved');
  assert.equal(reportRow?.version, 1);
  assert.ok(audits.length >= 9, `Expected at least 9 mutation audits, received ${audits.length}`);
  assert.ok(audits.every(row => typeof row.reason === 'string' && row.reason.length >= 5));
  report.mongo = { collections: ['article_categories', 'articles', 'cms_about_blocks', 'cms_team_members', 'cms_population_values', 'community_reports', 'audit_logs'], articleStatus: articleRow.status, articleVersion: articleRow.version, reportStatus: reportRow.status, reportVersion: reportRow.version, auditCount: audits.length, auditActions: audits.map(row => row.action) };

  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: 'suspended' } });
  const suspendedDenial = await request('GET', '/api/v1/admin/articles?page=1&limit=1', adminToken, undefined, 'current-state-denied');
  assert.ok([401, 403].includes(suspendedDenial.status), `current suspended account denial returned ${suspendedDenial.status}`);
  report.currentAccountDenialStatus = suspendedDenial.status;
  await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: adminOriginalStatus } });
  report.checks.push('current_admin_account_state_enforced');

  const rollbackUri = new URL(env.MONGODB_URI);
  rollbackUri.pathname = `/guide22_rollback_${Date.now()}`;
  rollbackMongo = await mongoose.createConnection(rollbackUri.toString()).asPromise();
  rollbackMongo.base.set('transactionAsyncLocalStorage', true);
  const failAudit = { async record() { throw new Error('GUIDE22_FORCED_AUDIT_FAILURE'); } };
  const allow = { async authorize() { return true; } };
  const actorId = new mongoose.Types.ObjectId().toHexString();
  const articleRollback = createArticleService({
    repository: createMongooseArticleRepository(createArticleModels(rollbackMongo)), authorization: allow, audit: failAudit,
    transaction: operation => rollbackMongo.transaction(operation)
  });
  await assert.rejects(articleRollback.createCategory({ userId: actorId }, {
    slug: 'rollback-category', name: { en: 'Rollback category' }, displayOrder: 1, active: true,
    reason: 'Force article audit rollback'
  }, { requestId: 'guide22-rollback-article', traceId: 'a'.repeat(32) }), /GUIDE22_FORCED_AUDIT_FAILURE/u);
  assert.equal(await rollbackMongo.collection('article_categories').countDocuments({}), 0);

  const aboutTeam = registerAboutTeamModels(rollbackMongo);
  const populationTips = registerPopulationTipsModels(rollbackMongo);
  const homepageDisplay = registerHomepageDisplayModels(rollbackMongo);
  const cmsRollback = createCmsAdminContentService({
    repository: createMongooseCmsAdminContentRepository({
      about: aboutTeam.about, team: aboutTeam.team, population: populationTips.population,
      tips: populationTips.tips, sections: homepageDisplay.sections, settings: homepageDisplay.settings
    }), authorization: allow, audit: failAudit, transaction: operation => rollbackMongo.transaction(operation)
  });
  await assert.rejects(cmsRollback.put({ userId: actorId }, 'about', {
    key: 'rollback_about', title: { en: 'Rollback About' }, body: { en: 'Must not persist' },
    order: 1, status: 'draft', reason: 'Force CMS audit rollback'
  }, { requestId: 'guide22-rollback-cms', traceId: 'b'.repeat(32) }), /GUIDE22_FORCED_AUDIT_FAILURE/u);
  assert.equal(await rollbackMongo.collection('cms_about_blocks').countDocuments({}), 0);
  await rollbackMongo.collection('users').insertOne({
    _id: new mongoose.Types.ObjectId(actorId), normalizedEmail: 'rollback@example.invalid', roleType: 'seeker',
    status: 'verified', locale: 'en', statusChangedAt: new Date(), createdAt: new Date(), updatedAt: new Date(), version: 0
  });
  const claims = { sub: actorId, role: 'seeker', status: 'verified', iat: 1, exp: 9_999_999_999, jti: randomUUID() };
  const reportRollback = createMongooseCommunityReportService(rollbackMongo, allow, failAudit);
  await assert.rejects(reportRollback.create(claims, {
    postId: new mongoose.Types.ObjectId().toHexString(), reason: 'spam', details: 'Must roll back with audit failure'
  }, { requestId: 'guide22-rollback-report', traceId: 'c'.repeat(32) }), /GUIDE22_FORCED_AUDIT_FAILURE/u);
  assert.equal(await rollbackMongo.collection('community_reports').countDocuments({}), 0);
  report.atomicAuditRollback = { articleMutationRolledBack: true, cmsMutationRolledBack: true,
    communityReportMutationRolledBack: true, auditFailureInjected: true };
  report.checks.push('article_cms_and_report_audit_failure_roll_back_mutations');
  report.status = 'PASS_LOCAL';
  report.remaining = ['Production verification remains intentionally deferred while the project stays in Demo mode.'];
} catch (error) {
  report.status = 'FAIL_LOCAL';
  report.failure = error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
  process.exitCode = 1;
} finally {
  try {
    if (rollbackMongo) {
      await rollbackMongo.dropDatabase();
      await rollbackMongo.close();
      rollbackMongo = undefined;
    }
    const admin = await mongo.collection('users').findOne({ normalizedEmail: 'admin.demo@example.invalid', roleType: 'admin' });
    if (admin?._id && adminOriginalStatus) await mongo.collection('users').updateOne({ _id: admin._id }, { $set: { status: adminOriginalStatus } });
    const targetIds = Object.values(created).filter(Boolean);
    if (created.articleId) await mongo.collection('articles').deleteMany({ _id: new mongoose.Types.ObjectId(created.articleId) });
    if (created.categoryId) await mongo.collection('article_categories').deleteMany({ _id: new mongoose.Types.ObjectId(created.categoryId) });
    if (created.aboutId) await mongo.collection('cms_about_blocks').deleteMany({ _id: new mongoose.Types.ObjectId(created.aboutId) });
    if (created.teamId) await mongo.collection('cms_team_members').deleteMany({ _id: new mongoose.Types.ObjectId(created.teamId) });
    if (created.reportId) await mongo.collection('community_reports').deleteMany({ id: created.reportId });
    await mongo.collection('cms_population_values').deleteMany({});
    if (populationSnapshot.length) await mongo.collection('cms_population_values').insertMany(populationSnapshot);
    if (targetIds.length) await mongo.collection('audit_logs').deleteMany({ targetId: { $in: targetIds } });
    await mongo.collection('audit_logs').deleteMany({ requestId: { $regex: `^${requestPrefix}` } });
    const original = originalSessionIds.map(id => new mongoose.Types.ObjectId(id));
    const users = await mongo.collection('users').find({ normalizedEmail: { $in: ['admin.demo@example.invalid', 'admin.viewer@example.invalid'] } }, { projection: { _id: 1 } }).toArray();
    const sessionFilter = { userId: { $in: users.map(row => row._id) }, ...(original.length ? { _id: { $nin: original } } : {}) };
    const extraSessions = await mongo.collection('sessions').find(sessionFilter, { projection: { _id: 1 } }).toArray();
    if (extraSessions.length) {
      await mongo.collection('sessions').deleteMany({ _id: { $in: extraSessions.map(row => row._id) } });
      await mongo.collection('audit_logs').deleteMany({ targetType: 'auth_session', targetId: { $in: extraSessions.map(row => row._id.toHexString()) } });
    }
    const residue = {
      articles: created.articleId ? await mongo.collection('articles').countDocuments({ _id: new mongoose.Types.ObjectId(created.articleId) }) : 0,
      categories: created.categoryId ? await mongo.collection('article_categories').countDocuments({ _id: new mongoose.Types.ObjectId(created.categoryId) }) : 0,
      about: created.aboutId ? await mongo.collection('cms_about_blocks').countDocuments({ _id: new mongoose.Types.ObjectId(created.aboutId) }) : 0,
      team: created.teamId ? await mongo.collection('cms_team_members').countDocuments({ _id: new mongoose.Types.ObjectId(created.teamId) }) : 0,
      reports: created.reportId ? await mongo.collection('community_reports').countDocuments({ id: created.reportId }) : 0,
      audits: await mongo.collection('audit_logs').countDocuments({ requestId: { $regex: `^${requestPrefix}` } }),
      sessions: await mongo.collection('sessions').countDocuments(sessionFilter)
    };
    assert.ok(Object.values(residue).every(value => value === 0), `Cleanup residue: ${JSON.stringify(residue)}`);
    assert.equal(await mongo.collection('cms_population_values').countDocuments({}), populationSnapshot.length);
    report.cleanup = true;
    report.cleanupResidue = residue;
    report.populationRestored = true;
  } catch (cleanupError) {
    report.cleanup = false;
    report.cleanupFailure = cleanupError instanceof Error ? cleanupError.message.slice(0, 1000) : String(cleanupError).slice(0, 1000);
    report.status = 'FAIL_LOCAL';
    process.exitCode = 1;
  }
  if (rollbackMongo) await rollbackMongo.close().catch(() => undefined);
  await mongo.close();
  report.finishedAt = new Date().toISOString();
  await mkdir('docs/quality/guide-runs', { recursive: true });
  await writeFile('docs/quality/guide-runs/guide22-content-mutations-local-latest.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(`GUIDE22_CONTENT_MUTATIONS_${report.status} checks=${report.checks.length} cleanup=${report.cleanup}`);
}
