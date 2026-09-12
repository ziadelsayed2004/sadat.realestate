import type { AuditWriter } from '../audit/writer.js';
import { Types } from 'mongoose';
import type { CommunityComment, CommunityPost } from '@sadat-real-estate/contracts';
import { communityCommentSchema, communityPostSchema, communityReactionSchema } from '@sadat-real-estate/contracts';
import type { CommunityModels, CommunityPostRecord, CommunityCommentRecord, CommunityReactionRecord } from './models.js';
import type { CommunityRepository } from './service.js';

const postProjection = { _id: 0, id: 1, authorId: 1, title: 1, body: 1, category: 1, authorName: 1, avatarUrl: 1, imageUrl: 1, likeCount: 1, dislikeCount: 1, status: 1, version: 1, createdAt: 1, updatedAt: 1 } as const;
const commentProjection = { _id: 0, id: 1, postId: 1, authorId: 1, body: 1, parentId: 1, depth: 1, status: 1, createdAt: 1 } as const;
const reactionProjection = { _id: 0, id: 1, postId: 1, userId: 1, reaction: 1, createdAt: 1, updatedAt: 1 } as const;

function post(row: CommunityPostRecord): CommunityPost {
  return communityPostSchema.parse(row);
}

function comment(row: CommunityCommentRecord): CommunityComment {
  return communityCommentSchema.parse(row);
}

export function createMongooseCommunityRepository(models: CommunityModels, audit?: AuditWriter): CommunityRepository {
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
    async moderatePost(value, expectedVersion, entry) {
      if (!audit) throw new Error('AUDIT_UNAVAILABLE');
      await models.CommunityPost.db.transaction(async session => {
        const versionFilter = expectedVersion === 0 ? { $or: [{ version: 0 }, { version: { $exists: false } }] } : { version: expectedVersion };
        const result = await models.CommunityPost.replaceOne({ id: value.id, ...versionFilter }, value, { session });
        if (result.matchedCount !== 1) throw new Error('VERSION_CONFLICT');
        await audit.record(entry, session);
      });
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
    },
    async setReaction(postId, userId, reaction, updatedAt) {
      let outcome: { postId: string; reaction: 'like' | 'dislike' | null; likeCount: number; dislikeCount: number } | undefined;
      await models.CommunityPost.db.transaction(async session => {
        const currentPost = await models.CommunityPost.findOne({ id: postId, status: 'published' }, postProjection, { session }).lean();
        if (currentPost === null) throw new Error('INVALID_STATE');
        const previousRow = await models.CommunityReaction.findOne({ postId, userId }, reactionProjection, { session }).lean();
        const previous = previousRow === null ? undefined : communityReactionSchema.parse(previousRow as CommunityReactionRecord);
        const nextReaction = previous?.reaction === reaction ? null : reaction;
        const increments = {
          likeCount: (nextReaction === 'like' ? 1 : 0) - (previous?.reaction === 'like' ? 1 : 0),
          dislikeCount: (nextReaction === 'dislike' ? 1 : 0) - (previous?.reaction === 'dislike' ? 1 : 0)
        };
        if (nextReaction === null) {
          await models.CommunityReaction.deleteOne({ postId, userId }, { session });
        } else if (previous === undefined) {
          await models.CommunityReaction.create([communityReactionSchema.parse({
            id: new Types.ObjectId().toHexString(), postId, userId,
            reaction: nextReaction, createdAt: updatedAt, updatedAt
          })], { session });
        } else {
          await models.CommunityReaction.updateOne({ postId, userId }, { $set: { reaction: nextReaction, updatedAt } }, { session });
        }
        const updated = await models.CommunityPost.findOneAndUpdate(
          { id: postId, status: 'published' }, { $inc: increments }, { returnDocument: 'after', session }
        ).select(postProjection).lean();
        if (updated === null) throw new Error('INVALID_STATE');
        const parsedPost = communityPostSchema.parse(updated);
        outcome = {
          postId,
          reaction: nextReaction,
          likeCount: parsedPost.likeCount ?? 0,
          dislikeCount: parsedPost.dislikeCount ?? 0
        };
      });
      if (outcome === undefined) throw new Error('INVALID_STATE');
      return outcome;
    }
  };
}
