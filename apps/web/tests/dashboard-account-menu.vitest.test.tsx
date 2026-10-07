import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardAccountMenu } from '../src/features/dashboard_account/menu.tsx';

describe('dashboard account menu', () => {
  it.each(['ar', 'en'] as const)('opens accessible links, closes outside and restores keyboard focus in %s', locale => {
    const onSignOut = vi.fn();
    render(<DashboardAccountMenu locale={locale} settingsHref={`/seeker/settings?lang=${locale}`} guideHref={`/seeker/user-guide?lang=${locale}`} signingOut={false} onSignOut={onSignOut}><span>AA</span></DashboardAccountMenu>);
    const trigger = screen.getByRole('button', { name: locale === 'ar' ? 'قائمة الحساب' : 'Account menu' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const controls = screen.getAllByRole('menuitem');
    expect(controls[0]).toHaveAttribute('href', `/seeker/settings?lang=${locale}`);
    expect(controls[1]).toHaveAttribute('href', `/seeker/user-guide?lang=${locale}`);
    expect(controls[0]).toHaveFocus();
    fireEvent.keyDown(controls[0]!, { key: 'ArrowUp' });
    expect(controls[2]).toHaveFocus();
    fireEvent.keyDown(controls[2]!, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    expect(screen.getAllByRole('menuitem')[2]).toHaveFocus();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getAllByRole('menuitem')[2]!);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
  it('disables logout while the request is pending', () => {
    const onSignOut = vi.fn();
    render(<DashboardAccountMenu locale="ar" settingsHref="/admin/settings" guideHref="/admin/user-guide" signingOut onSignOut={onSignOut}><span>A</span></DashboardAccountMenu>);
    fireEvent.click(screen.getByRole('button', { name: 'قائمة الحساب' }));
    const logout = screen.getByRole('menuitem', { name: 'جاري تسجيل الخروج…' });
    expect(logout).toBeDisabled();
    fireEvent.click(logout);
    expect(onSignOut).not.toHaveBeenCalled();
  });
});
