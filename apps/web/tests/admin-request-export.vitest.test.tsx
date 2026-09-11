import { describe, expect, it, vi } from 'vitest';
import { requestDataSchema, type RequestListQuery } from '@sadat-real-estate/contracts';
import { collectRequestsForExport, requestRowsToCsv } from '../src/features/admin_requests/request-export.tsx';

const request = (index: number) => requestDataSchema.parse({
  id: index.toString(16).padStart(24, '0'), type: 'contact', source: 'seeker', status: 'closed',
  payload: {}, version: 0, availableActions: [], createdAt: '2026-09-11T10:00:00.000Z', updatedAt: '2026-09-11T10:00:00.000Z',
});
const query: RequestListQuery = { page: 9, limit: 20, status: 'closed', type: 'contact', search: 'customer' };

describe('filtered request CSV export', () => {
  it('collects every page and keeps filters independently of the currently visible page', async () => {
    const items = Array.from({ length: 251 }, (_, index) => request(index + 1));
    const load = vi.fn(async (next: RequestListQuery) => ({ page: next.page, limit: next.limit, total: items.length,
      items: items.slice((next.page - 1) * next.limit, next.page * next.limit) }));
    expect(await collectRequestsForExport(load, query, new AbortController().signal)).toEqual(items);
    expect(load.mock.calls.map(([next]) => next)).toEqual([1, 2, 3].map(page => ({ ...query, page, limit: 100 })));
  });

  it('rejects changing totals, repeated records and incomplete pages rather than returning a partial export', async () => {
    const first = Array.from({ length: 100 }, (_, index) => request(index + 1));
    for (const second of [
      { page: 2, limit: 100, total: 102, items: [request(101), request(102)] },
      { page: 2, limit: 100, total: 101, items: [request(1)] },
      { page: 2, limit: 100, total: 101, items: [] },
    ]) {
      const load = vi.fn().mockResolvedValueOnce({ page: 1, limit: 100, total: 101, items: first }).mockResolvedValueOnce(second);
      await expect(collectRequestsForExport(load, query, new AbortController().signal)).rejects.toThrow('EXPORT_RESULTS_CHANGED');
    }
  });

  it('stops on cancellation or a failed authorized page request', async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => {
      controller.abort();
      return { page: 1, limit: 100, total: 0, items: [] };
    });
    await expect(collectRequestsForExport(load, query, controller.signal)).rejects.toThrow();
    expect(load).toHaveBeenCalledTimes(1);
    const denied = vi.fn().mockRejectedValue(new Error('FORBIDDEN'));
    await expect(collectRequestsForExport(denied, query, new AbortController().signal)).rejects.toThrow('FORBIDDEN');
  });

  it('preserves Unicode, leading-zero phones and CSV quoting while neutralizing formula cells', () => {
    expect(requestRowsToCsv([['العميل', '01000000000', 'A,"B"\nC'], ['=1+1', ' @SUM(1)', '+123', '-2', '\tformula']]))
      .toBe('\uFEFF"العميل","01000000000","A,""B""\nC"\r\n"\'=1+1","\' @SUM(1)","\'+123","\'-2","\'\tformula"\r\n');
  });
});
