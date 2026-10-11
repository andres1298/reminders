-- =============================================================================
-- Lukas · notificaciones push (SPEC v0.8 §4.9)
-- Cada dispositivo donde la persona activa las notificaciones guarda una
-- suscripción Web Push. El envío lo hace la ruta /api/cron/notifications
-- (Next.js, service role), disparada cada minuto por pg_cron.
-- =============================================================================

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
-- cada quien ve, agrega y borra solo sus dispositivos
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- preferencia por canal
alter table public.notification_prefs add column push boolean not null default true;
alter table public.notification_prefs add column telegram boolean not null default true;

-- el registro distingue el canal: un aviso por persona, tipo, ocurrencia y canal
alter table public.notification_log add column channel text not null default 'telegram'
  check (channel in ('telegram', 'push'));
alter table public.notification_log drop constraint notification_log_user_id_kind_occurrence_key_key;
alter table public.notification_log add constraint notification_log_once
  unique (user_id, kind, occurrence_key, channel);
