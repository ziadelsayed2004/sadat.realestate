import { RUNTIME_ROUTE_INVENTORY, runtimeRouteKey } from '../docs/route-inventory.js';

export const BACKEND_JOURNEY_NAMES = Object.freeze([
  'registration_to_publication',
  'requests',
  'advertising',
  'commissions',
  'cleanup'
] as const);

export type BackendJourneyName = (typeof BACKEND_JOURNEY_NAMES)[number];
export type BackendJourneyKind = 'route' | 'service' | 'cleanup';
export type BackendJourneyExpectation =
  | 'success'
  | 'validation_error'
  | 'forbidden'
  | 'state_transition'
  | 'cleanup';

export interface BackendJourneyStep {
  readonly id: string;
  readonly journey: BackendJourneyName;
  readonly order: number;
  readonly kind: BackendJourneyKind;
  readonly method?: string;
  readonly path?: string;
  readonly operation: string;
  readonly expectation: BackendJourneyExpectation;
  readonly cleanup?: boolean;
}

export interface BackendJourneyExecution {
  readonly outcome: BackendJourneyExpectation;
  readonly statusCode?: number;
  readonly note?: string;
}

export interface BackendJourneyExecutor {
  execute(step: BackendJourneyStep): Promise<BackendJourneyExecution>;
}

export interface BackendJourneyStepResult extends BackendJourneyStep {
  readonly outcome: BackendJourneyExpectation;
  readonly statusCode?: number;
  readonly note?: string;
}

export interface BackendJourneyReport {
  readonly version: 'backend-journeys-v1';
  readonly synthetic: true;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly steps: readonly BackendJourneyStepResult[];
  readonly cleanupCompleted: boolean;
}

const route = (
  id: string,
  journey: BackendJourneyName,
  order: number,
  method: string,
  path: string,
  operation: string,
  expectation: BackendJourneyExpectation = 'success'
): BackendJourneyStep => ({ id, journey, order, kind: 'route', method, path, operation, expectation });

const service = (
  id: string,
  journey: BackendJourneyName,
  order: number,
  operation: string,
  expectation: BackendJourneyExpectation = 'success'
): BackendJourneyStep => ({ id, journey, order, kind: 'service', operation, expectation });

const cleanup = (
  id: string,
  order: number,
  operation: string,
  method?: string,
  path?: string
): BackendJourneyStep => ({
  id,
  journey: 'cleanup',
  order,
  kind: 'cleanup',
  ...(method ? { method } : {}),
  ...(path ? { path } : {}),
  operation,
  expectation: 'cleanup',
  cleanup: true
});

/**
 * Ordered synthetic journey definitions. Route entries are deliberately
 * limited to the executable inventory; ads and commissions remain service
 * boundaries until dedicated HTTP routes exist.
 */
export const BACKEND_JOURNEY_STEPS: readonly BackendJourneyStep[] = Object.freeze([
  route('seeker-registration', 'registration_to_publication', 10, 'POST', '/api/v1/auth/register/seeker', 'registerSeeker'),
  route('provider-registration', 'registration_to_publication', 20, 'POST', '/api/v1/provider/application', 'createProviderApplication'),
  route('provider-submit-incomplete-negative', 'registration_to_publication', 25, 'POST', '/api/v1/provider/application/submit', 'submitProviderApplication', 'validation_error'),
  route('provider-account-step', 'registration_to_publication', 30, 'PATCH', '/api/v1/provider/application/account', 'updateProviderAccountStep'),
  route('provider-business-step', 'registration_to_publication', 40, 'PATCH', '/api/v1/provider/application/business', 'updateProviderBusinessStep'),
  route('provider-company-step', 'registration_to_publication', 50, 'PATCH', '/api/v1/provider/application/company', 'updateProviderCompanyStep'),
  route('provider-application-submit', 'registration_to_publication', 60, 'POST', '/api/v1/provider/application/submit', 'submitProviderApplication'),
  route('provider-project-create', 'registration_to_publication', 70, 'POST', '/api/v1/provider/projects', 'createProviderProject'),
  route('provider-project-submit', 'registration_to_publication', 80, 'POST', '/api/v1/provider/projects/:projectId/submit', 'submitProviderProject'),
  route('admin-project-review', 'registration_to_publication', 90, 'POST', '/api/v1/admin/projects/:projectId/review', 'reviewAdminProject'),
  route('provider-property-create', 'registration_to_publication', 100, 'POST', '/api/v1/provider/properties', 'createProviderProperty'),
  route('provider-property-save-basic', 'registration_to_publication', 110, 'PATCH', '/api/v1/provider/properties/:propertyId/steps/:step', 'saveProviderPropertyStep'),
  route('provider-property-submit', 'registration_to_publication', 120, 'POST', '/api/v1/provider/properties/:propertyId/submit', 'submitProviderProperty'),
  route('admin-property-review', 'registration_to_publication', 130, 'POST', '/api/v1/admin/properties/:propertyId/review', 'reviewAdminProperty'),
  route('admin-property-visibility', 'registration_to_publication', 140, 'POST', '/api/v1/admin/properties/:propertyId/visibility', 'changeAdminPropertyVisibility'),
  route('public-property-details', 'registration_to_publication', 150, 'GET', '/api/v1/public/properties/:slug', 'getPublicPropertyDetails'),
  route('seeker-request', 'requests', 200, 'POST', '/api/v1/seeker/search-requests', 'createSeekerSearchRequest'),
  route('provider-customer-request', 'requests', 210, 'POST', '/api/v1/provider/customer-requests', 'createProviderCustomerRequest'),
  route('admin-assign-request', 'requests', 220, 'POST', '/api/v1/admin/requests/:requestId/assign', 'assignAdminRequest'),
  route('admin-resolve-request', 'requests', 230, 'POST', '/api/v1/admin/requests/:requestId/transitions', 'transitionAdminRequest'),
  route('seeker-request-idor-negative', 'requests', 240, 'GET', '/api/v1/seeker/requests/:requestId', 'getSeekerRequest', 'forbidden'),
  service('ad-placement', 'advertising', 300, 'ads.createPlacement'),
  service('ad-request-draft', 'advertising', 310, 'ads.createRequest'),
  service('ad-request-review', 'advertising', 320, 'ads.transitionRequest'),
  service('ad-quote-issued', 'advertising', 330, 'ads.issueQuote'),
  service('ad-quote-accepted', 'advertising', 340, 'ads.decideQuote'),
  service('payment-proof-reviewed', 'advertising', 350, 'payments.review'),
  service('commission-policy-resolved', 'commissions', 400, 'commissions.resolve'),
  service('commission-event-snapshotted', 'commissions', 410, 'commissions.snapshot'),
  service('commission-provider-projection', 'commissions', 420, 'provider.commission.read'),
  cleanup('cleanup-request', 900, 'requests.cancel'),
  cleanup('cleanup-advertising-draft', 910, 'ads.cancel'),
  cleanup('cleanup-session', 920, 'auth.logout', 'POST', '/api/v1/auth/logout')
]);

