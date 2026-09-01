import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  ACCESSIBILITY_CONTRACT,
  ACCESSIBILITY_DIRECTIONS,
  ACCESSIBILITY_LOCALES,
  ACCESSIBLE_CONTRAST_PAIRS,
  APPROVED_DEVICE_SCOPES,
  FOCUSABLE_ELEMENT_SELECTOR,
  contrastRatio,
  getAccessibilityCopy,
  getFocusableElements,
  getNextRovingTabId,
  meetsContrast
} from '../src/features/accessibility/index.ts';
import { ROUTE_DEFINITIONS } from '../src/routes/route-table.ts';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const manifestPath = path.join(repositoryRoot, 'agent_pack', '09_sources', 'DESIGN_SOURCE_MANIFEST.json');
const accessibilityStylesPath = path.join(repositoryRoot, 'apps', 'web', 'src', 'features', 'accessibility', 'styles.css');

describe('release accessibility audit matrix', () => {
  it('keeps every route and approved screen within the locale, direction, and device contract', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      screens: Array<{ id: string; surface: keyof typeof APPROVED_DEVICE_SCOPES; locales: string[]; directionScope: string[]; deviceScope: string[] }>;
    };

    expect([...ACCESSIBILITY_LOCALES]).toEqual(['ar', 'en',]);
    expect(ACCESSIBILITY_DIRECTIONS).toEqual({ ar: 'rtl', en: 'ltr',});
    expect(manifest.screens).toHaveLength(131);

    for (const route of ROUTE_DEFINITIONS) {
      expect(route.deviceScope, route.id).toBe(APPROVED_DEVICE_SCOPES[route.surface]);
    }
    for (const screen of manifest.screens) {
      expect(screen.locales, screen.id).toEqual(['ar', 'en',]);
      expect(screen.directionScope, screen.id).toEqual(['rtl', 'ltr']);
      expect(screen.deviceScope, screen.id).toEqual(screen.surface === 'public' || screen.surface === 'auth' ? ['desktop', 'tablet', 'mobile'] : ['desktop']);
    }
  });

  it('passes the approved contrast and focus contracts', () => {
    expect(ACCESSIBILITY_CONTRACT.minimumTargetSize).toBe('2.5rem');
    expect(ACCESSIBILITY_CONTRACT.focusOutline).toContain('3px');
    expect(ACCESSIBILITY_CONTRACT.focusOffset).toBe('3px');
    for (const pair of ACCESSIBLE_CONTRAST_PAIRS) {
      expect(meetsContrast(pair), `${pair.name}: ${contrastRatio(pair.foreground, pair.background)}`).toBe(true);
    }

    const container = document.createElement('div');
    container.innerHTML = [
      '<a id="link" href="/safe">Link</a>',
      '<button id="button">Button</button>',
      '<button id="disabled" disabled>Disabled</button>',
      '<input id="input" />',
      '<div id="tab" tabindex="0">Tab</div>',
      '<div id="negative" tabindex="-1">Negative</div>',
      '<div id="hidden" hidden><button>Hidden</button></div>',
      '<div id="aria-hidden" aria-hidden="true"><button>Aria hidden</button></div>'
    ].join('');
    document.body.append(container);
    expect(getFocusableElements(container).map(element => element.id)).toEqual(['link', 'button', 'input', 'tab']);
    expect(FOCUSABLE_ELEMENT_SELECTOR).toContain('button:not([disabled])');
    expect(getNextRovingTabId(['first', 'second', 'third'], 'second', 'ArrowRight', 'ltr')).toBe('third');
    expect(getNextRovingTabId(['first', 'second', 'third'], 'second', 'ArrowRight', 'rtl')).toBe('first');
  });

  it('provides localized screen-reader copy and CSS safeguards for all supported locales', () => {
    for (const locale of ACCESSIBILITY_LOCALES) {
      expect(getAccessibilityCopy(locale).skipToContent.trim().length).toBeGreaterThan(0);
    }
    const css = readFileSync(accessibilityStylesPath, 'utf8');
    expect(css).toMatch(/focus-visible/u);
    expect(css).toMatch(/prefers-reduced-motion/u);
    expect(css).toMatch(/prefers-contrast/u);
  });
});
