import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes
} from 'react';
import { getFocusableElements, getNextRovingTabId } from '../accessibility/index.ts';

export type ComponentState = 'default' | 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';
export type NonDefaultComponentState = Exclude<ComponentState, 'default'>;

type ClassName = string | undefined;

function joinClassNames(...classNames: ClassName[]): string {
  return classNames.filter((className): className is string => Boolean(className)).join(' ');
}

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant | undefined;
  readonly size?: ButtonSize | undefined;
  readonly loading?: boolean | undefined;
  readonly fullWidth?: boolean | undefined;
  readonly startIcon?: ReactNode | undefined;
  readonly endIcon?: ReactNode | undefined;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  startIcon,
  endIcon,
  className,
  disabled = false,
  type = 'button',
  children,
  ...buttonProps
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...buttonProps}
      type={type}
      className={joinClassNames('ui-button', `ui-button--${variant}`, `ui-button--${size}`, fullWidth ? 'ui-button--full' : undefined, className)}
      data-state={loading ? 'loading' : isDisabled ? 'disabled' : 'default'}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="ui-button__spinner" aria-hidden="true" /> : startIcon !== undefined ? <span className="ui-button__icon" aria-hidden="true">{startIcon}</span> : null}
      <span className="ui-button__label">{children}</span>
      {!loading && endIcon !== undefined ? <span className="ui-button__icon" aria-hidden="true">{endIcon}</span> : null}
    </button>
  );
}

export type FieldState = 'default' | 'error' | 'success' | 'disabled';

interface FieldMessageProps {
  readonly helpText?: ReactNode | undefined;
  readonly error?: ReactNode | undefined;
  readonly success?: ReactNode | undefined;
}

function FieldMessage({ state, message, id }: { readonly state: FieldState; readonly message: ReactNode | undefined; readonly id: string }) {
  if (message === undefined) return null;
  return (
    <p id={id} className="ui-field__message" data-tone={state === 'error' ? 'error' : state === 'success' ? 'success' : 'default'} role={state === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  );
}

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>, FieldMessageProps {
  readonly label?: ReactNode | undefined;
  readonly state?: FieldState | undefined;
}

export function Input({
  label,
  state = 'default',
  helpText,
  error,
  success,
  id,
  className,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...inputProps
}: InputProps) {
  const generatedId = useId().replaceAll(':', '');
  const inputId = id ?? `ui-input-${generatedId}`;
  const message = state === 'error' ? error : state === 'success' ? success : helpText;
  const messageId = `${inputId}-message`;
  const describedBy = joinClassNames(ariaDescribedBy, message === undefined ? undefined : messageId);
  const isDisabled = disabled || state === 'disabled';

  return (
    <div className={joinClassNames('ui-field', `ui-field--${state}`, className)} data-state={state}>
      {label !== undefined ? <label className="ui-field__label" htmlFor={inputId}>{label}</label> : null}
      <input
        {...inputProps}
        id={inputId}
        className="ui-field__control"
        disabled={isDisabled}
        aria-describedby={describedBy || undefined}
        aria-invalid={state === 'error' ? true : ariaInvalid}
      />
      <FieldMessage state={state} message={message} id={messageId} />
    </div>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: ReactNode;
  readonly disabled?: boolean | undefined;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children' | 'size'>, FieldMessageProps {
  readonly label?: ReactNode | undefined;
  readonly state?: FieldState | undefined;
  readonly options: readonly SelectOption[];
  readonly placeholder?: ReactNode | undefined;
}

export function Select({
  label,
  state = 'default',
  helpText,
  error,
  success,
  options,
  placeholder,
  id,
  className,
  disabled = false,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...selectProps
}: SelectProps) {
  const generatedId = useId().replaceAll(':', '');
  const selectId = id ?? `ui-select-${generatedId}`;
  const message = state === 'error' ? error : state === 'success' ? success : helpText;
  const messageId = `${selectId}-message`;
  const describedBy = joinClassNames(ariaDescribedBy, message === undefined ? undefined : messageId);
  const isDisabled = disabled || state === 'disabled';

  return (
    <div className={joinClassNames('ui-field', `ui-field--${state}`, className)} data-state={state}>
      {label !== undefined ? <label className="ui-field__label" htmlFor={selectId}>{label}</label> : null}
      <select
        {...selectProps}
        id={selectId}
        className="ui-field__control ui-field__select"
        disabled={isDisabled}
        aria-describedby={describedBy || undefined}
        aria-invalid={state === 'error' ? true : ariaInvalid}
      >
        {placeholder !== undefined ? <option value="" disabled>{placeholder}</option> : null}
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      <FieldMessage state={state} message={message} id={messageId} />
    </div>
  );
}

export interface TabItem {
  readonly id: string;
  readonly label: ReactNode;
  readonly panel?: ReactNode | undefined;
  readonly disabled?: boolean | undefined;
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  readonly items: readonly TabItem[];
  readonly label?: string | undefined;
  readonly activeId?: string | undefined;
  readonly defaultActiveId?: string | undefined;
  readonly onActiveChange?: ((id: string) => void) | undefined;
  readonly direction?: 'ltr' | 'rtl' | undefined;
}

function safeDomId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/gu, '-');
}

