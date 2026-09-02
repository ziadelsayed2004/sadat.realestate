import { useEffect, useRef, useState } from 'react';
import type { SupportedLocale } from '@sadat-real-estate/contracts';
import { LOCALE_CHANGE_EVENT } from './runtime.js';

export interface LocaleSwitcherProps {
  readonly locale: SupportedLocale;
  readonly label?: string | undefined;
  readonly onLocaleChange?: ((locale: SupportedLocale) => void) | undefined;
  readonly className?: string | undefined;
}

const LOCALE_OPTIONS: readonly { readonly value: SupportedLocale; readonly label: string; readonly nativeName: string }[] = [
  { value: 'ar', label: 'العربية', nativeName: 'العربية' },
  { value: 'en', label: 'English', nativeName: 'English' }
];

export function LocaleSwitcher({
  locale,
  label = 'تغيير اللغة / Change language',
  onLocaleChange,
  className
}: LocaleSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const currentOption = LOCALE_OPTIONS.find(option => option.value === locale) ?? LOCALE_OPTIONS[0];

  function handleSelect(nextLocale: SupportedLocale) {
    setIsOpen(false);
    if (nextLocale === locale) return;

    if (onLocaleChange !== undefined) {
      onLocaleChange(nextLocale);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(LOCALE_CHANGE_EVENT, { detail: { locale: nextLocale } })
      );
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`custom-locale-switcher${isOpen ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
      data-custom-locale-switcher="true"
    >
      <button
        type="button"
        className="custom-locale-pill-btn"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(previous => !previous)}
      >
        <svg className="locale-pill-globe" viewBox="0 0 16 16" focusable="false" aria-hidden="true">
          <circle cx="8" cy="8" r="6" />
          <path d="M2 8h12M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12" />
        </svg>
        <span className="locale-pill-current-text">{currentOption?.label}</span>
        <svg className={`locale-pill-chevron${isOpen ? ' is-open' : ''}`} viewBox="0 0 12 12" focusable="false" aria-hidden="true">
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen ? (
        <div className="custom-locale-dropdown-menu" role="listbox" aria-label={label}>
          {LOCALE_OPTIONS.map(option => {
            const isSelected = option.value === locale;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-locale-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <span className="custom-locale-option-text">{option.label}</span>
                {isSelected ? (
                  <svg className="custom-locale-check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Accessible native select for test, form automation, and assistive technology parity */}
      <select
        data-locale-switch="true"
        aria-label={label}
        value={locale}
        onChange={event => handleSelect(event.currentTarget.value as SupportedLocale)}
        className="a11y-visually-hidden"
      >
        <option value="ar">العربية</option>
        <option value="en">English</option>
      </select>
    </div>
  );
}
