import { z } from 'zod';
import { successEnvelopeSchema } from '../contracts/envelopes.js';

export const AUTH_ROLE_TYPES = ['seeker', 'provider', 'admin'] as const;
export const AUTH_ACCOUNT_STATES = [
  'draft',
  'unverified',
  'pending_review',
  'needs_information',
  'verified',
  'rejected',
  'restricted',
  'suspended'
] as const;

export const AUTH_ERROR_CODES = Object.freeze({
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REFRESH_TOKEN_REUSED: 'REFRESH_TOKEN_REUSED',
  INVALID_OTP: 'INVALID_OTP',
  OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
  OTP_SEND_RATE_LIMITED: 'OTP_SEND_RATE_LIMITED',
  OTP_PROVIDER_UNAVAILABLE: 'OTP_PROVIDER_UNAVAILABLE'
} as const);

export const OTP_ROLE_TYPES = ['seeker', 'provider'] as const;
export const OTP_PURPOSES = ['login', 'registration'] as const;

const phoneInputSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^[+\d\s().-]+$/)
  .transform((value) => {
    const compact = value.replace(/[\s().-]/g, '');
    return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
  });

export const normalizedPhoneSchema = phoneInputSchema.pipe(
  z.string().regex(/^\+[1-9]\d{7,14}$/)
);

export const normalizedEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email();

export const otpPurposeSchema = z.enum(OTP_PURPOSES);
export const otpRoleTypeSchema = z.enum(OTP_ROLE_TYPES);

const otpRequestIdentityShape = {
  email: normalizedEmailSchema,
  roleType: otpRoleTypeSchema,
  purpose: otpPurposeSchema
};

export const otpSendRequestSchema = z.object(otpRequestIdentityShape).strict();

export const otpVerifyRequestSchema = z.object({
  ...otpRequestIdentityShape,
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/)
}).strict();

export const passwordResetOtpSendRequestSchema = z.object({
  email: normalizedEmailSchema,
  roleType: z.literal('admin'),
  purpose: z.literal('password_reset')
}).strict();

export const passwordResetOtpVerifyRequestSchema = passwordResetOtpSendRequestSchema.extend({
  challengeId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/)
}).strict();

export const otpSendDataSchema = z.object({
  accepted: z.literal(true),
  challengeId: z.string().uuid(),
  expiresInSeconds: z.number().int().positive(),
  retryAfterSeconds: z.number().int().positive()
}).strict();

export const otpVerifiedDataSchema = z.object({
  outcome: z.literal('verified'),
  verificationToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  expiresInSeconds: z.number().int().positive(),
  roleType: z.enum([...OTP_ROLE_TYPES, 'admin'])
}).strict();

export const adminLoginRequestSchema = z.object({
  email: normalizedEmailSchema,
  password: z.string().min(1).max(1024)
}).strict();

export const passwordResetRequestSchema = z.object({
  verificationToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  newPassword: z.string().min(12).max(128)
    .regex(/[a-z]/)
    .regex(/[A-Z]/)
    .regex(/\d/)
    .regex(/[^A-Za-z0-9]/)
}).strict();

export const passwordResetDataSchema = z.object({ reset: z.literal(true) }).strict();

export const emptyAuthRequestSchema = z.object({}).strict();

export const authenticatedUserSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{24}$/),
  roleType: z.enum(AUTH_ROLE_TYPES),
  status: z.enum(AUTH_ACCOUNT_STATES)
}).strict();

export const authSessionDataSchema = z.object({
  accessToken: z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  tokenType: z.literal('Bearer'),
  expiresInSeconds: z.number().int().positive(),
  user: authenticatedUserSchema
}).strict();

export const otpAuthenticatedDataSchema = authSessionDataSchema.extend({
  outcome: z.literal('authenticated')
}).strict();

export const otpVerifyDataSchema = z.discriminatedUnion('outcome', [
  otpAuthenticatedDataSchema,
  otpVerifiedDataSchema
]);

export const otpSendSuccessEnvelopeSchema = successEnvelopeSchema(otpSendDataSchema);
export const otpVerifySuccessEnvelopeSchema = successEnvelopeSchema(otpVerifyDataSchema);

export const authSessionSuccessEnvelopeSchema = successEnvelopeSchema(authSessionDataSchema);
export const passwordResetSuccessEnvelopeSchema = successEnvelopeSchema(passwordResetDataSchema);

export const logoutDataSchema = z.object({ loggedOut: z.literal(true) }).strict();
export const logoutSuccessEnvelopeSchema = successEnvelopeSchema(logoutDataSchema);

export type AuthRoleType = z.infer<typeof authenticatedUserSchema>['roleType'];
export type AuthAccountState = z.infer<typeof authenticatedUserSchema>['status'];
export type AdminLoginRequest = z.infer<typeof adminLoginRequestSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;
export type AuthSessionData = z.infer<typeof authSessionDataSchema>;
export type LogoutData = z.infer<typeof logoutDataSchema>;
export type NormalizedPhone = z.infer<typeof normalizedPhoneSchema>;
export type OtpPurpose = z.infer<typeof otpPurposeSchema>;
export type OtpRoleType = z.infer<typeof otpRoleTypeSchema>;
export type OtpSendRequest = z.infer<typeof otpSendRequestSchema>;
export type OtpVerifyRequest = z.infer<typeof otpVerifyRequestSchema>;
export type PasswordResetOtpSendRequest = z.infer<typeof passwordResetOtpSendRequestSchema>;
export type PasswordResetOtpVerifyRequest = z.infer<typeof passwordResetOtpVerifyRequestSchema>;
export type OtpSendData = z.infer<typeof otpSendDataSchema>;
export type OtpAuthenticatedData = z.infer<typeof otpAuthenticatedDataSchema>;
export type OtpVerifiedData = z.infer<typeof otpVerifiedDataSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifyDataSchema>;
