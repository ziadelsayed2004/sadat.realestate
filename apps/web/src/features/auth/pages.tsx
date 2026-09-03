import {
  AUTH_ERROR_CODES,
  adminLoginRequestSchema,
  normalizedEmailSchema,
  passwordResetRequestSchema,
  seekerRegistrationRequestSchema,
  type AdminLoginRequest,
  type OtpPurpose,
  type OtpRoleType,
  type OtpSendData,
  type OtpVerifyRequest,
  type PasswordResetRequest,
  type PasswordResetOtpVerifyRequest,
  type ProviderAccountPatch,
  type ProviderApplicationCreateRequest,
  type ProviderApplicationData,
  type ProviderBusinessPatch,
  type ProviderCompanyPatch,
  type ProviderDocumentCategory,
  type ProviderDocumentData,
  type ProviderDocumentDeleteData,
  type ProviderRegistrationData,
  type ProviderApplicationStatusData,
  type ProviderSubmitRequest,
  type SeekerRegistrationRequest,
  type ProviderType,
  type SupportedLocale
} from '@sadat-real-estate/contracts';
import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Input, Select, StateMessage } from '../design_system/index.ts';
import {
  AuthClient,
  type AuthOtpVerifyResult,
  type AuthSnapshot
} from './index.ts';
import {
  ProviderAccountPage,
  ProviderDocumentsPage,
  ProviderOrganizationPage,
  ProviderReviewPage,
  ProviderTypePage,
  getProviderAccountCopy,
  providerTypeFromUrl
} from '../provider_auth/index.ts';
import { getAuthCopy, type AuthCopy } from './copy.ts';
import './styles.css';

const OTP_COOLDOWN_FALLBACK_SECONDS = 60;
const OTP_LENGTH = 6;

export interface AuthFlowClient {
  loginAdmin(input: AdminLoginRequest): Promise<AuthSnapshot>;
  sendOtp(input: {
    readonly email: string;
    readonly roleType: OtpRoleType | 'admin';
    readonly purpose: OtpPurpose | 'password_reset';
  }): Promise<OtpSendData>;
  verifyOtp(input: OtpVerifyRequest | PasswordResetOtpVerifyRequest): Promise<AuthOtpVerifyResult>;
  resetPassword?(input: PasswordResetRequest): Promise<void>;
  registerSeeker(input: SeekerRegistrationRequest): Promise<AuthSnapshot>;
  registerProvider?: ((input: ProviderApplicationCreateRequest) => Promise<ProviderRegistrationData>) | undefined;
  getProviderApplication?: (() => Promise<ProviderApplicationData>) | undefined;
  updateProviderAccount?: ((input: ProviderAccountPatch) => Promise<ProviderApplicationData>) | undefined;
  updateProviderBusiness?: ((input: ProviderBusinessPatch) => Promise<ProviderApplicationData>) | undefined;
  updateProviderCompany?: ((input: ProviderCompanyPatch) => Promise<ProviderApplicationData>) | undefined;
  uploadProviderDocument?: ((category: ProviderDocumentCategory, file: File) => Promise<ProviderDocumentData>) | undefined;
  deleteProviderDocument?: ((documentId: string) => Promise<ProviderDocumentDeleteData>) | undefined;
  submitProviderApplication?: ((input: ProviderSubmitRequest) => Promise<ProviderApplicationData>) | undefined;
  getProviderApplicationStatus?: (() => Promise<ProviderApplicationStatusData>) | undefined;
  refresh?: (() => Promise<AuthSnapshot>) | undefined;
  dispose?: () => void;
}

export interface AuthPageProps {
  readonly url: string;
  readonly locale: SupportedLocale;
  readonly client?: AuthFlowClient | undefined;
  readonly onAuthenticated?: ((snapshot: AuthSnapshot) => void) | undefined;
}

type RequestState = 'idle' | 'loading' | 'error' | 'retry' | 'success';

interface AuthUiError {
  readonly state: 'error' | 'retry';
  readonly title: string;
  readonly message: string;
}

interface AuthLocation {
  readonly pathname: string;
  readonly roleType: OtpRoleType | 'admin';
  readonly purpose: OtpPurpose | 'password_reset';
  readonly returnTo: string;
}

function parseAuthLocation(url: string): AuthLocation {
  let parsed: URL;
  try {
    parsed = new URL(url, 'http://sadat.local');
  } catch {
    parsed = new URL('/auth/login', 'http://sadat.local');
  }

  const pathname = parsed.pathname.replace(/\/+$/u, '') || '/';
  const roleType = pathname === '/auth/forgot-password'
    ? 'admin'
    : parsed.searchParams.get('roleType') === 'provider' ? 'provider' : 'seeker';
  const purpose = pathname === '/auth/forgot-password'
    ? 'password_reset'
    : parsed.searchParams.get('purpose') === 'registration' || pathname.startsWith('/auth/register')
      ? 'registration'
      : 'login';
  const candidateReturnTo = parsed.searchParams.get('returnTo');
  const returnTo = candidateReturnTo !== null && candidateReturnTo.startsWith('/') && !candidateReturnTo.startsWith('//')
    ? candidateReturnTo
    : '/';

  return { pathname, roleType, purpose, returnTo };
}

function navigateAfterAuthentication(returnTo: string): void {
  if (typeof window === 'undefined') return;
  window.location.assign(returnTo);
}

function getApiErrorCode(error: unknown): string | undefined {
  return error instanceof ApiClientError ? error.apiError?.code : undefined;
}

function authError(error: unknown, copy: AuthCopy): AuthUiError {
  const code = getApiErrorCode(error);
  if (code === 'INVALID_REGISTRATION_TOKEN' || code === 'SEEKER_NOT_FOUND') {
    return { state: 'error', title: copy.invalidRegistrationTokenTitle, message: copy.invalidRegistrationTokenBody };
  }
  if (code === 'SEEKER_ALREADY_EXISTS') {
    return { state: 'error', title: copy.duplicateRegistrationTitle, message: copy.duplicateRegistrationBody };
  }
  if (code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
    return { state: 'error', title: copy.invalidCredentialsTitle, message: copy.invalidCredentialsBody };
  }
  if (code === AUTH_ERROR_CODES.ACCOUNT_NOT_ACTIVE) {
    return { state: 'error', title: copy.accountNotActiveTitle, message: copy.accountNotActiveBody };
  }
  if (code === AUTH_ERROR_CODES.INVALID_OTP) {
    return { state: 'error', title: copy.invalidOtpTitle, message: copy.invalidOtpBody };
  }
  if (code === AUTH_ERROR_CODES.OTP_ATTEMPTS_EXCEEDED) {
    return { state: 'error', title: copy.otpAttemptsTitle, message: copy.otpAttemptsBody };
  }
  if (code === AUTH_ERROR_CODES.OTP_SEND_RATE_LIMITED) {
    return { state: 'retry', title: copy.otpRateLimitedTitle, message: copy.otpRateLimitedBody };
  }
  if (code === AUTH_ERROR_CODES.OTP_PROVIDER_UNAVAILABLE) {
    return { state: 'retry', title: copy.otpProviderTitle, message: copy.otpProviderBody };
  }
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.status === 503)) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.genericErrorTitle, message: copy.genericErrorBody };
}

