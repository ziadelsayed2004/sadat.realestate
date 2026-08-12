# State Machines

## Provider Application

`draft -> pending_review -> needs_information -> pending_review -> approved | rejected`. An authorized, audited action may move `approved -> suspended`.

## Project and Property

`draft -> pending_review -> needs_changes -> pending_review -> approved -> published`, or `rejected`. A published item may become `hidden` or `archived`. Editing a published item creates a revision and does not replace the public version before approval.

## Request

Base flow: `new -> contacted -> follow_up -> viewing -> interested | negotiation -> completed | closed`. Each request type defines its allowed transitions; undefined jumps are rejected.

## Advertising Request

`draft -> review -> waiting_pricing -> quote_sent -> waiting_payment -> scheduled -> active -> ended`, with rejected, cancelled, or expired states where required.

## Payment Proof

`uploaded -> pending_review -> approved | rejected`. Uploaded does not mean approved payment.

## Account

`draft/unverified -> pending_review -> needs_information -> verified | rejected`, and an authorized action may move `verified -> restricted | suspended -> verified`.

## Commission Resolution

Resolve in this order: active exception, active account override, active default policy. Store policy, version, source, and effectiveAt in a snapshot at the approved commercial event.
