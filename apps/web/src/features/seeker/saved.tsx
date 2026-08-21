import { useEffect, useMemo, useState } from 'react';
import type { FavoriteListData, FavoriteProperty, SupportedLocale } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button, Pagination, PropertyCard, StateMessage } from '../design_system/index.ts';
import type { RouteSession } from '../routing/index.ts';
import { UxStateView } from '../ux_states/index.ts';
import { formatMoney, localizedText, propertyFeatures } from '../public/model.ts';
import { createSeekerFavoriteActions, createSeekerFavoritesLoader, localeForSeekerPath, type SeekerAuthorizationSource, type SeekerFavoriteActions, type SeekerFavoritesLoader } from './data.ts';
import { SeekerNavigation } from './overview.tsx';
import { getSeekerSavedCopy } from './saved-copy.ts';
import './styles.css';

export type SeekerSavedViewState = 'loading' | 'empty' | 'error' | 'retry' | 'success' | 'permission';

export interface SeekerSavedAuthClient extends SeekerAuthorizationSource {
  readonly getSnapshot: () => { readonly status: string };
}

export interface SeekerSavedProps {
  readonly locale: SupportedLocale;
  readonly session: RouteSession;
  readonly authClient?: SeekerSavedAuthClient | undefined;
  readonly apiOrigin?: string | undefined;
  readonly load?: SeekerFavoritesLoader | undefined;
  readonly actions?: SeekerFavoriteActions | undefined;
}

type MutationError = 'unavailable' | 'permission' | 'error';

function stateForError(error: unknown): Exclude<SeekerSavedViewState, 'loading' | 'empty' | 'success'> {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && (error.code === 'NETWORK_ERROR' || error.code === 'ABORTED')) return 'retry';
  return 'error';
}

function mutationErrorFor(error: unknown): MutationError {
  if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) return 'permission';
  if (error instanceof ApiClientError && error.status === 404) return 'unavailable';
  return 'error';
}

function dateLabel(value: string, locale: SupportedLocale): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));
}

function StatePanel({ state, locale, onRetry }: { readonly state: Exclude<SeekerSavedViewState, 'success' | 'empty'>; readonly locale: SupportedLocale; readonly onRetry: () => void }) {
  const copy = getSeekerSavedCopy(locale);
  const message = copy.states[state];
  return (
    <section className="seeker-dashboard__state" data-state={state} aria-label={message.title}>
      <StateMessage state={state} title={message.title} message={message.body} onRetry={state === 'retry' ? onRetry : undefined} retryLabel={copy.retry} />
      {state === 'error' ? <Button variant="secondary" size="sm" onClick={onRetry}>{copy.retry}</Button> : null}
    </section>
  );
}

function SavedPropertyCard({ property, locale, copy, removing, onRemove }: { readonly property: FavoriteProperty; readonly locale: SupportedLocale; readonly copy: ReturnType<typeof getSeekerSavedCopy>; readonly removing: boolean; readonly onRemove: () => void }) {
  const title = localizedText(property.name, locale) ?? property.slug;
  const transaction = property.transactionType === 'sale' ? copy.sale : copy.rent;
  const kind = property.kind === 'property' ? copy.property : copy.unit;
  const href = localeForSeekerPath(locale, `/properties/${property.slug}`);
  const features = propertyFeatures(property, locale, { area: copy.area, bedrooms: copy.bedrooms, bathrooms: copy.bathrooms, floor: copy.floor, sqm: copy.sqm });
  return (
    <PropertyCard
      className="seeker-saved-property-card"
      data-testid={`seeker-saved-property-${property.id}`}
      title={title}
      href={href}
      price={formatMoney(property.price, locale)}
      badges={[kind, transaction]}
      features={features}
      image={<UxStateView state="missing_image" title={copy.imageUnavailable} />}
      imageAlt={copy.imageUnavailable}
      source={<time dateTime={property.savedAt}>{copy.savedAt}: {dateLabel(property.savedAt, locale)}</time>}
      action={(
        <div className="seeker-saved-property-card__actions">
          <a className="seeker-saved-property-card__view" href={href}>{copy.view}</a>
          <Button variant="danger" size="sm" loading={removing} onClick={onRemove}>{removing ? copy.removing : copy.remove}</Button>
        </div>
      )}
    />
  );
}

