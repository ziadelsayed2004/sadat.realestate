import { useEffect, useRef, useState, useId } from 'react';

export interface CustomSelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean | undefined;
}

export interface CustomSelectProps {
  readonly id?: string | undefined;
  readonly name?: string | undefined;
  readonly label?: string | undefined;
  readonly value?: string | undefined;
  readonly defaultValue?: string | undefined;
  readonly placeholder?: string | undefined;
  readonly options: readonly CustomSelectOption[];
  readonly onChange?: ((value: string) => void) | undefined;
  readonly className?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly ariaLabel?: string | undefined;
}

export function CustomSelect({
  id,
  name,
  label,
  value: controlledValue,
  defaultValue = '',
  placeholder,
  options,
  onChange,
  className,
  disabled = false,
  ariaLabel
}: CustomSelectProps) {
  const generatedId = useId().replaceAll(':', '');
  const selectId = id ?? `custom-select-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const selectedOption = options.find(opt => opt.value === currentValue);
  const displayLabel = selectedOption ? selectedOption.label : (placeholder || label || '');

  function handleSelect(nextValue: string) {
    if (disabled) return;
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    setIsOpen(false);
    onChange?.(nextValue);
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
      className={`custom-select-wrapper${isOpen ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      data-custom-select="true"
    >
      {label ? <span className="custom-select-label">{label}</span> : null}
      <button
        id={selectId}
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || placeholder}
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className={`custom-select-value-text${!selectedOption && placeholder ? ' is-placeholder' : ''}`}>
          {displayLabel}
        </span>
        <svg
          className={`custom-select-chevron${isOpen ? ' is-open' : ''}`}
          viewBox="0 0 12 12"
          focusable="false"
          aria-hidden="true"
        >
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen ? (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel || label || placeholder}>
          {placeholder ? (
            <button
              type="button"
              role="option"
              aria-selected={currentValue === ''}
              className={`custom-select-option${currentValue === '' ? ' is-selected' : ''}`}
              onClick={() => handleSelect('')}
            >
              <span className="custom-select-option-text">{placeholder}</span>
              {currentValue === '' ? (
                <svg className="custom-select-check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
          ) : null}
          {options.map(option => {
            const isSelected = option.value === currentValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={option.disabled}
                className={`custom-select-option${isSelected ? ' is-selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                <span className="custom-select-option-text">{option.label}</span>
                {isSelected ? (
                  <svg className="custom-select-check" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M3.5 8.5l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Accessible native select for form submissions and automated tests */}
      <select
        name={name}
        value={currentValue}
        onChange={event => handleSelect(event.currentTarget.value)}
        disabled={disabled}
        aria-label={ariaLabel || label || placeholder}
        className="a11y-visually-hidden"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
