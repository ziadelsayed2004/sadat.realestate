import {
  cmsAdminAboutBlockPutSchema,
  cmsAdminAboutBlockSchema,
  cmsAdminContentDataSchema,
  cmsAdminContentNamespaceSchema,
  cmsAdminDisplaySettingPutSchema,
  cmsAdminDisplaySettingSchema,
  cmsAdminHomepageSectionPutSchema,
  cmsAdminHomepageSectionSchema,
  cmsAdminPopulationValuePutSchema,
  cmsAdminPopulationValueSchema,
  cmsAdminTeamMemberPutSchema,
  cmsAdminTeamMemberSchema,
  cmsAdminTipPutSchema,
  cmsAdminTipSchema,
  type CmsAdminAboutBlock,
  type CmsAdminAboutBlockPut,
  type CmsAdminContentData,
  type CmsAdminContentNamespace,
  type CmsAdminDisplaySetting,
  type CmsAdminDisplaySettingPut,
  type CmsAdminHomepageSection,
  type CmsAdminHomepageSectionPut,
  type CmsAdminPopulationValue,
  type CmsAdminPopulationValuePut,
  type CmsAdminTip,
  type CmsAdminTipPut,
  type CmsAdminTeamMember,
  type CmsAdminTeamMemberPut,
  type AboutBlockCreate,
  type TeamMemberCreate,
  type RbacPermission
} from '@sadat-real-estate/contracts';
import type { AuditWriter } from '../audit/writer.js';
import type {
  CmsAdminContentRepository,
  StoredAboutBlock,
  StoredDisplaySetting,
  DisplaySettingChanges,
  HomepageSectionChanges,
  StoredHomepageSection,
  StoredPopulationValue,
  StoredTip,
  TipChanges,
  StoredTeamMember
} from './admin-content-repository.js';

export interface CmsAdminPrincipal { userId: string }
export interface CmsAdminMutationContext { requestId: string; traceId: string }
export interface CmsAdminAuthorization { authorize(userId: string, permission: RbacPermission): Promise<boolean> }

export type CmsAdminContentErrorCode =
  | 'CMS_CONTENT_FORBIDDEN'
  | 'CMS_CONTENT_NOT_FOUND'
  | 'CMS_CONTENT_KEY_EXISTS'
  | 'CMS_CONTENT_VERSION_CONFLICT'
  | 'CMS_CONTENT_PUBLISH_FORBIDDEN';

export class CmsAdminContentServiceError extends Error {
  constructor(readonly code: CmsAdminContentErrorCode) {
    super(code);
    this.name = 'CmsAdminContentServiceError';
  }
}

export interface CmsAdminContentService {
  get(principal: CmsAdminPrincipal, namespace: CmsAdminContentNamespace): Promise<CmsAdminContentData>;
  put(principal: CmsAdminPrincipal, namespace: CmsAdminContentNamespace, input: unknown, context: CmsAdminMutationContext): Promise<CmsAdminContentData>;
}

function actions(manage: boolean, publish: boolean): CmsAdminAboutBlock['availableActions'] {
  if (!manage) return [];
  return publish ? ['update', 'publish', 'deactivate'] : ['update', 'deactivate'];
}

function aboutData(row: StoredAboutBlock, manage: boolean, publish: boolean): CmsAdminAboutBlock {
  return cmsAdminAboutBlockSchema.parse({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish),
    title: row.title,
    body: row.body
  });
}

function teamData(row: StoredTeamMember, manage: boolean, publish: boolean): CmsAdminTeamMember {
  return cmsAdminTeamMemberSchema.parse({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish),
    name: row.name,
    title: row.title,
    ...(row.bio ? { bio: row.bio } : {}),
    ...(row.photoAssetId ? { photoAssetId: row.photoAssetId } : {})
  });
}

function populationData(row: StoredPopulationValue, manage: boolean, publish: boolean): CmsAdminPopulationValue {
  return cmsAdminPopulationValueSchema.parse({
    ...row,
    ...(row.value === undefined ? {} : { value: row.value }),
    ...(row.sourceLabel ? { sourceLabel: row.sourceLabel } : {}),
    ...(row.sourceUrl ? { sourceUrl: row.sourceUrl } : {}),
    ...(row.asOf ? { asOf: row.asOf.toISOString() } : {}),
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish)
  });
}

function tipData(row: StoredTip, manage: boolean, publish: boolean): CmsAdminTip {
  return cmsAdminTipSchema.parse({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish),
    title: row.title,
    body: row.body
  });
}

function homepageSectionData(row: StoredHomepageSection, manage: boolean, publish: boolean): CmsAdminHomepageSection {
  return cmsAdminHomepageSectionSchema.parse({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish)
  });
}

