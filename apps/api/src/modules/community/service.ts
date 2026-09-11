import { randomBytes } from 'node:crypto';
import {
  communityCommentCreateSchema,
  communityCommentSchema,
  communityAdminPostListQuerySchema,
  communityAdminCommentListQuerySchema,
  communityPostCreateSchema,
  communityPostModerationSchema,
  communityPostPatchSchema,
  communityPostSchema,
  type CommunityComment,
  type CommunityAdminPostListData,
  type CommunityAdminPostListQuery,
  type CommunityAdminCommentListData,
  type CommunityAdminCommentListQuery,
  type CommunityCommentCreate,
  type CommunityPost,
  type CommunityPostCreate,
  type CommunityPublicComment,
  type CommunityPublicPost,
  type CommunityPublicPostDetailData,
  type CommunityPublicPostListData,
  type CommunityPublicListQuery
} from '@sadat-real-estate/contracts';
import type { AuditRecordInput, AuditWriter } from '../audit/writer.js';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { CommunityAccountCheck } from './account-state.js';
import { DEFAULT_COMMUNITY_RUNTIME_SETTINGS, type CommunityRuntimeSettings, type CommunitySettingsReader } from '../settings/community-policy.js';

const id = () => randomBytes(12).toString('hex');
const active = (claims: AccessTokenClaims) => claims.status === 'verified' && ['seeker', 'provider', 'admin'].includes(claims.role);

export interface CommunityRepository {
  listPosts(): Promise<CommunityPost[]>;
  getPost(postId: string): Promise<CommunityPost | undefined>;
  savePost(post: CommunityPost): Promise<void>;
  moderatePost(post: CommunityPost, expectedVersion: number, audit: AuditRecordInput): Promise<void>;
  listComments(postId?: string): Promise<CommunityComment[]>;
  getComment(commentId: string): Promise<CommunityComment | undefined>;
  saveComment(comment: CommunityComment): Promise<void>;
}

export interface CommunityAuthorization {
  authorize(adminId: string, permission: 'admin:community.view' | 'admin:community.moderate'): Promise<boolean>;
}

export interface CommunityService {
  create(claims: AccessTokenClaims, input: unknown): Promise<CommunityPost>;
  listOwned(claims: AccessTokenClaims): Promise<CommunityPost[]>;
  update(claims: AccessTokenClaims, postId: string, input: unknown): Promise<CommunityPost>;
  remove(claims: AccessTokenClaims, postId: string): Promise<CommunityPost>;
  moderate(claims: AccessTokenClaims, postId: string, input: unknown, context: { requestId: string; traceId: string }): Promise<CommunityPost>;
  createComment(claims: AccessTokenClaims, input: unknown): Promise<CommunityComment>;
  listComments(postId: string): Promise<CommunityComment[]>;
  removeComment(claims: AccessTokenClaims, commentId: string): Promise<CommunityComment>;
  publicList(): Promise<CommunityPost[]>;
  publicFeed(): Promise<Array<{ post: CommunityPost; comments: CommunityComment[] }>>;
  publicPage(query: CommunityPublicListQuery): Promise<CommunityPublicPostListData>;
  publicDetail(postId: string): Promise<CommunityPublicPostDetailData | undefined>;
  adminPage(claims: AccessTokenClaims, query: CommunityAdminPostListQuery): Promise<CommunityAdminPostListData>;
  adminCommentsPage(claims: AccessTokenClaims, query: CommunityAdminCommentListQuery): Promise<CommunityAdminCommentListData>;
}

export function createMemoryCommunityRepository(seed: CommunityPost[] = [], audit?: AuditWriter): CommunityRepository {
  const posts = new Map(seed.map(post => [post.id, post]));
  const comments = new Map<string, CommunityComment>();
  let mutationQueue: Promise<void> = Promise.resolve();
  return {
    async listPosts() { return [...posts.values()]; },
    async getPost(postId) { return posts.get(postId); },
    async savePost(post) { posts.set(post.id, post); },
    async moderatePost(post, expectedVersion, entry) {
      const mutation = mutationQueue.then(async () => {
        if (posts.get(post.id)?.version !== expectedVersion) throw new Error('VERSION_CONFLICT');
        if (!audit) throw new Error('AUDIT_UNAVAILABLE');
        await audit.record(entry);
        posts.set(post.id, post);
      });
      mutationQueue = mutation.catch(() => undefined);
      return mutation;
    },
    async listComments(postId) {
      const values = [...comments.values()];
      return postId === undefined ? values : values.filter(comment => comment.postId === postId);
    },
    async getComment(commentId) { return comments.get(commentId); },
    async saveComment(comment) { comments.set(comment.id, comment); }
  };
}

function publicPost(post: CommunityPost, commentCount: number): CommunityPublicPost {
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    category: post.category ?? 'question',
    ...(post.authorName === undefined ? {} : { authorName: post.authorName }),
    ...(post.avatarUrl === undefined ? {} : { avatarUrl: post.avatarUrl }),
    ...(post.imageUrl === undefined ? {} : { imageUrl: post.imageUrl }),
    likeCount: post.likeCount ?? 0,
    dislikeCount: post.dislikeCount ?? 0,
    commentCount
  };
}

