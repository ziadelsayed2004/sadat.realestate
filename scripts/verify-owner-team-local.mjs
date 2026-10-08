import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { createCmsAdminContentRuntime } from '../apps/api/src/modules/cms/admin-content-runtime.ts';
import { createPublicAboutTeamRuntime } from '../apps/api/src/modules/cms/public-runtime.ts';
import { createAuditModels } from '../apps/api/src/modules/audit/models.ts';
import { createMongooseAuditWriter } from '../apps/api/src/modules/audit/writer.ts';
const database = `qa_owner_team_${randomUUID().replaceAll('-', '')}`;
const connection = await mongoose.createConnection(`mongodb://127.0.0.1:27031/${database}?replicaSet=adcampaignqa`).asPromise();
try {
  const models = createAuditModels(connection); await models.AuditLog.init();
  const audit = createMongooseAuditWriter(models); const userId = new mongoose.Types.ObjectId().toHexString();
  const runtime = createCmsAdminContentRuntime(connection, {}, audit, { authorize: async () => true }, { mode: 'memory', scannerMode: 'deterministic-fake' });
  const context = { requestId: 'qa-team', traceId: 'c'.repeat(32) }; const claims = { sub: userId, role: 'admin', status: 'verified' };
  const result = await runtime.categories.put(claims, { label: { ar: 'التسويق', en: 'Marketing' }, reason: 'إنشاء قسم التسويق' }, context);
  const category = result.items.find(item => item.label.en === 'Marketing'); assert.ok(category);
  const saved = await runtime.service.put({ userId }, 'team', { name: { ar: 'عضو اختبار' }, title: { ar: 'مدير التسويق' }, category: category.key, status: 'published', active: true, order: 0, reason: 'إضافة عضو وتصنيفه' }, context);
  assert.equal(saved.items[0].category, category.key);
  const reopened = await runtime.service.get({ userId }, 'team'); assert.equal(reopened.items[0].category, category.key);
  const published = createPublicAboutTeamRuntime(connection); assert.equal((await published.service.listTeam())[0].category, category.key);
  await runtime.categories.put(claims, { ...category, label: { ar: 'فريق التسويق', en: 'Marketing team' }, reason: 'تعديل اسم القسم' }, context);
  assert.equal((await published.categories.list()).find(item => item.key === category.key).label.ar, 'فريق التسويق');
  await assert.rejects(runtime.categories.put(claims, { ...category, reason: 'تغيير بإصدار قديم' }, context), error => error.statusCode === 409);
  console.log('PASS: create/rename custom category, assign/reopen member, public projection, stale edit rejected.');
} finally { await connection.dropDatabase(); await connection.close(); }
