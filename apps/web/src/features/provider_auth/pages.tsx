import { PROVIDER_TYPES, providerTypeSchema, type ProviderType, type SupportedLocale } from '@sadat-real-estate/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../design_system/index.ts';
import '../auth/styles.css';
import { getProviderTypeCopy } from './copy.ts';
import './styles.css';

export interface ProviderTypePageProps {
  readonly url: string;
  readonly locale: SupportedLocale;
  readonly onContinue?: ((providerType: ProviderType, targetPath: string) => void) | undefined;
}

export function providerTypeFromUrl(url: string): ProviderType | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url, 'http://sadat.local');
  } catch {
    return undefined;
  }
  const candidate = parsed.searchParams.get('providerType');
  const result = providerTypeSchema.safeParse(candidate);
  return result.success ? result.data : undefined;
}

export function providerAccountPath(url: string, providerType: ProviderType): string {
  let parsed: URL;
  try {
    parsed = new URL(url, 'http://sadat.local');
  } catch {
    parsed = new URL('http://sadat.local/auth/register/provider/type');
  }
  const target = new URL('/auth/register/provider/account', parsed.origin);
  target.searchParams.set('providerType', providerType);
  const locale = parsed.searchParams.get('lang');
  if (locale !== null && locale.trim() !== '') target.searchParams.set('lang', locale);
  return `${target.pathname}${target.search}`;
}

function navigateToProviderAccount(url: string, providerType: ProviderType): void {
  if (typeof window === 'undefined') return;
  window.location.assign(providerAccountPath(url, providerType));
}

export function ProviderTypePage({ url, locale, onContinue }: ProviderTypePageProps) {
  const copy = getProviderTypeCopy(locale);
  const initialProviderType = useMemo(() => providerTypeFromUrl(url), [url]);
  const [selectedProviderType, setSelectedProviderType] = useState<ProviderType | undefined>(initialProviderType);
  const selected = selectedProviderType !== undefined;

  useEffect(() => {
    setSelectedProviderType(initialProviderType);
  }, [initialProviderType]);

  function continueToAccount(): void {
    if (selectedProviderType === undefined) return;
    const targetPath = providerAccountPath(url, selectedProviderType);
    if (onContinue !== undefined) {
      onContinue(selectedProviderType, targetPath);
      return;
    }
    navigateToProviderAccount(url, selectedProviderType);
  }

  return (
    <section
      className="auth-page provider-type-page"
      data-testid="provider-type-selection"
      data-screen-id={selected ? 'AUTH-08' : 'AUTH-07'}
      data-state={selected ? 'success' : 'idle'}
    >
      <div className="auth-card auth-card--form provider-type-card">
        <header className="auth-card__heading provider-type-card__heading">
          <span className="auth-card__icon provider-type-card__step" aria-hidden="true">2</span>
          <p className="provider-type-card__step-label">2 / 4</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </header>
        <div className="auth-card__body provider-type-card__body">
          <div className="provider-type-options" role="group" aria-label={copy.optionsLabel}>
            {PROVIDER_TYPES.map(providerType => {
              const option = copy.options[providerType];
              const isSelected = selectedProviderType === providerType;
              return (
                <button
                  key={providerType}
                  className={`provider-type-option${isSelected ? ' provider-type-option--selected' : ''}`}
                  type="button"
                  data-provider-type={providerType}
                  data-selected={isSelected}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedProviderType(providerType)}
                >
                  <span className="provider-type-option__topline">
                    <span className={`provider-type-option__icon provider-type-option__icon--${providerType}`} aria-hidden="true" />
                    <span className="provider-type-option__check" aria-hidden="true">{isSelected ? '✓' : ''}</span>
                  </span>
                  <span className="provider-type-option__title">{option.title}</span>
                  <span className="provider-type-option__description">{option.description}</span>
                </button>
              );
            })}
          </div>
          <aside className="provider-type-guidance" role="note">
            <strong>{copy.guidanceTitle}</strong>
            <span>{copy.guidanceBody}</span>
          </aside>
          <Button type="button" fullWidth size="lg" disabled={!selected} onClick={continueToAccount}>
            {copy.continueAction}
          </Button>
          <p className="auth-card__prompt"><a href="/auth/register">{copy.backAction}</a></p>
        </div>
      </div>
    </section>
  );
}