export function SeekerSaved({ locale, session, authClient, apiOrigin, load, actions }: SeekerSavedProps) {
  const copy = getSeekerSavedCopy(locale);
  const [state, setState] = useState<SeekerSavedViewState>('loading');
  const [data, setData] = useState<FavoriteListData | undefined>();
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [removingId, setRemovingId] = useState<string | undefined>();
  const [mutationError, setMutationError] = useState<MutationError | undefined>();
  const [mutationSuccess, setMutationSuccess] = useState<string | undefined>();
  const loadSource = useMemo(() => load ?? createSeekerFavoritesLoader({ apiOrigin, authorization: authClient }), [apiOrigin, authClient, load]);
  const actionSource = useMemo(() => actions ?? createSeekerFavoriteActions({ apiOrigin, authorization: authClient }), [actions, apiOrigin, authClient]);

  useEffect(() => {
    if (session.status !== 'authenticated') {
      setState('permission');
      return undefined;
    }
    const controller = new AbortController();
    setState('loading');
    void loadSource({ page, limit: 20 }, controller.signal).then(nextData => {
      if (controller.signal.aborted) return;
      setData(nextData);
      setState(nextData.items.length === 0 ? 'empty' : 'success');
    }).catch(error => {
      if (!controller.signal.aborted) setState(stateForError(error));
    });
    return () => controller.abort();
  }, [attempt, loadSource, page, session.status]);

  const remove = async (propertyId: string) => {
    setMutationError(undefined);
    setMutationSuccess(undefined);
    setRemovingId(propertyId);
    try {
      const result = await actionSource.remove(propertyId);
      setMutationSuccess(result.removed ? copy.mutation.removed : copy.mutation.alreadyRemoved);
      setAttempt(value => value + 1);
    } catch (error) {
      setMutationError(mutationErrorFor(error));
    } finally {
      setRemovingId(undefined);
    }
  };

  const mutationMessage = mutationError === undefined ? undefined : copy.mutation[mutationError];
  const pageCount = data === undefined ? 0 : Math.ceil(data.total / data.limit);
  return (
    <section className="seeker-dashboard seeker-saved" data-screen-id="SEK-06" data-route="/seeker/saved">
      <SeekerNavigation locale={locale} activePath="/seeker/saved" />
      <div className="seeker-dashboard__content">
        {state === 'loading' || state === 'retry' || state === 'error' || state === 'permission' ? <StatePanel state={state} locale={locale} onRetry={() => setAttempt(value => value + 1)} /> : null}
        {mutationSuccess ? <p className="seeker-saved__feedback" data-state="success" role="status">{mutationSuccess}</p> : null}
        {mutationMessage ? <p className="seeker-saved__feedback" data-state={mutationError} role="alert">{mutationMessage}</p> : null}
        {(state === 'success' || state === 'empty') && data !== undefined ? (
          <>
            <div className="seeker-dashboard__heading-row">
              <div>
                <p className="seeker-dashboard__eyebrow">{copy.eyebrow}</p>
                <h1>{copy.title}</h1>
                <p>{copy.description}</p>
                <span className="seeker-saved__count">{data.total} {copy.count}</span>
              </div>
            </div>
            {data.items.length === 0 ? (
              <div className="seeker-dashboard__empty" data-state="empty"><h2>{copy.empty.title}</h2><p>{copy.empty.body}</p></div>
            ) : (
              <>
                <div className="seeker-saved__grid" role="list" aria-label={copy.title}>
                  {data.items.map(property => <SavedPropertyCard key={property.id} property={property} locale={locale} copy={copy} removing={removingId === property.id} onRemove={() => { void remove(property.id); }} />)}
                </div>
                <Pagination page={data.page} pageCount={pageCount} onPageChange={nextPage => { setPage(nextPage); setMutationError(undefined); setMutationSuccess(undefined); }} previousLabel={copy.previous} nextLabel={copy.next} ariaLabel={copy.pagination} direction={locale === 'ar' ? 'rtl' : 'ltr'} />
              </>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
