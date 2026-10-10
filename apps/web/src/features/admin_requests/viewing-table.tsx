import { useState } from 'react';
import type { SupportedLocale, ViewingListData, ViewingTransition } from '@sadat-real-estate/contracts';
import { Button, Modal } from '../design_system/index.ts';
import { useAdminAttentionRead } from '../routing/admin-attention.tsx';
import { EGYPT_TIME_ZONE } from '../public/egypt-time.ts';
import type { AdminRequestsCopy } from './copy.ts';
import { ViewingActions } from './viewing-actions.tsx';
import { viewingHelp } from './viewing-help.tsx';

type Props = { readonly save: (id: string, input: ViewingTransition) => Promise<unknown>; readonly copy: AdminRequestsCopy; readonly locale: SupportedLocale };

function ViewingRow({ item, copy, locale, save }: Props & { readonly item: ViewingListData['items'][number] }) {
  const [open, setOpen] = useState(false);
  useAdminAttentionRead('viewing-requests', open ? item.id : undefined, item.updatedAt);
  const help = viewingHelp(locale);
  const name = item.property?.name[locale] ?? item.property?.name.en ?? item.property?.name.ar ?? help.unnamed;
  const customer = item.customerName ?? help.unavailable;
  const date = (value: string | undefined) => value ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: EGYPT_TIME_ZONE }).format(new Date(value)) : (locale === 'ar' ? 'الموعد لم يُحدد بعد' : 'To be arranged');
  const propertyLink = item.property?.slug ? `/properties/${item.property.slug}?lang=${locale}` : `/admin/properties/${item.propertyId}?lang=${locale}`;
  const badge = <span className="admin-requests__badge" data-tone={item.status === 'confirmed' || item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'neutral' : 'warning'}>{help.statuses[item.status]}</span>;
  return <tr data-testid={`admin-viewing-${item.id}`}>
    <td><a href={propertyLink} target="_blank" rel="noopener noreferrer">{name}</a>{item.property?.publicCode ? <small>{item.property.publicCode}</small> : null}</td>
    <td>{customer}</td><td>{date(item.requestedAt)}<small>{help.time}</small></td><td>{badge}</td>
    <td><Button size="sm" variant="secondary" onClick={() => setOpen(true)}>{help.open}</Button>
      {open ? <Modal open className="admin-requests__detail-modal admin-viewing__modal" title={help.details} closeLabel={copy.closeDetails} onClose={() => setOpen(false)}>
        <div className="admin-viewing__summary">{badge}<p>{help.stateHelp[item.status]}</p></div>
        <dl className="admin-viewing__facts">
          <div><dt>{copy.property}</dt><dd><a href={propertyLink} target="_blank" rel="noopener noreferrer">{name}</a>{item.property?.publicCode ? <small>{item.property.publicCode}</small> : null}</dd></div>
          <div><dt>{help.customer}</dt><dd>{customer}{item.customerPhone ? <a href={item.customerContactMethod === 'whatsapp' ? `https://wa.me/${item.customerPhone.slice(1)}` : `tel:${item.customerPhone}`}>{item.customerContactMethod === 'whatsapp' ? 'WhatsApp: ' : ''}{item.customerPhone}</a> : null}</dd></div>
          <div className="admin-viewing__appointment"><dt>{help.proposed}</dt><dd><strong>{date(item.requestedAt)}</strong><small>{help.time}</small></dd></div>
        </dl>
        {item.requestedAt && ['requested', 'rescheduled'].includes(item.status) && new Date(item.requestedAt) < new Date() ? <p className="admin-viewing__notice">{help.past}</p> : null}
        {item.note ? <section className="admin-viewing__customer-note"><h3>{locale === 'ar' ? 'ملاحظة العميل' : 'Customer note'}</h3><p>{item.note}</p></section> : null}
        {item.providerId ? <p><a href={`/admin/users/${item.providerId}?lang=${locale}`}>{locale === 'ar' ? 'عرض حساب مقدّم العقار' : 'Open property provider account'}</a></p> : null}
        <ViewingActions item={item} locale={locale} save={async input => { await save(item.id, input); if (input.action === 'confirm') setOpen(false); }} />
        <details className="admin-viewing__record"><summary>{help.technical}</summary><dl className="admin-requests__details">
          <div><dt>{copy.requestId}</dt><dd><bdi>{item.id}</bdi></dd></div><div><dt>{copy.seeker}</dt><dd><bdi>{item.seekerId}</bdi></dd></div>
          <div><dt>{copy.created}</dt><dd>{date(item.createdAt)}</dd></div><div><dt>{copy.updated}</dt><dd>{date(item.updatedAt)}</dd></div>
        </dl></details>
      </Modal> : null}
    </td>
  </tr>;
}

export function ViewingTable({ data, ...props }: Props & { readonly data: ViewingListData }) {
  const help = viewingHelp(props.locale);
  return <div className="admin-requests__table-wrap"><table className="admin-requests__table admin-viewing__table">
    <thead><tr>{[props.copy.property, help.customer, props.copy.appointment, props.copy.status, props.copy.actions].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
    <tbody>{data.items.map(item => <ViewingRow key={item.id} item={item} {...props} />)}</tbody>
  </table></div>;
}
