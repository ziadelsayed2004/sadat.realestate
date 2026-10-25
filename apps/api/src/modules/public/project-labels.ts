import { Types, type Connection } from 'mongoose';
import { localizedTextSchema } from '@sadat-real-estate/contracts';
import { visiblePublicOrganizations } from './identity.js';

const id = (value: unknown) => value instanceof Types.ObjectId ? value.toString() : typeof value === 'string' && /^[a-f0-9]{24}$/u.test(value) ? value : undefined;
export async function attachPublicProjectLabels<T extends { projectId?: string }>(connection: Connection, rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.flatMap(row => row.projectId && id(row.projectId) ? [row.projectId] : []))].map(value => new Types.ObjectId(value));
  if (!ids.length) return rows;
  const projects = await connection.collection('projects').find({ _id: { $in: ids }, status: 'published' }, { projection: { name: 1, slug: 1, organizationId: 1 } }).toArray();
  const organizations = await connection.collection('organizations').find({ _id: { $in: projects.flatMap(project => id(project.organizationId) ? [new Types.ObjectId(id(project.organizationId)!)] : []) }, status: 'approved' }, { projection: { providerId: 1, kind: 1, slug: 1, status: 1 } }).toArray();
  const visible = await visiblePublicOrganizations(connection, organizations, 'directory');
  return rows.map(row => {
    const project = projects.find(item => id(item._id) === row.projectId), name = localizedTextSchema.safeParse(project?.name);
    if (!project || !name.success) return row;
    const organization = visible.find(item => id(item._id) === id(project.organizationId));
    return { ...row, projectName: name.data, ...(organization && typeof project.slug === 'string' ? { projectUrl: `/developers/${organization.slug}/projects/${project.slug}` } : {}) };
  });
}
