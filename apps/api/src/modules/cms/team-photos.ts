import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { Types, type Connection } from 'mongoose';
import sharp from 'sharp';
import { cmsTeamPhotoSchema, type RbacPermission } from '@sadat-real-estate/contracts';
import type { AccessTokenClaims } from '../auth/crypto.js';
import type { AuditWriter } from '../audit/writer.js';
import type { RbacService } from '../rbac/service.js';
import type { StorageAdapter, MalwareScannerAdapter } from '../uploads/adapters.js';
import { ApiContractError } from '../contracts/error-boundary.js';

const maxBytes = 10 * 1024 * 1024;
const invalid = () => new ApiContractError('TEAM_PHOTO_INVALID', 'errors.validation', 400);
const unavailable = () => new ApiContractError('TEAM_PHOTO_UNAVAILABLE', 'errors.serviceUnavailable', 503);
const missing = () => new ApiContractError('TEAM_PHOTO_NOT_FOUND', 'errors.notFound', 404);

export function createTeamPhotos(dependencies: {
  connection: Connection;
  authorization: Pick<RbacService, 'authorize'>;
  audit: Pick<AuditWriter, 'record'>;
  storage: StorageAdapter;
  scanner: MalwareScannerAdapter;
  kind?: 'article' | 'taxonomy';
}) {
  const { connection, authorization, audit, storage, scanner } = dependencies;
  const article = dependencies.kind === 'article';
  const taxonomy = dependencies.kind === 'taxonomy';
  const photos = connection.collection(taxonomy ? 'taxonomy_photos' : article ? 'cms_article_photos' : 'cms_team_photos');
  async function authorize(claims: AccessTokenClaims, permission: RbacPermission) {
    if (claims.role !== 'admin' || claims.status !== 'verified' || !await authorization.authorize(claims.sub, permission)) {
      throw new ApiContractError('FORBIDDEN', 'errors.forbidden', 403);
    }
  }
  async function find(id: string) {
    if (!/^[a-f0-9]{24}$/.test(id)) throw missing();
    const row = await photos.findOne({ _id: new Types.ObjectId(id), storageKey: { $type: 'string' } });
    if (!row) throw missing();
    return row;
  }
  return {
    async validateAttach(id: string) { await find(id); },
    async upload(claims: AccessTokenClaims, source: AsyncIterable<Uint8Array>, mime: string, context: { requestId: string; traceId: string }) {
      await authorize(claims, taxonomy ? 'admin:taxonomy.manage' : 'admin:content.manage');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) throw invalid();
      if (!await storage.isReady() || !await scanner.isReady()) throw unavailable();
      const chunks: Buffer[] = []; let bytes = 0;
      for await (const chunk of source) { bytes += chunk.length; if (bytes > maxBytes) throw invalid(); chunks.push(Buffer.from(chunk)); }
      if (!bytes) throw invalid();
      const original = Buffer.concat(chunks);
      let scan;
      try { scan = await scanner.scan(Readable.from(original)); } catch { throw unavailable(); }
      if (scan !== 'clean') throw scan === 'infected' ? invalid() : unavailable();
      let image: Buffer;
      try {
        const processor = sharp(original, { limitInputPixels: 40_000_000, failOn: 'warning' });
        const meta = await processor.metadata();
        const format = mime === 'image/jpeg' ? 'jpeg' : mime === 'image/png' ? 'png' : 'webp';
        if (meta.format !== format || (meta.pages ?? 1) > 1) throw invalid();
        // Normalize orientation, strip metadata, and bound the delivered portrait size.
        image = await processor.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
      } catch { throw invalid(); }
      if (image.length > maxBytes) throw invalid();
      const id = new Types.ObjectId(); const at = new Date();
      const photo = cmsTeamPhotoSchema.parse({ id: id.toHexString(), imageUrl: `/api/v1/public/${taxonomy ? 'taxonomy' : article ? 'article' : 'team'}-photos/${id.toHexString()}` });
      const storageKey = `quarantine/${randomUUID().replaceAll('-', '')}`;
      const session = await connection.startSession();
      try {
        await storage.putPrivateQuarantine(storageKey, Readable.from(image));
        await session.withTransaction(async () => {
          await photos.insertOne({ _id: id, storageKey, mime: 'image/webp', createdBy: new Types.ObjectId(claims.sub), createdAt: at }, { session });
          await audit.record({ actorType: 'admin', actorId: claims.sub, action: taxonomy ? 'taxonomy.photo.upload' : article ? 'article.photo.upload' : 'cms.team.photo.upload', targetType: taxonomy ? 'taxonomy_photo' : article ? 'article_photo' : 'cms_team_photo', targetId: photo.id, reason: taxonomy ? 'Upload scanned taxonomy image' : article ? 'Upload scanned article image' : 'Upload scanned team portrait', before: {}, after: { mime: 'image/webp', bytes: image.length }, ...context, occurredAt: at }, session);
        });
      } catch (error) { await storage.deletePrivate(storageKey); throw error; }
      finally { await session.endSession(); }
      return photo;
    },
    async open(id: string, claims?: AccessTokenClaims) {
      if (claims) await authorize(claims, taxonomy ? 'admin:taxonomy.view' : 'admin:content.view');
      const photo = await find(id);
      if (!claims && !await connection.collection(taxonomy ? 'property_taxonomy' : article ? 'articles' : 'cms_team_members').findOne(taxonomy
        ? { imageUrl: `/api/v1/public/taxonomy-photos/${id}`, active: true }
        : article ? { status: 'published', $or: [{ coverAssetId: photo._id }, { galleryAssetIds: photo._id }] }
        : { photoAssetId: photo._id, active: true, status: 'published' })) throw missing();
      return { mime: 'image/webp', stream: await storage.openPrivate(String(photo.storageKey)) };
    }
  };
}
export type TeamPhotos = ReturnType<typeof createTeamPhotos>;