function inputError(copy: AuthCopy): AuthUiError {
  return { state: 'error', title: copy.invalidFormTitle, message: copy.invalidFormBody };
}

function StateNotice({ error, copy, onRetry }: { readonly error: AuthUiError; readonly copy: AuthCopy; readonly onRetry?: (() => void) | undefined }) {
  return (
    <StateMessage
      state={error.state}
      title={error.title}
      message={error.message}
      retryLabel={copy.retryAction}
      onRetry={error.state === 'retry' ? onRetry : undefined}
    />
  );
}

type AuthIconName = 'mail' | 'lock' | 'eye' | 'eye-off' | 'shield' | 'home' | 'building';

function AuthIcon({ name }: { readonly name: AuthIconName }) {
  const svgProps = {
    className: 'auth-icon',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    focusable: 'false' as const,
    'aria-hidden': true
  };

  switch (name) {
    case 'mail':
      return <svg {...svgProps}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 5 7.5-5" /></svg>;
    case 'lock':
      return <svg {...svgProps}><rect x="6.5" y="10" width="11" height="10" rx="1" /><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" /></svg>;
    case 'eye':
      return <svg {...svgProps}><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" /><circle cx="12" cy="12" r="2" /></svg>;
    case 'eye-off':
      return <svg {...svgProps}><path d="M3.5 12s3-5 8.5-5c5.5 0 8.5 5 8.5 5s-3 5-8.5 5c-5.5 0-8.5-5-8.5-5Z" /><circle cx="12" cy="12" r="2" /><path d="m4 4 16 16" /></svg>;
    case 'shield':
      return <svg {...svgProps}><path d="M12 3 19 6v5.5c0 4.5-2.8 7.7-7 9.5-4.2-1.8-7-5-7-9.5V6l7-3Z" /></svg>;
    case 'home':
      return <svg {...svgProps}><path d="m4 10 8-7 8 7" /><path d="M5 9.5V20h14V9.5" /><path d="M9.5 20v-6h5v6" /></svg>;
    case 'building':
      return <svg {...svgProps}><path d="M7 21V4a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17" /><path d="M7 10H5a2 2 0 0 0-2 2v9M17 10h2a2 2 0 0 1 2 2v9M3 21h18" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></svg>;
  }
}

function LoginPage({ client, locale, onAuthenticated }: { readonly client: AuthFlowClient; readonly locale: SupportedLocale; readonly onAuthenticated: (snapshot: AuthSnapshot) => void }) {
  const copy = getAuthCopy(locale);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState<AuthUiError | undefined>();

  const submit = useCallback(async () => {
    const parsed = adminLoginRequestSchema.safeParse({ email, password });
    if (!parsed.success) {
      setState('error');
      setError(inputError(copy));
      return;
    }

    setState('loading');
    setError(undefined);
    try {
      const snapshot = await client.loginAdmin(parsed.data);
      setState('success');
      onAuthenticated(snapshot);
    } catch (requestError: unknown) {
      const nextError = authError(requestError, copy);
      setState(nextError.state);
      setError(nextError);
    }
  }, [client, copy, email, onAuthenticated, password]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit();
  }

  return (
    <section className="auth-page auth-page--login" data-screen-id="AUTH-01" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card">
        <header className="auth-card__hero">
          <img className="auth-card__logo" src="/assets/sadat-real-estate-logo.png" alt="" width="636" height="557" />
          <h1>{copy.loginTitle}</h1>
          <p>{copy.loginDescription}</p>
        </header>
        <div className="auth-card__body">
          {error === undefined ? null : <StateNotice error={error} copy={copy} onRetry={() => void submit()} />}
          {state === 'success' ? <StateMessage state="success" title={copy.loginSuccessTitle} message={copy.loginSuccessBody} /> : null}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-login-field-shell auth-login-field-shell--email">
              <Input
                id="auth-login-email"
                className="auth-login-field auth-login-field--email"
                label={copy.identifierLabel}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder={copy.identifierPlaceholder}
                value={email}
                onChange={event => setEmail(event.currentTarget.value)}
                required
                state={state === 'error' && !normalizedEmailSchema.safeParse(email).success ? 'error' : 'default'}
              />
              <span className="auth-login-field__icon" aria-hidden="true"><AuthIcon name="mail" /></span>
            </div>
            <div className="auth-password-field">
              <Input
                id="auth-login-password"
                className="auth-login-field auth-login-field--password"
                label={copy.passwordLabel}
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder={copy.passwordPlaceholder}
                value={password}
                onChange={event => setPassword(event.currentTarget.value)}
                required
                state={state === 'error' && password === '' ? 'error' : 'default'}
              />
              <span className="auth-login-field__icon auth-login-field__icon--password" aria-hidden="true"><AuthIcon name="lock" /></span>
              <button
                className="auth-password-field__toggle"
                type="button"
                onClick={() => setShowPassword(value => !value)}
                aria-pressed={showPassword}
                aria-label={showPassword ? copy.hidePassword : copy.showPassword}
              >
                <AuthIcon name={showPassword ? 'eye' : 'eye-off'} />
              </button>
            </div>
            {copy.rememberLabel !== undefined && copy.forgotPasswordAction !== undefined ? (
              <div className="auth-login-options">
                <label className="auth-remember">
                  <input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.currentTarget.checked)} />
                  <span>{copy.rememberLabel}</span>
                </label>
                <a className="auth-forgot" href={`/auth/forgot-password?lang=${locale}`}>{copy.forgotPasswordAction}</a>
              </div>
            ) : null}
            <Button type="submit" fullWidth size="lg" loading={state === 'loading'}>
              {state === 'loading' ? copy.loggingIn : copy.loginAction}
            </Button>
          </form>
          <p className="auth-card__prompt auth-card__prompt--email">
            {copy.emailLoginPrompt} <a href="/auth/verify-email?purpose=login&roleType=seeker">{copy.emailLoginAction}</a>
          </p>
          <p className="auth-card__prompt auth-card__prompt--account">
            {copy.createAccountPrompt} <a href="/auth/register">{copy.createAccountAction}</a>
          </p>
          <div className="auth-card__divider" aria-hidden="true" />
          {copy.privacyNotice === undefined ? null : <p className="auth-card__privacy"><span className="auth-card__privacy-icon"><AuthIcon name="shield" /></span>{copy.privacyNotice}</p>}
        </div>
      </div>
    </section>
  );
}

