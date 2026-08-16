import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Badge,
  Button,
  Input,
  Modal,
  Pagination,
  PropertyCard,
  Select,
  StateMessage,
  Table,
  Tabs,
  Toast,
  getPaginationItems
} from '../src/features/design_system/index.ts';
import type { TableColumn } from '../src/features/design_system/index.ts';

test('Button exposes visual variants and loading/disabled semantics', () => {
  const markup = renderToStaticMarkup(createElement(Button, {
    variant: 'accent',
    size: 'lg',
    loading: true,
    children: 'حفظ'
  }));
  assert.match(markup, /class="ui-button ui-button--accent ui-button--lg"/);
  assert.match(markup, /data-state="loading"/);
  assert.match(markup, /aria-busy="true"/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, />حفظ</);
});

test('Input and Select render localized field messages and invalid state', () => {
  const input = renderToStaticMarkup(createElement(Input, {
    id: 'email',
    label: 'البريد الإلكتروني',
    state: 'error',
    error: 'أدخل بريداً صالحاً',
    dir: 'rtl'
  }));
  assert.match(input, /for="email"/);
  assert.match(input, /aria-invalid="true"/);
  assert.match(input, /aria-describedby="email-message"/);
  assert.match(input, /role="alert"/);
  assert.match(input, />أدخل بريداً صالحاً</);

  const select = renderToStaticMarkup(createElement(Select, {
    id: 'status',
    label: 'الحالة',
    state: 'success',
    success: 'تم الحفظ',
    options: [{ value: 'published', label: 'منشور' }],
    value: 'published',
    onChange: () => undefined
  }));
  assert.match(select, /class="ui-field ui-field--success"/);
  assert.match(select, /value="published"/);
  assert.match(select, />منشور</);
  assert.match(select, />تم الحفظ</);
});

test('Tabs provide selected tab, panel, disabled, keyboard-safe structure, and direction', () => {
  const markup = renderToStaticMarkup(createElement(Tabs, {
    direction: 'rtl',
    items: [
      { id: 'overview', label: 'نظرة عامة', panel: 'المحتوى' },
      { id: 'private', label: 'خاص', disabled: true, panel: 'غير متاح' }
    ],
    label: 'أقسام العقار'
  }));
  assert.match(markup, /class="ui-tabs" dir="rtl"/);
  assert.match(markup, /role="tablist"/);
  assert.match(markup, /role="tab" aria-selected="true"/);
  assert.match(markup, /aria-selected="false"[^>]+disabled=""/);
  assert.match(markup, /role="tabpanel"/);
  assert.match(markup, />المحتوى</);

  const ltrMarkup = renderToStaticMarkup(createElement(Tabs, {
    direction: 'ltr',
    items: [{ id: 'one', label: 'Overview', panel: 'Content' }]
  }));
  assert.match(ltrMarkup, /class="ui-tabs" dir="ltr"/);
});

test('Badge and shared state message expose semantic state variants', () => {
  const badge = renderToStaticMarkup(createElement(Badge, { tone: 'success', dot: true, children: 'تم التحقق' }));
  assert.match(badge, /class="ui-badge ui-badge--success"/);
  assert.match(badge, /ui-badge__dot/);
  assert.match(badge, />تم التحقق</);

  const retry = renderToStaticMarkup(createElement(StateMessage, {
    state: 'retry',
    title: 'تعذر التحميل',
    message: 'حاول مرة أخرى',
    retryLabel: 'إعادة المحاولة',
    onRetry: () => undefined
  }));
  assert.match(retry, /data-state="retry"/);
  assert.match(retry, /role="status"/);
  assert.match(retry, />إعادة المحاولة</);
});

