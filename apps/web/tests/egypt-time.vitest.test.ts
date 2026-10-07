import { describe, expect, it } from 'vitest';
import { egyptInstant, egyptLocalDateTime, egyptTimeLabel } from '../src/features/public/egypt-time.ts';

describe('Egypt viewing clock', () => {
  it('uses Cairo winter and summer rules independently of the device clock', () => {
    expect(egyptInstant('2026-01-15T12:30')?.toISOString()).toBe('2026-01-15T10:30:00.000Z');
    expect(egyptInstant('2026-07-15T12:30')?.toISOString()).toBe('2026-07-15T09:30:00.000Z');
    expect(egyptTimeLabel('ar', new Date('2026-07-15'))).toBe('توقيت مصر (GMT+3)');
    expect(egyptTimeLabel('en', new Date('2026-01-15'))).toBe('Egypt time (GMT+2)');
    expect(egyptLocalDateTime(new Date('2026-07-15T09:30Z'))).toBe('2026-07-15T12:30');
  });
  it('rejects invalid dates and the missing daylight-saving hour', () => {
    expect(egyptInstant('2026-04-24T00:30')).toBeUndefined();
    expect(egyptInstant('2026-02-30T12:30')).toBeUndefined();
    expect(egyptInstant('')).toBeUndefined();
    expect(egyptInstant('2026-04-24T01:30')?.toISOString()).toBe('2026-04-23T22:30:00.000Z');
    expect(egyptInstant('2026-10-29T23:30')?.toISOString()).toBe('2026-10-29T20:30:00.000Z');
  });
});
