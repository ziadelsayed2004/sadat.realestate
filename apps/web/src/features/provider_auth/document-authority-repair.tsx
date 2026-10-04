import { useState } from 'react';
import type { ProviderApplicationData, SupportedLocale } from '@sadat-real-estate/contracts';
import { Button, Select } from '../design_system/index.ts';
import { getProviderOrganizationCopy } from './organization-copy.ts';

export function DocumentAuthorityRepair({ application, locale, save, onSaved }: {
  readonly application: ProviderApplicationData;
  readonly locale: SupportedLocale;
  readonly save: (patch: { version: number; accountOwnerHasRegisteredAuthority: boolean }) => Promise<ProviderApplicationData>;
  readonly onSaved: (application: ProviderApplicationData) => void;
}) {
  const copy = getProviderOrganizationCopy(locale);
  const [authority, setAuthority] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return <form className="provider-document-repair" onSubmit={event => {
    event.preventDefault();
    if (authority === '' || busy) return;
    setBusy(true);
    setFailed(false);
    void save({ version: application.version, accountOwnerHasRegisteredAuthority: authority === 'true' })
      .then(onSaved).catch(() => setFailed(true)).finally(() => setBusy(false));
  }}>
    <Select label={copy.authorityLabel} value={authority} required disabled={busy}
      onChange={event => setAuthority(event.currentTarget.value)} options={[
        { value: '', label: copy.authorityPlaceholder },
        { value: 'true', label: copy.authorityYes },
        { value: 'false', label: copy.authorityNo }
      ]} />
    {failed ? <p role="alert">{copy.unavailableBody}</p> : null}
    <Button type="submit" loading={busy} disabled={busy || authority === ''}>{copy.saveDraftAction}</Button>
  </form>;
}
