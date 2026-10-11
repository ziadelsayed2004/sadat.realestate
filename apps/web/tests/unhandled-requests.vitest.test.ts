import { describe, expect, it } from 'vitest';
import { createUnhandledRequestTracker } from '../src/features/testing/msw/unhandled-requests.ts';

describe('test API fixture guard', () => {
  it('fails a test even if the UI caught an unhandled API request', () => {
    const tracker = createUnhandledRequestTracker();
    tracker.record('GET', '/api/v1/admin/providers/example/public-identity-subscription');
    expect(() => tracker.verify()).toThrow('GET /api/v1/admin/providers/example/public-identity-subscription');
  });
  it('reports every missing handler and isolates the next test', () => {
    const tracker = createUnhandledRequestTracker();
    tracker.record('GET', '/api/v1/new-feature');
    tracker.record('PUT', '/api/v1/new-feature');
    expect(() => tracker.verify()).toThrow(/GET.*\nPUT/su);
    expect(() => tracker.verify()).not.toThrow();
  });
});
