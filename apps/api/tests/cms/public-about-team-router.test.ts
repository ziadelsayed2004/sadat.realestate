import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiServer, startApiServer, stopApiServer } from '../../src/server.js';
import { createPublicAboutTeamService } from '../../src/modules/cms/public-content.js';

const TEAM_PHOTO_ID = '4123456789abcdef01234567';

const repository = {
  async listAbout() {
    return [
      { key: 'values', title: { en: 'Our values' }, body: { en: 'Published values' }, order: 2, status: 'published' as const, active: true },
      { key: 'mission', title: { en: 'Our mission' }, body: { en: 'Published mission' }, order: 1, status: 'published' as const, active: true },
      { key: 'draft', title: { en: 'Draft' }, body: { en: 'Never public' }, order: 0, status: 'draft' as const, active: true },
      { key: 'inactive', title: { en: 'Inactive' }, body: { en: 'Never public' }, order: 0, status: 'published' as const, active: false }
    ];
  },
  async listTeam() {
    return [
      { key: 'leader', name: { en: 'Public leader' }, title: { en: 'Platform lead' }, bio: { en: 'Published biography' }, photoAssetId: TEAM_PHOTO_ID, order: 1, status: 'published' as const, active: true },
      { key: 'draft-member', name: { en: 'Draft member' }, title: { en: 'Draft role' }, order: 0, status: 'draft' as const, active: true }
    ];
  }
};

function request(origin: string, path: string) {
  return fetch(`${origin}${path}`);
}

async function withServer(run: (origin: string) => Promise<void>) {
  const publicAboutTeam = createPublicAboutTeamService(repository);
  const server = createApiServer({
    database: { isReady: async () => true },
    publicAboutTeam: { service: publicAboutTeam }
  });
  const address = await startApiServer(server, { host: '127.0.0.1', port: 0 });
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await stopApiServer(server);
  }
}

test('public About and Team routes expose published, active, deterministic safe projections', async () => withServer(async origin => {
  const about = await request(origin, '/api/v1/public/about');
  assert.equal(about.status, 200);
  assert.match(about.headers.get('cache-control') ?? '', /public/);
  const aboutBody = await about.json() as { data: { items: Array<Record<string, unknown>> } };
  assert.deepEqual(aboutBody.data.items.map(item => item.key), ['mission', 'values']);
  assert.equal('status' in aboutBody.data.items[0]!, false);
  assert.equal('active' in aboutBody.data.items[0]!, false);
  assert.equal('updatedBy' in aboutBody.data.items[0]!, false);

  const team = await request(origin, '/api/v1/public/team');
  assert.equal(team.status, 200);
  const teamBody = await team.json() as { data: { items: Array<Record<string, unknown>> } };
  assert.equal(teamBody.data.items.length, 1);
  assert.deepEqual(teamBody.data.items[0]?.name, { en: 'Public leader' });
  assert.deepEqual(teamBody.data.items[0]?.role, { en: 'Platform lead' });
  assert.equal(teamBody.data.items[0]?.photoAssetId, TEAM_PHOTO_ID);
  assert.equal('status' in teamBody.data.items[0]!, false);
  assert.equal('updatedBy' in teamBody.data.items[0]!, false);
}));

test('public About and Team routes remain safe when no published CMS content exists', async () => withServer(async origin => {
  const emptyServer = createApiServer({
    database: { isReady: async () => true },
    publicAboutTeam: {
      service: createPublicAboutTeamService({
        async listAbout() { return []; },
        async listTeam() { return []; }
      })
    }
  });
  const address = await startApiServer(emptyServer, { host: '127.0.0.1', port: 0 });
  try {
    const [about, team] = await Promise.all([
      request(`http://127.0.0.1:${address.port}`, '/api/v1/public/about'),
      request(`http://127.0.0.1:${address.port}`, '/api/v1/public/team')
    ]);
    assert.deepEqual((await about.json() as { data: { items: unknown[] } }).data.items, []);
    assert.deepEqual((await team.json() as { data: { items: unknown[] } }).data.items, []);
  } finally {
    await stopApiServer(emptyServer);
  }
  assert.equal(origin.startsWith('http://127.0.0.1:'), true);
}));
