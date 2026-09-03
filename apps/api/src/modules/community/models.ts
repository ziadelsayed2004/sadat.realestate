import { Schema, type Connection, type Model } from 'mongoose';
import type { CommunityComment, CommunityPost } from '@sadat-real-estate/contracts';

export type CommunityPostRecord = CommunityPost;
export type CommunityCommentRecord = CommunityComment;

export interface CommunityModels {
  CommunityPost: Model<CommunityPostRecord>;
  CommunityComment: Model<CommunityCommentRecord>;
}

const postSchema = new Schema<CommunityPostRecord>({
  id: { type: String, required: true, immutable: true, match: /^[a-f0-9]{24}$/ },
  authorId: { type: String, required: true, immutable: true, match: /^[a-f0-9]{24}$/ },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 5_000 },
  category: { type: String, enum: ['question', 'experience', 'advice', 'service', 'area', 'property'] },
  authorName: { type: Schema.Types.Mixed },
  avatarUrl: { type: String, trim: true, maxlength: 2_048 },
  imageUrl: { type: String, trim: true, maxlength: 2_048 },
  likeCount: { type: Number, min: 0, default: 0 },
  dislikeCount: { type: Number, min: 0, default: 0 },
  status: { type: String, required: true, enum: ['draft', 'published', 'hidden', 'removed'] },
  createdAt: { type: String, required: true, immutable: true },
  updatedAt: { type: String, required: true }
}, { collection: 'community_posts', strict: 'throw', versionKey: false });

postSchema.index({ status: 1, createdAt: -1, id: 1 }, { name: 'community_posts_public_order' });
postSchema.index({ authorId: 1, createdAt: -1, id: 1 }, { name: 'community_posts_author_order' });
postSchema.index({ id: 1 }, { unique: true, name: 'community_posts_id_unique' });

const commentSchema = new Schema<CommunityCommentRecord>({
  id: { type: String, required: true, immutable: true, match: /^[a-f0-9]{24}$/ },
  postId: { type: String, required: true, immutable: true, match: /^[a-f0-9]{24}$/ },
  authorId: { type: String, required: true, immutable: true, match: /^[a-f0-9]{24}$/ },
  body: { type: String, required: true, trim: true, maxlength: 5_000 },
  parentId: { type: String, match: /^[a-f0-9]{24}$/ },
  depth: { type: Number, required: true, min: 0, max: 2 },
  status: { type: String, required: true, enum: ['visible', 'hidden', 'removed'] },
  createdAt: { type: String, required: true, immutable: true }
}, { collection: 'community_comments', strict: 'throw', versionKey: false });

commentSchema.index({ postId: 1, status: 1, createdAt: 1, id: 1 }, { name: 'community_comments_post_visible_order' });
commentSchema.index({ id: 1 }, { unique: true, name: 'community_comments_id_unique' });

export function createCommunityModels(connection: Connection): CommunityModels {
  const CommunityPost = (connection.models.CommunityPost as Model<CommunityPostRecord> | undefined)
    ?? connection.model<CommunityPostRecord>('CommunityPost', postSchema);
  const CommunityComment = (connection.models.CommunityComment as Model<CommunityCommentRecord> | undefined)
    ?? connection.model<CommunityCommentRecord>('CommunityComment', commentSchema);
  return { CommunityPost, CommunityComment };
}
