import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BrandMark,
  DEFAULT_DESIGN_ASSETS,
  DESIGN_ASSET_SLOTS,
  DESIGN_TOKEN_CSS_VARIABLES,
  DESIGN_TOKENS,
  isPublicAssetPath,
  resolveDesignAsset
} from '../src/features/design_system/index.ts';

test('design tokens match the approved final brand system and expose every requested family', () => {
  const sourceManifest = JSON.parse(readFileSync(
    new URL('../../../agent_pack/09_sources/DESIGN_SOURCE_MANIFEST.json', import.meta.url),
    'utf8'
  )) as { brand: { designSystem: { approvedTokens: { colors: Record<string, string>; typography: { fontFamily: string } } } } };
  const approved = sourceManifest.brand.designSystem.approvedTokens;
  assert.equal(DESIGN_TOKENS.color.brandPrimary, '#0F4A3B');
  assert.equal(DESIGN_TOKENS.color.brandSecondary, '#17233D');
  assert.equal(DESIGN_TOKENS.color.brandAccent, '#D1A044');
  assert.equal(DESIGN_TOKENS.color.pageBackground, '#FAF8F2');
  assert.equal(DESIGN_TOKENS.color.surfaceSoft, '#F3E8D0');
  assert.equal(DESIGN_TOKENS.typography.fontFamily.sans.startsWith('Cairo,'), true);
  assert.equal(DESIGN_TOKENS.color.brandPrimary, approved.colors.primary);
  assert.equal(DESIGN_TOKENS.color.brandSecondary, approved.colors.secondary);
  assert.equal(DESIGN_TOKENS.color.brandAccent, approved.colors.accent);
  assert.equal(DESIGN_TOKENS.typography.fontFamily.sans.startsWith(`${approved.typography.fontFamily},`), true);
  assert.equal(DESIGN_TOKENS.spacing.lg, '1rem');
  assert.equal(DESIGN_TOKENS.spacing['4xl'], '4rem');
  assert.equal(DESIGN_TOKENS.radius.lg, '1rem');
  assert.equal(DESIGN_TOKENS.radius.full, '9999px');
  assert.match(DESIGN_TOKENS.shadow.state, /^0 /);
  assert.ok(Object.keys(DESIGN_TOKENS.color).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.typography).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.spacing).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.radius).length > 0);
  assert.ok(Object.keys(DESIGN_TOKENS.shadow).length > 0);
});

test('TypeScript token metadata and CSS custom properties remain in parity', () => {
  const css = readFileSync(new URL('../src/features/design_system/tokens.css', import.meta.url), 'utf8');
  for (const variable of Object.values(DESIGN_TOKEN_CSS_VARIABLES)) {
    assert.match(css, new RegExp(`${variable.replaceAll('-', '\\-')}\\s*:`), `Missing ${variable}`);
  }
});

test('brand asset slots accept only same-origin public asset paths', () => {
  assert.deepEqual([...DESIGN_ASSET_SLOTS], ['logo', 'favicon']);
  assert.equal(DEFAULT_DESIGN_ASSETS.logo, '/assets/sadat-real-estate-logo.png');
  assert.equal(DEFAULT_DESIGN_ASSETS.favicon, '/assets/sadat-real-estate-favicon.png');
  assert.equal(isPublicAssetPath('/assets/logo.svg'), true);
  assert.equal(resolveDesignAsset({ logo: '/assets/logo.svg' }, 'logo'), '/assets/logo.svg');
  assert.equal(resolveDesignAsset({ favicon: '/assets/favicon.svg' }, 'logo'), undefined);
  assert.equal(isPublicAssetPath('https://cdn.example.test/logo.svg'), false);
  assert.equal(isPublicAssetPath('/assets/../private/logo.svg'), false);
  assert.equal(isPublicAssetPath('/assets/logo.svg?secret=value'), false);
  assert.equal(isPublicAssetPath('/assets/%6cogo.svg'), false);
});

test('brand rendering uses the approved default asset and keeps a truthful explicit fallback', () => {
  const defaultMarkup = renderToStaticMarkup(createElement(BrandMark, { label: 'Sadat Real Estate' }));
  assert.match(defaultMarkup, /<img[^>]+src="\/assets\/sadat-real-estate-logo\.png"/);

  const fallback = renderToStaticMarkup(createElement(BrandMark, { label: 'Sadat Real Estate', assets: {} }));
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

test('the committed runtime logo is the approved handoff asset, not supplier artwork', () => {
  const logo = readFileSync(new URL('../public/assets/sadat-real-estate-logo.png', import.meta.url));
  const favicon = readFileSync(new URL('../public/assets/sadat-real-estate-favicon.png', import.meta.url));
  const approvedSha256 = '0ce8b25786617c56bd862a46d16978a0446d6b1eb2ffa09cb169d69ae06c1bdb';
  assert.equal(createHash('sha256').update(logo).digest('hex'), approvedSha256);
  assert.equal(createHash('sha256').update(favicon).digest('hex'), approvedSha256);
});
