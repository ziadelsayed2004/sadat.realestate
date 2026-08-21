import { randomBytes } from 'node:crypto';
import {
  communityCommentCreateSchema,
  communityCommentSchema,
  communityAdminPostListQuerySchema,
  communityAdminCommentListQuerySchema,
  communityPostCreateSchema,
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
import type { AccessTokenClaims } from '../auth/crypto.js';

const id = () => randomBytes(12).toString('hex');
const active = (claims: AccessTokenClaims) => claims.status === 'verified' && ['seeker', 'provider', 'admin'].includes(claims.role);

export interface CommunityRepository {
  listPosts(): Promise<CommunityPost[]>;
  getPost(postId: string): Promise<CommunityPost | undefined>;
  savePost(post: CommunityPost): Promise<void>;
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
  publish(claims: AccessTokenClaims, postId: string): Promise<CommunityPost>;
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

export function createMemoryCommunityRepository(seed: CommunityPost[] = []): CommunityRepository {
  const posts = new Map(seed.map(post => [post.id, post]));
  const comments = new Map<string, CommunityComment>();
  return {
    async listPosts() { return [...posts.values()]; },
    async getPost(postId) { return posts.get(postId); },
    async savePost(post) { posts.set(post.id, post); },
    async listComments(postId) {
      const values = [...comments.values()];
      return postId === undefined ? values : values.filter(comment => comment.postId === postId);
    },
    async getComment(commentId) { return comments.get(commentId); },
    async saveComment(comment) { comments.set(comment.id, comment); }
  };
}

function publicPost(post: CommunityPost, commentCount: number): CommunityPublicPost {
  return { id: post.id, title: post.title, body: post.body, createdAt: post.createdAt, commentCount };
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
  authorization?: CommunityAuthorization
): CommunityService {
  const now = () => new Date().toISOString();
  async function requireAdminView(claims: AccessTokenClaims): Promise<void> {
    if (claims.role !== 'admin' || claims.status !== 'verified' || authorization === undefined || !(await authorization.authorize(claims.sub, 'admin:community.view'))) {
      throw new Error('FORBIDDEN');
    }
  }

  function adminPost(post: CommunityPost, commentCount: number) {
    return { ...post, commentCount };
  }

  return {
    async create(claims, input) {
      if (!active(claims)) throw new Error('FORBIDDEN');
      const parsed: CommunityPostCreate = communityPostCreateSchema.parse(input);
      const stamp = now();
      const post = communityPostSchema.parse({ id: id(), authorId: claims.sub, ...parsed, status: 'draft', createdAt: stamp, updatedAt: stamp });
      await repository.savePost(post);
      return post;
    },
    async listOwned(claims) {
      if (!active(claims)) throw new Error('FORBIDDEN');
      return (await repository.listPosts()).filter(post => post.authorId === claims.sub);
    },
    async update(claims, postId, input) {
      const post = await repository.getPost(postId);
      if (!post || post.authorId !== claims.sub) throw new Error('NOT_FOUND');
      const updated = communityPostSchema.parse({ ...post, ...communityPostPatchSchema.parse(input), updatedAt: now() });
      await repository.savePost(updated);
      return updated;
    },
    async remove(claims, postId) {
      const post = await repository.getPost(postId);
      if (!post || post.authorId !== claims.sub) throw new Error('NOT_FOUND');
      const updated = { ...post, status: 'removed' as const, updatedAt: now() };
      await repository.savePost(updated);
      return updated;
    },
    async publish(claims, postId) {
      if (claims.role !== 'admin' || claims.status !== 'verified') throw new Error('FORBIDDEN');
      const post = await repository.getPost(postId);
      if (!post) throw new Error('NOT_FOUND');
      const updated = { ...post, status: 'published' as const, updatedAt: now() };
      await repository.savePost(updated);
      return updated;
    },
    async createComment(claims, input) {
      if (!active(claims)) throw new Error('FORBIDDEN');
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
      const items = posts.slice(start, start + parsed.limit).map(post => adminPost(post, commentCounts.get(post.id) ?? 0));
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
