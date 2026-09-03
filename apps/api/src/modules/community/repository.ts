import type { CommunityComment, CommunityPost } from '@sadat-real-estate/contracts';
import { communityCommentSchema, communityPostSchema } from '@sadat-real-estate/contracts';
import type { CommunityModels, CommunityPostRecord, CommunityCommentRecord } from './models.js';
import type { CommunityRepository } from './service.js';

const postProjection = { _id: 0, id: 1, authorId: 1, title: 1, body: 1, category: 1, authorName: 1, avatarUrl: 1, imageUrl: 1, likeCount: 1, dislikeCount: 1, status: 1, createdAt: 1, updatedAt: 1 } as const;
const commentProjection = { _id: 0, id: 1, postId: 1, authorId: 1, body: 1, parentId: 1, depth: 1, status: 1, createdAt: 1 } as const;

function post(row: CommunityPostRecord): CommunityPost {
  return communityPostSchema.parse(row);
}

function comment(row: CommunityCommentRecord): CommunityComment {
  return communityCommentSchema.parse(row);
}

export function createMongooseCommunityRepository(models: CommunityModels): CommunityRepository {
  return {
    async listPosts() {
      const rows = await models.CommunityPost.find({}, postProjection).sort({ createdAt: -1, id: 1 }).lean();
      return rows.flatMap(row => {
        const parsed = communityPostSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
    },
    async getPost(postId) {
      const row = await models.CommunityPost.findOne({ id: postId }, postProjection).lean();
      return row === null ? undefined : post(row as CommunityPostRecord);
    },
    async savePost(value) {
      await models.CommunityPost.replaceOne({ id: value.id }, value, { upsert: true });
    },
    async listComments(postId) {
      const filter = postId === undefined ? {} : { postId };
      const rows = await models.CommunityComment.find(filter, commentProjection).sort({ createdAt: 1, id: 1 }).lean();
      return rows.flatMap(row => {
        const parsed = communityCommentSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      });
    },
    async getComment(commentId) {
      const row = await models.CommunityComment.findOne({ id: commentId }, commentProjection).lean();
      return row === null ? undefined : comment(row as CommunityCommentRecord);
    },
    async saveComment(value) {
      await models.CommunityComment.replaceOne({ id: value.id }, value, { upsert: true });
    }
  };
}
