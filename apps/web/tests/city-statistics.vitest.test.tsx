import { fireEvent, screen, waitFor } from '@testing-library/react';
import { cmsAdminContentDataSchema } from '@sadat-real-estate/contracts';
import { expect, it, vi } from 'vitest';
import { CityStatisticsEditor } from '../src/features/admin_content/city-statistics.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';

const initial = () => cmsAdminContentDataSchema.parse({ namespace: 'display', items: ['buildings', 'housing_units'].map((key, index) => ({
  id: String(index + 1).padStart(24, '0'), key: `city_metric_${key}`, value: { kind: 'number', value: 50 }, status: 'published',
  version: 2, updatedBy: 'cccccccccccccccccccccccc', updatedAt: '2026-10-11T10:00:00.000Z', availableActions: ['update', 'publish']
})) });

it('previews several changes and retries only the unsaved statistic after partial failure', async () => {
  let data = initial(), fail = true;
  const save = vi.fn(async (input: unknown) => {
    const body = input as { id: string; version: number; value: { kind: 'number'; value: number } };
    if (body.id.endsWith('2') && fail) { fail = false; throw new Error('Temporary failure'); }
    data = cmsAdminContentDataSchema.parse({ namespace: 'display', items: data.items.map(row => row.id === body.id ? { ...row, value: body.value, version: body.version + 1 } : row) });
    return data;
  });
  renderWithLocale(<CityStatisticsEditor locale="en" population={79120} load={async () => data} save={save} errorMessage={error => (error as Error).message} />);
  const buildings = await screen.findByLabelText('Buildings');
  fireEvent.change(buildings, { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText('Housing units'), { target: { value: '12345678' } });
  fireEvent.change(screen.getByLabelText('Change reason'), { target: { value: 'Approved city statistics update' } });
  expect(screen.getByLabelText('City statistics preview')).toHaveTextContent('12,345,678');
  fireEvent.submit(buildings.closest('form')!);
  await screen.findByRole('alert');
  expect(save).toHaveBeenCalledTimes(2);
  expect(buildings).toHaveValue(2000);
  fireEvent.submit(buildings.closest('form')!);
  await screen.findByRole('status');
  expect(save).toHaveBeenCalledTimes(3);
  expect(save.mock.calls[2]?.[0]).toMatchObject({ id: '000000000000000000000002', version: 2 });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save changes (0)' })).toBeDisabled());
});

it('does not allow editing or creating statistics when their load failed', async () => {
  const save = vi.fn();
  renderWithLocale(<CityStatisticsEditor locale="en" load={async () => { throw new Error('Unavailable'); }} save={save} errorMessage={error => (error as Error).message} />);
  await screen.findByRole('alert');
  expect(screen.queryByRole('spinbutton')).toBeNull();
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Reload counts' })).toBeEnabled();
});
