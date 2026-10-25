import { Types, type Connection } from 'mongoose';
import { localizedTextSchema, projectStatusSchema, organizationSlugSchema, propertyReviewContextSchema, type PropertyReviewContext } from '@sadat-real-estate/contracts';
import { visiblePublicOrganizations } from '../public/identity.js';
import type { StoredProperty } from './repository.js';

export interface ReviewContextPermissions { projects: boolean; providers: boolean }
export type PropertyReviewContextReader = (property: StoredProperty, permissions: ReviewContextPermissions) => Promise<PropertyReviewContext>;
const objectId = (value: unknown): string | undefined => value instanceof Types.ObjectId ? value.toHexString() : typeof value === 'string' && /^[a-f0-9]{24}$/u.test(value) ? value : undefined;

export function createPropertyReviewContextReader(connection: Connection): PropertyReviewContextReader {
  return async (property, permissions) => {
    const missing = property.projectId ? { projectUnavailable: true } : {};
    const owner = new Types.ObjectId(property.providerId);
    let [profile, application] = await Promise.all([
      connection.collection('provider_profiles').findOne({ $or: [{ _id: owner }, { userId: owner }] }, { projection: { userId: 1, providerType: 1 } }),
      connection.collection('provider_applications').findOne({ $or: [{ _id: owner }, { userId: owner }] }, { projection: { userId: 1, providerType: 1 } })
    ]);
    const accountId = objectId(application?.userId) ?? objectId(profile?.userId) ?? property.providerId;
    [profile, application] = await Promise.all([profile ?? connection.collection('provider_profiles').findOne({ userId: new Types.ObjectId(accountId) }, { projection: { userId: 1, providerType: 1 } }), application ?? connection.collection('provider_applications').findOne({ userId: new Types.ObjectId(accountId) }, { projection: { userId: 1, providerType: 1 } })]);
    if (profile?.userId && String(profile.userId) !== accountId || application?.userId && String(application.userId) !== accountId) return missing;
    const kind = application?.providerType ?? profile?.providerType ?? property.source.sourceType;
    if (!['developer_company', 'brokerage_office'].includes(String(kind)) || profile?.providerType && profile.providerType !== kind) return missing;
    const owners = [...new Set([property.providerId, accountId, objectId(profile?._id), objectId(application?._id)].filter((value): value is string => Boolean(value)))];
    const keys = [...owners, ...owners.map(value => new Types.ObjectId(value))];
    const organization = await connection.collection('organizations').findOne({ ...(property.source.organizationId ? { _id: new Types.ObjectId(property.source.organizationId) } : {}), providerId: { $in: keys }, kind }, { projection: { providerId: 1, name: 1, kind: 1, slug: 1, status: 1, directoryVisible: 1 } });
    const name = localizedTextSchema.safeParse(organization?.name);
    if (!organization || !name.success) return missing;
    const slug = organizationSlugSchema.safeParse(organization.slug);
    const publicVisible = slug.success && organization.status === 'approved' && organization.directoryVisible !== false && (await visiblePublicOrganizations(connection, [organization], 'directory')).length === 1;
    const publicPath = publicVisible ? `/developers/${slug.data}` : undefined;
    const context: PropertyReviewContext = { organization: { name: name.data, kind: kind as 'developer_company' | 'brokerage_office', ...(permissions.providers && objectId(application?._id) ? { adminPath: `/admin/providers/${objectId(application!._id)}` } : {}), ...(publicPath ? { publicPath, projectsPath: `${publicPath}#developer-projects` } : {}) } };
    if (property.projectId) {
      const project = await connection.collection('projects').findOne({ _id: new Types.ObjectId(property.projectId), providerId: { $in: keys }, $or: [{ organizationId: { $in: [organization._id, String(organization._id)] } }, { organizationId: null }] }, { projection: { name: 1, status: 1, slug: 1 } });
      const projectName = localizedTextSchema.safeParse(project?.name), status = projectStatusSchema.safeParse(project?.status), projectSlug = organizationSlugSchema.safeParse(project?.slug);
      if (projectName.success && status.success) context.project = { name: projectName.data, status: status.data, ...(permissions.projects ? { adminPath: `/admin/projects/review?projectId=${property.projectId}` } : {}), ...(publicPath && status.data === 'published' && projectSlug.success ? { publicPath: `${publicPath}/projects/${projectSlug.data}` } : {}) };
      else context.projectUnavailable = true;
    }
    return propertyReviewContextSchema.parse(context);
  };
}
