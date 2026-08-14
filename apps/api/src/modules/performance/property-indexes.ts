import { propertyExplainSummarySchema, propertyQueryPlanSchema, type PropertyExplainSummary, type PropertyQueryPattern, type PropertyQueryPlan } from '@sadat-real-estate/contracts';
import { propertySchema } from '../properties/models.js';

export type PropertyIndexKind = 'compound' | 'text' | 'geospatial';
export interface PropertyIndexCatalogEntry {
  name: string;
  kind: PropertyIndexKind;
  fields: readonly string[];
  queryPattern: PropertyQueryPattern;
}

export const PROPERTY_INDEX_CATALOG: readonly PropertyIndexCatalogEntry[] = Object.freeze([
  { name: 'properties_provider_status_updated', kind: 'compound', fields: ['providerId', 'status', 'updatedAt', '_id'], queryPattern: 'provider_list' },
  { name: 'properties_provider_slug_unique', kind: 'compound', fields: ['providerId', 'slug'], queryPattern: 'provider_list' },
  { name: 'properties_public_status', kind: 'compound', fields: ['status', 'active', 'updatedAt'], queryPattern: 'admin_list' },
  { name: 'properties_project_public', kind: 'compound', fields: ['projectId', 'status', 'active'], queryPattern: 'public_project' },
  { name: 'properties_location_public', kind: 'compound', fields: ['locationId', 'status', 'active'], queryPattern: 'public_location' },
  { name: 'properties_coordinates_geo', kind: 'geospatial', fields: ['coordinates'], queryPattern: 'nearby' },
  { name: 'properties_search_text', kind: 'text', fields: ['name.ar', 'name.en', 'name.zh-CN', 'slug'], queryPattern: 'localized_search' }
]);

const HINTS: Record<PropertyQueryPattern, string> = {
  provider_list: 'properties_provider_status_updated',
  admin_list: 'properties_public_status',
  public_project: 'properties_project_public',
  public_location: 'properties_location_public',
  nearby: 'properties_coordinates_geo',
  localized_search: 'properties_search_text'
};

export function getPropertySchemaIndexes(): readonly { name?: string; key: Record<string, unknown> }[] {
  return propertySchema.indexes().map(([key, options]) => typeof options.name === 'string' ? { name: options.name, key: { ...key } } : { key: { ...key } });
}

export function missingPropertyIndexes(): readonly PropertyIndexCatalogEntry[] {
  const names = new Set(getPropertySchemaIndexes().map(index => index.name));
  return PROPERTY_INDEX_CATALOG.filter(index => !names.has(index.name));
}

export function buildPropertyQueryPlan(input: { pattern: PropertyQueryPattern; page: number; limit: number; sort?: Record<string, 1 | -1> }): PropertyQueryPlan {
  const plan = {
    pattern: input.pattern,
    page: input.page,
    limit: input.limit,
    skip: (input.page - 1) * input.limit,
    hint: HINTS[input.pattern],
    ...(input.sort ? { sort: input.sort } : {})
  };
  return propertyQueryPlanSchema.parse(plan);
}

export function evaluatePropertyExplainPlan(summary: unknown, expectedHint: string): { usesExpectedIndex: boolean; bounded: boolean; returned: number } {
  const parsed: PropertyExplainSummary = propertyExplainSummarySchema.parse(summary);
  return {
    usesExpectedIndex: parsed.winningIndex === expectedHint,
    bounded: parsed.totalDocsExamined <= Math.max(parsed.nReturned * 20, 20),
    returned: parsed.nReturned
  };
}

export function expectedPropertyHint(pattern: PropertyQueryPattern): string { return HINTS[pattern]; }
