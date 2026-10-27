import assert from 'node:assert/strict';
import test from 'node:test';

test('generates CMS keys for About, team and tips without making update requests create new records', async () => {
  const { service } = createService();
  const context = { requestId: 'auto-cms', traceId: 'a'.repeat(32) };
  for (const namespace of ['about', 'team', 'tips'] as const) {
    const output = await service.put({ userId: adminId }, namespace, { title: { ar: 'عنوان' }, ...(namespace === 'team' ? { name: { ar: 'أحمد' } } : { body: { ar: 'محتوى' } }), order: 0, reason: 'Create automatic CMS key' }, context);
    const item = output.items[0]!;
    assert.ok('key' in item);
    assert.match(item.key as string, /^(about|team|tip)_[a-f0-9]{32}$/);
    const updated = await service.put({ userId: adminId }, namespace, { id: item.id, version: item.version, title: { en: 'Changed title' }, order: 1, reason: 'Update saved record' }, context);
    assert.equal(updated.items[0] && 'key' in updated.items[0] ? updated.items[0].key : undefined, item.key);
  }
});
import type {
  CmsAdminContentRepository,
  StoredAboutBlock,
  StoredDisplaySetting,
  StoredHomepageSection,
  StoredPopulationValue,
  StoredTip,
  StoredTeamMember
} from '../../src/modules/cms/admin-content-repository.js';
import { createCmsAdminContentService, CmsAdminContentServiceError } from '../../src/modules/cms/admin-content-service.js';
import { createMongooseCmsAdminContentRepository, type CmsAdminContentModels } from '../../src/modules/cms/admin-content-repository.js';
import { Types } from 'mongoose';

const adminId = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const changedAt = new Date('2026-08-19T11:00:00.000Z');

test('accepts omitted tip order, preserves order on editing and honors explicit order', async () => {
  const { service } = createService();
  const context = { requestId: 'tip-order', traceId: 'a'.repeat(32) };
  const created = await service.put({ userId: adminId }, 'tips', { title: { en: 'New tip' }, body: { en: 'Review documents.' }, reason: 'Create without order' }, context);
  assert.equal(created.namespace, 'tips');
  const row = created.items[0]!;
  assert.equal('order' in row && row.order, 2);
  const edited = await service.put({ userId: adminId }, 'tips', { id: row.id, version: row.version, title: { en: 'Edited tip' }, reason: 'Keep existing order' }, context);
  assert.equal('order' in edited.items[0]! && edited.items[0].order, 2);
  const explicit = await service.put({ userId: adminId }, 'tips', { id: row.id, version: row.version + 1, order: 0, reason: 'Move to the beginning' }, context);
  assert.equal('order' in explicit.items[0]! && explicit.items[0].order, 0);
});

test('automatic tip order uses the largest stored order outside the limited list, while explicit zero bypasses it', async () => {
  let lookups = 0;
  const models = { tips: {
    findOne() { lookups++; return { sort(value: unknown) { assert.deepEqual(value, { order: -1, _id: -1 }); return { select(fields: unknown) { assert.deepEqual(fields, { order: 1 }); return { async lean() { return lookups === 1 ? { order: 420 } : null; } }; } }; } }; },
    async create(input: Record<string, unknown>) { return { toObject: () => ({ ...input, _id: new Types.ObjectId(secondId), version: 0 }) }; }
  } } as unknown as CmsAdminContentModels;
  const store = createMongooseCmsAdminContentRepository(models);
  const input = { key: 'last_tip', title: { en: 'Tip' }, body: { en: 'Body' }, active: true, status: 'draft' as const };
  const result = await store.createTip(input, adminId, changedAt);
  assert.equal(result.kind === 'written' && result.item.order, 421);
  const explicit = await store.createTip({ ...input, order: 0 }, adminId, changedAt);
  assert.equal(explicit.kind === 'written' && explicit.item.order, 0);
  assert.equal(lookups, 1);
  const first = await store.createTip(input, adminId, changedAt);
  assert.equal(first.kind === 'written' && first.item.order, 0);
});

