import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandMark, DESIGN_ASSET_SLOTS, DESIGN_TOKENS, isPublicAssetPath, resolveDesignAsset } from '../src/features/design_system/index.ts';

test('design tokens preserve the foundation palette and expose every requested family', () => {
  assert.equal(DESIGN_TOKENS.color.brand, '#163c62');
  assert.equal(DESIGN_TOKENS.color.surface, '#ffffff');
  assert.equal(DESIGN_TOKENS.typography.fontFamily.sans.startsWith('Inter,'), true);
  assert.equal(DESIGN_TOKENS.spacing.lg, '1rem');
  assert.equal(DESIGN_TOKENS.radius.lg, '0.75rem');
  assert.match(DESIGN_TOKENS.shadow.state, /^0 /);
  assert.ok(Object.keys(DESIGN_TOKENS.color).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.typography).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.spacing).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.radius).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.shadow).length > 0);
});

test('brand asset slots accept only same-origin public asset paths', () => {
  assert.deepEqual([...DESIGN_ASSET_SLOTS], ['logo', 'favicon']);
  assert.equal(isPublicAssetPath('/assets/logo.svg'), true);
  assert.equal(resolveDesignAsset({ logo: '/assets/logo.svg' }, 'logo'), '/assets/logo.svg');
  assert.equal(resolveDesignAsset({ favicon: '/assets/favicon.svg' }, 'logo'), undefined);
  assert.equal(isPublicAssetPath('https://cdn.example.test/logo.svg'), false);
  assert.equal(isPublicAssetPath('/assets/../private/logo.svg'), false);
  assert.equal(isPublicAssetPath('/assets/logo.svg?secret=value'), false);
  assert.equal(isPublicAssetPath('/assets/%6cogo.svg'), false);
});

test('brand rendering uses an approved asset when supplied and keeps a truthful text fallback', () => {
  const fallback = renderToStaticMarkup(createElement(BrandMark, { label: 'Sadat Real Estate' }));
  assert.match(fallback, />Sadat Real Estate<\/a>/);
  assert.doesNotMatch(fallback, /<img/);

  const withLogo = renderToStaticMarkup(createElement(BrandMark, {
    label: 'Sadat Real Estate',
    assets: { logo: '/assets/logo.svg' }
  }));
  assert.match(withLogo, /<img[^>]+src="\/assets\/logo\.svg"/);

  const unsafe = renderToStaticMarkup(createElement(BrandMark, {
    label: 'Sadat Real Estate',
    assets: { logo: 'https://example.test/logo.svg' }
  }));
  assert.doesNotMatch(unsafe, /<img/);
});
