import assert from 'node:assert/strict'; import test from 'node:test'; import type { AccessTokenClaims } from '../../src/modules/auth/crypto.js'; import { createCommunityService, createMemoryCommunityRepository } from '../../src/modules/community/service.js';
const seeker = { iss: 'sadat-realestate-api', aud: 'sadat-realestate', sub: '0123456789abcdef01234567', sid: '1123456789abcdef01234567', role: 'seeker', status: 'verified', iat: 1, exp: 9999999999, jti: 'test' } as AccessTokenClaims; const admin = { ...seeker, role: 'admin' } as AccessTokenClaims;

test('removing another author comment requires current moderation permission', async () => {
  const repository = createMemoryCommunityRepository([], { record: async () => 'audit-id' });
  let allowed = true;
  const moderator = { ...admin, sub: '2123456789abcdef01234567' };
  const service = createCommunityService([], repository, {
    authorize: async (id, permission) => allowed && id === moderator.sub && permission === 'admin:community.moderate',
  });
  const post = await service.create(seeker, { title: 'Permission check', body: 'Published discussion' });
  await service.moderate(moderator, post.id, { action: 'publish', reason: 'Reviewed post', expectedVersion: 0 }, { requestId: 'test', traceId: 'test' });
  const first = await service.createComment(seeker, { postId: post.id, body: 'First comment' });
  const second = await service.createComment(seeker, { postId: post.id, body: 'Second comment' });
  await assert.rejects(() => createCommunityService([], repository).removeComment(moderator, first.id), /FORBIDDEN/);
  assert.equal((await repository.getComment(first.id))?.status, 'visible');
  assert.equal((await service.removeComment(moderator, first.id)).status, 'removed');
  allowed = false;
  await assert.rejects(() => service.removeComment(moderator, second.id), /FORBIDDEN/);
  assert.equal((await repository.getComment(second.id))?.status, 'visible');
  assert.equal((await service.removeComment(seeker, second.id)).status, 'removed');
});
test('community posts are owned, bounded, moderated, and removed without cross-user access', async () => { const service = createCommunityService([], createMemoryCommunityRepository([], { record: async () => 'audit-id' }), { authorize: async () => true }); const post = await service.create(seeker, { title: 'Hello', body: 'A community post' }); assert.equal(post.status, 'draft'); await assert.rejects(() => service.update({ ...seeker, sub: '1123456789abcdef01234567' } as AccessTokenClaims, post.id, { body: 'IDOR' }), /NOT_FOUND/); const published = await service.moderate(admin, post.id, { action: 'publish', expectedVersion: post.version, reason: 'Approved after review' }, { requestId: 'test', traceId: 'test' }); assert.equal(published.status, 'published'); assert.equal(published.version, 1); assert.equal((await service.publicList()).length, 1); const removed = await service.remove(seeker, post.id); assert.equal(removed.status, 'removed'); assert.equal(removed.version, 2); assert.equal((await service.publicList()).length, 0); });

test('comments enforce published-post state, bounded reply depth, and ownership', async () => { const service = createCommunityService([], createMemoryCommunityRepository([], { record: async () => 'audit-id' }), { authorize: async () => true }); const post = await service.create(seeker, { title: 'Hello', body: 'A community post' }); await service.moderate(admin, post.id, { action: 'publish', expectedVersion: post.version, reason: 'Approved after review' }, { requestId: 'test', traceId: 'test' }); const comment = await service.createComment(seeker, { postId: post.id, body: 'Helpful reply' }); assert.equal(comment.depth, 0); const reply = await service.createComment(admin, { postId: post.id, body: 'Thanks', parentId: comment.id }); assert.equal(reply.depth, 1); assert.equal((await service.listComments(post.id)).length, 2); await assert.rejects(() => service.removeComment({ ...seeker, sub: '1123456789abcdef01234567' } as AccessTokenClaims, comment.id), /NOT_FOUND/); });

test('public community feed returns published posts, visible comments, and truthful counts only', async () => { const service = createCommunityService([], createMemoryCommunityRepository([], { record: async () => 'audit-id' }), { authorize: async () => true }); const post = await service.create(seeker, { title: 'Feed', body: 'Visible' }); await service.moderate(admin, post.id, { action: 'publish', expectedVersion: post.version, reason: 'Approved after review' }, { requestId: 'test', traceId: 'test' }); const comment = await service.createComment(seeker, { postId: post.id, body: 'Visible comment' }); const feed = await service.publicFeed(); assert.equal(feed.length, 1); assert.equal(feed[0].comments.length, 1); await service.removeComment(seeker, comment.id); assert.equal((await service.publicFeed())[0].comments.length, 0); await service.remove(seeker, post.id); assert.equal((await service.publicFeed()).length, 0); });


