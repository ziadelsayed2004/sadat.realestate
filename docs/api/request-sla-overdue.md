# Request SLA and Overdue Read Model

Requests receive a server-owned default due date (48 hours after creation). Administrative overdue reads derive a bounded read model at request time, include only non-terminal requests whose due date has elapsed, and return deterministic overdue seconds. No client can set or clear the due date, and the read is idempotent; no fabricated job metrics or state mutations are introduced.
