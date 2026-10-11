import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server.ts';
import { createUnhandledRequestTracker } from './msw/unhandled-requests.ts';

const unhandledRequests = createUnhandledRequestTracker();

beforeAll(() => {
  server.listen({ onUnhandledRequest(request, print) {
    unhandledRequests.record(request.method, request.url);
    print.error();
  } });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  unhandledRequests.verify();
});

afterAll(() => {
  server.close();
});
