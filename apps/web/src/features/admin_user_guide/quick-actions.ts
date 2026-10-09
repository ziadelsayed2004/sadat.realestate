import type { GuideLink, GuideSection, GuideTopic } from './content.ts';
import type { GuideAudience } from './account-guides.ts';

/** Topic IDs are shared by the live guide, deep links and downloadable catalog. */
const adminTasks = ['verification', 'property-review', 'viewing-administration', 'request-actions', 'articles', 'article-categories', 'banner-create', 'commission-exceptions', 'admin-users-roles', 'platform-contact', 'notifications-audit', 'tips-home'];
const providerTasks = ['provider-documents', 'provider-property', 'property-video', 'provider-followup', 'provider-ad-workflow', 'egypt-viewing-time'];
const tasks: Record<GuideAudience, readonly string[]> = {
  all: ['public-search', 'seeker-requests', 'provider-property', 'developer-journey', 'viewing-administration', 'articles', 'banner-create', 'commission-exceptions', 'admin-users-roles'],
  seeker: ['public-search', 'seeker-requests', 'seeker-profile', 'public-content', 'seeker-register'],
  individual_broker: ['individual-journey', ...providerTasks],
  brokerage_office: ['office-journey', ...providerTasks],
  developer: ['developer-journey', ...providerTasks],
  'owner-admin': adminTasks,
  'staff-admin': adminTasks
};

export function guideQuickActions(sections: readonly GuideSection[], audience: GuideAudience): GuideTopic[] {
  const available = new Map(sections.flatMap(section => section.topics.map(topic => [topic.id, topic] as const)));
  return tasks[audience].flatMap(id => { const topic = available.get(id); return topic ? [topic] : []; });
}

export function guideTopicAnchor(id: string): string { return `guide-${id}`; }

export function guideQuickTarget(topic: GuideTopic): GuideLink | undefined {
  const preferred: Record<string, string> = { 'developer-journey': '/provider/projects', 'office-journey': '/provider/properties', 'admin-users-roles': '/admin/admin-users', 'seeker-requests': '/seeker/requests' };
  return topic.links.find(link => link.path === preferred[topic.id]) ?? topic.links[0];
}
