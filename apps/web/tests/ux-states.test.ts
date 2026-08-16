import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  getUxStateSemantics,
  isUxState,
  UX_STATES,
  UxStateView
} from '../src/features/ux_states/index.ts';

test('UX state model exposes the required states and accessible semantics', () => {
  assert.deepEqual([...UX_STATES], [
    'loading',
    'empty',
    'error',
    'retry',
    'success',
    'permission',
    'missing_image',
    'long_text'
  ]);
  assert.equal(isUxState('loading'), true);
  assert.equal(isUxState('missing_image'), true);
  assert.equal(isUxState('unknown'), false);
  assert.deepEqual(getUxStateSemantics('loading'), { role: 'status', live: 'polite', busy: true });
  assert.deepEqual(getUxStateSemantics('error'), { role: 'alert', live: 'assertive', busy: false });
  assert.throws(() => getUxStateSemantics('unknown'), /Unsupported UX state/);
});

test('standard state views render consistent loading, empty, error, success, and permission semantics', () => {
  const states = ['loading', 'empty', 'error', 'success', 'permission'] as const;
  for (const state of states) {
    const markup = renderToStaticMarkup(createElement(UxStateView, {
      state,
      title: `${state} title`,
      message: `${state} message`
    }));
    assert.match(markup, new RegExp(`data-state="${state}"`));
    assert.match(markup, new RegExp(`>${state} title<`));
    assert.match(markup, new RegExp(`>${state} message<`));
  }

  const loading = renderToStaticMarkup(createElement(UxStateView, {
    state: 'loading',
    title: 'Loading',
    message: 'Preparing the interface.'
  }));
  assert.match(loading, /role="status"/);
  assert.match(loading, /aria-live="polite"/);
  assert.match(loading, /aria-busy="true"/);

  const error = renderToStaticMarkup(createElement(UxStateView, {
    state: 'error',
    title: 'Error',
    message: 'The interface could not load.'
  }));
  assert.match(error, /role="alert"/);
  assert.match(error, /aria-live="assertive"/);

  const success = renderToStaticMarkup(createElement(UxStateView, {
    state: 'success',
    title: 'Success',
    children: createElement('p', null, 'Content is ready.')
  }));
  assert.match(success, /role="region"/);
  assert.match(success, />Content is ready\.<\/p>/);
});

test('retry state is explicit and disabled until a retry action is supplied', () => {
  const disabled = renderToStaticMarkup(createElement(UxStateView, {
    state: 'retry',
    title: 'Retry',
    message: 'Try again when the connection is available.',
    retryLabel: 'Retry'
  }));
  assert.match(disabled, /<button[^>]+disabled=""[^>]*>Retry<\/button>/);

  const enabled = renderToStaticMarkup(createElement(UxStateView, {
    state: 'retry',
    title: 'Retry',
    retryLabel: 'Retry',
    onRetry: () => undefined
  }));
  assert.match(enabled, /<button[^>]*>Retry<\/button>/);
  assert.doesNotMatch(enabled, /<button[^>]+disabled=""/);
});

test('missing-image state is an honest placeholder and never fabricates an image URL', () => {
  const markup = renderToStaticMarkup(createElement(UxStateView, {
    state: 'missing_image',
    title: 'Image unavailable',
    message: 'No image is available for this item.'
  }));
  assert.match(markup, /data-state="missing_image"/);
  assert.match(markup, /data-placeholder="missing-image"/);
  assert.doesNotMatch(markup, /<img|src=/i);
  assert.match(markup, /Image unavailable/);
});

test('long-text state keeps user content wrapped and preserves text rather than injecting markup', () => {
  const longText = 'A'.repeat(400);
  const markup = renderToStaticMarkup(createElement(UxStateView, {
    state: 'long_text',
    title: 'Long text',
    message: longText
  }));
  assert.match(markup, /data-state="long_text"/);
  assert.match(markup, /data-text-wrap="safe"/);
  assert.match(markup, /overflow-wrap:anywhere/);
  assert.match(markup, new RegExp(longText));
  assert.doesNotMatch(markup, /dangerouslySetInnerHTML|<script/i);
});
