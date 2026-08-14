import { z } from 'zod';
const id = z.string().regex(/^[a-f0-9]{24}$/); const body = z.string().trim().min(1).max(5_000).regex(/^[^\u0000-\u001f\u007f]*$/u);
export const communityPostStatusSchema = z.enum(['draft', 'published', 'hidden', 'removed']);
export const communityPostSchema = z.object({ id, authorId: id, title: z.string().trim().min(1).max(160), body, status: communityPostStatusSchema, createdAt: z.string().datetime({ offset: true }), updatedAt: z.string().datetime({ offset: true }) }).strict();
export const communityPostCreateSchema = communityPostSchema.pick({ title: true, body: true }).strict(); export const communityPostPatchSchema = communityPostCreateSchema.partial().strict();
export type CommunityPost = z.infer<typeof communityPostSchema>; export type CommunityPostCreate = z.infer<typeof communityPostCreateSchema>;
export const communityCommentSchema = z.object({ id, postId: id, authorId: id, body, parentId: id.optional(), depth: z.number().int().min(0).max(2), status: z.enum(['visible', 'hidden', 'removed']), createdAt: z.string().datetime({ offset: true }) }).strict();
export const communityCommentCreateSchema = communityCommentSchema.pick({ postId: true, body: true, parentId: true }).strict();
export type CommunityComment = z.infer<typeof communityCommentSchema>;
