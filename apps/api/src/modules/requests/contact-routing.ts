import { Types, type Connection } from 'mongoose';
import { unexpiredPropertyFilter } from '../settings/property-policy.js';
import { publicRelatedId } from '../public/related-property.js';
import { RequestServiceError, type RequestRecord } from './service.js';

export async function routeContact(connection: Connection, request: RequestRecord): Promise<RequestRecord> {
  if (request.type !== 'contact') return request;
  const organizationId = request.payload.organizationId;
  const direct = request.payload.contactChannel === 'provider';
  let providerId: string | undefined;
  let propertyOrganization: string | undefined;
  if (request.propertyId) {
    const property = await connection.collection('properties').findOne({
      _id: new Types.ObjectId(request.propertyId), status: 'published', active: true, ...unexpiredPropertyFilter()
    }, { projection: { providerId: 1, organizationId: 1, projectId: 1 } });
    if (!property) throw new RequestServiceError('REQUEST_NOT_FOUND');
    if (request.projectId && publicRelatedId(property.projectId) !== request.projectId) throw new RequestServiceError('REQUEST_NOT_FOUND');
    providerId = publicRelatedId(property.providerId);
    propertyOrganization = publicRelatedId(property.organizationId);
  }
  if (typeof organizationId === 'string') {
    if (request.propertyId && propertyOrganization !== organizationId) throw new RequestServiceError('REQUEST_NOT_FOUND');
    const organization = await connection.collection('organizations').findOne({ _id: new Types.ObjectId(organizationId), status: 'approved' }, { projection: { providerId: 1, name: 1, slug: 1, profileProjects: 1 } });
    providerId = publicRelatedId(organization?.providerId);
    if ((!organization && !request.propertyId) || (direct && !providerId)) throw new RequestServiceError('REQUEST_NOT_FOUND');
    // A published property's platform inquiry does not need a direct-company recipient.
    // Standalone project inquiries and direct delivery still validate company ownership.
    if (request.projectId && (direct || !request.propertyId)) {
      const embedded = Array.isArray(organization?.profileProjects) && organization.profileProjects.some((project: Record<string, unknown>) => publicRelatedId(project._id) === request.projectId && project.status === 'published');
      if (!embedded && !await connection.collection('projects').findOne({ _id: new Types.ObjectId(request.projectId), organizationId: new Types.ObjectId(organizationId), status: 'published' }, { projection: { _id: 1 } })) throw new RequestServiceError('REQUEST_NOT_FOUND');
    }
    request = { ...request, payload: { ...request.payload,
      ...(typeof organization?.slug === 'string' ? { organizationSlug: organization.slug } : {}),
      ...(typeof organization?.name?.ar === 'string' ? { organizationNameAr: organization.name.ar } : {}),
      ...(typeof organization?.name?.en === 'string' ? { organizationNameEn: organization.name.en } : {})
    } };
    if (direct) {
      const profile = await connection.collection('provider_profiles').findOne({ _id: new Types.ObjectId(providerId), status: 'approved' }, { projection: { userId: 1 } });
      providerId = publicRelatedId(profile?.userId);
      if (!providerId) throw new RequestServiceError('REQUEST_NOT_FOUND');
    }
  } else if (direct && providerId) {
    const profile = await connection.collection('provider_profiles').findOne({ _id: new Types.ObjectId(providerId), status: 'approved' }, { projection: { userId: 1 } });
    providerId = publicRelatedId(profile?.userId);
  }
  if (!direct) return request;
  if (!providerId || !await connection.collection('users').findOne({ _id: new Types.ObjectId(providerId), roleType: 'provider', status: 'verified' }, { projection: { _id: 1 } })) throw new RequestServiceError('REQUEST_NOT_FOUND');
  return { ...request, providerId };
}

export function directContactNotification(request: RequestRecord) {
  if (!request.providerId || request.payload.contactChannel !== 'provider') return undefined;
  return {
    _id: new Types.ObjectId(), recipientId: new Types.ObjectId(request.providerId), audience: 'provider',
    type: 'contact.created', title: { ar: 'طلب تواصل جديد', en: 'New contact inquiry' },
    message: { ar: 'لديك استفسار جديد. افتح طلبات العملاء للاطلاع والرد.', en: 'You have a new inquiry. Open customer requests to review and respond.' },
    link: '/provider/customer-requests', readAt: null, createdAt: request.createdAt
  };
}