function publicComment(comment: CommunityComment): CommunityPublicComment {
  return {
    id: comment.id,
    postId: comment.postId,
    body: comment.body,
    ...(comment.parentId === undefined ? {} : { parentId: comment.parentId }),
    depth: comment.depth,
    createdAt: comment.createdAt
  };
}

export function createCommunityService(
  seed: CommunityPost[] = [],
  repository: CommunityRepository = createMemoryCommunityRepository(seed),
  authorization?: CommunityAuthorization,
  settingsReader?: CommunitySettingsReader,
  accountCheck?: CommunityAccountCheck
): CommunityService {
  async function requireActive(claims: AccessTokenClaims): Promise<void> {
    if (!active(claims) || (accountCheck !== undefined && !(await accountCheck(claims)))) throw new Error('FORBIDDEN');
  }
  const now = () => new Date().toISOString();
  const settings = async (): Promise<CommunityRuntimeSettings> => settingsReader ? settingsReader.read() : DEFAULT_COMMUNITY_RUNTIME_SETTINGS;
  const cairoDay = (value: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
  const containsBlockedWord = (value: string, policy: CommunityRuntimeSettings): boolean => {
    const normalized = value.toLocaleLowerCase('ar-EG');
    return policy.blockedWordReview && policy.blockedWords.some((word) => normalized.includes(word));
  };
  async function requireAdminView(claims: AccessTokenClaims): Promise<void> {
    if (claims.role !== 'admin' || claims.status !== 'verified' || authorization === undefined || !(await authorization.authorize(claims.sub, 'admin:community.view'))) {
      throw new Error('FORBIDDEN');
    }
  }

  function adminPost(post: CommunityPost, commentCount: number, policy: CommunityRuntimeSettings, currentTime: number) {
    if (post.status !== 'draft' || policy.moderationWaitHours === undefined) return { ...post, commentCount };
    const moderationDueAt = new Date(Date.parse(post.createdAt) + policy.moderationWaitHours * 60 * 60 * 1000).toISOString();
    return { ...post, commentCount, moderationDueAt, moderationOverdue: Date.parse(moderationDueAt) <= currentTime };
  }

  return {
    async create(claims, input) {
      await requireActive(claims);
      const parsed: CommunityPostCreate = communityPostCreateSchema.parse(input);
      const stamp = now();
      const policy = await settings();
      if (policy.dailyPostLimit !== undefined) {
        const today = cairoDay(stamp);
        const createdToday = (await repository.listPosts()).filter((post) => post.authorId === claims.sub && post.status !== 'removed' && cairoDay(post.createdAt) === today).length;
        if (createdToday >= policy.dailyPostLimit) throw new Error('POST_LIMIT');
      }
      if (containsBlockedWord(`${parsed.title} ${parsed.body}`, policy) && policy.blockedWordAction === 'reject') throw new Error('BLOCKED_CONTENT');
      const post = communityPostSchema.parse({ id: id(), authorId: claims.sub, ...parsed, status: 'draft', version: 0, createdAt: stamp, updatedAt: stamp });
      await repository.savePost(post);
      return post;
    },
    async listOwned(claims) {
      await requireActive(claims);
      return (await repository.listPosts()).filter(post => post.authorId === claims.sub);
    },
    async update(claims, postId, input) {
      await requireActive(claims);
      const post = await repository.getPost(postId);
      if (!post || post.authorId !== claims.sub) throw new Error('NOT_FOUND');
      const patch = communityPostPatchSchema.parse(input);
      const policy = await settings();
      if (containsBlockedWord(`${patch.title ?? post.title} ${patch.body ?? post.body}`, policy) && policy.blockedWordAction === 'reject') throw new Error('BLOCKED_CONTENT');
      const updated = communityPostSchema.parse({ ...post, ...patch, version: post.version + 1, updatedAt: now() });
      await repository.savePost(updated);
      return updated;
    },
    async remove(claims, postId) {
      await requireActive(claims);
      const post = await repository.getPost(postId);
      if (!post || post.authorId !== claims.sub) throw new Error('NOT_FOUND');
      const updated = { ...post, status: 'removed' as const, version: post.version + 1, updatedAt: now() };
      await repository.savePost(updated);
      return updated;
    },
    async moderate(claims, postId, input, context) {
      if (claims.role !== 'admin' || claims.status !== 'verified' || !authorization || !(await authorization.authorize(claims.sub, 'admin:community.moderate'))) throw new Error('FORBIDDEN');
      const parsed = communityPostModerationSchema.parse(input);
      const post = await repository.getPost(postId);
      if (!post) throw new Error('NOT_FOUND');
      if (post.version !== parsed.expectedVersion) throw new Error('VERSION_CONFLICT');
      const status = parsed.action === 'publish' ? 'published' : parsed.action === 'hide' ? 'hidden' : 'rejected';
      const allowed = parsed.action === 'publish' ? ['draft', 'hidden', 'rejected'] : parsed.action === 'hide' ? ['published'] : ['draft', 'hidden'];
      if (!allowed.includes(post.status)) throw new Error('INVALID_STATE');
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(post.updatedAt) + 1)).toISOString();
      const updated = { ...post, status, version: post.version + 1, updatedAt } as CommunityPost;
      await repository.moderatePost(updated, parsed.expectedVersion, {
        actorType: 'admin', actorId: claims.sub, targetType: 'community_post', targetId: postId,
        action: `community_post.${parsed.action}`, reason: parsed.reason,
        before: { status: post.status, version: post.version, updatedAt: post.updatedAt }, after: { status, version: updated.version, updatedAt },
        ...context, occurredAt: new Date(updatedAt)
      });
      return updated;
    },
    async createComment(claims, input) {
      await requireActive(claims);
      const parsed: CommunityCommentCreate = communityCommentCreateSchema.parse(input);
      const post = await repository.getPost(parsed.postId);
      if (!post || post.status !== 'published') throw new Error('INVALID_STATE');
      const parent = parsed.parentId === undefined ? undefined : await repository.getComment(parsed.parentId);
      if (parsed.parentId !== undefined && (!parent || parent.postId !== parsed.postId || parent.status !== 'visible')) throw new Error('INVALID_STATE');
      const depth = parent === undefined ? 0 : parent.depth + 1;
      if (depth > 2) throw new Error('INVALID_STATE');
      const comment = communityCommentSchema.parse({ id: id(), ...parsed, authorId: claims.sub, depth, status: 'visible', createdAt: now() });
      await repository.saveComment(comment);
      return comment;
    },
    async listComments(postId) {
      return (await repository.listComments(postId))
        .filter(comment => comment.status === 'visible')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    },
    async removeComment(claims, commentId) {
      await requireActive(claims);
      const comment = await repository.getComment(commentId);
      if (!comment || (comment.authorId !== claims.sub && claims.role !== 'admin')) throw new Error('NOT_FOUND');
      const updated = { ...comment, status: 'removed' as const };
      await repository.saveComment(updated);
      return updated;
    },
    async publicList() {
      return (await repository.listPosts())
        .filter(post => post.status === 'published')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async publicFeed() {
      const posts = await this.publicList();
      return Promise.all(posts.map(async post => ({ post, comments: await this.listComments(post.id) })));
    },
    async publicPage(query) {
      const posts = await this.publicList();
      const start = (query.page - 1) * query.limit;
      const items = await Promise.all(posts.slice(start, start + query.limit).map(async post => {
        const comments = await this.listComments(post.id);
        return publicPost(post, comments.length);
      }));
      return { items, page: query.page, limit: query.limit, total: posts.length };
    },
    async publicDetail(postId) {
      const post = await repository.getPost(postId);
      if (!post || post.status !== 'published') return undefined;
      const comments = await this.listComments(post.id);
      return { post: publicPost(post, comments.length), comments: comments.map(publicComment) };
    },
    async adminPage(claims, query) {
      await requireAdminView(claims);
      const parsed = communityAdminPostListQuerySchema.parse(query);
      const policy = await settings();
      const currentTime = Date.now();
      const search = parsed.search?.toLocaleLowerCase('en-US');
      const posts = (await repository.listPosts())
        .filter(post => parsed.status === undefined || post.status === parsed.status)
        .filter(post => search === undefined || `${post.title} ${post.body}`.toLocaleLowerCase('en-US').includes(search))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id));
      const comments = await repository.listComments();
      const commentCounts = new Map<string, number>();
      for (const comment of comments) {
        if (comment.status !== 'removed') commentCounts.set(comment.postId, (commentCounts.get(comment.postId) ?? 0) + 1);
      }
      const start = (parsed.page - 1) * parsed.limit;
      const items = posts.slice(start, start + parsed.limit).map(post => adminPost(post, commentCounts.get(post.id) ?? 0, policy, currentTime));
      return { items, page: parsed.page, limit: parsed.limit, total: posts.length };
    },
    async adminCommentsPage(claims, query) {
      await requireAdminView(claims);
      const parsed = communityAdminCommentListQuerySchema.parse(query);
      const search = parsed.search?.toLocaleLowerCase('en-US');
      const comments = (await repository.listComments())
        .filter(comment => parsed.status === undefined || comment.status === parsed.status)
        .filter(comment => parsed.postId === undefined || comment.postId === parsed.postId)
        .filter(comment => search === undefined || comment.body.toLocaleLowerCase('en-US').includes(search))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.id.localeCompare(right.id));
      const start = (parsed.page - 1) * parsed.limit;
      return { items: comments.slice(start, start + parsed.limit), page: parsed.page, limit: parsed.limit, total: comments.length };
    }
  };
}
