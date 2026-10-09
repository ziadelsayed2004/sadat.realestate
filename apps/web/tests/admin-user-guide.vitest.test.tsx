import navigationSource from '../src/features/admin/overview.tsx?raw';
import routeMatrixSource from '../../../docs/quality/figma_parity/SCREEN_ROUTE_API_JOURNEY_MATRIX.json?raw';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminUserGuide from '../src/features/admin_user_guide/views.tsx';
import { GUIDE_SECTIONS, searchGuide } from '../src/features/admin_user_guide/content.ts';
import { getUserGuideCopy } from '../src/features/admin_user_guide/copy.ts';
import { App } from '../src/features/frontend_foundation/app.tsx';
import { renderWithLocale } from '../src/features/testing/index.ts';
import { resolveRoute } from '../src/routes/route-table.ts';
import { audienceLabels, GUIDE_AUDIENCES, sectionsForAudience } from '../src/features/admin_user_guide/account-guides.ts';
import { guideAsText, guideAsMarkdown, GUIDE_EDITION } from '../src/features/admin_user_guide/export.ts';
import { guideQuickActions } from '../src/features/admin_user_guide/quick-actions.ts';
import { guideAsHtml } from '../src/features/admin_user_guide/catalog-export.ts';

const admin = { status: 'authenticated' as const, role: 'admin' as const };
const topics = GUIDE_SECTIONS.flatMap(section => section.topics);
const paths = new Set(topics.flatMap(topic => topic.links.map(link => new URL(link.path, 'https://example.test').pathname)));

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn().mockImplementation((media: string) => ({ matches: false, media, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) });
  window.history.replaceState(null, '', '/admin/user-guide?lang=ar');
});

