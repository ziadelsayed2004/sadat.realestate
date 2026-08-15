import { z } from 'zod';

const safeKey = z.string().trim().min(1).max(120).regex(/^[a-zA-Z][a-zA-Z0-9_.:-]*$/u);
const safeText = z.string().trim().min(1).max(500).regex(/^[^\u0000-\u001f\u007f]+$/u);
const safeEvidence = z.string().trim().min(1).max(240).regex(/^[A-Za-z0-9_./:#()' -]+$/u);
const utcDate = z.string().datetime({ offset: true });

export const SECURITY_ASSURANCE_DOMAINS = ['owasp_api', 'platform'] as const;
export const SECURITY_ASSURANCE_STATUSES = ['implemented', 'partial', 'blocked', 'not_applicable'] as const;
export const SECURITY_ASSURANCE_OVERALLS = ['pass', 'conditional', 'blocked'] as const;
export const SECURITY_ASSURANCE_CATEGORIES = [
  'api1_bola',
  'api2_authentication',
  'api3_property_authorization',
  'api4_resource_consumption',
  'api5_function_authorization',
  'api6_business_flow',
  'api7_ssrf',
  'api8_misconfiguration',
  'api9_inventory',
  'api10_unsafe_consumption',
  'platform_secrets',
  'platform_data_protection',
  'platform_supply_chain',
  'platform_availability',
  'platform_external_assurance'
] as const;

export const securityAssuranceDomainSchema = z.enum(SECURITY_ASSURANCE_DOMAINS);
export const securityAssuranceStatusSchema = z.enum(SECURITY_ASSURANCE_STATUSES);
export const securityAssuranceOverallSchema = z.enum(SECURITY_ASSURANCE_OVERALLS);
export const securityAssuranceCategorySchema = z.enum(SECURITY_ASSURANCE_CATEGORIES);
export const securityAssuranceFindingSchema = z.object({
  id: safeKey,
  domain: securityAssuranceDomainSchema,
  category: securityAssuranceCategorySchema,
  status: securityAssuranceStatusSchema,
  title: safeText,
  evidence: z.array(safeEvidence).min(1).max(12),
  gap: safeText.optional(),
  ownerAction: safeText.optional()
}).strict();

export const securityAssuranceReportSchema = z.object({
  version: z.literal(1),
  generatedAt: utcDate,
  overall: securityAssuranceOverallSchema,
  findings: z.array(securityAssuranceFindingSchema).min(1).max(40)
}).strict();

export type SecurityAssuranceDomain = z.infer<typeof securityAssuranceDomainSchema>;
export type SecurityAssuranceStatus = z.infer<typeof securityAssuranceStatusSchema>;
export type SecurityAssuranceOverall = z.infer<typeof securityAssuranceOverallSchema>;
export type SecurityAssuranceCategory = z.infer<typeof securityAssuranceCategorySchema>;
export type SecurityAssuranceFinding = z.infer<typeof securityAssuranceFindingSchema>;
export type SecurityAssuranceReport = z.infer<typeof securityAssuranceReportSchema>;
