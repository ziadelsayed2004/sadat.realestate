import assert from 'node:assert/strict';
import test from 'node:test';

const { render } = await import('../dist/server/entry-server.js');

test('SSR renders the public shell with requested locale and LTR direction', () => {
  const result = render('/properties?lang=en', { acceptLanguage: 'ar' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'en');
  assert.equal(result.direction, 'ltr');
  assert.match(result.html, /data-surface="public"/);
  assert.match(result.html, /data-locale="en"/);
  assert.match(result.html, /src="\/assets\/sadat-real-estate-logo\.png"/);
});

test('SSR keeps protected dashboard routes in a permission-safe shell', () => {
  const result = render('/admin/audit-log', { acceptLanguage: 'ar' });
  assert.equal(result.statusCode, 200);
  assert.equal(result.locale, 'ar');
  assert.equal(result.direction, 'rtl');
  assert.match(result.html, /data-state="permission"/);
  assert.match(result.html, /data-auth-required="true"/);
});

test('SSR returns a real 404 result for unknown routes', () => {
  const result = render('/missing-route', { acceptLanguage: 'zh-CN' });
  assert.equal(result.statusCode, 404);
  assert.equal(result.locale, 'zh-CN');
  assert.match(result.html, /data-state="error"/);
});