describe('interactive administrator reference', () => {
  it('keeps each quick action inside its selected audience and opens a filtered topic without leaving the guide', async () => {
    for (const audience of GUIDE_AUDIENCES) {
      const sections = sectionsForAudience(GUIDE_SECTIONS, audience);
      const ids = new Set(sections.flatMap(section => section.topics.map(topic => topic.id)));
      expect(guideQuickActions(sections, audience).length).toBeGreaterThan(0);
      expect(guideQuickActions(sections, audience).every(topic => ids.has(topic.id))).toBe(true);
    }
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    fireEvent.click(screen.getByRole('button', { name: audienceLabels['owner-admin'] }));
    expect(screen.getByLabelText('نوع الحساب')).toHaveValue('owner-admin');
    const quick = document.querySelector<HTMLElement>('.user-guide__quick')!;
    const card = within(quick).getByRole('heading', { name: 'طلبات المعاينة: تنظيم زيارة العميل للعقار' }).closest('article')!;
    expect(within(card).getByRole('link', { name: /فتح الصفحة/ })).toHaveAttribute('href', '/admin/viewing-requests?lang=ar');
    fireEvent.click(within(card).getByRole('link', { name: 'شرح الخطوات' }));
    const target = document.getElementById('guide-toggle-viewing-administration')!;
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveAttribute('aria-expanded', 'true');
    expect(window.location.href).toContain('audience=owner-admin#guide-viewing-administration');
  });
  it('exports a searchable catalog and stable internal topic links from the same instructions', () => {
    const html = guideAsHtml(GUIDE_SECTIONS);
    const markdown = guideAsMarkdown(GUIDE_SECTIONS);
    expect(html).toContain(GUIDE_EDITION);
    for (const topic of topics) {
      expect(html).toContain(`id="guide-${topic.id}"`);
      expect(markdown).toContain(`](#guide-${topic.id})`);
      expect(markdown).toContain(`<a id="guide-${topic.id}"></a>`);
    }
    expect(html).toContain('data-quick-audience="developer"');
    expect(html).toContain('https://elsadatrealestate.com/provider/projects?lang=ar');
    expect(html).not.toContain('errors.conflict</');
  });
  it('exports the current financial instructions as Markdown with localized working links', () => {
    const sections = searchGuide('', 'ads-commissions');
    const markdown = guideAsMarkdown(sections, 'en');
    expect(markdown).toContain(`# دليل استخدام منصة عقارات السادات`);
    expect(markdown).toContain(GUIDE_EDITION);
    expect(markdown).toContain('### فهم المراجعة المالية وإيصالات الدفع');
    expect(markdown).toContain('هذان الصفان لا يعنيان دفع 1000 جنيه');
    expect(markdown).toContain('[المراجعة المالية](https://elsadatrealestate.com/admin/ads/financial-review?lang=en)');
    expect(markdown).toContain('إعداد صورة الإعلان ورابط العقار');
    expect(markdown).not.toContain('===');
  });
  it('has useful instructions and working links for every requested account type', () => {
    for (const audience of GUIDE_AUDIENCES) {
      const sections = sectionsForAudience(GUIDE_SECTIONS, audience);
      expect(sections.length, audience).toBeGreaterThan(0);
      const text = guideAsText(sections, 'ar');
      expect(text).toContain('https://elsadatrealestate.com/');
      expect(text).not.toMatch(/:[a-z]|\*|[a-f0-9]{24}/u);
    }
    const provider = guideAsText(sectionsForAudience(GUIDE_SECTIONS, 'brokerage_office'));
    expect(provider).toContain('دليل مكتب الوساطة');
    expect(provider).toContain('ليس مفتاحًا يُشترى');
    expect(provider).not.toContain('دليل الأدمن الرئيسي');
    expect(guideAsText(GUIDE_SECTIONS)).toContain('/admin/banners?lang=ar#banner-placements');
  });
  it('filters the administrator guide by account type without granting permissions', () => {
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    fireEvent.change(screen.getByLabelText('نوع الحساب'), { target: { value: 'brokerage_office' } });
    expect(screen.getByRole('option', { name: audienceLabels.brokerage_office })).toBeVisible();
    expect(document.getElementById('guide-office-journey')).toBeInTheDocument();
    expect(document.getElementById('guide-owner-journey')).toBeNull();
    expect(screen.getByText(/اختيار نوع الحساب يغيّر الشرح فقط/)).toBeVisible();
  });
  it('selects the company guide from the actual developer account type', async () => {
    window.history.replaceState(null, '', '/provider/user-guide?lang=ar');
    const authClient = { getAuthorizationHeader: () => 'Bearer guide', getProviderApplicationStatus: async () => ({ applicationId: 'cccccccccccccccccccccccc', providerType: 'developer_company' as const, status: 'approved' as const, version: 1, availableActions: ['open_dashboard' as const] }) };
    renderWithLocale(<AdminUserGuide locale="ar" session={{ status: 'authenticated', role: 'provider' }} authClient={authClient} />);
    await waitFor(() => expect(screen.getByLabelText('نوع الحساب')).toHaveValue('developer'));
    expect(document.getElementById('guide-developer-journey')).toBeInTheDocument();
  });
  it.each(['seeker', 'provider'] as const)('opens the %s guide from its own dashboard without admin task links', async role => {
    window.history.replaceState(null, '', `/${role}/user-guide?lang=ar`);
    renderWithLocale(<App url={`/${role}/user-guide?lang=ar`} locale="ar" session={{ status: 'authenticated', role }} />);
    expect(await screen.findByTestId('admin-user-guide')).toBeVisible();
    const guide = document.querySelector('.user-guide')!;
    expect(guide.querySelector('a[href^="/admin"]')).toBeNull();
    expect(guide.querySelector('select#user-guide-audience option[value="owner-admin"]')).toBeNull();
    expect(document.querySelector(`a[href="/${role}/user-guide?lang=ar"][aria-current="page"]`)).toBeInTheDocument();
  });
  it('covers every sidebar task and every canonical admin screen without fake record links', () => {
    const navigation = navigationSource;
    const navigationPaths = [...navigation.matchAll(/sidebarItem\('[^']+',\s*'([^']+)'/gu)].map(match => match[1]);
    for (const path of navigationPaths) expect(paths.has(path ?? ''), `Missing guide for ${path}`).toBe(true);
    const matrix = JSON.parse(routeMatrixSource) as { rows: { route: string; surface: string }[] };
    // Dynamic records are reached by opening a real record in their documented list.
    for (const entry of matrix.rows.filter(row => row.surface === 'admin')) {
      const path = entry.route.replace(/\/:id.*$/u, '');
      expect(paths.has(path === '/admin/commissions/accounts' ? '/admin/commissions/account' : path), `Missing canonical route ${entry.route}`).toBe(true);
    }
    expect(topics.length).toBeGreaterThanOrEqual(45);
    expect(new Set(topics.map(topic => topic.id)).size).toBe(topics.length);
    for (const topic of topics) {
      expect(topic.steps.length).toBeGreaterThanOrEqual(3);
      expect(topic.fields.length).toBeGreaterThan(0);
      expect(topic.questions.length).toBeGreaterThan(0);
      for (const link of topic.links) {
        expect(link.path).not.toMatch(/:[a-z]|\*|[a-f0-9]{24}/u);
        expect(resolveRoute(link.path).kind).toBe('matched');
      }
    }
  });

  it('finds Arabic spelling variants and field explanations, and handles no results', () => {
    expect(searchGuide('صلاحية مسجله').flatMap(section => section.topics.map(topic => topic.id))).toContain('provider-documents');
    expect(searchGuide('homepage.hero').flatMap(section => section.topics.map(topic => topic.id))).toContain('banner-create');
    expect(searchGuide('قطع غيار الطائرات')).toHaveLength(0);
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    fireEvent.change(screen.getByLabelText('ابحث في الدليل'), { target: { value: 'قطع غيار الطائرات' } });
    expect(screen.getByRole('heading', { name: 'لا توجد موضوعات مطابقة' })).toBeVisible();
    fireEvent.click(screen.getAllByRole('button', { name: 'مسح البحث والتصفية' })[0]!);
    expect(screen.queryByRole('heading', { name: 'لا توجد موضوعات مطابقة' })).not.toBeInTheDocument();
  });

  it('expands and collapses sections and individual topics, preserving other filtered sections', () => {
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'banners' } });
    const topic = screen.getByRole('button', { name: /إعلان بصور متبدّلة بدل صورة واحدة/ });
    expect(topic).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'فتح الكل' }));
    expect(topic).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(topic);
    expect(topic).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'طي الكل' }));
    expect(screen.getByRole('button', { name: /الصورة: الملف أو الرابط والأبعاد/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('restores valid stored reading state and safely ignores corrupt storage', async () => {
    localStorage.setItem('sadat-admin-user-guide-v1', JSON.stringify({ opened: ['banner-create', 'unknown'], last: 'banner-create', large: true }));
    const view = renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    expect(screen.getByRole('button', { name: /إعلان بصور متبدّلة بدل صورة واحدة/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'حجم نص الشرح: كبير' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /إعلان بصور متبدّلة بدل صورة واحدة/ }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem('sadat-admin-user-guide-v1') ?? '{}').opened).not.toContain('banner-create'));
    view.unmount(); localStorage.setItem('sadat-admin-user-guide-v1', '{broken');
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    expect(screen.getByRole('button', { name: /استخدام الدليل التفاعلي/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('opens a shared deep link and exposes honest limits for draft commission workflows', async () => {
    window.history.replaceState(null, '', '/admin/user-guide?lang=ar#guide-commission-account');
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    const topic = screen.getByRole('button', { name: /عمولة حساب معين والتعارض عند الحفظ/ });
    expect(topic).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(topic).toHaveFocus());
    expect(screen.getByText(/صفحة تخصيص الحساب الحالية لا توفر تعديل سجل سابق/)).toBeVisible();
  });

  it('maximizes with focus containment, Escape restores focus and scroll, and minimizes independently', () => {
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    // Focus containment does not need every chapter; keep the dialog representative
    // without repeatedly walking the entire reference under concurrent test load.
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'banners' } });
    const button = screen.getByRole('button', { name: 'تكبير مساحة القراءة' });
      button.focus(); fireEvent.click(button);
      const dialog = screen.getByRole('dialog', { name: 'دليل الاستخدام' });
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(document.body.style.overflow).toBe('hidden');
      const focusable = [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select')].filter(element => !element.closest('[hidden]'));
      const last = focusable.at(-1)!;
      last.focus(); fireEvent.keyDown(last, { key: 'Tab' });
      expect(focusable[0]).toHaveFocus();
      fireEvent.keyDown(dialog, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(document.body.style.overflow).toBe('');
      expect(button).toHaveFocus();
      fireEvent.click(screen.getByRole('button', { name: 'تصغير الدليل' }));
      expect(screen.queryByLabelText('ابحث في الدليل')).not.toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'إظهار الدليل' }));
      expect(screen.getByLabelText('ابحث في الدليل')).toBeVisible();
  });

  it('registers the lazy route and the active sidebar entry for an administrator', async () => {
    renderWithLocale(<App url="/admin/user-guide?lang=ar" locale="ar" session={admin} />);
    expect(await screen.findByTestId('admin-user-guide')).toBeVisible();
    expect(document.querySelector('.admin-dashboard__navigation a[data-active="true"]')).toHaveAttribute('href', '/admin/user-guide?lang=ar');
  });

  it('copies a locale-aware stable topic URL and prints only the filtered selection', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    renderWithLocale(<AdminUserGuide locale="en" session={admin} />, { locale: 'en' });
    fireEvent.change(screen.getByLabelText('Section'), { target: { value: 'banners' } });
    fireEvent.click(screen.getByRole('button', { name: /إعلان بصور متبدّلة بدل صورة واحدة/ }));
    const article = document.getElementById('guide-banner-create')!;
    fireEvent.click(within(article).getByRole('button', { name: 'Copy topic link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/admin/user-guide?lang=en#guide-banner-create')));
    expect(within(article).getByRole('link', { name: 'إضافة بانر' })).toHaveAttribute('href', '/admin/banners/new?lang=en');
    fireEvent.click(screen.getByRole('button', { name: 'Print results / save PDF' }));
    expect(print).toHaveBeenCalledOnce();
    expect(document.getElementById('guide-team')).toBeNull();
  });

  it.each(['seeker', 'provider'] as const)('keeps %s accounts outside the admin guide', role => {
    renderWithLocale(<App url="/admin/user-guide?lang=ar" locale="ar" session={{ status: 'authenticated', role }} />);
    expect(screen.queryByTestId('admin-user-guide')).not.toBeInTheDocument();
  });
  it('keeps anonymous visitors outside the guide', () => {
    renderWithLocale(<App url="/admin/user-guide?lang=ar" locale="ar" />);
    expect(screen.queryByTestId('admin-user-guide')).not.toBeInTheDocument();
  });
  it('provides localized controls and a clearly labelled Arabic reference', () => {
    const copy = getUserGuideCopy('en');
    renderWithLocale(<AdminUserGuide locale="en" session={admin} />, { locale: 'en' });
    expect(screen.getByRole('heading', { name: copy.title })).toBeVisible();
    expect(screen.getByText(copy.language)).toBeVisible();
    expect(document.querySelector('.user-guide__chapters')).toHaveAttribute('lang', 'ar');
    expect(document.querySelector('.user-guide__chapters')).toHaveAttribute('dir', 'rtl');
  });
  it('follows topic hash changes without a reload and leaves a filtered view', async () => {
    renderWithLocale(<AdminUserGuide locale="ar" session={admin} />);
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'content' } });
    window.history.replaceState(null, '', '/admin/user-guide?lang=ar#guide-commission-account');
    fireEvent(window, new Event('hashchange'));
    const target = screen.getByRole('button', { name: /عمولة حساب معين والتعارض عند الحفظ/ });
    expect(target).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(target).toHaveFocus());
  });
});