test('Modal and Toast expose accessible open, dismiss, and alert semantics', () => {
  const modal = renderToStaticMarkup(createElement(Modal, {
    open: true,
    title: 'تأكيد النشر',
    description: 'سيظهر العقار بعد المراجعة.',
    closeLabel: 'إغلاق',
    onClose: () => undefined,
    children: 'محتوى النافذة'
  }));
  assert.match(modal, /role="dialog"/);
  assert.match(modal, /aria-modal="true"/);
  assert.match(modal, /aria-label="إغلاق"/);
  assert.match(modal, />محتوى النافذة</);

  const toast = renderToStaticMarkup(createElement(Toast, {
    open: true,
    tone: 'error',
    title: 'تعذر الحفظ',
    message: 'تحقق من البيانات.',
    dismissLabel: 'إغلاق التنبيه',
    onDismiss: () => undefined
  }));
  assert.match(toast, /role="alert"/);
  assert.match(toast, /data-tone="error"/);
  assert.match(toast, /aria-label="إغلاق التنبيه"/);
});

test('Table renders public rows and all applicable async/permission states', () => {
  const columns: TableColumn<{ name: string }>[] = [{ key: 'name', header: 'الاسم', render: row => row.name }];
  const table = renderToStaticMarkup(createElement(Table<{ name: string }>, {
    columns,
    rows: [{ name: 'عقار السادات' }],
    caption: 'العقارات',
    getRowKey: row => row.name
  }));
  assert.match(table, /<caption>العقارات<\/caption>/);
  assert.match(table, />عقار السادات</);
  assert.match(table, /data-state="success"/);

  for (const state of ['loading', 'empty', 'error', 'retry', 'permission'] as const) {
    const stateMarkup = renderToStaticMarkup(createElement(Table<{ name: string }>, {
      columns,
      rows: [],
      state,
      stateMessages: { [state]: { title: state, message: 'state' } }
    }));
    assert.match(stateMarkup, new RegExp(`data-state="${state}"`));
  }
});

test('Pagination clamps pages, preserves RTL arrows, and exposes current page', () => {
  assert.deepEqual(getPaginationItems(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
  assert.deepEqual(getPaginationItems(1, 3), [1, 2, 3]);
  const markup = renderToStaticMarkup(createElement(Pagination, {
    page: 5,
    pageCount: 10,
    direction: 'rtl',
    previousLabel: 'السابق',
    nextLabel: 'التالي',
    ariaLabel: 'صفحات العقارات',
    onPageChange: () => undefined
  }));
  assert.match(markup, /<nav class="ui-pagination" aria-label="صفحات العقارات" dir="rtl">/);
  assert.match(markup, /aria-current="page"[^>]*>5</);
  assert.match(markup, />›</);
  assert.match(markup, />‹</);
});

test('PropertyCard renders only supplied public projection data and state-safe variants', () => {
  const markup = renderToStaticMarkup(createElement(PropertyCard, {
    title: 'شقة فاخرة',
    location: 'مدينة السادات',
    price: '١٬٨٥٠٬٠٠٠ جنيه',
    source: 'المصدر: وسيط معتمد',
    image: createElement('img', { src: '/assets/property.jpg', alt: 'واجهة الشقة' }),
    imageAlt: 'صورة العقار',
    badges: [createElement(Badge, { key: 'published', tone: 'success', children: 'منشور' })],
    features: [{ label: 'المساحة', value: '١٢٠ م²' }],
    href: '/properties/example'
  }));
  assert.match(markup, /class="ui-property-card"/);
  assert.match(markup, /href="\/properties\/example"/);
  assert.match(markup, />شقة فاخرة</);
  assert.match(markup, />المصدر: وسيط معتمد</);
  assert.doesNotMatch(markup, /internal|audit|assignment|private/i);

  const loading = renderToStaticMarkup(createElement(PropertyCard, {
    title: 'غير مستخدم أثناء التحميل',
    state: 'loading',
    stateMessages: { loading: { title: 'جارٍ التحميل' } }
  }));
  assert.match(loading, /data-state="loading"/);
  assert.match(loading, /aria-busy="true"/);
});
