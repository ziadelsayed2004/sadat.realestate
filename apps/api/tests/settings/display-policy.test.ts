import assert from 'node:assert/strict';
import test from 'node:test';
import { displayRuntimeSettings } from '../../src/modules/settings/display-policy.js';

test('maps only bounded population display settings', () => {
  assert.deepEqual(displayRuntimeSettings({
    population_count: 450_000,
    population_label: { ar: 'نسمة', en: 'Residents', unsafe: 'discarded' },
    show_population_counter: false
  }), {
    populationCount: 450_000,
    populationLabel: { ar: 'نسمة', en: 'Residents' },
    showPopulationCounter: false
  });
});

test('ignores malformed display settings instead of changing the public homepage', () => {
  assert.deepEqual(displayRuntimeSettings({ population_count: -1, population_label: [], show_population_counter: 'yes' }), {});
  assert.deepEqual(displayRuntimeSettings(undefined), {});
});
