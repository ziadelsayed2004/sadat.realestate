import assert from 'node:assert/strict';
import test from 'node:test';
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

const adminId = '0123456789abcdef01234567';
const secondId = '1123456789abcdef01234567';
const changedAt = new Date('2026-08-19T11:00:00.000Z');

function repository(): CmsAdminContentRepository {
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
    async listTeam() { return [team]; },
    async findTeam(id) { return id === team.id ? team : null; },
    async createTeam(input, actorId, at) {
      team = { id: secondId, ...input, updatedBy: actorId, version: 0, updatedAt: at };
      return { kind: 'written', item: team };
    },
    async updateTeam(id, version, input, actorId, at) {
      if (id !== team.id) return { kind: 'not_found' };
      if (version !== team.version) return { kind: 'version_conflict' };
      team = { ...team, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
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
      tip = { id: tip.id, ...input, updatedBy: actorId, version: 0, updatedAt: at };
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
      homepage = { ...homepage, ...input, updatedBy: actorId, version: version + 1, updatedAt: at };
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

function createService(options: { manage?: boolean; publish?: boolean } = {}) {
  const audits: string[] = [];
  const created = createCmsAdminContentService({
    repository: repository(),
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

  await assert.rejects(
    service.put({ userId: adminId }, 'population', {
      status: 'unavailable', reason: 'Source temporarily unavailable'
    }, { requestId: 'cms-6', traceId: 'f'.repeat(32) }),
    (error: unknown) => error instanceof CmsAdminContentServiceError && error.code === 'CMS_CONTENT_VERSION_CONFLICT'
  );

  const unavailable = await service.put({ userId: adminId }, 'population', {
    status: 'unavailable', version: item.version, reason: 'Source temporarily unavailable'
  }, { requestId: 'cms-7', traceId: 'f'.repeat(32) });
  assert.equal(unavailable.namespace, 'population');
  assert.equal(unavailable.items[0]?.status, 'unavailable');
  assert.equal('value' in (unavailable.items[0] ?? {}), false);
});
