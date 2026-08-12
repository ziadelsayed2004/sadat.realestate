import { randomInt } from 'node:crypto';

export interface OtpDelivery {
  phone: string;
  code: string;
  expiresAt: Date;
}

export interface OtpProvider {
  readonly kind: 'deterministic-fake' | 'external' | 'unconfigured';
  isReady(): boolean;
  send(delivery: OtpDelivery): Promise<void>;
}

export interface OtpCodeGenerator {
  create(): string;
}

export class OtpProviderUnavailableError extends Error {
  constructor() {
    super('OTP provider is unavailable');
    this.name = 'OtpProviderUnavailableError';
  }
}

export function createDeterministicFakeOtpProvider(
  onDelivery?: (delivery: OtpDelivery) => void | Promise<void>
): OtpProvider {
  return Object.freeze({
    kind: 'deterministic-fake' as const,
    isReady: () => true,
    async send(delivery: OtpDelivery) {
      await onDelivery?.(delivery);
    }
  });
}

export function createUnconfiguredOtpProvider(): OtpProvider {
  return Object.freeze({
    kind: 'unconfigured' as const,
    isReady: () => false,
    async send() {
      throw new OtpProviderUnavailableError();
    }
  });
}

export function createDeterministicOtpCodeGenerator(code = '000000'): OtpCodeGenerator {
  if (!/^\d{6}$/.test(code)) throw new Error('Deterministic OTP code must contain six digits');
  return Object.freeze({ create: () => code });
}

export function createSecureOtpCodeGenerator(): OtpCodeGenerator {
  return Object.freeze({
    create: () => randomInt(0, 1_000_000).toString().padStart(6, '0')
  });
}