function ForgotPasswordPage({ client, locale, url }: { readonly client: AuthFlowClient; readonly locale: SupportedLocale; readonly url: string }) {
  const [grant, setGrant] = useState<string>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [state, setState] = useState<RequestState>('idle');
  const copy = getAuthCopy(locale);
  let initialRoleType: OtpRoleType | 'admin' = 'seeker';
  try {
    const requestedRole = new URL(url, 'http://sadat.local').searchParams.get('roleType');
    if (requestedRole === 'provider' || requestedRole === 'admin') initialRoleType = requestedRole;
  } catch {
    // Keep the safe seeker default for malformed/legacy URLs.
  }

  if (grant === undefined) {
    return <OtpPage client={client} locale={locale} roleType={initialRoleType} purpose="password_reset" onAuthenticated={() => undefined} onRegistrationVerified={token => setGrant(token)} />;
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = passwordResetRequestSchema.safeParse({ verificationToken: grant, newPassword: password });
    if (!parsed.success || password !== confirmation || client.resetPassword === undefined) {
      setState('error');
      return;
    }
    setState('loading');
    try {
      await client.resetPassword(parsed.data);
      setState('success');
    } catch {
      setState('error');
    }
  };

  return <section className="auth-page auth-page--email" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div className="auth-card auth-card--form">
      <header className="auth-card__heading"><span className="auth-card__icon"><AuthIcon name="lock" /></span><h1>{locale === 'ar' ? 'تعيين كلمة مرور جديدة' : 'Set a new password'}</h1><p>{locale === 'ar' ? 'استخدم 8 أحرف على الأقل، تشمل حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.' : 'Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.'}</p></header>
      <div className="auth-card__body">
        {state === 'error' ? <StateMessage state="error" title={copy.invalidFormTitle} message={locale === 'ar' ? 'تأكد من تطابق كلمتي المرور واحتوائهما على حرف كبير وصغير ورقم ورمز.' : 'Passwords must match and include upper/lowercase letters, a number, and a symbol.'} /> : null}
        {state === 'success' ? <StateMessage state="success" title={locale === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed'} message={locale === 'ar' ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.' : 'You can now log in with the new password.'} /> : null}
        {state !== 'success' ? <form className="auth-form" onSubmit={event => void submit(event)}><Input id="auth-new-password" label={locale === 'ar' ? 'كلمة المرور الجديدة' : 'New password'} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.currentTarget.value)} required /><Input id="auth-confirm-password" label={locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} type="password" autoComplete="new-password" value={confirmation} onChange={event => setConfirmation(event.currentTarget.value)} required /><Button type="submit" fullWidth size="lg" loading={state === 'loading'}>{locale === 'ar' ? 'حفظ كلمة المرور' : 'Save password'}</Button></form> : null}
        <p className="auth-card__prompt"><a href={`/auth/login?lang=${locale}`}>{copy.loginAction}</a></p>
      </div>
    </div>
  </section>;
}

interface OtpPageProps {
  readonly client: AuthFlowClient;
  readonly locale: SupportedLocale;
  readonly roleType: OtpRoleType | 'admin';
  readonly purpose: OtpPurpose | 'password_reset';
  readonly onAuthenticated: (snapshot: AuthSnapshot) => void;
  readonly onRegistrationVerified?: ((
    verificationToken: string,
    email: string
  ) => void) | undefined;
  readonly lockRoleType?: boolean | undefined;
}

