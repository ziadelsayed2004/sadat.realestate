import type { Connection } from 'mongoose';
import type { CmsPublicContent, LocalizedText } from '@sadat-real-estate/contracts';
import { publicAboutBlock, publicTeamMember, sortPublished } from './about-team.js';
import { registerAboutTeamModels } from './about-team-models.js';

type PublishedAboutSource = {
  key: string;
  title: LocalizedText;
  body: LocalizedText;
  order: number;
  status: 'draft' | 'published' | 'inactive';
  active: boolean;
};

type PublishedTeamSource = {
  key: string;
  name: LocalizedText;
  title: LocalizedText;
  bio?: LocalizedText;
  photoAssetId?: string;
  imageUrl?: string;
  category?: 'management' | 'sales' | 'support' | 'content';
  order: number;
  status: 'draft' | 'published' | 'inactive';
  active: boolean;
};

export interface PublicAboutTeamRepository {
  listAbout(): Promise<PublishedAboutSource[]>;
  listTeam(): Promise<PublishedTeamSource[]>;
}

export interface PublicAboutTeamService {
  listAbout(): Promise<CmsPublicContent[]>;
  listTeam(): Promise<CmsPublicContent[]>;
}

function safeAbout(source: PublishedAboutSource): CmsPublicContent | null {
  try {
    return publicAboutBlock(source);
  } catch {
    return null;
  }
}

function safeTeam(source: PublishedTeamSource): CmsPublicContent | null {
  try {
    return publicTeamMember(source);
  } catch {
    return null;
  }
}

export function createPublicAboutTeamService(repository: PublicAboutTeamRepository): PublicAboutTeamService {
  return {
    async listAbout() {
      return sortPublished((await repository.listAbout()).flatMap(source => {
        const item = safeAbout(source);
        return item === null ? [] : [item];
      }));
    },
    async listTeam() {
      return sortPublished((await repository.listTeam()).flatMap(source => {
        const item = safeTeam(source);
        return item === null ? [] : [item];
      }));
    }
  };
}

export function createMongoosePublicAboutTeamRepository(connection: Connection): PublicAboutTeamRepository {
  const models = registerAboutTeamModels(connection);
  return {
    async listAbout() {
      const rows = await models.about
        .find({ status: 'published', active: true })
        .select({ _id: 0, key: 1, title: 1, body: 1, order: 1, status: 1, active: 1 })
        .sort({ order: 1, key: 1 })
        .lean()
        .exec();
      return rows.map(row => ({
        key: row.key,
        title: row.title,
        body: row.body,
        order: row.order,
        status: row.status,
        active: row.active
      }));
    },
    async listTeam() {
      const rows = await models.team
        .find({ status: 'published', active: true })
        .select({ _id: 0, key: 1, name: 1, title: 1, bio: 1, photoAssetId: 1, imageUrl: 1, category: 1, order: 1, status: 1, active: 1 })
        .sort({ order: 1, key: 1 })
        .lean()
        .exec();
      return rows.map(row => ({
        key: row.key,
        name: row.name,
        title: row.title,
        ...(row.bio === undefined ? {} : { bio: row.bio }),
        ...(row.photoAssetId === undefined ? {} : { photoAssetId: row.photoAssetId.toString() }),
        ...(row.imageUrl === undefined ? {} : { imageUrl: row.imageUrl }),
        ...(row.category === undefined ? {} : { category: row.category }),
        order: row.order,
        status: row.status,
        active: row.active
      }));
    }
  };
}

export function createMongoosePublicAboutTeamService(connection: Connection): PublicAboutTeamService {
  return createPublicAboutTeamService(createMongoosePublicAboutTeamRepository(connection));
}
