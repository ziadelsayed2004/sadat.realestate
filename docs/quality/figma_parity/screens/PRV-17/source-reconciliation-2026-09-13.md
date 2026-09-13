# PRV-17 source reconciliation — 13 September 2026

The approved desktop export for Figma node `6017:21747`, its canonical 1577×944 frame, and stored responsive metadata for tablet node `6017:121002` and mobile node `6017:119479` were reviewed against the add-customer-request modal. The runtime evidence now uses the actual canonical desktop dimensions instead of a shorter generic viewport that clipped the form footer.

The modal header was aligned to the source title-only composition and its desktop spacing was compacted so the contract-backed form and both actions remain inside the frame. Mobile and tablet retain their dedicated contained modal behavior. The exact provider-customer payload remains: first and last names, phone, optional email/message/property/project/source note, validation, authenticated creation, feedback, and fail-closed mutation handling.

The source also shows separate WhatsApp, request type, preferred contact, priority, follow-up date, responsible agent, and consent controls. Those fields are absent from `providerCustomerPayload`; they were not added as non-persisting controls or mapped onto unrelated fields. PRV-17 remains `PARTIAL_EXTERNAL` until an approved contract and product behavior exist.

Intentional AR/EN desktop baseline update passed 2/2 and final no-update creation/transition verification passed 2/2 at 1577×944. Responsive verification passed at 1024×936 and 402×1560 in AR/EN, including explicit modal containment, validation, and no horizontal overflow. Client build/bundle budget, typecheck, focused lint, and diff checks passed. Strict Figma totals remain 91/119 with 28 open. No Production launch or Demo purge ran.