function OtpPage({ client, locale, roleType: initialRoleType, purpose, onAuthenticated, onRegistrationVerified, lockRoleType = false }: OtpPageProps) {
  const copy = getAuthCopy(locale);
  const [email, setEmail] = useState('');
  const [roleType, setRoleType] = useState<OtpRoleType | 'admin'>(initialRoleType);
  const [stage, setStage] = useState<'request' | 'verify'>('request');
  const [challenge, setChallenge] = useState<OtpSendData | undefined>();
  const [code, setCode] = useState<string[]>(() => Array.from({ length: OTP_LENGTH }, () => ''));
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState<AuthUiError | undefined>();
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cooldownSeconds = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const normalizedEmail = normalizedEmailSchema.safeParse(email).success
    ? normalizedEmailSchema.parse(email)
    : undefined;

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setNow(Date.now());
      return undefined;
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  useEffect(() => {
    if (stage === 'verify') inputRefs.current[0]?.focus();
  }, [stage]);

  const sendCode = useCallback(async () => {
    if (cooldownSeconds > 0) return;
    const parsedEmail = normalizedEmailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setState('error');
      setError(inputError(copy));
      return;
    }

    setState('loading');
    setError(undefined);
    try {
      const response = await client.sendOtp({
        email: parsedEmail.data,
        roleType,
        purpose
      });
      setEmail(parsedEmail.data);
      setChallenge(response);
      setCode(Array.from({ length: OTP_LENGTH }, () => ''));
      setCooldownUntil(Date.now() + response.retryAfterSeconds * 1_000);
      setNow(Date.now());
      setStage('verify');
      setState('success');
    } catch (requestError: unknown) {
      const nextError = authError(requestError, copy);
      setState(nextError.state);
      setError(nextError);
      if (getApiErrorCode(requestError) === AUTH_ERROR_CODES.OTP_SEND_RATE_LIMITED) {
        setCooldownUntil(Date.now() + OTP_COOLDOWN_FALLBACK_SECONDS * 1_000);
        setNow(Date.now());
      }
    }
  }, [client, copy, cooldownSeconds, email, purpose, roleType]);

  const verifyCode = useCallback(async () => {
    if (
      challenge === undefined
      || normalizedEmail === undefined
      || code.join('').length !== OTP_LENGTH
    ) {
      setState('error');
      setError(inputError(copy));
      return;
    }

    setState('loading');
    setError(undefined);
    const request: OtpVerifyRequest | PasswordResetOtpVerifyRequest = purpose === 'password_reset'
      ? { email: normalizedEmail, roleType, purpose: 'password_reset', challengeId: challenge.challengeId, code: code.join('') }
      : { email: normalizedEmail, roleType: roleType === 'admin' ? 'seeker' : roleType, purpose: purpose === 'registration' ? 'registration' : 'login', challengeId: challenge.challengeId, code: code.join('') };
    try {
      const result = await client.verifyOtp(request);
      setState('success');
      setVerified(true);
      if (result.outcome === 'authenticated') onAuthenticated(result.snapshot);
      if (result.outcome === 'verified' && onRegistrationVerified !== undefined) {
        onRegistrationVerified(result.verificationToken, normalizedEmail);
      }
    } catch (requestError: unknown) {
      const nextError = authError(requestError, copy);
      setState(nextError.state);
      setError(nextError);
    }
  }, [challenge, client, code, copy, normalizedEmail, onAuthenticated, onRegistrationVerified, purpose, roleType]);

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendCode();
  }

  function handleVerifySubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void verifyCode();
  }

  function updateCodeDigit(position: number, value: string): void {
    const digit = value.replace(/\D/gu, '').slice(-1);
    setCode(previous => {
      const next = [...previous];
      next[position] = digit;
      return next;
    });
    if (digit !== '' && position < OTP_LENGTH - 1) inputRefs.current[position + 1]?.focus();
  }

  function handleCodeKeyDown(position: number, event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && code[position] === '' && position > 0) {
      inputRefs.current[position - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && position > 0) inputRefs.current[position - 1]?.focus();
    if (event.key === 'ArrowRight' && position < OTP_LENGTH - 1) inputRefs.current[position + 1]?.focus();
  }

  function handleCodePaste(position: number, event: ClipboardEvent<HTMLInputElement>): void {
    const pasted = event.clipboardData.getData('text').replace(/\D/gu, '').slice(0, OTP_LENGTH - position);
    if (pasted === '') return;
    event.preventDefault();
    setCode(previous => {
      const next = [...previous];
      for (const [offset, digit] of Array.from(pasted).entries()) next[position + offset] = digit;
      return next;
    });
    inputRefs.current[Math.min(position + pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  function changeEmail(): void {
    setEmail('');
    setStage('request');
    setChallenge(undefined);
    setCode(Array.from({ length: OTP_LENGTH }, () => ''));
    setCooldownUntil(0);
    setNow(Date.now());
    setState('idle');
    setError(undefined);
    setVerified(false);
  }

  if (stage === 'request') {
    return (
      <section className="auth-page auth-page--email" data-screen-id="AUTH-04" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
        <div className="auth-card auth-card--form">
          <header className="auth-card__heading">
            <span className="auth-card__icon"><AuthIcon name="mail" /></span>
            <h1>{copy.emailTitle}</h1>
            <p>{purpose === 'registration' ? copy.registrationPurpose : copy.emailDescription}</p>
          </header>
          <div className="auth-card__body">
            {error === undefined ? null : <StateNotice error={error} copy={copy} onRetry={() => void sendCode()} />}
            <form className="auth-form" onSubmit={handleRequestSubmit} noValidate>
              <Input
                id="auth-otp-email"
                label={copy.identifierLabel}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder={copy.identifierPlaceholder}
                value={email}
                onChange={event => setEmail(event.currentTarget.value)}
                required
                state={state === 'error' && normalizedEmail === undefined ? 'error' : 'default'}
              />
              <Select
                id="auth-role-type"
                label={copy.roleLabel}
                name="roleType"
                value={roleType}
                disabled={lockRoleType}
                onChange={event => setRoleType(event.currentTarget.value as OtpRoleType | 'admin')}
                options={[
                  { value: 'seeker', label: copy.roleSeeker },
                  { value: 'provider', label: copy.roleProvider },
                  ...(purpose === 'password_reset' || roleType === 'admin' ? [{ value: 'admin', label: locale === 'ar' ? 'مدير النظام' : 'Administrator' }] : [])
                ]}
              />
              <Button type="submit" fullWidth size="lg" loading={state === 'loading'} disabled={cooldownSeconds > 0}>
                {state === 'loading' ? copy.sendingCode : copy.sendCodeAction}
              </Button>
            </form>
            <p className="auth-card__prompt"><a href="/auth/login">{copy.loginAction}</a></p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-page auth-page--otp" data-screen-id="AUTH-05" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form">
        <header className="auth-card__heading">
          <span className="auth-card__icon"><AuthIcon name="mail" /></span>
          <h1>{copy.otpTitle}</h1>
          <p>{copy.otpDescription} <strong dir="ltr">{email}</strong></p>
        </header>
        <div className="auth-card__body">
          {error === undefined ? null : <StateNotice error={error} copy={copy} onRetry={() => void verifyCode()} />}
          {state === 'success' && verified ? <StateMessage state="success" title={purpose === 'login' ? copy.loginSuccessTitle : copy.verificationSuccessTitle} message={purpose === 'login' ? copy.loginSuccessBody : copy.verificationSuccessBody} /> : null}
          {state === 'success' && !verified ? <StateMessage state="success" title={copy.codeSentTitle} message={copy.codeSentBody} /> : null}
          <form className="auth-form auth-form--otp" onSubmit={handleVerifySubmit} noValidate>
            <fieldset className="auth-otp-fieldset">
              <legend>{copy.codeLabel}</legend>
              <div className="auth-otp__digits" dir="ltr">
                {code.map((digit, position) => (
                  <input
                    key={position}
                    ref={element => { inputRefs.current[position] = element; }}
                    className="auth-otp__digit"
                    aria-label={copy.codeDigitLabel(position + 1)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={position === 0 ? 'one-time-code' : 'off'}
                    maxLength={1}
                    value={digit}
                    onChange={event => updateCodeDigit(position, event.currentTarget.value)}
                    onKeyDown={event => handleCodeKeyDown(position, event)}
                    onPaste={event => handleCodePaste(position, event)}
                    aria-invalid={error !== undefined || undefined}
                  />
                ))}
              </div>
            </fieldset>
            <Button type="submit" fullWidth size="lg" loading={state === 'loading'} disabled={verified}>
              {state === 'loading' ? copy.verifyingCode : copy.verifyAction}
            </Button>
          </form>
          <div className="auth-otp__actions">
            <Button type="button" variant="ghost" size="sm" onClick={() => void sendCode()} disabled={cooldownSeconds > 0 || state === 'loading' || verified}>
              {cooldownSeconds > 0 ? copy.resendIn(cooldownSeconds) : copy.resendAction}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={changeEmail} disabled={state === 'loading'}>
              {copy.changeEmailAction}
            </Button>
          </div>
          <p className="auth-card__prompt"><a href="/auth/login">{copy.loginAction}</a></p>
        </div>
      </div>
    </section>
  );
}

function replaceAuthUrl(path: string): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', path);
}

function legacyEmailVerificationPath(url: string): string {
  const legacy = new URL(url, 'http://sadat.local');
  const target = new URL('/auth/verify-email', legacy.origin);
  const preservedKeys = ['purpose', 'roleType', 'providerType', 'lang', 'returnTo'] as const;
  for (const key of preservedKeys) {
    const value = legacy.searchParams.get(key);
    if (value !== null && value.trim() !== '') target.searchParams.set(key, value);
  }
  return `${target.pathname}${target.search}${legacy.hash}`;
}

function LegacyVerificationRedirect({ locale, url }: { readonly locale: SupportedLocale; readonly url: string }) {
  const copy = getAuthCopy(locale);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.location.replace(legacyEmailVerificationPath(url));
  }, [url]);

  return (
    <section className="auth-page auth-page--email-redirect" data-route-alias="/auth/verify-phone" data-state="redirecting" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form">
        <div className="auth-card__body">
          <StateMessage state="loading" title={copy.emailTitle} message={copy.emailDescription} />
        </div>
      </div>
    </section>
  );
}

interface RegistrationRolePageProps {
  readonly copy: AuthCopy;
  readonly locale: SupportedLocale;
  readonly restartRequired: boolean;
  readonly onSelectSeeker: () => void;
}

function RegistrationRolePage({ copy, locale, restartRequired, onSelectSeeker }: RegistrationRolePageProps) {
  const [selected, setSelected] = useState(false);

  function selectSeeker(): void {
    setSelected(true);
  }

  function continueToEmail(): void {
    if (!selected) return;
    onSelectSeeker();
  }

  return (
    <section className="auth-page auth-page--registration-role" data-screen-id="AUTH-02" data-state={selected ? 'success' : 'idle'} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form">
        <header className="auth-card__heading">
          <span className="auth-registration-step" aria-label={copy.registrationStepLabel ?? 'Step 1'}>
            <span className="auth-registration-step__number" aria-hidden="true">1</span>
            <span>{copy.registrationStepLabel ?? 'Step 1'}</span>
          </span>
          <h1>{copy.accountSelectionTitle}</h1>
          <p>{copy.accountSelectionBody}</p>
        </header>
        <div className="auth-card__body">
          {restartRequired ? (
            <StateMessage
              state="error"
              title={copy.registrationUnavailableTitle}
              message={copy.registrationUnavailableBody}
            />
          ) : null}
          <div className="auth-role-options" aria-label={copy.roleLabel}>
            <button
              className={`auth-role-card${selected ? ' auth-role-card--selected' : ''}`}
              type="button"
              aria-pressed={selected}
              onClick={selectSeeker}
            >
              <span className="auth-role-card__icon"><AuthIcon name="home" /></span>
              <span className="auth-role-card__title">{copy.seekerAccountTitle}</span>
              <span className="auth-role-card__body">{copy.seekerAccountBody}</span>
            </button>
            <a className="auth-role-card auth-role-card--link" href="/auth/register/provider/type">
              <span className="auth-role-card__icon"><AuthIcon name="building" /></span>
              <span className="auth-role-card__title">{copy.providerAccountTitle}</span>
              <span className="auth-role-card__body">{copy.providerAccountBody}</span>
              <span className="auth-role-card__tag"><span className="auth-role-card__tag-label">{copy.roleProvider}</span></span>
            </a>
          </div>
          <div className="auth-role-actions">
            <Button type="button" size="lg" disabled={!selected} onClick={continueToEmail}>
              {copy.continueAction}
            </Button>
            <p className="auth-card__prompt"><a href="/auth/login">{copy.backAction}</a></p>
          </div>
        </div>
      </div>
    </section>
  );
}

interface SeekerRegistrationFormProps {
  readonly client: AuthFlowClient;
  readonly locale: SupportedLocale;
  readonly email: string;
  readonly verificationToken: string;
  readonly onRegistered: (snapshot: AuthSnapshot) => void;
  readonly onRestart: () => void;
}

function SeekerRegistrationForm({ client, locale, email, verificationToken, onRegistered, onRestart }: SeekerRegistrationFormProps) {
  const copy = getAuthCopy(locale);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [state, setState] = useState<RequestState>('idle');
  const [error, setError] = useState<AuthUiError | undefined>();

  const submit = useCallback(async () => {
    const parsed = seekerRegistrationRequestSchema.safeParse({
      verificationToken,
      firstName,
      lastName,
      password,
      locale
    });
    if (!parsed.success || password !== passwordConfirmation) {
      setState('error');
      setError(inputError(copy));
      return;
    }

    setState('loading');
    setError(undefined);
    try {
      const snapshot = await client.registerSeeker(parsed.data);
      setState('success');
      onRegistered(snapshot);
    } catch (requestError: unknown) {
      const nextError = authError(requestError, copy);
      setState(nextError.state);
      setError(nextError);
    }
  }, [client, copy, firstName, lastName, locale, onRegistered, password, passwordConfirmation, verificationToken]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void submit();
  }

  return (
    <section className="auth-page auth-page--registration-form" data-screen-id="AUTH-03" data-state={state} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form">
        <header className="auth-card__heading">
          <span className="auth-card__icon" aria-hidden="true">✓</span>
          <h1>{copy.registrationFormTitle}</h1>
          <p>{copy.registrationFormBody}</p>
        </header>
        <div className="auth-card__body">
          {error === undefined ? null : <StateNotice error={error} copy={copy} onRetry={() => void submit()} />}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <Input
              id="auth-registration-first-name"
              label={copy.firstNameLabel}
              name="firstName"
              autoComplete="given-name"
              placeholder={copy.firstNamePlaceholder}
              value={firstName}
              onChange={event => setFirstName(event.currentTarget.value)}
              required
              state={state === 'error' && firstName.trim() === '' ? 'error' : 'default'}
            />
            <Input
              id="auth-registration-last-name"
              label={copy.lastNameLabel}
              name="lastName"
              autoComplete="family-name"
              placeholder={copy.lastNamePlaceholder}
              value={lastName}
              onChange={event => setLastName(event.currentTarget.value)}
              required
              state={state === 'error' && lastName.trim() === '' ? 'error' : 'default'}
            />
            <Input
              id="auth-registration-email"
              label={copy.identifierLabel}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              readOnly
              dir="ltr"
              state="success"
            />
            <Input id="auth-registration-password" label={locale === 'ar' ? 'كلمة المرور' : 'Password'} name="password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.currentTarget.value)} required />
            <Input id="auth-registration-password-confirmation" label={locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} name="passwordConfirmation" type="password" autoComplete="new-password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.currentTarget.value)} required />
            <p className="auth-field-help">{locale === 'ar' ? '8 أحرف على الأقل، تشمل حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا.' : 'At least 8 characters with uppercase, lowercase, a number, and a symbol.'}</p>
            <Button type="submit" fullWidth size="lg" loading={state === 'loading'}>
              {state === 'loading' ? copy.registering : copy.registerAction}
            </Button>
          </form>
          {error?.state === 'error' ? (
            <Button type="button" variant="ghost" onClick={onRestart}>
              {copy.restartRegistrationAction}
            </Button>
          ) : null}
          <p className="auth-card__prompt"><button className="auth-inline-button" type="button" onClick={onRestart}>{copy.backAction}</button></p>
        </div>
      </div>
    </section>
  );
}

interface SeekerRegistrationSuccessProps {
  readonly copy: AuthCopy;
  readonly locale: SupportedLocale;
  readonly snapshot: AuthSnapshot;
  readonly onContinue: (snapshot: AuthSnapshot) => void;
}

function SeekerRegistrationSuccess({ copy, locale, snapshot, onContinue }: SeekerRegistrationSuccessProps) {
  return (
    <section className="auth-page auth-page--registration-success" data-screen-id="AUTH-06" data-state="success" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--success">
        <div className="auth-success-mark" aria-hidden="true">✓</div>
        <div className="auth-success-content" role="status" aria-live="polite">
          <h1>{copy.registrationSuccessTitle}</h1>
          <p>{copy.registrationSuccessBody}</p>
        </div>
        <div className="auth-success-actions">
          <Button type="button" fullWidth size="lg" onClick={() => onContinue(snapshot)}>
            {copy.registrationNextAction}
          </Button>
          <a href="/auth/login">{copy.loginAction}</a>
        </div>
      </div>
    </section>
  );
}

interface SeekerRegistrationFlowProps {
  readonly client: AuthFlowClient;
  readonly locale: SupportedLocale;
  readonly onAuthenticated: (snapshot: AuthSnapshot) => void;
  readonly restartRequired: boolean;
}

function SeekerRegistrationFlow({ client, locale, onAuthenticated, restartRequired }: SeekerRegistrationFlowProps) {
  const [step, setStep] = useState<'role' | 'otp' | 'form' | 'success'>('role');
  const [showRestartNotice, setShowRestartNotice] = useState(restartRequired);
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [email, setEmail] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<AuthSnapshot | undefined>();
  const copy = getAuthCopy(locale);

  function startSeekerRegistration(): void {
    setShowRestartNotice(false);
    replaceAuthUrl('/auth/verify-email?purpose=registration&roleType=seeker');
    setStep('otp');
  }

  const handleRegistrationVerified = useCallback((
    token: string,
    verifiedEmail: string
  ) => {
    setVerificationToken(token);
    setEmail(verifiedEmail);
    replaceAuthUrl('/auth/register/seeker');
    setStep('form');
  }, []);

  const restart = useCallback(() => {
    setVerificationToken(undefined);
    setEmail(undefined);
    setSnapshot(undefined);
    setShowRestartNotice(false);
    replaceAuthUrl('/auth/register');
    setStep('role');
  }, []);

  const handleRegistered = useCallback((nextSnapshot: AuthSnapshot) => {
    setSnapshot(nextSnapshot);
    replaceAuthUrl('/auth/register/seeker/success');
    setStep('success');
  }, []);

  if (step === 'role') {
    return <RegistrationRolePage copy={copy} locale={locale} restartRequired={showRestartNotice} onSelectSeeker={startSeekerRegistration} />;
  }
  if (step === 'otp') {
    return (
      <OtpPage
        client={client}
        locale={locale}
        roleType="seeker"
        purpose="registration"
        onAuthenticated={onAuthenticated}
        onRegistrationVerified={handleRegistrationVerified}
      />
    );
  }
  if (
    step === 'form'
    && verificationToken !== undefined
    && email !== undefined
  ) {
    return (
      <SeekerRegistrationForm
        client={client}
        locale={locale}
        email={email}
        verificationToken={verificationToken}
        onRegistered={handleRegistered}
        onRestart={restart}
      />
    );
  }
  if (step === 'success' && snapshot !== undefined) {
    return <SeekerRegistrationSuccess copy={copy} locale={locale} snapshot={snapshot} onContinue={onAuthenticated} />;
  }
  return <RegistrationRolePage copy={copy} locale={locale} restartRequired onSelectSeeker={startSeekerRegistration} />;
}

type ProviderRegistrationStep = 'type' | 'otp' | 'registering' | 'account' | 'organization' | 'documents' | 'review' | 'registration-error';

interface ProviderRegistrationFlowProps {
  readonly client: AuthFlowClient;
  readonly locale: SupportedLocale;
  readonly url: string;
  readonly initialStep: ProviderRegistrationStep;
  readonly onAuthenticated: (snapshot: AuthSnapshot) => void;
}

interface ProviderRegistrationUiError {
  readonly state: 'error' | 'retry';
  readonly title: string;
  readonly message: string;
}

function providerRegistrationError(error: unknown, locale: SupportedLocale): ProviderRegistrationUiError {
  const copy = getProviderAccountCopy(locale);
  const code = error instanceof ApiClientError ? error.apiError?.code : undefined;
  if (code === 'INVALID_REGISTRATION_TOKEN') {
    return { state: 'error', title: copy.invalidRegistrationTitle, message: copy.invalidRegistrationBody };
  }
  if (code === 'PROVIDER_ALREADY_EXISTS') {
    return { state: 'error', title: copy.duplicateRegistrationTitle, message: copy.duplicateRegistrationBody };
  }
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.status === 503)) {
    return { state: 'retry', title: copy.networkTitle, message: copy.networkBody };
  }
  return { state: 'error', title: copy.unavailableTitle, message: copy.unavailableBody };
}

