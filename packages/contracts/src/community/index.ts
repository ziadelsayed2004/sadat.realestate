import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';
import { localizedTextSchema } from '../localization/index.js';

const id = z.string().regex(/^[a-f0-9]{24}$/);
const body = z.string().trim().min(1).max(5_000).regex(/^[^\u0000-\u001f\u007f]*$/u);
const page = z.coerce.number().int().min(1).max(1_000_000).default(1);
const limit = z.coerce.number().int().min(1).max(50).default(20);
const publicMediaUrl = z.union([
  z.url().max(2_048),
  z.string().trim().min(2).max(2_048).regex(/^\/(?!\/)[^\s]*$/u)
]);

export const communityPostStatusSchema = z.enum(['draft', 'published', 'hidden', 'removed']);
export const communityPostCategorySchema = z.enum(['question', 'experience', 'advice', 'service', 'area', 'property']);
export const communityPostSchema = z.object({
  id,
  authorId: id,
  title: z.string().trim().min(1).max(160),
  body,
  category: communityPostCategorySchema.optional(),
  authorName: localizedTextSchema.optional(),
  avatarUrl: publicMediaUrl.optional(),
  imageUrl: publicMediaUrl.optional(),
  likeCount: z.number().int().nonnegative().optional(),
  dislikeCount: z.number().int().nonnegative().optional(),
  status: communityPostStatusSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const communityPostCreateSchema = communityPostSchema.pick({ title: true, body: true }).extend({ category: communityPostCategorySchema.optional() }).strict();
export const communityPostPatchSchema = communityPostCreateSchema.partial().strict();
export type CommunityPost = z.infer<typeof communityPostSchema>;
export type CommunityPostCreate = z.infer<typeof communityPostCreateSchema>;

export const communityCommentStatusSchema = z.enum(['visible', 'hidden', 'removed']);
export const communityCommentSchema = z.object({ id, postId: id, authorId: id, body, parentId: id.optional(), depth: z.number().int().min(0).max(2), status: communityCommentStatusSchema, createdAt: z.string().datetime({ offset: true }) }).strict();
export const communityCommentCreateSchema = communityCommentSchema.pick({ postId: true, body: true, parentId: true }).strict();
export const communityCommentCreateRequestSchema = communityCommentCreateSchema.omit({ postId: true }).strict();
export type CommunityComment = z.infer<typeof communityCommentSchema>;
export type CommunityCommentCreate = z.infer<typeof communityCommentCreateSchema>;

export const communityPostIdParamsSchema = z.object({ postId: id }).strict();
export const communityCommentIdParamsSchema = z.object({ commentId: id }).strict();
export const communityPublicListQuerySchema = z.object({ page, limit }).strict();
export type CommunityPublicListQuery = z.infer<typeof communityPublicListQuerySchema>;
export const communityAdminPostListQuerySchema = z.object({
  page,
  limit,
  status: communityPostStatusSchema.optional(),
  search: z.string().trim().min(1).max(160).optional()
}).strict();
export type CommunityAdminPostListQuery = z.infer<typeof communityAdminPostListQuerySchema>;

export const communityPublicPostSchema = z.object({
  id,
  title: communityPostSchema.shape.title,
  body: communityPostSchema.shape.body,
  createdAt: communityPostSchema.shape.createdAt,
  category: communityPostCategorySchema,
  authorName: localizedTextSchema.optional(),
  avatarUrl: publicMediaUrl.optional(),
  imageUrl: publicMediaUrl.optional(),
  likeCount: z.number().int().nonnegative(),
  dislikeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative()
}).strict();
export const communityPublicCommentSchema = z.object({
  id,
  postId: id,
  body,
  parentId: id.optional(),
  depth: z.number().int().min(0).max(2),
  createdAt: communityCommentSchema.shape.createdAt
}).strict();
export const communityPublicPostListDataSchema = z.object({
  items: z.array(communityPublicPostSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const communityPublicPostDetailDataSchema = z.object({
  post: communityPublicPostSchema,
  comments: z.array(communityPublicCommentSchema)
}).strict();
export const communityPublicPostListSuccessEnvelopeSchema = successEnvelopeSchema(communityPublicPostListDataSchema);
export const communityPublicPostDetailSuccessEnvelopeSchema = successEnvelopeSchema(communityPublicPostDetailDataSchema);
export type CommunityPublicPost = z.infer<typeof communityPublicPostSchema>;
export type CommunityPublicComment = z.infer<typeof communityPublicCommentSchema>;
export type CommunityPublicPostListData = z.infer<typeof communityPublicPostListDataSchema>;
export type CommunityPublicPostDetailData = z.infer<typeof communityPublicPostDetailDataSchema>;
export const communityAdminPostSchema = communityPostSchema.extend({ commentCount: z.number().int().nonnegative() }).strict();
export const communityAdminPostListDataSchema = z.object({
  items: z.array(communityAdminPostSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const communityAdminPostListSuccessEnvelopeSchema = successEnvelopeSchema(communityAdminPostListDataSchema);
export type CommunityAdminPost = z.infer<typeof communityAdminPostSchema>;
export type CommunityAdminPostListData = z.infer<typeof communityAdminPostListDataSchema>;

export const communityAdminCommentListQuerySchema = z.object({
  page,
  limit,
  status: communityCommentStatusSchema.optional(),
  postId: id.optional(),
  search: z.string().trim().min(1).max(160).optional()
}).strict();
export type CommunityAdminCommentListQuery = z.infer<typeof communityAdminCommentListQuerySchema>;
export const communityAdminCommentSchema = communityCommentSchema;
export const communityAdminCommentListDataSchema = z.object({
  items: z.array(communityAdminCommentSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const communityAdminCommentListSuccessEnvelopeSchema = successEnvelopeSchema(communityAdminCommentListDataSchema);
export type CommunityAdminComment = z.infer<typeof communityAdminCommentSchema>;
export type CommunityAdminCommentListData = z.infer<typeof communityAdminCommentListDataSchema>;

export const communityPostMutationDataSchema = communityPostSchema.pick({ id: true, status: true, createdAt: true, updatedAt: true }).strict();
export const communityPostMutationSuccessEnvelopeSchema = successEnvelopeSchema(communityPostMutationDataSchema);
export const communityCommentMutationDataSchema = communityCommentSchema.pick({ id: true, postId: true, depth: true, createdAt: true }).strict();
export const communityCommentMutationSuccessEnvelopeSchema = successEnvelopeSchema(communityCommentMutationDataSchema);

export const communityReportReasonSchema = z.enum(['spam', 'abuse', 'misinformation', 'other']);
export const communityReportCreateRequestSchema = z.object({
  reason: communityReportReasonSchema,
  details: z.string().trim().min(2).max(1_000).regex(/^[^\u0000-\u001f\u007f]*$/u)
}).strict();
export const communityReportCreateSchema = communityReportCreateRequestSchema.extend({ postId: id }).strict();
export const communityReportIdParamsSchema = z.object({ reportId: id }).strict();
export const communityReportDataSchema = z.object({ id, status: z.literal('open'), createdAt: z.string().datetime({ offset: true }) }).strict();
export const communityReportSuccessEnvelopeSchema = successEnvelopeSchema(communityReportDataSchema);
export type CommunityReportReason = z.infer<typeof communityReportReasonSchema>;
export type CommunityReportCreate = z.infer<typeof communityReportCreateSchema>;
export type CommunityReportData = z.infer<typeof communityReportDataSchema>;

export const communityReportStatusSchema = z.enum(['open', 'in_review', 'resolved', 'dismissed']);
export const communityReportActionSchema = z.enum(['resolve', 'dismiss']);
export const communityReportResolveSchema = z.object({
  version: z.number().int().nonnegative(),
  action: communityReportActionSchema,
  reason: z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u)
}).strict();
export const communityAdminReportListQuerySchema = z.object({
  status: communityReportStatusSchema.optional(),
  postId: id.optional(),
  page,
  limit
}).strict();
export const communityAdminReportSchema = z.object({
  id,
  postId: id,
  reporterId: id,
  reason: communityReportReasonSchema,
  details: z.string().trim().min(2).max(1_000).regex(/^[^\u0000-\u001f\u007f]*$/u),
  status: communityReportStatusSchema,
  resolutionReason: z.string().trim().min(5).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u).optional(),
  version: z.number().int().nonnegative(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true })
}).strict();
export const communityAdminReportListDataSchema = z.object({
  items: z.array(communityAdminReportSchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative()
}).strict();
export const communityAdminReportListSuccessEnvelopeSchema = successEnvelopeSchema(communityAdminReportListDataSchema);
export const communityAdminReportResolveSuccessEnvelopeSchema = successEnvelopeSchema(communityAdminReportSchema);
export type CommunityReportStatus = z.infer<typeof communityReportStatusSchema>;
export type CommunityReportAction = z.infer<typeof communityReportActionSchema>;
export type CommunityReportResolve = z.infer<typeof communityReportResolveSchema>;
export type CommunityAdminReportListQuery = z.infer<typeof communityAdminReportListQuerySchema>;
export type CommunityAdminReport = z.infer<typeof communityAdminReportSchema>;
export type CommunityAdminReportListData = z.infer<typeof communityAdminReportListDataSchema>;
