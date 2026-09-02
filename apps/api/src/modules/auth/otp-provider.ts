import { randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';

export interface OtpDelivery {
  email: string;
  roleType: 'seeker' | 'provider' | 'admin';
  purpose: 'login' | 'registration' | 'password_reset';
  code: string;
  expiresAt: Date;
}

export interface OtpProvider {
  readonly kind: 'deterministic-fake' | 'smtp' | 'external' | 'unconfigured';
  isReady(): boolean | Promise<boolean>;
  send(delivery: OtpDelivery): Promise<void>;
}

export interface SmtpOtpProviderConfiguration {
  host: string;
  port: number;
  tls: 'implicit' | 'starttls' | 'none';
  user?: string;
  password?: string;
  from: string;
  productName?: string;
}

export interface SmtpTransport {
  verify(): Promise<unknown>;
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
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

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character] as string);
}

function renderOtpMessage(
  delivery: OtpDelivery,
  productName = 'Elsadat Real Estate'
): { subject: string; text: string; html: string } {
  const minutes = Math.max(1, Math.ceil((delivery.expiresAt.getTime() - Date.now()) / 60_000));
  const safeProductName = escapeHtml(productName);
  const safeCode = escapeHtml(delivery.code);
  const subject = `رمز التحقق | ${productName}`;
  const text = [
    productName,
    '',
    `رمز التحقق الخاص بك هو: ${delivery.code}`,
    `ينتهي الرمز خلال ${minutes} دقائق.`,
    'لا تشارك هذا الرمز مع أي شخص. إذا لم تطلبه فتجاهل هذه الرسالة.',
    '',
    `Your verification code is: ${delivery.code}`,
    `It expires in ${minutes} minutes.`,
    'Never share this code. If you did not request it, ignore this message.'
  ].join('\n');
  const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;background:#f6f4ee;font-family:Arial,sans-serif;color:#172238">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px;background:#f6f4ee">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e7e1d3;border-radius:16px;overflow:hidden">
          <tr><td style="background:#172238;color:#fff;padding:24px;text-align:center;font-size:20px;font-weight:700">${safeProductName}</td></tr>
          <tr><td style="padding:32px;text-align:center">
            <h1 style="margin:0 0 12px;font-size:22px">رمز التحقق الخاص بك</h1>
            <p style="margin:0 0 24px;color:#596274">استخدم الرمز التالي لإكمال طلبك. ينتهي خلال ${minutes} دقائق.</p>
            <div dir="ltr" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#f0b94b;color:#172238;font-size:32px;font-weight:800;letter-spacing:8px">${safeCode}</div>
            <p style="margin:24px 0 0;color:#8b3440;font-size:14px">لا تشارك هذا الرمز مع أي شخص.</p>
            <hr style="border:0;border-top:1px solid #ece7dc;margin:28px 0">
            <div dir="ltr" style="text-align:left;color:#596274;font-size:14px">
              <strong>Your verification code</strong><br>
              Use the code above within ${minutes} minutes. Never share it with anyone.
            </div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, text, html };
}

export function createNodemailerSmtpTransport(
  configuration: SmtpOtpProviderConfiguration
): SmtpTransport {
  const authenticated = configuration.user !== undefined && configuration.password !== undefined;
  return nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.tls === 'implicit',
    requireTLS: configuration.tls === 'starttls',
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    ...(configuration.tls === 'none' ? { ignoreTLS: true } : {}),
    ...(authenticated
      ? { auth: { user: configuration.user, pass: configuration.password } }
      : {})
  });
}

export function createSmtpOtpProvider(
  configuration: SmtpOtpProviderConfiguration,
  transport: SmtpTransport = createNodemailerSmtpTransport(configuration)
): OtpProvider & { verify(): Promise<boolean> } {
  const readinessTtlMs = 5 * 60 * 1000;
  let readiness: { checkedAt: number; value: boolean } | undefined;
  let readinessCheck: Promise<boolean> | undefined;

  async function check(force = false): Promise<boolean> {
    if (!force && readiness && Date.now() - readiness.checkedAt < readinessTtlMs) {
      return readiness.value;
    }
    if (!force && readinessCheck) return readinessCheck;
    const pending = transport.verify()
      .then(() => true)
      .catch(() => false)
      .then((value) => {
        readiness = { checkedAt: Date.now(), value };
        return value;
      })
      .finally(() => {
        readinessCheck = undefined;
      });
    readinessCheck = pending;
    return pending;
  }

  return Object.freeze({
    kind: 'smtp' as const,
    isReady: () => check(),
    verify() {
      return check(true);
    },
    async send(delivery: OtpDelivery) {
      const message = renderOtpMessage(delivery, configuration.productName);
      try {
        await transport.sendMail({
          from: configuration.from,
          to: delivery.email,
          ...message
        });
        readiness = { checkedAt: Date.now(), value: true };
      } catch (error) {
        readiness = { checkedAt: Date.now(), value: false };
        throw error;
      }
    }
  });
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