function providerTypePath(providerType: ProviderType | undefined, locale: SupportedLocale): string {
  const query = new URLSearchParams({ lang: locale });
  if (providerType !== undefined) query.set('providerType', providerType);
  return `/auth/register/provider/type?${query.toString()}`;
}

function providerOtpPath(providerType: ProviderType | undefined, locale: SupportedLocale): string {
  const query = new URLSearchParams({ purpose: 'registration', roleType: 'provider', lang: locale });
  if (providerType !== undefined) query.set('providerType', providerType);
  return `/auth/verify-email?${query.toString()}`;
}

function providerProgressPath(providerType: ProviderType, locale: SupportedLocale, step: 'account' | 'organization' | 'documents' | 'review'): string {
  if (step === 'review') {
    const query = new URLSearchParams({ providerType, lang: locale });
    return `/auth/register/provider/review?${query.toString()}`;
  }
  const query = new URLSearchParams({ providerType, lang: locale, step });
  return `/auth/register/provider/account?${query.toString()}`;
}

function providerRegistrationStepFromUrl(url: string): ProviderRegistrationStep {
  try {
    const parsed = new URL(url, 'http://sadat.local');
    if (parsed.pathname === '/auth/register/provider/review') return 'review';
    const step = parsed.searchParams.get('step');
    if (step === 'review') return 'review';
    if (step === 'organization' || step === 'documents') return step;
  } catch {
    // The route will fall back to the account step when the URL is malformed.
  }
  return 'account';
}

