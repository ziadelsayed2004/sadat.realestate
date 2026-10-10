import { useState, type FormEvent } from 'react';
import type { SupportedLocale, ViewingData, ViewingTransition } from '@sadat-real-estate/contracts';
import { ApiClientError } from '../contracts/index.ts';
import { Button } from '../design_system/index.ts';
import { egyptInstant, egyptLocalDateTime, EGYPT_TIME_ZONE, egyptTimeLabel } from '../public/egypt-time.ts';
import { viewingHelp } from './viewing-help.tsx';

export function ViewingActions({ item, locale, save }: { readonly item: ViewingData; readonly locale: SupportedLocale; readonly save: (input: ViewingTransition) => Promise<unknown> }) {
  const copy = viewingHelp(locale);
  const initialDate = item.requestedAt ? egyptLocalDateTime(new Date(item.requestedAt)) : '';
  const [action, setAction] = useState<ViewingTransition['action']>('confirm');
  const [date, setDate] = useState(initialDate.slice(0, 10));
  const [time, setTime] = useState(initialDate.slice(11, 16));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const actions = (item.availableActions ?? []).filter(value => Boolean(item.requestedAt) || !['confirm', 'complete'].includes(value));
  const currentAction = actions.includes(action) ? action : actions[0];
  const appointment = date && time ? egyptInstant(`${date}T${time}`) : undefined;
  const id = `admin-viewing-${item.id}`;
  const feedbackView = feedback ? <p className="admin-viewing__feedback" data-error={feedback.error} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p> : null;
  if (!actions.length) return <div className="admin-viewing__notice">{feedbackView}<p>{['completed', 'cancelled'].includes(item.status) ? copy.closed : copy.permission}</p></div>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !currentAction || !actions.includes(currentAction)) return;
    if (reason.trim().length < 5 || reason.trim().length > 500) { setFeedback({ text: copy.reasonError, error: true }); return; }
    const now = new Date();
    if (currentAction === 'reschedule' && (!appointment || appointment <= now || appointment.getTime() > now.getTime() + 366 * 86400000)) { setFeedback({ text: copy.dateError, error: true }); return; }
    setBusy(true); setFeedback(undefined);
    try {
      await save({ action: currentAction, expectedVersion: item.version, reason: reason.trim(),
        ...(currentAction === 'reschedule' && appointment ? { requestedAt: appointment.toISOString(), timezone: EGYPT_TIME_ZONE } : {})
      });
      setReason(''); setFeedback({ text: copy.saved, error: false });
    } catch (error) {
      setFeedback({ text: error instanceof ApiClientError && error.status === 409 ? copy.conflict
        : error instanceof ApiClientError && (error.status === 401 || error.status === 403) ? copy.permission
          : error instanceof ApiClientError && error.status === 400 && currentAction === 'reschedule' ? copy.dateError : copy.failed, error: true });
    } finally { setBusy(false); }
  }

  return <form className="admin-requests__actions admin-viewing__actions" onSubmit={event => { void submit(event); }}>
    <fieldset disabled={busy}><legend>{copy.actionTitle}</legend><div className="admin-viewing__choices">
      {actions.map(value => <label className="admin-viewing__choice" key={value} data-selected={currentAction === value}>
        <input type="radio" name={`${id}-action`} value={value} checked={currentAction === value} onChange={() => { setAction(value); setFeedback(undefined); }} />
        <span><strong>{copy.actions[value]}</strong><small>{copy.actionHelp[value]}</small></span>
      </label>)}
    </div></fieldset>
    {currentAction === 'reschedule' ? <div className="admin-viewing__new-time">
      <label htmlFor={`${id}-date`}>{copy.date}<input id={`${id}-date`} type="date" required value={date} onChange={event => setDate(event.currentTarget.value)} disabled={busy} /></label>
      <label htmlFor={`${id}-time`}>{copy.clock}<input id={`${id}-time`} type="time" required value={time} onChange={event => setTime(event.currentTarget.value)} disabled={busy} /></label>
      <p>{appointment ? egyptTimeLabel(locale, appointment) : copy.dateError}</p>
    </div> : null}
    <label htmlFor={`${id}-reason`}>{copy.reason}<textarea id={`${id}-reason`} aria-describedby={`${id}-reason-hint`} required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.currentTarget.value)} disabled={busy} placeholder={copy.reasonPlaceholder} /></label>
    <p className="admin-viewing__field-hint" id={`${id}-reason-hint`}>{copy.reasonHint}</p>
    <Button type="submit" loading={busy} disabled={busy || !currentAction}>{currentAction ? copy.actions[currentAction] : copy.actionTitle}</Button>
    {feedbackView}
  </form>;
}
