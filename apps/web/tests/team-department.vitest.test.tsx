import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEAM_CATEGORIES } from '@sadat-real-estate/contracts';
import { TeamDepartmentField, teamDepartmentLabel } from '../src/features/admin_content/team-department.tsx';
import { TeamCategoriesManager } from '../src/features/admin_content/team-categories.tsx';

describe('team department selection', () => {
  it('offers saved departments and lets the owner open their editor from the member form', () => {
    const change = vi.fn();
    render(<><details id="team-departments"><summary>Departments</summary></details><TeamDepartmentField value="" categories={DEFAULT_TEAM_CATEGORIES} locale="en" disabled={false} onChange={change} /></>);
    const select = screen.getByLabelText('Team department');
    expect(screen.getByRole('option', { name: 'Sales' })).toHaveValue('sales');
    fireEvent.change(select, { target: { value: 'sales' } });
    expect(change).toHaveBeenCalledWith('sales');
    const scroll = vi.fn(); document.getElementById('team-departments')!.scrollIntoView = scroll;
    fireEvent.click(screen.getByRole('button', { name: 'Add or edit a department' }));
    expect(document.getElementById('team-departments')).toHaveAttribute('open');
    expect(scroll).toHaveBeenCalledOnce();
    expect(screen.getByText('Departments')).toHaveFocus();
  });

  it('preserves a previously assigned inactive or unavailable department', () => {
    render(<TeamDepartmentField value="old-department" categories={[]} locale="en" disabled={false} onChange={() => undefined} />);
    expect(screen.getByLabelText('Team department')).toHaveValue('old-department');
    expect(teamDepartmentLabel(undefined, [], 'en')).toBe('Unassigned');
    expect(teamDepartmentLabel('sales', DEFAULT_TEAM_CATEGORIES, 'en')).toBe('Sales');
  });

  it('preserves department edits on failure and retries with the saved version', async () => {
    const update = vi.fn();
    const save = vi.fn().mockRejectedValueOnce(new Error('temporary error')).mockResolvedValueOnce(DEFAULT_TEAM_CATEGORIES);
    render(<TeamCategoriesManager locale="en" load={async () => [...DEFAULT_TEAM_CATEGORIES]} save={save} onChange={update} />);
    fireEvent.click(screen.getByText('Manage team departments and add a department'));
    await waitFor(() => expect(screen.getByRole('option', { name: 'Sales' })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Choose a category to edit or create one'), { target: { value: 'sales' } });
    fireEvent.change(screen.getByLabelText('English category name (optional)'), { target: { value: 'Sales department' } });
    fireEvent.change(screen.getByLabelText('Category change reason'), { target: { value: 'Clarify sales department name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('input is preserved'));
    expect(screen.getByLabelText('English category name (optional)')).toHaveValue('Sales department');
    fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Category saved'));
    expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ key: 'sales', version: DEFAULT_TEAM_CATEGORIES.find(item => item.key === 'sales')!.version, label: expect.objectContaining({ en: 'Sales department' }) }));
    expect(update).toHaveBeenLastCalledWith(DEFAULT_TEAM_CATEGORIES);
    expect(screen.getByLabelText('Display order')).toHaveValue(0);
  });
});