function ProviderRegistrationState({
  locale,
  error,
  onRetry,
  onBack
}: {
  readonly locale: SupportedLocale;
  readonly error?: ProviderRegistrationUiError | undefined;
  readonly onRetry?: (() => void) | undefined;
  readonly onBack: () => void;
}) {
  const copy = getProviderAccountCopy(locale);
  return (
    <section className="auth-page provider-account-page" data-testid="provider-registration-state" data-screen-id="AUTH-09" data-state={error?.state ?? 'loading'} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="auth-card auth-card--form provider-account-card">
        <div className="provider-account-state">
          {error === undefined
            ? <StateMessage state="loading" title={copy.loadingTitle} message={copy.loadingBody} />
            : <StateMessage state={error.state} title={error.title} message={error.message} retryLabel={copy.retryAction} onRetry={error.state === 'retry' ? onRetry : undefined} />}
          <Button type="button" variant="ghost" onClick={onBack}>{copy.backAction}</Button>
        </div>
      </div>
    </section>
  );
}

function ProviderRegistrationFlow({ client, locale, url, initialStep, onAuthenticated }: ProviderRegistrationFlowProps) {
  const initialProviderType = useMemo(() => providerTypeFromUrl(url), [url]);
  const [step, setStep] = useState<ProviderRegistrationStep>(initialStep);
  const [providerType, setProviderType] = useState<ProviderType | undefined>(initialProviderType);
  const [verificationToken, setVerificationToken] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [application, setApplication] = useState<ProviderApplicationData | undefined>();
  const [error, setError] = useState<ProviderRegistrationUiError | undefined>();

  const restart = useCallback(() => {
    setStep('type');
    setProviderType(undefined);
    setVerificationToken(undefined);
    setPassword('');
    setApplication(undefined);
    setError(undefined);
    replaceAuthUrl(providerTypePath(undefined, locale));
  }, [locale]);

  const backToType = useCallback(() => {
    setStep('type');
    setError(undefined);
    replaceAuthUrl(providerTypePath(providerType, locale));
  }, [locale, providerType]);

  const createDraft = useCallback(async (nextProviderType: ProviderType, token: string) => {
    if (client.registerProvider === undefined) {
      setError({
        state: 'error',
        title: getProviderAccountCopy(locale).unavailableTitle,
        message: getProviderAccountCopy(locale).unavailableBody
      });
      setStep('registration-error');
      return;
    }
    setError(undefined);
    setStep('registering');
    try {
      const registration = await client.registerProvider({ verificationToken: token, providerType: nextProviderType, password });
      setApplication(registration.application);
      setProviderType(nextProviderType);
      setStep('account');
      replaceAuthUrl(`/auth/register/provider/account?providerType=${encodeURIComponent(nextProviderType)}&lang=${encodeURIComponent(locale)}`);
    } catch (requestError: unknown) {
      setError(providerRegistrationError(requestError, locale));
      setStep('registration-error');
    }
  }, [client, locale, password]);

  const handleTypeContinue = useCallback((nextProviderType: ProviderType, _targetPath: string, nextPassword: string) => {
    setPassword(nextPassword);
    setProviderType(nextProviderType);
    if (application !== undefined && application.providerType === nextProviderType) {
      setStep('account');
      replaceAuthUrl(`/auth/register/provider/account?providerType=${encodeURIComponent(nextProviderType)}&lang=${encodeURIComponent(locale)}`);
      return;
    }
    if (verificationToken !== undefined) {
      void createDraft(nextProviderType, verificationToken);
      return;
    }
    setStep('otp');
    replaceAuthUrl(providerOtpPath(nextProviderType, locale));
  }, [application, createDraft, locale, verificationToken]);

  const handleRegistrationVerified = useCallback((token: string, verifiedEmail: string) => {
    setVerificationToken(token);
    void verifiedEmail;
    if (providerType === undefined) {
      setStep('type');
      replaceAuthUrl(providerTypePath(undefined, locale));
      return;
    }
    void createDraft(providerType, token);
  }, [createDraft, locale, providerType]);

  const handleAccountContinue = useCallback((updated: ProviderApplicationData) => {
    if (providerType === undefined) return;
    setApplication(updated);
    if (providerType === 'individual_broker') {
      setStep('documents');
      replaceAuthUrl(providerProgressPath(providerType, locale, 'documents'));
      return;
    }
    setStep('organization');
    replaceAuthUrl(providerProgressPath(providerType, locale, 'organization'));
  }, [locale, providerType]);

  const backToAccount = useCallback(() => {
    setStep('account');
    setError(undefined);
    if (providerType !== undefined) replaceAuthUrl(providerProgressPath(providerType, locale, 'account'));
  }, [locale, providerType]);

  const handleOrganizationContinue = useCallback((updated: ProviderApplicationData) => {
    if (providerType === undefined) return;
    setApplication(updated);
    setStep('documents');
    replaceAuthUrl(providerProgressPath(providerType, locale, 'documents'));
  }, [locale, providerType]);

  const backToOrganization = useCallback(() => {
    if (providerType === undefined || providerType === 'individual_broker') {
      backToAccount();
      return;
    }
    setStep('organization');
    setError(undefined);
    replaceAuthUrl(providerProgressPath(providerType, locale, 'organization'));
  }, [backToAccount, locale, providerType]);

  const handleDocumentsContinue = useCallback((updated: ProviderApplicationData) => {
    setApplication(updated);
    setProviderType(updated.providerType);
    setStep('review');
    replaceAuthUrl(providerProgressPath(updated.providerType, locale, 'review'));
  }, [locale]);

  const backToDocuments = useCallback((updated?: ProviderApplicationData) => {
    const nextApplication = updated ?? application;
    const nextProviderType = nextApplication?.providerType ?? providerType;
    if (nextApplication !== undefined) setApplication(nextApplication);
    if (nextProviderType === undefined) {
      restart();
      return;
    }
    setProviderType(nextProviderType);
    setStep('documents');
    replaceAuthUrl(providerProgressPath(nextProviderType, locale, 'documents'));
  }, [application, locale, providerType, restart]);

  if (step === 'type') {
    return (
      <ProviderTypePage
        url={providerTypePath(providerType, locale)}
        locale={locale}
        onContinue={handleTypeContinue}
      />
    );
  }
  if (step === 'otp') {
    return (
      <OtpPage
        client={client}
        locale={locale}
        roleType="provider"
        purpose="registration"
        onAuthenticated={onAuthenticated}
        onRegistrationVerified={handleRegistrationVerified}
        lockRoleType
      />
    );
  }
  if (step === 'registering') {
    return <ProviderRegistrationState locale={locale} onBack={backToType} />;
  }
  if (step === 'registration-error') {
    return <ProviderRegistrationState locale={locale} error={error} onRetry={verificationToken !== undefined && providerType !== undefined ? () => void createDraft(providerType, verificationToken) : undefined} onBack={restart} />;
  }
  if (step === 'account' && providerType !== undefined) {
    return (
      <ProviderAccountPage
        client={client}
        locale={locale}
        providerType={providerType}
        initialApplication={application}
        onBack={backToType}
        onContinue={handleAccountContinue}
      />
    );
  }
  if (step === 'organization' && providerType !== undefined && providerType !== 'individual_broker') {
    return (
      <ProviderOrganizationPage
        client={client}
        locale={locale}
        providerType={providerType}
        initialApplication={application}
        onBack={backToAccount}
        onContinue={handleOrganizationContinue}
      />
    );
  }
  if (step === 'documents' && providerType !== undefined) {
    return (
      <ProviderDocumentsPage
        client={client}
        locale={locale}
        providerType={providerType}
        initialApplication={application}
        onBack={providerType === 'individual_broker' ? backToAccount : backToOrganization}
        onContinue={handleDocumentsContinue}
      />
    );
  }
  if (step === 'review') {
    return (
      <ProviderReviewPage
        client={client}
        locale={locale}
        providerType={providerType}
        initialApplication={application}
        onBack={backToDocuments}
        onEdit={updated => backToDocuments(updated)}
      />
    );
  }
  return <ProviderRegistrationState locale={locale} error={error} onBack={restart} />;
}

