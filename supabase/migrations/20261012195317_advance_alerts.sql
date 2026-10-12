-- Anticipos opcionales; la recurrencia sigue calculándose en schedule.ts.
alter table public.tasks add column alert_minutes integer
  check (alert_minutes in (15, 30, 60, 120, 1440, 2880, 4320));
alter table public.household_todos add column due_at timestamptz,
  add column alert_minutes integer check (alert_minutes in (15, 30, 60, 120, 1440, 2880, 4320)),
  add constraint todo_alert_needs_date check (alert_minutes is null or due_at is not null);
create index household_todos_alert_due on public.household_todos (due_at)
  where deleted_at is null and done_at is null and alert_minutes is not null;