function displaySettingData(row: StoredDisplaySetting, manage: boolean, publish: boolean): CmsAdminDisplaySetting {
  return cmsAdminDisplaySettingSchema.parse({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
    availableActions: actions(manage, publish)
  });
}

export function createCmsAdminContentService(dependencies: {
  repository: CmsAdminContentRepository;
  authorization: CmsAdminAuthorization;
  audit: Pick<AuditWriter, 'record'>;
  now?: () => Date;
}): CmsAdminContentService {
  const now = dependencies.now ?? (() => new Date());
  const allowed = (userId: string, permission: RbacPermission) => dependencies.authorization.authorize(userId, permission);

  async function authorizationFor(userId: string): Promise<{ manage: boolean; publish: boolean }> {
    const [manage, publish] = await Promise.all([
      allowed(userId, 'admin:content.manage'),
      allowed(userId, 'admin:content.publish')
    ]);
    return { manage, publish };
  }

  async function requireView(userId: string): Promise<{ manage: boolean; publish: boolean }> {
    if (!await allowed(userId, 'admin:content.view')) throw new CmsAdminContentServiceError('CMS_CONTENT_FORBIDDEN');
    return authorizationFor(userId);
  }

  async function requireManage(userId: string): Promise<{ manage: boolean; publish: boolean }> {
    const authorization = await requireView(userId);
    if (!authorization.manage) throw new CmsAdminContentServiceError('CMS_CONTENT_FORBIDDEN');
    return authorization;
  }

  function requirePublish(status: string, publish: boolean): void {
    if (status === 'published' && !publish) throw new CmsAdminContentServiceError('CMS_CONTENT_PUBLISH_FORBIDDEN');
  }

  async function audit(
    action: string,
    targetType: string,
    targetId: string,
    principal: CmsAdminPrincipal,
    reason: string,
    before: unknown,
    after: unknown,
    context: CmsAdminMutationContext,
    at: Date
  ): Promise<void> {
    await dependencies.audit.record({
      actorType: 'admin', actorId: principal.userId, targetType, targetId, action, reason,
      before, after, requestId: context.requestId, traceId: context.traceId, occurredAt: at
    });
  }

  function aboutResult(result: Awaited<ReturnType<CmsAdminContentRepository['createAbout']>> | Awaited<ReturnType<CmsAdminContentRepository['updateAbout']>>): StoredAboutBlock {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'key_conflict') throw new CmsAdminContentServiceError('CMS_CONTENT_KEY_EXISTS');
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  function teamResult(result: Awaited<ReturnType<CmsAdminContentRepository['createTeam']>> | Awaited<ReturnType<CmsAdminContentRepository['updateTeam']>>): StoredTeamMember {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'key_conflict') throw new CmsAdminContentServiceError('CMS_CONTENT_KEY_EXISTS');
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  function populationResult(result: Awaited<ReturnType<CmsAdminContentRepository['updatePopulation']>>): StoredPopulationValue {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  function tipResult(result: Awaited<ReturnType<CmsAdminContentRepository['createTip']>> | Awaited<ReturnType<CmsAdminContentRepository['updateTip']>>): StoredTip {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'key_conflict') throw new CmsAdminContentServiceError('CMS_CONTENT_KEY_EXISTS');
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  function homepageSectionResult(result: Awaited<ReturnType<CmsAdminContentRepository['createHomepageSection']>> | Awaited<ReturnType<CmsAdminContentRepository['updateHomepageSection']>>): StoredHomepageSection {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'key_conflict') throw new CmsAdminContentServiceError('CMS_CONTENT_KEY_EXISTS');
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  function displaySettingResult(result: Awaited<ReturnType<CmsAdminContentRepository['createDisplaySetting']>> | Awaited<ReturnType<CmsAdminContentRepository['updateDisplaySetting']>>): StoredDisplaySetting {
    if (result.kind === 'written') return result.item;
    if (result.kind === 'key_conflict') throw new CmsAdminContentServiceError('CMS_CONTENT_KEY_EXISTS');
    if (result.kind === 'not_found') throw new CmsAdminContentServiceError('CMS_CONTENT_NOT_FOUND');
    throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
  }

  async function read(principal: CmsAdminPrincipal, namespace: CmsAdminContentNamespace): Promise<CmsAdminContentData> {
    const authorization = await requireView(principal.userId);
    if (namespace === 'about') {
      return cmsAdminContentDataSchema.parse({ namespace, items: (await dependencies.repository.listAbout()).map(row => aboutData(row, authorization.manage, authorization.publish)) });
    }
    if (namespace === 'team') {
      return cmsAdminContentDataSchema.parse({ namespace, items: (await dependencies.repository.listTeam()).map(row => teamData(row, authorization.manage, authorization.publish)) });
    }
    if (namespace === 'tips') {
      return cmsAdminContentDataSchema.parse({ namespace, items: (await dependencies.repository.listTips()).map(row => tipData(row, authorization.manage, authorization.publish)) });
    }
    if (namespace === 'homepage') {
      return cmsAdminContentDataSchema.parse({ namespace, items: (await dependencies.repository.listHomepageSections()).map(row => homepageSectionData(row, authorization.manage, authorization.publish)) });
    }
    if (namespace === 'display') {
      return cmsAdminContentDataSchema.parse({ namespace, items: (await dependencies.repository.listDisplaySettings()).map(row => displaySettingData(row, authorization.manage, authorization.publish)) });
    }
    const row = await dependencies.repository.getPopulation();
    return cmsAdminContentDataSchema.parse({ namespace, items: row ? [populationData(row, authorization.manage, authorization.publish)] : [] });
  }

  return {
    async get(principal, namespace) {
      return read(principal, cmsAdminContentNamespaceSchema.parse(namespace));
    },
    async put(principal, unparsedNamespace, unparsedInput, context) {
      const namespace = cmsAdminContentNamespaceSchema.parse(unparsedNamespace);
      const authorization = await requireManage(principal.userId);
      const at = now();
      if (namespace === 'about') {
        const input = cmsAdminAboutBlockPutSchema.parse(unparsedInput) as CmsAdminAboutBlockPut;
        let row: StoredAboutBlock;
        if ('id' in input && input.id !== undefined) {
          const update = input as Extract<CmsAdminAboutBlockPut, { id: string }>;
          if (update.status !== undefined) requirePublish(update.status, authorization.publish);
          row = aboutResult(await dependencies.repository.updateAbout(update.id, update.version, {
            ...(update.title !== undefined ? { title: update.title } : {}),
            ...(update.body !== undefined ? { body: update.body } : {}),
            ...(update.order !== undefined ? { order: update.order } : {}),
            ...(update.active !== undefined ? { active: update.active } : {}),
            ...(update.status !== undefined ? { status: update.status } : {})
          }, principal.userId, at));
        } else {
          const create = input as AboutBlockCreate;
          requirePublish(create.status, authorization.publish);
          row = aboutResult(await dependencies.repository.createAbout({
            key: create.key, title: create.title, body: create.body, order: create.order,
            active: create.active, status: create.status
          }, principal.userId, at));
        }
        await audit('cms.about.write', 'cms_about_block', row.id, principal, input.reason, null, { id: row.id, key: row.key, status: row.status, version: row.version }, context, at);
        return read(principal, namespace);
      }
      if (namespace === 'team') {
        const input = cmsAdminTeamMemberPutSchema.parse(unparsedInput) as CmsAdminTeamMemberPut;
        let row: StoredTeamMember;
        if ('id' in input && input.id !== undefined) {
          const update = input as Extract<CmsAdminTeamMemberPut, { id: string }>;
          if (update.status !== undefined) requirePublish(update.status, authorization.publish);
          row = teamResult(await dependencies.repository.updateTeam(update.id, update.version, {
            ...(update.name !== undefined ? { name: update.name } : {}),
            ...(update.title !== undefined ? { title: update.title } : {}),
            ...(update.bio !== undefined ? { bio: update.bio } : {}),
            ...(update.photoAssetId !== undefined ? { photoAssetId: update.photoAssetId } : {}),
            ...(update.order !== undefined ? { order: update.order } : {}),
            ...(update.active !== undefined ? { active: update.active } : {}),
            ...(update.status !== undefined ? { status: update.status } : {})
          }, principal.userId, at));
        } else {
          const create = input as TeamMemberCreate;
          requirePublish(create.status, authorization.publish);
          row = teamResult(await dependencies.repository.createTeam({
            key: create.key, name: create.name, title: create.title,
            ...(create.bio ? { bio: create.bio } : {}),
            ...(create.photoAssetId ? { photoAssetId: create.photoAssetId } : {}),
            order: create.order, active: create.active, status: create.status
          }, principal.userId, at));
        }
        await audit('cms.team.write', 'cms_team_member', row.id, principal, input.reason, null, { id: row.id, key: row.key, status: row.status, version: row.version }, context, at);
        return read(principal, namespace);
      }
      if (namespace === 'tips') {
        const input = cmsAdminTipPutSchema.parse(unparsedInput) as CmsAdminTipPut;
        let row: StoredTip;
        if ('id' in input && input.id !== undefined) {
          const update = input as Extract<CmsAdminTipPut, { id: string }>;
          if (update.status !== undefined) requirePublish(update.status, authorization.publish);
          const changes: TipChanges = {
            ...(update.title !== undefined ? { title: update.title } : {}),
            ...(update.body !== undefined ? { body: update.body } : {}),
            ...(update.order !== undefined ? { order: update.order } : {}),
            ...(update.active !== undefined ? { active: update.active } : {}),
            ...(update.status !== undefined ? { status: update.status } : {})
          };
          row = tipResult(await dependencies.repository.updateTip(update.id, update.version, changes, principal.userId, at));
        } else {
          const create = input as Extract<CmsAdminTipPut, { key: string }>;
          requirePublish(create.status, authorization.publish);
          row = tipResult(await dependencies.repository.createTip({
            key: create.key, title: create.title, body: create.body, order: create.order,
            active: create.active, status: create.status
          }, principal.userId, at));
        }
        await audit('cms.tips.write', 'cms_real_estate_tip', row.id, principal, input.reason, null, { id: row.id, key: row.key, status: row.status, version: row.version }, context, at);
        return read(principal, namespace);
      }
      if (namespace === 'homepage') {
        const input = cmsAdminHomepageSectionPutSchema.parse(unparsedInput) as CmsAdminHomepageSectionPut;
        let row: StoredHomepageSection;
        if ('id' in input && input.id !== undefined) {
          const update = input as Extract<CmsAdminHomepageSectionPut, { id: string }>;
          if (update.status !== undefined) requirePublish(update.status, authorization.publish);
          const changes: HomepageSectionChanges = {
            ...(update.title !== undefined ? { title: update.title } : {}),
            ...(update.body !== undefined ? { body: update.body } : {}),
            ...(update.order !== undefined ? { order: update.order } : {}),
            ...(update.visible !== undefined ? { visible: update.visible } : {}),
            ...(update.status !== undefined ? { status: update.status } : {})
          };
          row = homepageSectionResult(await dependencies.repository.updateHomepageSection(update.id, update.version, changes, principal.userId, at));
        } else {
          const create = input as Extract<CmsAdminHomepageSectionPut, { key: string }>;
          requirePublish(create.status, authorization.publish);
          row = homepageSectionResult(await dependencies.repository.createHomepageSection({
            key: create.key, title: create.title, ...(create.body === undefined ? {} : { body: create.body }),
            order: create.order, visible: create.visible, status: create.status
          }, principal.userId, at));
        }
        await audit('cms.homepage.write', 'cms_homepage_section', row.id, principal, input.reason, null, { id: row.id, key: row.key, status: row.status, version: row.version }, context, at);
        return read(principal, namespace);
      }
      if (namespace === 'display') {
        const input = cmsAdminDisplaySettingPutSchema.parse(unparsedInput) as CmsAdminDisplaySettingPut;
        let row: StoredDisplaySetting;
        if ('id' in input && input.id !== undefined) {
          const update = input as Extract<CmsAdminDisplaySettingPut, { id: string }>;
          if (update.status !== undefined) requirePublish(update.status, authorization.publish);
          const changes: DisplaySettingChanges = {
            ...(update.value === undefined ? {} : { value: update.value }),
            ...(update.status === undefined ? {} : { status: update.status })
          };
          row = displaySettingResult(await dependencies.repository.updateDisplaySetting(update.id, update.version, changes, principal.userId, at));
        } else {
          const create = input as Extract<CmsAdminDisplaySettingPut, { key: string }>;
          requirePublish(create.status, authorization.publish);
          row = displaySettingResult(await dependencies.repository.createDisplaySetting({ key: create.key, value: create.value, status: create.status }, principal.userId, at));
        }
        await audit('cms.display.write', 'cms_display_setting', row.id, principal, input.reason, null, { id: row.id, key: row.key, status: row.status, version: row.version }, context, at);
        return read(principal, namespace);
      }
      const input = cmsAdminPopulationValuePutSchema.parse(unparsedInput) as CmsAdminPopulationValuePut;
      const current = await dependencies.repository.getPopulation();
      requirePublish(input.status, authorization.publish);
      if (current !== null && input.version === undefined) {
        throw new CmsAdminContentServiceError('CMS_CONTENT_VERSION_CONFLICT');
      }
      const row = current === null
        ? await dependencies.repository.createPopulation({
          status: input.status,
          ...(input.value === undefined ? {} : { value: input.value }),
          ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
          ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
          ...(input.asOf ? { asOf: new Date(input.asOf) } : {}),
          reason: input.reason
        }, principal.userId, at)
        : populationResult(await dependencies.repository.updatePopulation(current.id, input.version ?? current.version, {
          status: input.status,
          ...(input.value === undefined && input.status !== 'available' ? { value: null } : input.value === undefined ? {} : { value: input.value }),
          ...(input.sourceLabel ? { sourceLabel: input.sourceLabel } : {}),
          ...(input.sourceUrl ? { sourceUrl: input.sourceUrl } : {}),
          ...(input.asOf ? { asOf: new Date(input.asOf) } : {}),
          reason: input.reason
        }, principal.userId, at));
      await audit('cms.population.write', 'cms_population_value', row.id, principal, input.reason, null, { id: row.id, status: row.status, version: row.version }, context, at);
      return read(principal, namespace);
    }
  };
}