export function AuthPage({ url, locale, client: providedClient, onAuthenticated: providedOnAuthenticated }: AuthPageProps) {
  const client = useMemo<AuthFlowClient>(() => providedClient ?? new AuthClient(), [providedClient]);
  const location = useMemo(() => parseAuthLocation(url), [url]);
  const copy = getAuthCopy(locale);
  const onAuthenticated = providedOnAuthenticated ?? (() => navigateAfterAuthentication(location.returnTo));

  useEffect(() => {
    if (providedClient !== undefined) return undefined;
    return () => client.dispose?.();
  }, [client, providedClient]);

  if (location.pathname === '/auth/login') {
    return <LoginPage client={client} locale={locale} onAuthenticated={onAuthenticated} />;
  }
  if (location.pathname === '/auth/forgot-password') {
    return <ForgotPasswordPage client={client} locale={locale} url={url} />;
  }
  if (location.pathname === '/auth/verify-phone') {
    return <LegacyVerificationRedirect locale={locale} url={url} />;
  }
  if (location.pathname === '/auth/verify-email') {
    if (location.roleType === 'provider' && location.purpose === 'registration') {
      return <ProviderRegistrationFlow client={client} locale={locale} url={url} initialStep="otp" onAuthenticated={onAuthenticated} />;
    }
    return <OtpPage client={client} locale={locale} roleType={location.roleType} purpose={location.purpose} onAuthenticated={onAuthenticated} />;
  }
  if (location.pathname === '/auth/register/provider/type') {
    return <ProviderRegistrationFlow client={client} locale={locale} url={url} initialStep="type" onAuthenticated={onAuthenticated} />;
  }
  if (location.pathname === '/auth/register/provider/account') {
    return <ProviderRegistrationFlow client={client} locale={locale} url={url} initialStep={providerRegistrationStepFromUrl(url)} onAuthenticated={onAuthenticated} />;
  }
  if (location.pathname === '/auth/register/provider/review' || location.pathname === '/provider-application/status' || location.pathname === '/provider-application/needs-information' || location.pathname === '/provider-application/approved') {
    return <ProviderRegistrationFlow client={client} locale={locale} url={url} initialStep="review" onAuthenticated={onAuthenticated} />;
  }
  if (location.pathname === '/auth/register' || location.pathname.startsWith('/auth/register/seeker')) {
    return (
      <SeekerRegistrationFlow
        client={client}
        locale={locale}
        onAuthenticated={onAuthenticated}
        restartRequired={location.pathname === '/auth/register/seeker/success'}
      />
    );
  }
  return (
    <section className="auth-page auth-page--unavailable" data-state="error" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <StateMessage state="error" title={copy.unknownRouteTitle} message={copy.unknownRouteBody} />
    </section>
  );
}