test('moderation requires permission and reason, audits decisions, and rejects concurrent/stale updates', async () => {
  const entries: unknown[] = [];
  const repo = createMemoryCommunityRepository([], { record: async entry => { entries.push(entry); return 'audit-id'; } });
  const service = createCommunityService([], repo, { authorize: async (id, permission) => id === admin.sub && permission === 'admin:community.moderate' });
  const post = await service.create(seeker, { title: 'Moderation test', body: 'Test body' });
  const context = { requestId: 'test-request', traceId: 'test-trace' };
  const input = { action: 'publish', expectedVersion: post.version, reason: 'Reviewed and approved' };
  await assert.rejects(() => service.moderate(seeker, post.id, input, context), /FORBIDDEN/);
  await assert.rejects(() => createCommunityService([], repo).moderate(admin, post.id, input, context), /FORBIDDEN/);
  await assert.rejects(() => service.moderate(admin, post.id, { ...input, reason: ' ' }, context));
  assert.equal((await service.publicList()).length, 0);
  const outcomes = await Promise.allSettled([service.moderate(admin, post.id, input, context), service.moderate(admin, post.id, input, context)]);
  assert.equal(outcomes.filter(outcome => outcome.status === 'fulfilled').length, 1);
  assert.equal(entries.length, 1);
  assert.equal((await service.publicList()).length, 1);
  const published = await repo.getPost(post.id);
  await assert.rejects(() => service.moderate(admin, post.id, input, context), /VERSION_CONFLICT/);
  const hidden = await service.moderate(admin, post.id, { ...input, action: 'hide', expectedVersion: published!.version }, context);
  assert.equal((await service.publicList()).length, 0);
  assert.equal(await service.publicDetail(post.id), undefined);
  assert.equal(entries.length, 2);
  const rejected = await service.moderate(admin, post.id, { ...input, action: 'reject', expectedVersion: hidden.version }, context);
  assert.equal(rejected.status, 'rejected');
  assert.equal(rejected.version, 3);
  assert.equal(entries.length, 3);
});

test('a failed audit leaves the community post unpublished', async () => {
  const repo = createMemoryCommunityRepository([], { record: async () => { throw new Error('audit offline'); } });
  const service = createCommunityService([], repo, { authorize: async () => true });
  const post = await service.create(seeker, { title: 'Fail closed', body: 'Audit must persist' });
  await assert.rejects(() => service.moderate(admin, post.id, { action: 'publish', reason: 'Reviewed content', expectedVersion: post.version }, { requestId: 'test', traceId: 'test' }), /audit offline/);
  assert.equal((await repo.getPost(post.id))!.status, 'draft');
});

test('community settings reject blocked content and enforce the Cairo daily post limit', async () => {
  const repository = createMemoryCommunityRepository();
  const settings = { read: async () => ({ blockedWordReview: true, blockedWords: ['spam'], blockedWordAction: 'reject' as const, dailyPostLimit: 1 }) };
  const service = createCommunityService([], repository, { authorize: async () => true }, settings);
  await assert.rejects(() => service.create(seeker, { title: 'Spam offer', body: 'Rejected content' }), /BLOCKED_CONTENT/);
  await service.create(seeker, { title: 'First post', body: 'Allowed content' });
  await assert.rejects(() => service.create(seeker, { title: 'Second post', body: 'Daily limit' }), /POST_LIMIT/);
});

test('community moderation wait settings expose a truthful admin review deadline', async () => {
  const repository = createMemoryCommunityRepository();
  const service = createCommunityService([], repository, { authorize: async () => true }, { read: async () => ({ blockedWordReview: false, blockedWords: [], blockedWordAction: 'manual_review' as const, moderationWaitHours: 1 }) });
  const post = await service.create(seeker, { title: 'Review deadline', body: 'Waiting for moderation' });
  const page = await service.adminPage(admin, { page: 1, limit: 20 });
  assert.equal(page.items[0]?.moderationDueAt, new Date(Date.parse(post.createdAt) + 60 * 60 * 1000).toISOString());
  assert.equal(page.items[0]?.moderationOverdue, false);
});