function validateJourneyDefinitions(steps: readonly BackendJourneyStep[]): void {
  const ids = new Set<string>();
  const orderKeys = new Set<string>();
  const routes = new Set(RUNTIME_ROUTE_INVENTORY.map(runtimeRouteKey));
  for (const step of steps) {
    if (ids.has(step.id)) throw new Error(`Duplicate backend journey step ${step.id}`);
    ids.add(step.id);
    const orderKey = `${step.journey}:${step.order}`;
    if (orderKeys.has(orderKey)) throw new Error(`Duplicate backend journey order ${orderKey}`);
    orderKeys.add(orderKey);
    if (step.kind === 'route') {
      if (!step.method || !step.path) throw new Error(`Route journey step ${step.id} is missing method/path`);
      if (!routes.has(`${step.method.toUpperCase()} ${step.path}`)) {
        throw new Error(`Journey route is not implemented: ${step.method.toUpperCase()} ${step.path}`);
      }
    } else if (step.kind === 'service' && (step.method || step.path)) {
      throw new Error(`Service journey step ${step.id} cannot declare an HTTP route`);
    }
  }
}

export function validateBackendJourneyDefinitions(
  steps: readonly BackendJourneyStep[] = BACKEND_JOURNEY_STEPS
): string[] {
  try {
    validateJourneyDefinitions(steps);
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : 'Invalid backend journey definitions'];
  }
}

export async function runBackendJourneys(
  executor: BackendJourneyExecutor,
  options: { steps?: readonly BackendJourneyStep[]; now?: () => Date } = {}
): Promise<BackendJourneyReport> {
  const steps = options.steps ?? BACKEND_JOURNEY_STEPS;
  validateJourneyDefinitions(steps);
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const regularSteps = [...steps].filter(step => !step.cleanup).sort((a, b) => a.order - b.order);
  const cleanupSteps = [...steps].filter(step => step.cleanup).sort((a, b) => a.order - b.order);
  const results: BackendJourneyStepResult[] = [];
  let primaryError: unknown;
  try {
    for (const step of regularSteps) {
      const execution = await executor.execute(step);
      if (execution.outcome !== step.expectation) {
        throw new Error(`Journey step ${step.id} expected ${step.expectation} but received ${execution.outcome}`);
      }
      results.push({ ...step, ...execution });
    }
  } catch (error) {
    primaryError = error;
  } finally {
    for (const step of cleanupSteps) {
      try {
        const execution = await executor.execute(step);
        if (execution.outcome !== step.expectation) {
          primaryError ??= new Error(`Cleanup step ${step.id} expected ${step.expectation} but received ${execution.outcome}`);
          continue;
        }
        results.push({ ...step, ...execution });
      } catch (error) {
        primaryError ??= error;
      }
    }
  }
  if (primaryError) throw primaryError;
  return {
    version: 'backend-journeys-v1',
    synthetic: true,
    startedAt,
    finishedAt: now().toISOString(),
    steps: results,
    cleanupCompleted: cleanupSteps.every(step => results.some(result => result.id === step.id))
  };
}
