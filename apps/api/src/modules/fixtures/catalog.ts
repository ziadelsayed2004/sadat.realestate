import {
  UAT_FIXTURE_STATES,
  UAT_FIXTURE_SURFACES,
  uatFixtureCatalogSchema,
  uatFixtureSchema,
  type UatFixture,
  type UatFixtureCatalog,
  type UatFixtureState,
  type UatFixtureSurface
} from '@sadat-realestate/contracts';

function payloadFor(state: UatFixtureState): Record<string, unknown> {
  switch (state) {
    case 'loading': return { viewState: 'loading' };
    case 'empty': return { viewState: 'empty', items: [] };
    case 'error': return { viewState: 'error', errorCode: 'SYNTHETIC_ERROR' };
    case 'retry': return { viewState: 'retry', retryable: true };
    case 'success': return { viewState: 'success', fixtureLabel: 'Synthetic UAT fixture' };
    case 'missing_image': return { viewState: 'success', imageState: 'missing' };
    case 'long_text': return { viewState: 'success', text: 'Synthetic UAT long text '.repeat(32).trim() };
    case 'expired': return { viewState: 'expired', expired: true };
    case 'unavailable': return { viewState: 'unavailable', reason: 'adapter_unavailable' };
  }
}

function createFixture(surface: UatFixtureSurface, state: UatFixtureState): UatFixture {
  return uatFixtureSchema.parse({
    key: `${surface}.${state}`,
    surface,
    state,
    locale: 'en',
    synthetic: true,
    payload: payloadFor(state)
  });
}

export function createUatFixtureCatalog(): UatFixtureCatalog {
  const items = UAT_FIXTURE_SURFACES.flatMap(surface => UAT_FIXTURE_STATES.map(state => createFixture(surface, state)));
  return uatFixtureCatalogSchema.parse({ version: 'uat-fixtures-v1', items });
}

export function getUatFixture(catalog: UatFixtureCatalog, key: string): UatFixture | undefined {
  const parsed = uatFixtureCatalogSchema.parse(catalog);
  return parsed.items.find(item => item.key === key);
}

export function assertUatFixtureCatalog(value: unknown): UatFixtureCatalog {
  const parsed = uatFixtureCatalogSchema.parse(value);
  const keys = new Set(parsed.items.map(item => item.key));
  if (keys.size !== parsed.items.length) throw new Error('UAT_FIXTURE_DUPLICATE_KEY');
  for (const surface of UAT_FIXTURE_SURFACES) {
    for (const state of UAT_FIXTURE_STATES) {
      if (!keys.has(`${surface}.${state}`)) throw new Error(`UAT_FIXTURE_MISSING:${surface}.${state}`);
    }
  }
  return parsed;
}
