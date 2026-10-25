import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/features/public/model.ts';

describe('exact property prices with opt-in approximation', () => {
  it.each(['ar', 'en'] as const)('keeps the full amount and decimals in %s', locale => {
    const number = (value: string | undefined) => value?.replace(/[٠-٩]/gu, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit))).replace(/٬/gu, ',').replace(/٫/gu, '.');
    for (const amount of [3_250_000, 3_250_001, 999_999, 3_250_000.75, 1000.25]) {
      const result = number(formatMoney({ amount, currency: 'EGP' }, locale));
      expect(result).toContain(new Intl.NumberFormat('en-US', { maximumFractionDigits: 20 }).format(amount));
      expect(result).not.toMatch(/حوالي|Approx\./u);
    }
  });
  it.each(['ar', 'en'] as const)('marks one-decimal millions as approximate only when enabled in %s', locale => {
    const money = { amount: 3_250_000, currency: 'EGP' };
    expect(formatMoney(money, locale, true)).toBe(locale === 'ar' ? 'حوالي 3.3 مليون جنيه' : 'Approx. EGP 3.3M');
    expect(money.amount).toBe(3_250_000);
    expect(formatMoney(money, locale, false)).not.toContain('3.3');
    expect(formatMoney({ amount: 999_999, currency: 'EGP' }, locale, true)).not.toMatch(/حوالي|Approx\./u);
    expect(formatMoney({ amount: 3_250_000.75, currency: 'USD' }, locale, true)).not.toMatch(/حوالي|Approx\./u);
    expect(formatMoney(undefined, locale, true)).toBeUndefined();
  });
});