export function Tabs({
  items,
  label,
  activeId,
  defaultActiveId,
  onActiveChange,
  direction,
  className,
  ...divProps
}: TabsProps) {
  const baseId = useId().replaceAll(':', '');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [internalActiveId, setInternalActiveId] = useState<string | undefined>(() => defaultActiveId ?? items.find(item => !item.disabled)?.id);
  const requestedActiveId = activeId ?? internalActiveId;
  const activeItem = items.find(item => item.id === requestedActiveId && !item.disabled) ?? items.find(item => !item.disabled);
  const selectedId = activeItem?.id;

  const selectTab = (id: string, moveFocus = false) => {
    setInternalActiveId(id);
    onActiveChange?.(id);
    if (moveFocus) tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'Home' && event.key !== 'End') return;
    const enabledItems = items.filter(item => !item.disabled);
    if (enabledItems.length === 0) return;
    event.preventDefault();
    const nextId = getNextRovingTabId(enabledItems.map(item => item.id), selectedId, event.key, direction ?? 'ltr');
    if (nextId !== undefined) selectTab(nextId, true);
  };

  return (
    <div {...divProps} className={joinClassNames('ui-tabs', className)} dir={direction}>
      <div className="ui-tabs__list" role="tablist" aria-label={label} aria-orientation="horizontal">
        {items.map(item => {
          const isSelected = item.id === selectedId;
          const tabId = `${baseId}-tab-${safeDomId(item.id)}`;
          const panelId = `${baseId}-panel-${safeDomId(item.id)}`;
          return (
            <button
              key={item.id}
              id={tabId}
              ref={element => {
                if (element === null) delete tabRefs.current[item.id];
                else tabRefs.current[item.id] = element;
              }}
              className="ui-tabs__tab"
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => selectTab(item.id)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {activeItem !== undefined ? (
        <div id={`${baseId}-panel-${safeDomId(activeItem.id)}`} className="ui-tabs__panel" role="tabpanel" aria-labelledby={`${baseId}-tab-${safeDomId(activeItem.id)}`} tabIndex={0}>
          {activeItem.panel}
        </div>
      ) : null}
    </div>
  );
}

export type BadgeTone = 'neutral' | 'brand' | 'gold' | 'info' | 'success' | 'warning' | 'error';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone | undefined;
  readonly dot?: boolean | undefined;
}

export function Badge({ tone = 'neutral', dot = false, className, children, ...spanProps }: BadgeProps) {
  return (
    <span {...spanProps} className={joinClassNames('ui-badge', `ui-badge--${tone}`, className)} data-tone={tone}>
      {dot ? <span className="ui-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export interface StateMessageProps {
  readonly state: NonDefaultComponentState;
  readonly title?: ReactNode | undefined;
  readonly message?: ReactNode | undefined;
  readonly retryLabel?: ReactNode | undefined;
  readonly onRetry?: (() => void) | undefined;
}

export function StateMessage({ state, title, message, retryLabel, onRetry }: StateMessageProps) {
  const role = state === 'error' || state === 'permission' ? 'alert' : 'status';
  return (
    <div className="ui-state-message" data-state={state} role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'} aria-busy={state === 'loading' || undefined}>
      {title !== undefined ? <h3>{title}</h3> : null}
      {message !== undefined ? <p>{message}</p> : null}
      {state === 'retry' && onRetry !== undefined && retryLabel !== undefined ? <Button variant="secondary" size="sm" onClick={onRetry}>{retryLabel}</Button> : null}
    </div>
  );
}

export type StateMessages = Partial<Record<NonDefaultComponentState, Omit<StateMessageProps, 'state'>>>;

export interface ModalProps {
  readonly open: boolean;
  readonly title: ReactNode;
  readonly description?: ReactNode | undefined;
  readonly children: ReactNode;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly footer?: ReactNode | undefined;
}

export function Modal({ open, title, description, children, closeLabel, onClose, footer }: ModalProps) {
  const titleId = `ui-modal-title-${useId().replaceAll(':', '')}`;
  const descriptionId = `${titleId}-description`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;

    if (dialog !== null) {
      const firstFocusable = getFocusableElements(dialog)[0];
      (firstFocusable ?? dialog).focus();
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab' || dialog === null) return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements.at(-1);
      if (firstFocusable === undefined) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const currentElement = document.activeElement;
      if (currentElement !== null && !dialog.contains(currentElement)) {
        event.preventDefault();
        firstFocusable.focus();
      } else if (event.shiftKey && currentElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      } else if (!event.shiftKey && currentElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const previousFocus = previousFocusRef.current;
      previousFocusRef.current = null;
      if (previousFocus?.isConnected === true) previousFocus.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="ui-modal-backdrop" data-state="open">
      <div
        className="ui-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        {...(description === undefined ? {} : { 'aria-describedby': descriptionId })}
      >
        <header className="ui-modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description !== undefined ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button className="ui-modal__close" type="button" aria-label={closeLabel} onClick={onClose}>×</button>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer !== undefined ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface ToastProps {
  readonly open: boolean;
  readonly title: ReactNode;
  readonly message?: ReactNode | undefined;
  readonly tone?: ToastTone | undefined;
  readonly dismissLabel?: string | undefined;
  readonly onDismiss?: (() => void) | undefined;
}

export function Toast({ open, title, message, tone = 'info', dismissLabel, onDismiss }: ToastProps) {
  if (!open) return null;
  const role = tone === 'error' ? 'alert' : 'status';
  return (
    <div className="ui-toast" data-tone={tone} role={role} aria-live={role === 'alert' ? 'assertive' : 'polite'}>
      <div className="ui-toast__content">
        <strong>{title}</strong>
        {message !== undefined ? <p>{message}</p> : null}
      </div>
      {onDismiss !== undefined && dismissLabel !== undefined ? <button className="ui-toast__dismiss" type="button" aria-label={dismissLabel} onClick={onDismiss}>×</button> : null}
    </div>
  );
}

export interface TableColumn<TRow> {
  readonly key: string;
  readonly header: ReactNode;
  readonly render?: ((row: TRow, index: number) => ReactNode) | undefined;
  readonly align?: 'start' | 'center' | 'end' | undefined;
}

export interface TableProps<TRow> {
  readonly columns: readonly TableColumn<TRow>[];
  readonly rows: readonly TRow[];
  readonly caption?: ReactNode | undefined;
  readonly state?: NonDefaultComponentState | undefined;
  readonly stateMessages?: StateMessages | undefined;
  readonly getRowKey?: ((row: TRow, index: number) => string | number) | undefined;
}

export function Table<TRow>({ columns, rows, caption, state, stateMessages, getRowKey }: TableProps<TRow>) {
  const effectiveState: NonDefaultComponentState = state ?? (rows.length === 0 ? 'empty' : 'success');
  const rendersRows = effectiveState === 'success';
  const stateCopy = stateMessages?.[effectiveState];

  return (
    <div className="ui-table-wrap" data-state={effectiveState} aria-busy={effectiveState === 'loading' || undefined}>
      {rendersRows ? (
        <table className="ui-table">
          {caption !== undefined ? <caption>{caption}</caption> : null}
          <thead>
            <tr>{columns.map(column => <th key={column.key} scope="col" data-align={column.align ?? 'start'}>{column.header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(getRowKey?.(row, index) ?? index)}>
                {columns.map(column => <td key={column.key} data-align={column.align ?? 'start'}>{column.render?.(row, index) ?? null}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <StateMessage state={effectiveState} {...(stateCopy ?? {})} />}
    </div>
  );
}

export type PaginationItem = number | 'ellipsis';

export function getPaginationItems(page: number, pageCount: number, maxVisiblePages = 5): PaginationItem[] {
  if (pageCount <= 0) return [];
  if (pageCount <= maxVisiblePages) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const items: PaginationItem[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pageCount - 1, currentPage + 1);
  if (start > 2) items.push('ellipsis');
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < pageCount - 1) items.push('ellipsis');
  items.push(pageCount);
  return items;
}

export interface PaginationProps {
  readonly page: number;
  readonly pageCount: number;
  readonly onPageChange: (page: number) => void;
  readonly previousLabel: string;
  readonly nextLabel: string;
  readonly ariaLabel: string;
  readonly direction?: 'ltr' | 'rtl' | undefined;
  readonly maxVisiblePages?: number | undefined;
}

export function Pagination({ page, pageCount, onPageChange, previousLabel, nextLabel, ariaLabel, direction = 'ltr', maxVisiblePages = 5 }: PaginationProps) {
  if (pageCount <= 0) return null;
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const items = getPaginationItems(currentPage, pageCount, maxVisiblePages);
  const previousSymbol = direction === 'rtl' ? '›' : '‹';
  const nextSymbol = direction === 'rtl' ? '‹' : '›';

  return (
    <nav className="ui-pagination" aria-label={ariaLabel} dir={direction}>
      <Button variant="ghost" size="sm" aria-label={previousLabel} disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>{previousSymbol}</Button>
      <ol className="ui-pagination__pages">
        {items.map((item, index) => item === 'ellipsis'
          ? <li key={`ellipsis-${index}`} className="ui-pagination__ellipsis" aria-hidden="true">…</li>
          : <li key={item}><button className="ui-pagination__page" type="button" aria-current={item === currentPage ? 'page' : undefined} aria-label={String(item)} onClick={() => onPageChange(item)}>{item}</button></li>)}
      </ol>
      <Button variant="ghost" size="sm" aria-label={nextLabel} disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}>{nextSymbol}</Button>
    </nav>
  );
}

export interface PropertyCardFeature {
  readonly label: ReactNode;
  readonly value: ReactNode;
}

export interface PropertyCardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly title: ReactNode;
  readonly location?: ReactNode | undefined;
  readonly price?: ReactNode | undefined;
  readonly source?: ReactNode | undefined;
  readonly image?: ReactNode | undefined;
  readonly imageAlt?: string | undefined;
  readonly mediaOverlay?: ReactNode | undefined;
  readonly badges?: readonly ReactNode[] | undefined;
  readonly features?: readonly PropertyCardFeature[] | undefined;
  readonly href?: string | undefined;
  readonly state?: NonDefaultComponentState | undefined;
  readonly stateMessages?: StateMessages | undefined;
  readonly action?: ReactNode | undefined;
}

export function PropertyCard({
  title,
  location,
  price,
  source,
  image,
  imageAlt,
  mediaOverlay,
  badges,
  features,
  href,
  state,
  stateMessages,
  action,
  className,
  ...articleProps
}: PropertyCardProps) {
  const effectiveState: NonDefaultComponentState = state ?? 'success';
  const stateCopy = stateMessages?.[effectiveState];
  if (effectiveState !== 'success') {
    return (
      <article {...articleProps} className={joinClassNames('ui-property-card', className)} data-state={effectiveState}>
        <StateMessage state={effectiveState} {...(stateCopy ?? {})} />
      </article>
    );
  }

  const titleMarkup = href !== undefined ? <a className="ui-property-card__title" href={href}>{title}</a> : <span className="ui-property-card__title">{title}</span>;
  const mediaProps = imageAlt === undefined ? {} : { 'aria-label': imageAlt };

  return (
    <article {...articleProps} className={joinClassNames('ui-property-card', className)} data-state="success">
      {image !== undefined ? <div className="ui-property-card__media" {...mediaProps}>{image}{mediaOverlay}</div> : <div className="ui-property-card__media ui-property-card__media--empty" aria-hidden="true">{mediaOverlay}</div>}
      <div className="ui-property-card__body">
        {badges !== undefined && badges.length > 0 ? <div className="ui-property-card__badges">{badges.map((badge, index) => <span key={index}>{badge}</span>)}</div> : null}
        <h3>{titleMarkup}</h3>
        {location !== undefined ? <p className="ui-property-card__location">{location}</p> : null}
        {price !== undefined ? <p className="ui-property-card__price">{price}</p> : null}
        {features !== undefined && features.length > 0 ? <dl className="ui-property-card__features">{features.map((feature, index) => <div key={index}><dt>{feature.label}</dt><dd>{feature.value}</dd></div>)}</dl> : null}
        {source !== undefined ? <p className="ui-property-card__source">{source}</p> : null}
        {action !== undefined ? <div className="ui-property-card__action">{action}</div> : null}
      </div>
    </article>
  );
}
