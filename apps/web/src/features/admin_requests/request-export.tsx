import { useEffect, useRef, useState } from 'react';
import type { RequestData, RequestListQuery, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button } from '../design_system/index.ts';
import type { AdminRequestsLoader } from './data.ts';
import { requestMetricLabel } from './metrics-copy.ts';

export async function collectRequestsForExport(load: AdminRequestsLoader, query: Partial<RequestListQuery>, signal: AbortSignal): Promise<RequestData[]> {
  const result: RequestData[] = [];
  const seen = new Set<string>();
  let expectedTotal: number | undefined;
  const limit = 100;
  for (let page = 1; ; page += 1) {
    signal.throwIfAborted();
    const data = await load({ ...query, page, limit }, signal);
    signal.throwIfAborted();
    expectedTotal ??= data.total;
    if (data.page !== page || data.limit !== limit || data.total !== expectedTotal
      || data.items.length !== Math.min(limit, expectedTotal - result.length)) throw new Error('EXPORT_RESULTS_CHANGED');
    for (const request of data.items) {
      if (seen.has(request.id)) throw new Error('EXPORT_RESULTS_CHANGED');
      seen.add(request.id);
      result.push(request);
    }
    if (result.length === expectedTotal) return result;
  }
}

export function requestRowsToCsv(rows: readonly (readonly string[])[]): string {
  const cell = (value: string) => {
    // Spreadsheet quoting alone does not prevent formula execution.
    const safe = /^\s*[=+@-]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return `\uFEFF${rows.map(row => row.map(cell).join(',')).join('\r\n')}\r\n`;
}

export function RequestExport({ locale, query, load, headings, row }: {
  readonly locale: SupportedLocale;
  readonly query: Partial<RequestListQuery>;
  readonly load: AdminRequestsLoader;
  readonly headings: readonly string[];
  readonly row: (request: RequestData) => readonly string[];
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef<AbortController | undefined>(undefined);
  const queryKey = JSON.stringify(query);
  useEffect(() => {
    setBusy(false);
    setError(false);
    return () => { pending.current?.abort(); pending.current = undefined; };
  }, [queryKey, load]);
  async function download() {
    if (pending.current !== undefined) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError(false);
    try {
      const requests = await collectRequestsForExport(load, query, controller.signal);
      const url = URL.createObjectURL(new Blob([requestRowsToCsv([headings, ...requests.map(row)])], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `requests-${new Date().toISOString().slice(0, 10)}-${locale}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (pending.current === controller) { pending.current = undefined; setBusy(false); }
    }
  }
  return <div className="admin-requests__export">
    <Button type="button" size="sm" variant="secondary" disabled={busy} loading={busy} onClick={() => { void download(); }}>{requestMetricLabel(locale, 'exportCsv')}</Button>
    {error ? <p role="alert">{requestMetricLabel(locale, 'exportFailed')}</p> : null}
  </div>;
}
