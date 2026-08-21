import { Types } from 'mongoose';
import type {
  AboutBlockCreate,
  DisplaySettingCreate,
  DisplaySettingValue,
  HomepageSectionCreate,
  LocalizedText,
  TeamMemberCreate,
  TipCreate
} from '@sadat-real-estate/contracts';
import type { AboutBlockDocument, TeamMemberDocument } from './about-team-models.js';
import type { PopulationValueDocument, RealEstateTipDocument, registerPopulationTipsModels } from './population-models.js';
import type { DisplaySettingDocument, HomepageSectionDocument, registerHomepageDisplayModels } from './homepage-display-models.js';

export interface StoredAboutBlock {
  id: string;
  key: string;
  title: LocalizedText;
  body: LocalizedText;
  order: number;
  active: boolean;
  status: 'draft' | 'published' | 'inactive';
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface StoredTeamMember {
  id: string;
  key: string;
  name: LocalizedText;
  title: LocalizedText;
  bio?: LocalizedText;
  photoAssetId?: string;
  order: number;
  active: boolean;
  status: 'draft' | 'published' | 'inactive';
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface StoredPopulationValue {
  id: string;
  status: 'available' | 'unavailable' | 'draft';
  value?: number;
  sourceLabel?: LocalizedText;
  sourceUrl?: string;
  asOf?: Date;
  reason: string;
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface StoredTip {
  id: string;
  key: string;
  title: LocalizedText;
  body: LocalizedText;
  order: number;
  active: boolean;
  status: 'draft' | 'published' | 'inactive';
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface StoredHomepageSection {
  id: string;
  key: string;
  title: LocalizedText;
  body?: LocalizedText;
  order: number;
  visible: boolean;
  status: 'draft' | 'published' | 'inactive';
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface StoredDisplaySetting {
  id: string;
  key: string;
  value: DisplaySettingValue;
  status: 'draft' | 'published' | 'inactive';
  updatedBy: string;
  version: number;
  updatedAt: Date;
}

export interface AboutBlockChanges {
  title?: LocalizedText;
  body?: LocalizedText;
  order?: number;
  active?: boolean;
  status?: 'draft' | 'published' | 'inactive';
}

export interface TeamMemberChanges {
  name?: LocalizedText;
  title?: LocalizedText;
  bio?: LocalizedText | null;
  photoAssetId?: string | null;
  order?: number;
  active?: boolean;
  status?: 'draft' | 'published' | 'inactive';
}

export interface PopulationValueChanges {
  status: 'available' | 'unavailable' | 'draft';
  value?: number;
  sourceLabel?: LocalizedText;
  sourceUrl?: string;
  asOf?: Date;
  reason: string;
}

export interface PopulationValueUpdateChanges extends Omit<PopulationValueChanges, 'value'> {
  value?: number | null;
}

export interface TipChanges {
  title?: LocalizedText;
  body?: LocalizedText;
  order?: number;
  active?: boolean;
  status?: 'draft' | 'published' | 'inactive';
}

export interface HomepageSectionChanges {
  title?: LocalizedText;
  body?: LocalizedText;
  order?: number;
  visible?: boolean;
  status?: 'draft' | 'published' | 'inactive';
}

export interface DisplaySettingChanges {
  value?: DisplaySettingValue;
  status?: 'draft' | 'published' | 'inactive';
}

export type CmsWriteResult<T> =
  | { kind: 'written'; item: T }
  | { kind: 'not_found' | 'version_conflict' | 'key_conflict' };

export interface CmsAdminContentRepository {
  listAbout(): Promise<StoredAboutBlock[]>;
  findAbout(id: string): Promise<StoredAboutBlock | null>;
  createAbout(input: Omit<AboutBlockCreate, 'reason'>, actorId: string, at: Date): Promise<CmsWriteResult<StoredAboutBlock>>;
  updateAbout(id: string, version: number, input: AboutBlockChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredAboutBlock>>;
  listTeam(): Promise<StoredTeamMember[]>;
  findTeam(id: string): Promise<StoredTeamMember | null>;
  createTeam(input: Omit<TeamMemberCreate, 'reason'>, actorId: string, at: Date): Promise<CmsWriteResult<StoredTeamMember>>;
  updateTeam(id: string, version: number, input: TeamMemberChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredTeamMember>>;
  getPopulation(): Promise<StoredPopulationValue | null>;
  createPopulation(input: PopulationValueChanges, actorId: string, at: Date): Promise<StoredPopulationValue>;
  updatePopulation(id: string, version: number, input: PopulationValueUpdateChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredPopulationValue>>;
  listTips(): Promise<StoredTip[]>;
  createTip(input: Omit<TipCreate, 'reason'>, actorId: string, at: Date): Promise<CmsWriteResult<StoredTip>>;
  updateTip(id: string, version: number, input: TipChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredTip>>;
  listHomepageSections(): Promise<StoredHomepageSection[]>;
  createHomepageSection(input: Omit<HomepageSectionCreate, 'reason'>, actorId: string, at: Date): Promise<CmsWriteResult<StoredHomepageSection>>;
  updateHomepageSection(id: string, version: number, input: HomepageSectionChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredHomepageSection>>;
  listDisplaySettings(): Promise<StoredDisplaySetting[]>;
  createDisplaySetting(input: Omit<DisplaySettingCreate, 'reason'>, actorId: string, at: Date): Promise<CmsWriteResult<StoredDisplaySetting>>;
  updateDisplaySetting(id: string, version: number, input: DisplaySettingChanges, actorId: string, at: Date): Promise<CmsWriteResult<StoredDisplaySetting>>;
}

export interface CmsAdminContentModels {
  readonly about: ReturnType<typeof import('./about-team-models.js').registerAboutTeamModels>['about'];
  readonly team: ReturnType<typeof import('./about-team-models.js').registerAboutTeamModels>['team'];
  readonly population: ReturnType<typeof registerPopulationTipsModels>['population'];
  readonly tips: ReturnType<typeof registerPopulationTipsModels>['tips'];
  readonly sections: ReturnType<typeof registerHomepageDisplayModels>['sections'];
  readonly settings: ReturnType<typeof registerHomepageDisplayModels>['settings'];
}

function duplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function mapAbout(record: AboutBlockDocument): StoredAboutBlock {
  return {
    id: record._id.toHexString(),
    key: record.key,
    title: record.title,
    body: record.body,
    order: record.order,
    active: record.active,
    status: record.status,
    updatedBy: record.updatedBy.toHexString(),
    version: record.version,
    updatedAt: record.updatedAt
  };
}

function mapTeam(record: TeamMemberDocument): StoredTeamMember {
  return {
    id: record._id.toHexString(),
    key: record.key,
    name: record.name,
    title: record.title,
    ...(record.bio ? { bio: record.bio } : {}),
    ...(record.photoAssetId ? { photoAssetId: record.photoAssetId.toHexString() } : {}),
    order: record.order,
    active: record.active,
    status: record.status,
    updatedBy: record.updatedBy.toHexString(),
    version: record.version,
    updatedAt: record.updatedAt
  };
}

function mapPopulation(record: PopulationValueDocument): StoredPopulationValue {
  return {
    id: record._id.toHexString(),
    status: record.status,
    ...(record.value === undefined ? {} : { value: record.value }),
    ...(record.sourceLabel ? { sourceLabel: record.sourceLabel } : {}),
    ...(record.sourceUrl ? { sourceUrl: record.sourceUrl } : {}),
    ...(record.asOf ? { asOf: record.asOf } : {}),
    reason: record.reason,
    updatedBy: record.updatedBy.toHexString(),
    version: record.version,
    updatedAt: record.updatedAt
  };
}

function mapTip(record: RealEstateTipDocument): StoredTip {
  return {
    id: record._id.toHexString(),
    key: record.key,
    title: record.title,
    body: record.body,
    order: record.order,
    active: record.active,
    status: record.status,
    updatedBy: record.updatedBy.toHexString(),
    version: record.version,
    updatedAt: record.updatedAt
  };
}

function mapHomepageSection(record: HomepageSectionDocument): StoredHomepageSection {
  return {
    id: record._id.toHexString(), key: record.key, title: record.title,
    ...(record.body ? { body: record.body } : {}), order: record.order, visible: record.visible,
    status: record.status, updatedBy: record.updatedBy.toHexString(), version: record.version, updatedAt: record.updatedAt
  };
}

function mapDisplaySetting(record: DisplaySettingDocument): StoredDisplaySetting {
  return { id: record._id.toHexString(), key: record.key, value: record.value, status: record.status, updatedBy: record.updatedBy.toHexString(), version: record.version, updatedAt: record.updatedAt };
}

function toMongoLocalized(value: LocalizedText): Record<string, string> {
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => entry[1] !== undefined)
  );
}

function updateDocument(
  changes: object,
  actorId: string,
  at: Date
): { $set: Record<string, unknown>; $unset?: Record<string, 1>; $inc: { version: 1 } } {
  const set: Record<string, unknown> = { updatedBy: new Types.ObjectId(actorId), updatedAt: at };
  const unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) unset[key] = 1;
    else if (value !== undefined) set[key] = value;
  }
  return {
    $set: set,
    ...(Object.keys(unset).length === 0 ? {} : { $unset: unset }),
    $inc: { version: 1 }
  };
}

export function createMongooseCmsAdminContentRepository(models: CmsAdminContentModels): CmsAdminContentRepository {
  return {
    async listAbout() {
      const rows = await models.about.find().sort({ order: 1, key: 1, _id: 1 }).limit(100).lean();
      return rows.map(row => mapAbout(row));
    },
    async findAbout(id) {
      const row = await models.about.findById(new Types.ObjectId(id)).lean();
      return row ? mapAbout(row) : null;
    },
    async createAbout(input, actorId, at) {
      try {
        const row = await models.about.create({ ...input, updatedBy: new Types.ObjectId(actorId), updatedAt: at });
        return { kind: 'written', item: mapAbout(row.toObject()) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async updateAbout(id, version, input, actorId, at) {
      try {
        const row = await models.about.findOneAndUpdate(
          { _id: new Types.ObjectId(id), version },
          updateDocument(input, actorId, at),
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.about.exists({ _id: new Types.ObjectId(id) })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapAbout(row) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async listTeam() {
      const rows = await models.team.find().sort({ order: 1, key: 1, _id: 1 }).limit(100).lean();
      return rows.map(row => mapTeam(row));
    },
    async findTeam(id) {
      const row = await models.team.findById(new Types.ObjectId(id)).lean();
      return row ? mapTeam(row) : null;
    },
    async createTeam(input, actorId, at) {
      try {
        const row = await models.team.create({
          key: input.key,
          name: input.name,
          title: input.title,
          ...(input.bio === undefined ? {} : { bio: input.bio }),
          ...(input.photoAssetId ? { photoAssetId: new Types.ObjectId(input.photoAssetId) } : {}),
          order: input.order,
          active: input.active,
          status: input.status,
          updatedBy: new Types.ObjectId(actorId),
          updatedAt: at
        });
        return { kind: 'written', item: mapTeam(row.toObject()) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async updateTeam(id, version, input, actorId, at) {
      try {
        const changes: Record<string, unknown> = {
          ...input,
          ...(input.photoAssetId === undefined || input.photoAssetId === null
            ? { photoAssetId: input.photoAssetId }
            : { photoAssetId: new Types.ObjectId(input.photoAssetId) })
        };
        const row = await models.team.findOneAndUpdate(
          { _id: new Types.ObjectId(id), version },
          updateDocument(changes, actorId, at),
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.team.exists({ _id: new Types.ObjectId(id) })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapTeam(row) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async getPopulation() {
      const row = await models.population.findOne().sort({ updatedAt: -1, _id: 1 }).lean();
      return row ? mapPopulation(row) : null;
    },
    async createPopulation(input, actorId, at) {
        const row = await models.population.create({
        status: input.status,
        ...(input.value === undefined ? {} : { value: input.value }),
        ...(input.sourceLabel === undefined ? {} : { sourceLabel: toMongoLocalized(input.sourceLabel) }),
        ...(input.sourceUrl === undefined ? {} : { sourceUrl: input.sourceUrl }),
        ...(input.asOf === undefined ? {} : { asOf: input.asOf }),
        reason: input.reason,
        updatedBy: new Types.ObjectId(actorId),
        updatedAt: at
      });
      return mapPopulation(row.toObject());
    },
    async updatePopulation(id, version, input, actorId, at) {
      const changes = input.status === 'available' || input.value !== undefined
        ? input
        : { ...input, value: null };
      const row = await models.population.findOneAndUpdate(
        { _id: new Types.ObjectId(id), version },
        updateDocument(changes, actorId, at),
        { new: true, runValidators: true, lean: true }
      );
      if (!row) return await models.population.exists({ _id: new Types.ObjectId(id) })
        ? { kind: 'version_conflict' }
        : { kind: 'not_found' };
      return { kind: 'written', item: mapPopulation(row) };
    },
    async listTips() {
      const rows = await models.tips.find().sort({ order: 1, key: 1, _id: 1 }).limit(100).lean();
      return rows.map(row => mapTip(row));
    },
    async createTip(input, actorId, at) {
      try {
        const row = await models.tips.create({
          key: input.key,
          title: input.title,
          body: input.body,
          order: input.order,
          active: input.active,
          status: input.status,
          updatedBy: new Types.ObjectId(actorId),
          updatedAt: at
        });
        return { kind: 'written', item: mapTip(row.toObject()) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async updateTip(id, version, input, actorId, at) {
      try {
        const row = await models.tips.findOneAndUpdate(
          { _id: new Types.ObjectId(id), version },
          updateDocument(input, actorId, at),
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.tips.exists({ _id: new Types.ObjectId(id) })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapTip(row) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async listHomepageSections() {
      const rows = await models.sections.find().sort({ order: 1, key: 1, _id: 1 }).limit(100).lean();
      return rows.map(row => mapHomepageSection(row));
    },
    async createHomepageSection(input, actorId, at) {
      try {
        const row = await models.sections.create({
          key: input.key, title: input.title, ...(input.body === undefined ? {} : { body: input.body }),
          order: input.order, visible: input.visible, status: input.status,
          updatedBy: new Types.ObjectId(actorId), updatedAt: at
        });
        return { kind: 'written', item: mapHomepageSection(row.toObject()) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async updateHomepageSection(id, version, input, actorId, at) {
      try {
        const row = await models.sections.findOneAndUpdate(
          { _id: new Types.ObjectId(id), version }, updateDocument(input, actorId, at),
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.sections.exists({ _id: new Types.ObjectId(id) })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapHomepageSection(row) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async listDisplaySettings() {
      const rows = await models.settings.find().sort({ key: 1, _id: 1 }).limit(100).lean();
      return rows.map(row => mapDisplaySetting(row));
    },
    async createDisplaySetting(input, actorId, at) {
      try {
        const row = await models.settings.create({
          key: input.key, value: input.value, status: input.status,
          updatedBy: new Types.ObjectId(actorId), updatedAt: at
        });
        return { kind: 'written', item: mapDisplaySetting(row.toObject()) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    },
    async updateDisplaySetting(id, version, input, actorId, at) {
      try {
        const row = await models.settings.findOneAndUpdate(
          { _id: new Types.ObjectId(id), version }, updateDocument(input, actorId, at),
          { new: true, runValidators: true, lean: true }
        );
        if (!row) return await models.settings.exists({ _id: new Types.ObjectId(id) })
          ? { kind: 'version_conflict' }
          : { kind: 'not_found' };
        return { kind: 'written', item: mapDisplaySetting(row) };
      } catch (error) {
        return duplicateKey(error) ? { kind: 'key_conflict' } : Promise.reject(error);
      }
    }
  };
}