test('persists About statistics with version checks, audit and preservation on unrelated edits', async () => {
  const { service, audits } = createService();
  const stats = [{ value: '0', label: { ar: 'طلبات', en: 'Requests' }, visible: true }, { value: '9K+', label: { en: 'Residents' }, visible: false }];
  const context = { requestId: 'about-stats', traceId: 'a'.repeat(32) };
  const saved = await service.put({ userId: adminId }, 'about', { id: adminId, version: 2, order: 0, stats, reason: 'Update About statistics' }, context);
  assert.equal(saved.namespace, 'about');
  if (saved.namespace !== 'about') return;
  assert.deepEqual(saved.items[0]?.stats, stats);
  await assert.rejects(service.put({ userId: adminId }, 'about', { id: adminId, version: 2, order: 0, stats: [], reason: 'Overwrite old version' }, context), (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT');
  const updated = await service.put({ userId: adminId }, 'about', { id: adminId, version: 3, order: 1, reason: 'Reorder About section' }, context);
  if (updated.namespace === 'about') assert.deepEqual(updated.items[0]?.stats, stats);
  assert.deepEqual(audits, ['cms.about.write', 'cms.about.write']);
  const denied = createService({ manage: false });
  await assert.rejects(denied.service.put({ userId: adminId }, 'about', { id: adminId, version: 2, order: 0, stats, reason: 'Update About statistics' }, context), (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_FORBIDDEN');
});

function repository(): CmsAdminContentRepository {
  let teamDeleted = false;
  let about: StoredAboutBlock = {
    id: adminId,
    key: 'mission',
    title: { en: 'Mission' },
    body: { en: 'A published mission.' },
    order: 0,
    active: true,
    status: 'published',
    updatedBy: adminId,
    version: 2,
    updatedAt: changedAt
  };
  let team: StoredTeamMember = {
    id: secondId,
    key: 'leader',
    name: { en: 'Team lead' },
    title: { en: 'Platform lead' },
    bio: { en: 'A published biography.' },
    order: 0,
    active: true,
    status: 'published',
    updatedBy: adminId,
    version: 1,
    updatedAt: changedAt
  };
  let population: StoredPopulationValue | null = null;
  let tip: StoredTip = {
    id: '3123456789abcdef01234567', key: 'buying', title: { en: 'Buying safely' },
    body: { en: 'Review the source before paying.' }, order: 1, active: true, status: 'published',
    updatedBy: adminId, version: 1, updatedAt: changedAt
  };
  let homepage: StoredHomepageSection = {
    id: '4123456789abcdef01234567', key: 'hero', title: { en: 'Featured homes' },
    body: { en: 'Approved homepage section.' }, order: 0, visible: true, status: 'published',
    updatedBy: adminId, version: 1, updatedAt: changedAt
  };
  let display: StoredDisplaySetting = {
    id: '5123456789abcdef01234567', key: 'show_search', value: { kind: 'boolean', value: true },
    status: 'published', updatedBy: adminId, version: 1, updatedAt: changedAt
  };
  return {
    async listAbout() { return [about]; },
    async findAbout(id) { return id === about.id ? about : null; },
    async createAbout(input, actorId, at) {
      about = { id: adminId, ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: about };
    },
    async updateAbout(id, version, input, actorId, at) {
      if (id !== about.id) return { kind: 'not_found' };
      if (version !== about.version) return { kind: 'version_conflict' };
      about = { ...about, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
      return { kind: 'written', item: about };
    },
    async listTeam() { return teamDeleted ? [] : [team]; },
    async findTeam(id) { return !teamDeleted && id === team.id ? team : null; },
    async createTeam(input, actorId, at) {
      team = { id: secondId, ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: team };
    },
    async updateTeam(id, version, input, actorId, at) {
      if (teamDeleted || id !== team.id) return { kind: 'not_found' };
      if (version !== team.version) return { kind: 'version_conflict' };
      team = { ...team, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
      for (const field of ['bio', 'photoAssetId', 'imageUrl', 'category'] as const) if (input[field] === null) delete team[field];
      return { kind: 'written', item: team };
    },
    async deleteTeam(id, version) {
      if (teamDeleted || id !== team.id) return { kind: 'not_found' };
      if (version !== team.version) return { kind: 'version_conflict' };
      teamDeleted = true;
      return { kind: 'written', item: team };
    },
    async getPopulation() { return population; },
    async createPopulation(input, actorId, at) {
      population = { id: '2123456789abcdef01234567', ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return population;
    },
    async updatePopulation(id, version, input, actorId, at) {
      if (!population || id !== population.id) return { kind: 'not_found' };
      if (version !== population.version) return { kind: 'version_conflict' };
      if (input.value === null) {
        const withoutValue = { ...population };
        delete withoutValue.value;
        const withoutNewValue = { ...input };
        delete withoutNewValue.value;
        population = { ...withoutValue, ...withoutNewValue, updatedBy: actorId, version: version + 1, updatedAt: at };
      } else {
        population = { ...population, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
      }
      return { kind: 'written', item: population };
    },
    async listTips() { return [tip]; },
    async createTip(input, actorId, at) {
      tip = { id: tip.id, ...input, order: input.order ?? tip.order + 1, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: tip };
    },
    async updateTip(id, version, input, actorId, at) {
      if (id !== tip.id) return { kind: 'not_found' };
      if (version !== tip.version) return { kind: 'version_conflict' };
      tip = { ...tip, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
      return { kind: 'written', item: tip };
    },
    async listHomepageSections() { return [homepage]; },
    async createHomepageSection(input, actorId, at) {
      homepage = { id: homepage.id, ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: homepage };
    },
    async updateHomepageSection(id, version, input, actorId, at) {
      if (id !== homepage.id) return { kind: 'not_found' };
      if (version !== homepage.version) return { kind: 'version_conflict' };
      const { eyebrow, body, ...changes } = input;
      homepage = { ...homepage, ...changes, ...(eyebrow ? { eyebrow } : {}), ...(body ? { body } : {}), updatedBy: actorId, version: version + 1, updatedAt: at };
      if (eyebrow === null) delete homepage.eyebrow;
      if (body === null) delete homepage.body;
      return { kind: 'written', item: homepage };
    },
    async listDisplaySettings() { return [display]; },
    async createDisplaySetting(input, actorId, at) {
      display = { id: display.id, ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: display };
    },
    async updateDisplaySetting(id, version, input, actorId, at) {
      if (id !== display.id) return { kind: 'not_found' };
      if (version !== display.version) return { kind: 'version_conflict' };
      display = { ...display, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
      return { kind: 'written', item: display };
    }
  };
}

test('stops and resumes homepage content without losing text, with audit, permissions and version checks', async () => {
  const { service, audits } = createService({ publish: false });
  const id = '4123456789abcdef01234567';
  const context = { requestId: 'section-visibility', traceId: 'a'.repeat(32) };
  const stopped = await service.put({ userId: adminId }, 'homepage', { id, version: 1, status: 'inactive', visible: false, reason: 'Temporarily hide section' }, context);
  assert.equal(stopped.namespace, 'homepage');
  if (stopped.namespace !== 'homepage') return;
  assert.equal(stopped.items[0]?.status, 'inactive');
  assert.equal(stopped.items[0]?.visible, false);
  assert.equal(stopped.items[0]?.title.en, 'Featured homes');
  assert.equal(stopped.items[0]?.body?.en, 'Approved homepage section.');
  await assert.rejects(service.put({ userId: adminId }, 'homepage', { id, version: 2, status: 'published', visible: true, reason: 'Resume hidden section' }, context),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_PUBLISH_FORBIDDEN');
  assert.deepEqual(audits, ['cms.homepage.write']);

  const allowed = createService();
  await allowed.service.put({ userId: adminId }, 'homepage', { id, version: 1, status: 'inactive', visible: false, reason: 'Temporarily hide section' }, context);
  await assert.rejects(allowed.service.put({ userId: adminId }, 'homepage', { id, version: 1, status: 'published', visible: true, reason: 'Resume stale section' }, context),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT');
  const resumed = await allowed.service.put({ userId: adminId }, 'homepage', { id, version: 2, status: 'published', visible: true, reason: 'Resume hidden section' }, context);
  if (resumed.namespace !== 'homepage') return;
  assert.equal(resumed.items[0]?.status, 'published'); assert.equal(resumed.items[0]?.visible, true);
  assert.equal(resumed.items[0]?.version, 3); assert.equal(resumed.items[0]?.title.en, 'Featured homes');
  assert.deepEqual(allowed.audits, ['cms.homepage.write', 'cms.homepage.write']);
});

function createService(options: { manage?: boolean; publish?: boolean; validateTeamCategory?: (key: string) => Promise<void>; automaticPopulation?: () => Promise<import('../../src/modules/cms/automatic-population.js').PopulationSnapshot | null> } = {}) {
  const audits: string[] = [];
  const created = createCmsAdminContentService({
    repository: repository(),
    ...(options.validateTeamCategory ? { validateTeamCategory: options.validateTeamCategory } : {}),
    ...(options.automaticPopulation ? { automaticPopulation: options.automaticPopulation } : {}),
    authorization: {
      async authorize(_userId, permission) {
        if (permission === 'admin:content.manage') return options.manage ?? true;
        if (permission === 'admin:content.publish') return options.publish ?? true;
        return true;
      }
    },
    audit: { async record(input) { audits.push(input.action); return 'audit-id'; } },
    now: () => new Date('2026-08-19T12:00:00.000Z')
  });
  return { service: created, audits };
}

test('saves multiple departments, preserves inactive assignments and legacy updates, and clears all without resurrection', async () => {
  const checked: string[] = [];
  const { service } = createService({ validateTeamCategory: async key => { checked.push(key); if (key === 'missing') throw new Error('Department unavailable'); } });
  const context = { requestId: 'multiple-departments', traceId: 'a'.repeat(32) };
  const read = async () => { const data = await service.get({ userId: adminId }, 'team'); if (data.namespace !== 'team') throw Error('Expected team'); return data.items[0]!; };
  await service.put({ userId: adminId }, 'team', { id: secondId, version: 1, order: 0, categories: ['sales', 'support'], reason: 'Assign sales and support' }, context);
  assert.deepEqual((await read()).categories, ['sales', 'support']);
  assert.equal((await read()).category, 'sales');
  assert.deepEqual(checked, ['sales', 'support']);
  await service.put({ userId: adminId }, 'team', { id: secondId, version: 2, order: 0, title: { en: 'Senior sales and support' }, reason: 'Update member title only' }, context);
  assert.deepEqual((await read()).categories, ['sales', 'support']);
  await assert.rejects(service.put({ userId: adminId }, 'team', { id: secondId, version: 3, order: 0, categories: ['sales', 'missing'], reason: 'Invalid department assignment' }, context), /Department unavailable/);
  assert.equal((await read()).version, 3);
  await service.put({ userId: adminId }, 'team', { id: secondId, version: 3, order: 0, categories: [], reason: 'Remove all member departments' }, context);
  assert.deepEqual((await read()).categories, []); assert.equal((await read()).category, undefined);
  await service.put({ userId: adminId }, 'team', { id: secondId, version: 4, order: 0, category: 'sales', reason: 'Legacy client chooses one department' }, context);
  assert.deepEqual((await read()).categories, ['sales']);
});

test('automatic population is read-only and does not overwrite manual About statistics', async () => {
  const { service, audits } = createService({ automaticPopulation: async () => ({ value: 79120, year: 2026, checkedAt: '2026-10-11T10:00:00.000Z' }) });
  const output = await service.get({ userId: adminId }, 'population');
  assert.equal(output.namespace, 'population');
  if (output.namespace !== 'population') return;
  assert.equal(output.items[0]?.automatic, true);
  assert.equal(output.items[0]?.value, 79120);
  assert.equal(output.items[0]?.updatedBy, undefined);
  assert.deepEqual(output.items[0]?.availableActions, []);
  await assert.rejects(service.put({ userId: adminId }, 'population', { status: 'unavailable', reason: 'Attempt manual override' }, { requestId: 'population', traceId: 'a'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_FORBIDDEN');
  assert.deepEqual(audits, []);
  const context = { requestId: 'manual-buildings', traceId: 'a'.repeat(32) };
  const stats = [{ value: '123', label: { ar: 'المباني', en: 'Buildings' }, visible: true }];
  const about = await service.put({ userId: adminId }, 'about', { id: adminId, version: 2, order: 0, stats, reason: 'Update manual building count' }, context);
  assert.equal(about.namespace, 'about');
  if (about.namespace === 'about') assert.deepEqual(about.items[0]?.stats, stats);
});

test('saves and clears the bounded bilingual homepage introductory text using the existing permission and version boundary', async () => {
  const { service, audits } = createService();
  const initial = await service.get({ userId: adminId }, 'homepage');
  assert.equal(initial.namespace, 'homepage'); if (initial.namespace !== 'homepage') return;
  const hero = initial.items[0]!;
  const context = { requestId: 'hero-intro', traceId: 'a'.repeat(32) };
  const eyebrow = { ar: 'نص مقدمة جديد', en: 'New introductory text' };
  const saved = await service.put({ userId: adminId }, 'homepage', { id: hero.id, version: hero.version, eyebrow, reason: 'Update homepage introduction' }, context);
  if (saved.namespace !== 'homepage') throw new Error('Wrong namespace');
  assert.deepEqual(saved.items[0]!.eyebrow, eyebrow);
  await assert.rejects(service.put({ userId: adminId }, 'homepage', { id: hero.id, version: saved.items[0]!.version, eyebrow: { en: 'x'.repeat(121) }, reason: 'Reject long introductory text' }, context));
  const cleared = await service.put({ userId: adminId }, 'homepage', { id: hero.id, version: saved.items[0]!.version, eyebrow: null, reason: 'Restore default introductory text' }, context);
  if (cleared.namespace !== 'homepage') throw new Error('Wrong namespace');
  assert.equal(cleared.items[0]!.eyebrow, undefined);
  assert.equal(audits.filter(action => action === 'cms.homepage.write').length, 2);
  await assert.rejects(createService({ manage: false }).service.put({ userId: adminId }, 'homepage', { id: hero.id, version: hero.version, eyebrow, reason: 'Unauthorized introduction change' }, context));
});

test('attaches a verified uploaded portrait and clears both the photo ID and displayed URL on removal', async () => {
  const id = 'd'.repeat(24); const checked: string[] = [];
  const service = createCmsAdminContentService({ repository: repository(), authorization: { async authorize() { return true; } }, audit: { async record() { return 'audit'; } }, validateTeamPhoto: async value => { checked.push(value); } });
  const context = { requestId: 'photo-save', traceId: 'a'.repeat(32) };
  const saved = await service.put({ userId: adminId }, 'team', { id: secondId, version: 1, order: 0, photoAssetId: id, reason: 'Attach team portrait' }, context);
  assert.equal(saved.namespace, 'team');
  if (saved.namespace !== 'team') return;
  assert.equal(saved.items[0]?.imageUrl, `/api/v1/public/team-photos/${id}`);
  assert.deepEqual(checked, [id]);
  const removed = await service.put({ userId: adminId }, 'team', { id: secondId, version: 2, order: 0, photoAssetId: null, reason: 'Remove team portrait' }, context);
  if (removed.namespace !== 'team') return;
  assert.equal(removed.items[0]?.photoAssetId, undefined); assert.equal(removed.items[0]?.imageUrl, undefined);
});
test('rejects an invalid uploaded photo reference without changing the member', async () => {
  const service = createCmsAdminContentService({ repository: repository(), authorization: { async authorize() { return true; } }, audit: { async record() { return 'audit'; } }, validateTeamPhoto: async () => { throw new Error('Photo not found'); } });
  await assert.rejects(service.put({ userId: adminId }, 'team', { id: secondId, version: 1, order: 0, photoAssetId: 'd'.repeat(24), name: { en: 'Must not save' }, reason: 'Attach missing portrait' }, { requestId: 'photo-save', traceId: 'a'.repeat(32) }), /Photo not found/);
  const data = await service.get({ userId: adminId }, 'team');
  if (data.namespace === 'team') { assert.equal(data.items[0]?.version, 1); assert.equal(data.items[0]?.name.en, 'Team lead'); }
});

test('deletes a team member with management permission and records the deletion audit', async () => {
  const { service, audits } = createService();
  const result = await service.deleteTeam({ userId: adminId }, { id: secondId, version: 1, reason: 'Member left the team' }, { requestId: 'delete-team', traceId: 'a'.repeat(32) });
  assert.deepEqual(result, { namespace: 'team', items: [] });
  assert.deepEqual(audits, ['cms.team.delete']);
  await assert.rejects(service.deleteTeam({ userId: adminId }, { id: secondId, version: 1, reason: 'Member left the team' }, { requestId: 'delete-team', traceId: 'a'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_NOT_FOUND');
});

test('rejects unauthorized or stale team deletions without removing the member', async () => {
  const input = { id: secondId, version: 0, reason: 'Member left the team' };
  const context = { requestId: 'delete-team', traceId: 'a'.repeat(32) };
  const unauthorized = createService({ manage: false });
  await assert.rejects(unauthorized.service.deleteTeam({ userId: adminId }, input, context),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_FORBIDDEN');
  const stale = createService();
  await assert.rejects(stale.service.deleteTeam({ userId: adminId }, input, context),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT');
  assert.equal((await stale.service.get({ userId: adminId }, 'team')).items.length, 1);
  assert.deepEqual(stale.audits, []);
  assert.deepEqual(unauthorized.audits, []);
});

test('returns ordered admin About/Team projections with permission-derived actions', async () => {
  const { service } = createService();
  const about = await service.get({ userId: adminId }, 'about');
  assert.equal(about.namespace, 'about');
  assert.equal(about.items[0]?.key, 'mission');
  assert.deepEqual(about.items[0]?.availableActions, ['update', 'publish', 'deactivate']);
  assert.equal('reason' in (about.items[0] ?? {}), false);

  const team = await service.get({ userId: adminId }, 'team');
  assert.equal(team.namespace, 'team');
  assert.equal(team.items[0]?.key, 'leader');

  const tips = await service.get({ userId: adminId }, 'tips');
  assert.equal(tips.namespace, 'tips');
  assert.equal(tips.items[0]?.key, 'buying');
  assert.deepEqual(tips.items[0]?.availableActions, ['update', 'publish', 'deactivate']);

  const homepage = await service.get({ userId: adminId }, 'homepage');
  assert.equal(homepage.namespace, 'homepage');
  assert.equal(homepage.items[0]?.key, 'hero');

  const display = await service.get({ userId: adminId }, 'display');
  assert.equal(display.namespace, 'display');
  assert.equal(display.items[0]?.key, 'show_search');
});

test('automatically assigns a new tip key and preserves it when its title changes', async () => {
  const { service } = createService();
  const context = { requestId: 'automatic-tip-key', traceId: 'f'.repeat(32) };
  const created = await service.put({ userId: adminId }, 'tips', {
    title: { ar: 'نصيحة جديدة' }, body: { ar: 'راجع المستندات قبل شراء العقار.' }, status: 'draft', reason: 'Create advice without a manual key'
  }, context);
  assert.ok(created.namespace === 'tips');
  const item = created.items.find(candidate => candidate.title.ar === 'نصيحة جديدة');
  assert.ok(item);
  assert.match(item.key, /^tip_[a-f0-9]{32}$/u);
  const updated = await service.put({ userId: adminId }, 'tips', {
    id: item.id, version: item.version, title: { ar: 'عنوان النصيحة بعد التعديل' }, reason: 'Change advice title'
  }, context);
  assert.equal(updated.items.find(candidate => candidate.id === item.id)?.key, item.key);
});

test('creates and updates a reason-bearing published tip with optimistic versioning', async () => {
  const { service, audits } = createService();
  const created = await service.put({ userId: adminId }, 'tips', {
    key: 'renting', title: { en: 'Renting safely' }, body: { en: 'Check the agreement.' },
    order: 2, status: 'draft', reason: 'Create a draft tip'
  }, { requestId: 'cms-tip-1', traceId: 'f'.repeat(32) });
  const item = created.items.find((candidate) => candidate.key === 'renting');
  assert.ok(item);
  assert.equal(item?.status, 'draft');

  const published = await service.put({ userId: adminId }, 'tips', {
    id: item!.id, version: item!.version, status: 'published', reason: 'Publish reviewed tip'
  }, { requestId: 'cms-tip-2', traceId: 'f'.repeat(32) });
  assert.equal(published.items.find((candidate) => candidate.id === item!.id)?.status, 'published');
  assert.deepEqual(audits, ['cms.tips.write', 'cms.tips.write']);

  await assert.rejects(
    service.put({ userId: adminId }, 'tips', {
      id: item!.id, version: item!.version, order: 3, reason: 'Stale reorder'
    }, { requestId: 'cms-tip-3', traceId: 'f'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT'
  );
});

test('creates and updates homepage order and display settings without inventing public values', async () => {
  const { service, audits } = createService();
  const createdSection = await service.put({ userId: adminId }, 'homepage', {
    key: 'tips', title: { en: 'Tips' }, order: 3, visible: true, status: 'draft', reason: 'Create homepage section'
  }, { requestId: 'cms-home-1', traceId: 'f'.repeat(32) });
  const section = createdSection.items.find((candidate) => candidate.key === 'tips');
  assert.ok(section);
  const reordered = await service.put({ userId: adminId }, 'homepage', {
    id: section!.id, version: section!.version, order: 1, reason: 'Reorder homepage section'
  }, { requestId: 'cms-home-2', traceId: 'f'.repeat(32) });
  assert.equal(reordered.items.find((candidate) => candidate.id === section!.id)?.order, 1);

  const createdSetting = await service.put({ userId: adminId }, 'display', {
    key: 'hero_mode', value: { kind: 'text', value: 'editorial' }, status: 'draft', reason: 'Create display setting'
  }, { requestId: 'cms-home-3', traceId: 'f'.repeat(32) });
  const setting = createdSetting.items.find((candidate) => candidate.key === 'hero_mode');
  assert.ok(setting);
  const published = await service.put({ userId: adminId }, 'display', {
    id: setting!.id, version: setting!.version, status: 'published', reason: 'Publish display setting'
  }, { requestId: 'cms-home-4', traceId: 'f'.repeat(32) });
  assert.equal(published.items.find((candidate) => candidate.id === setting!.id)?.status, 'published');
  assert.deepEqual(audits.slice(-4), ['cms.homepage.write', 'cms.homepage.write', 'cms.display.write', 'cms.display.write']);
});

test('requires publish permission before a published About write and records reason-bearing changes', async () => {
  const denied = createService({ publish: false });
  await assert.rejects(
    denied.service.put({ userId: adminId }, 'about', {
      key: 'new_block', title: { en: 'New' }, body: { en: 'Body' }, order: 1, status: 'published', reason: 'Publish content'
    }, { requestId: 'cms-1', traceId: 'f'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_PUBLISH_FORBIDDEN'
  );
  assert.deepEqual(denied.audits, []);

  const allowed = createService();
  const result = await allowed.service.put({ userId: adminId }, 'about', {
    key: 'new_block', title: { en: 'New' }, body: { en: 'Body' }, order: 1, status: 'draft', reason: 'Create draft'
  }, { requestId: 'cms-2', traceId: 'f'.repeat(32) });
  assert.equal(result.namespace, 'about');
  assert.deepEqual(allowed.audits, ['cms.about.write']);
});

test('rejects stale About writes and preserves source requirements for population', async () => {
  const { service } = createService();
  await assert.rejects(
    service.put({ userId: adminId }, 'about', {
      id: adminId, version: 1, order: 2, reason: 'Reorder block'
    }, { requestId: 'cms-3', traceId: 'f'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT'
  );
  await assert.rejects(
    service.put({ userId: adminId }, 'population', {
      status: 'available', value: 100, reason: 'Unsourced value'
    }, { requestId: 'cms-4', traceId: 'f'.repeat(32) })
  );
});

test('serves a sourced population value and requires its version for updates', async () => {
  const { service } = createService();
  const created = await service.put({ userId: adminId }, 'population', {
    status: 'available',
    value: 500000,
    sourceLabel: { en: 'Sadat City authority' },
    sourceUrl: 'https://example.test/population',
    asOf: '2026-08-19T00:00:00.000Z',
    reason: 'Publish sourced population'
  }, { requestId: 'cms-5', traceId: 'f'.repeat(32) });
  assert.equal(created.namespace, 'population');
  assert.equal(created.items.length, 1);
  const item = created.items[0];
  assert.ok(item);
  assert.equal(item.status, 'available');
  assert.equal(item.value, 500000);
  assert.equal(item.sourceLabel?.en, 'Sadat City authority');

  const revised = await service.put({ userId: adminId }, 'population', {
    status: 'available', version: item.version, value: 44000,
    sourceLabel: { en: 'Sadat City authority' }, sourceUrl: 'https://example.test/population',
    asOf: '2026-10-07T00:00:00.000Z', reason: 'Correct the sourced population'
  }, { requestId: 'cms-revised', traceId: 'f'.repeat(32) });
  assert.equal(revised.items[0]?.value, 44000);
  assert.equal(revised.items[0]?.version, item.version + 1);

  await assert.rejects(
    service.put({ userId: adminId }, 'population', {
      status: 'unavailable', reason: 'Source temporarily unavailable'
    }, { requestId: 'cms-6', traceId: 'f'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT'
  );

  const unavailable = await service.put({ userId: adminId }, 'population', {
    status: 'unavailable', version: revised.items[0]!.version, reason: 'Source temporarily unavailable'
  }, { requestId: 'cms-7', traceId: 'f'.repeat(32) });
  assert.equal(unavailable.namespace, 'population');
  assert.equal(unavailable.items[0]?.status, 'unavailable');
  assert.equal('value' in (unavailable.items[0] ?? {}), false);
});


test('clears a homepage description explicitly and replaces locale maps without reviving old text', async () => {
  const { service } = createService();
  const context = { requestId: 'clear-home-description', traceId: 'a'.repeat(32) };
  let result = await service.get({ userId: adminId }, 'homepage');
  if (result.namespace !== 'homepage') throw new Error('Unexpected namespace');
  const original = result.items[0]!;
  result = await service.put({ userId: adminId }, 'homepage', { id: original.id, version: original.version, body: null, reason: 'Remove unwanted description' }, context);
  if (result.namespace !== 'homepage') throw new Error('Unexpected namespace');
  assert.equal(result.items[0]?.body, undefined);
  let row = result.items[0]!;
  result = await service.put({ userId: adminId }, 'homepage', { id: row.id, version: row.version, body: { ar: 'New Arabic', en: 'New English' }, reason: 'Set both translations' }, context);
  if (result.namespace !== 'homepage') throw new Error('Unexpected namespace');
  row = result.items[0]!;
  const next = await service.put({ userId: adminId }, 'homepage', { id: row.id, version: row.version, body: { en: 'Only English' }, reason: 'Remove one translation' }, context);
  if (next.namespace !== 'homepage') throw new Error('Unexpected namespace');
  assert.deepEqual(next.items[0]?.body, { en: 'Only English' });
  await assert.rejects(service.put({ userId: adminId }, 'homepage', { id: row.id, version: row.version, body: null, reason: 'Stale overwrite' }, context), (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT');
});
