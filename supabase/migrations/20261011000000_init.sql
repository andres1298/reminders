-- =============================================================================
-- Lukas · esquema inicial (SPEC v0.7 §7)
--
-- Principios:
--   * Nada se borra: borrar = deleted_at (borrado lógico). No hay políticas DELETE
--     sobre datos del hogar; borrar/restaurar pasa por funciones.
--   * Nunca se guarda qué cuenta tocó "Hecha": task_events no tiene actor_id.
--   * La recurrencia se calcula en TypeScript (src/lib/schedule.ts). Las funciones
--     de aquí reciben el próximo vencimiento ya calculado y hacen el cambio de
--     forma atómica (bloqueo de fila + verificación de la ocurrencia esperada).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  display_name   text not null check (char_length(display_name) between 1 and 40),
  avatar_emoji   text not null default '🙂',
  avatar_url     text,
  locale         text not null default 'es' check (locale in ('es', 'en')),
  theme          text not null default 'system' check (theme in ('light', 'dark', 'system')),
  is_super_admin boolean not null default false,
  disabled_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table public.households (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 40),
  emoji          text not null default '🏡',
  timezone       text not null default 'America/Costa_Rica',
  vacation_from  timestamptz,
  vacation_until timestamptz,
  created_by     uuid not null references public.profiles (id),
  disabled_at    timestamptz,
  deleted_at     timestamptz,
  created_at     timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id),
  user_id      uuid not null references public.profiles (id),
  role         text not null default 'member' check (role in ('admin', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (household_id, user_id)
);
create index on public.household_members (user_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('household', 'platform')),
  household_id uuid references public.households (id),
  token_hash   text not null unique,
  role         text check (role in ('admin', 'member')),
  invited_by   uuid not null references public.profiles (id),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_by  uuid references public.profiles (id),
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now(),
  check ((kind = 'household') = (household_id is not null))
);

create table public.lists (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  name         text not null check (char_length(name) between 1 and 40),
  emoji        text not null default '📌',
  color        text,
  position     integer not null default 0,
  deleted_at   timestamptz,
  deleted_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index on public.lists (household_id) where deleted_at is null;

create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid not null references public.households (id),
  list_id             uuid references public.lists (id),
  emoji               text not null,
  title               text not null check (char_length(title) between 1 and 60),
  description         text check (char_length(description) <= 500),
  schedule_type       text not null check (schedule_type in ('interval', 'weekly', 'monthly', 'once')),
  schedule            jsonb not null,
  anchor              text not null default 'schedule' check (anchor in ('completion', 'schedule')),
  due_time            time not null default '09:00',
  starts_on           date not null default current_date,
  ends_on             date,
  color               text,
  assignment_mode     text not null default 'anyone' check (assignment_mode in ('anyone', 'fixed', 'rotation')),
  current_assignee_id uuid references public.profiles (id),
  cycle_started_at    timestamptz not null default now(),
  next_due_at         timestamptz,
  completed_at        timestamptz,
  paused_at           timestamptz,
  paused_by           uuid references public.profiles (id),
  deleted_at          timestamptz,
  deleted_by          uuid references public.profiles (id),
  created_by          uuid not null references public.profiles (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check ((assignment_mode = 'anyone') = (current_assignee_id is null))
);
create index tasks_due_idx on public.tasks (next_due_at)
  where deleted_at is null and paused_at is null and completed_at is null;
create index on public.tasks (household_id) where deleted_at is null;

create table public.task_rotation (
  task_id  uuid not null references public.tasks (id) on delete cascade,
  user_id  uuid not null references public.profiles (id),
  position integer not null,
  primary key (task_id, user_id),
  unique (task_id, position)
);

-- Intencionalmente SIN actor_id: no se guarda la cuenta que tocó "Hecha".
create table public.task_events (
  id                    uuid primary key default gen_random_uuid(),
  task_id               uuid not null references public.tasks (id),
  household_id          uuid not null references public.households (id),
  kind                  text not null check (kind in ('done', 'skipped', 'snoozed', 'missed', 'undone')),
  assignee_at_time      uuid references public.profiles (id),   -- NULL = "Cualquiera"
  credited_to           uuid references public.profiles (id),   -- 'done': elegido o responsable; NULL = Hogar
  due_at_snapshot       timestamptz,
  snoozed_until         timestamptz,
  -- estado previo, para "Deshacer"
  prev_next_due_at      timestamptz,
  prev_cycle_started_at timestamptz,
  prev_assignee_id      uuid references public.profiles (id),
  undoes_event_id       uuid references public.task_events (id),
  undone_at             timestamptz,
  created_at            timestamptz not null default now()
);
create index on public.task_events (task_id, created_at desc);
create index on public.task_events (household_id, created_at desc);

-- Pendientes de casa (SPEC §4.13): sin fecha ni repetición.
create table public.household_todos (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  text         text not null check (char_length(text) between 1 and 80),
  emoji        text not null default '📝',
  assignee_id  uuid references public.profiles (id),        -- NULL = Cualquiera
  soon         boolean not null default false,
  done_at      timestamptz,
  deleted_at   timestamptz,
  deleted_by   uuid references public.profiles (id),
  created_by   uuid not null references public.profiles (id),
  created_at   timestamptz not null default now()
);
create index on public.household_todos (household_id) where deleted_at is null;

create table public.api_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id),
  name         text not null check (char_length(name) between 1 and 40),
  token_hash   text not null unique,
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  revoked_at   timestamptz
);

create table public.telegram_links (
  user_id   uuid primary key references public.profiles (id),
  chat_id   bigint not null unique,
  username  text,
  linked_at timestamptz not null default now()
);

create table public.telegram_link_codes (
  code_hash  text primary key,
  user_id    uuid not null references public.profiles (id),
  expires_at timestamptz not null,
  used_at    timestamptz
);

create table public.telegram_messages (
  chat_id        bigint not null,
  message_id     bigint not null,
  task_id        uuid not null references public.tasks (id),
  occurrence_key text not null,
  sent_at        timestamptz not null default now(),
  primary key (chat_id, message_id)
);

create table public.notification_prefs (
  user_id      uuid primary key references public.profiles (id),
  per_task     boolean not null default true,
  daily_digest boolean not null default true,
  digest_time  time not null default '07:00',
  quiet_start  time,
  quiet_end    time
);

create table public.notification_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id),
  task_id        uuid references public.tasks (id),
  kind           text not null check (kind in ('due', 'digest')),
  occurrence_key text not null,
  sent_at        timestamptz not null default now(),
  unique (user_id, kind, occurrence_key)
);

-- ---------------------------------------------------------------------------
-- Ayudantes de permisos (SECURITY DEFINER para no recursar en RLS)
-- ---------------------------------------------------------------------------
create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_super_admin and p.disabled_at is null
                   from public.profiles p where p.id = auth.uid()), false)
$$;

create function public.is_member(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.household_members m
    join public.households h on h.id = m.household_id
    join public.profiles p on p.id = m.user_id
    where m.household_id = hh and m.user_id = auth.uid()
      and h.disabled_at is null and h.deleted_at is null and p.disabled_at is null
  )
$$;

create function public.is_admin(hh uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_member(hh) and exists (
    select 1 from public.household_members m
    where m.household_id = hh and m.user_id = auth.uid() and m.role = 'admin'
  )
$$;

create function public.shares_household(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.household_members a
    join public.household_members b on b.household_id = a.household_id
    where a.user_id = auth.uid() and b.user_id = other
  )
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.households          enable row level security;
alter table public.household_members   enable row level security;
alter table public.invitations         enable row level security;
alter table public.lists               enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_rotation       enable row level security;
alter table public.task_events         enable row level security;
alter table public.household_todos     enable row level security;
alter table public.api_tokens          enable row level security;
alter table public.telegram_links      enable row level security;
alter table public.telegram_link_codes enable row level security;  -- solo service role
alter table public.telegram_messages   enable row level security;  -- solo service role
alter table public.notification_prefs  enable row level security;
alter table public.notification_log    enable row level security;  -- solo service role

-- profiles: uno mismo, quienes comparten hogar y el super admin
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_household(id) or public.is_super_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- households: se crean con create_household(); se editan si eres admin
create policy households_select on public.households for select to authenticated
  using (public.is_member(id) or public.is_super_admin());
create policy households_update on public.households for update to authenticated
  using (public.is_admin(id)) with check (public.is_admin(id));

-- household_members: ver a los del hogar; administrar si eres admin
create policy members_select on public.household_members for select to authenticated
  using (public.is_member(household_id) or public.is_super_admin());
create policy members_admin_update on public.household_members for update to authenticated
  using (public.is_admin(household_id)) with check (public.is_admin(household_id));
create policy members_admin_delete on public.household_members for delete to authenticated
  using (public.is_admin(household_id) or user_id = auth.uid());

-- invitations: admins del hogar (las de plataforma, el super admin)
create policy invitations_select on public.invitations for select to authenticated
  using (case when kind = 'household' then public.is_admin(household_id) else public.is_super_admin() end);
create policy invitations_insert on public.invitations for insert to authenticated
  with check (invited_by = auth.uid() and
    case when kind = 'household' then public.is_admin(household_id) else public.is_super_admin() end);
create policy invitations_update on public.invitations for update to authenticated
  using (case when kind = 'household' then public.is_admin(household_id) else public.is_super_admin() end);

-- lists / tasks / todos: miembros leen lo no borrado; admins (Papelera) también lo borrado
create policy lists_select on public.lists for select to authenticated
  using ((public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id))) or public.is_super_admin());
create policy lists_insert on public.lists for insert to authenticated
  with check (public.is_member(household_id) and deleted_at is null);
create policy lists_update on public.lists for update to authenticated
  using (public.is_member(household_id) and deleted_at is null)
  with check (public.is_member(household_id) and deleted_at is null);

create policy tasks_select on public.tasks for select to authenticated
  using ((public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id))) or public.is_super_admin());
create policy tasks_insert on public.tasks for insert to authenticated
  with check (public.is_member(household_id) and created_by = auth.uid() and deleted_at is null and paused_at is null);
-- Editar campos de la tarea. Completar, pausar y borrar van por funciones.
create policy tasks_update on public.tasks for update to authenticated
  using (public.is_member(household_id) and deleted_at is null)
  with check (public.is_member(household_id) and deleted_at is null);

create policy rotation_select on public.task_rotation for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_member(t.household_id)));
create policy rotation_write on public.task_rotation for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and public.is_member(t.household_id)))
  with check (exists (select 1 from public.tasks t where t.id = task_id and public.is_member(t.household_id))
              and public.is_member((select t.household_id from public.tasks t where t.id = task_id)));

create policy events_select on public.task_events for select to authenticated
  using (public.is_member(household_id) or public.is_super_admin());

create policy todos_select on public.household_todos for select to authenticated
  using ((public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id))) or public.is_super_admin());
create policy todos_insert on public.household_todos for insert to authenticated
  with check (public.is_member(household_id) and created_by = auth.uid() and deleted_at is null);
create policy todos_update on public.household_todos for update to authenticated
  using (public.is_member(household_id) and deleted_at is null)
  with check (public.is_member(household_id) and deleted_at is null);

-- datos personales: solo el dueño
create policy api_tokens_own on public.api_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy telegram_links_own on public.telegram_links for select to authenticated
  using (user_id = auth.uid());
create policy telegram_links_unlink on public.telegram_links for delete to authenticated
  using (user_id = auth.uid());
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Funciones de dominio (atómicas, validan membresía)
-- ---------------------------------------------------------------------------

/** Crea un hogar y deja a quien lo crea como admin. */
create function public.create_household(p_name text, p_emoji text default '🏡', p_timezone text default 'America/Costa_Rica')
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.households (name, emoji, timezone, created_by)
    values (p_name, p_emoji, p_timezone, auth.uid()) returning id into v_id;
  insert into public.household_members (household_id, user_id, role) values (v_id, auth.uid(), 'admin');
  return v_id;
end $$;

-- Bloquea la tarea y verifica que el usuario es miembro.
create function public._lock_task(p_task uuid) returns public.tasks
language plpgsql security definer set search_path = '' as $$
declare t public.tasks;
begin
  select * into t from public.tasks where id = p_task for update;
  if not found or t.deleted_at is not null then raise exception 'task_not_found' using errcode = 'P0002'; end if;
  if not public.is_member(t.household_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return t;
end $$;
revoke all on function public._lock_task(uuid) from public;

-- Siguiente persona en la rotación.
create function public._next_in_rotation(p_task uuid, p_current uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  with r as (select user_id, position from public.task_rotation where task_id = p_task),
       cur as (select coalesce((select position from r where user_id = p_current), -1) as pos)
  select coalesce(
    (select user_id from r, cur where r.position > cur.pos order by r.position limit 1),
    (select user_id from r order by position limit 1)
  )
$$;
revoke all on function public._next_in_rotation(uuid, uuid) from public;

/**
 * "✅ Hecha" / "🙋 La hizo alguien más".
 * p_expected_due: el vencimiento que la persona estaba viendo; si ya cambió,
 *   la ocurrencia ya fue completada (o saltada) y se responde 'already_done'.
 * p_next_due: próximo vencimiento calculado en TypeScript (NULL = tarea "Una vez").
 * p_credited_to: quién la hizo; NULL = el responsable (o Hogar si es "Cualquiera").
 */
create function public.complete_task(
  p_task uuid, p_expected_due timestamptz, p_next_due timestamptz, p_credited_to uuid default null
) returns public.task_events language plpgsql security definer set search_path = '' as $$
declare t public.tasks; e public.task_events;
begin
  t := public._lock_task(p_task);
  if t.completed_at is not null or t.next_due_at is distinct from p_expected_due then
    raise exception 'already_done' using errcode = 'P0001';
  end if;
  if t.paused_at is not null then raise exception 'task_paused' using errcode = 'P0001'; end if;
  if p_credited_to is not null and not exists (
    select 1 from public.household_members where household_id = t.household_id and user_id = p_credited_to
  ) then raise exception 'credit_not_member' using errcode = '22023'; end if;

  insert into public.task_events (task_id, household_id, kind, assignee_at_time, credited_to, due_at_snapshot,
                                  prev_next_due_at, prev_cycle_started_at, prev_assignee_id)
  values (t.id, t.household_id, 'done', t.current_assignee_id, coalesce(p_credited_to, t.current_assignee_id),
          t.next_due_at, t.next_due_at, t.cycle_started_at, t.current_assignee_id)
  returning * into e;

  update public.tasks set
    cycle_started_at    = now(),
    next_due_at         = p_next_due,
    completed_at        = case when p_next_due is null then now() end,
    current_assignee_id = case when assignment_mode = 'rotation'
                               then public._next_in_rotation(id, current_assignee_id)
                               else current_assignee_id end,
    updated_at          = now()
  where id = t.id;
  return e;
end $$;

/** "Saltar esta vez": avanza sin completado (cuenta como "sin hacer" para el responsable). */
create function public.skip_task(p_task uuid, p_expected_due timestamptz, p_next_due timestamptz)
returns public.task_events language plpgsql security definer set search_path = '' as $$
declare t public.tasks; e public.task_events;
begin
  t := public._lock_task(p_task);
  if t.next_due_at is distinct from p_expected_due then raise exception 'already_done' using errcode = 'P0001'; end if;
  if p_next_due is null then raise exception 'cannot_skip_once' using errcode = '22023'; end if;
  insert into public.task_events (task_id, household_id, kind, assignee_at_time, due_at_snapshot,
                                  prev_next_due_at, prev_cycle_started_at, prev_assignee_id)
  values (t.id, t.household_id, 'skipped', t.current_assignee_id, t.next_due_at,
          t.next_due_at, t.cycle_started_at, t.current_assignee_id)
  returning * into e;
  update public.tasks set cycle_started_at = greatest(now(), t.next_due_at), next_due_at = p_next_due, updated_at = now()
  where id = t.id;
  return e;
end $$;

/** "Posponer": nuevo vencimiento; el ciclo no se reinicia. */
create function public.snooze_task(p_task uuid, p_until timestamptz)
returns public.task_events language plpgsql security definer set search_path = '' as $$
declare t public.tasks; e public.task_events;
begin
  t := public._lock_task(p_task);
  if p_until <= now() then raise exception 'snooze_in_past' using errcode = '22023'; end if;
  insert into public.task_events (task_id, household_id, kind, assignee_at_time, due_at_snapshot, snoozed_until,
                                  prev_next_due_at, prev_cycle_started_at, prev_assignee_id)
  values (t.id, t.household_id, 'snoozed', t.current_assignee_id, t.next_due_at, p_until,
          t.next_due_at, t.cycle_started_at, t.current_assignee_id)
  returning * into e;
  update public.tasks set next_due_at = p_until,
    cycle_started_at = least(cycle_started_at, now()), updated_at = now()
  where id = t.id;
  return e;
end $$;

/** "Deshacer": revierte el último completado, salto o pospuesto que no se haya deshecho. */
create function public.undo_last_event(p_task uuid)
returns public.task_events language plpgsql security definer set search_path = '' as $$
declare t public.tasks; last public.task_events; e public.task_events;
begin
  t := public._lock_task(p_task);
  select * into last from public.task_events
    where task_id = t.id and kind in ('done', 'skipped', 'snoozed') and undone_at is null
    order by created_at desc limit 1;
  if not found then raise exception 'nothing_to_undo' using errcode = 'P0002'; end if;

  update public.tasks set
    next_due_at = last.prev_next_due_at, cycle_started_at = last.prev_cycle_started_at,
    current_assignee_id = last.prev_assignee_id, completed_at = null, updated_at = now()
  where id = t.id;
  update public.task_events set undone_at = now() where id = last.id;
  insert into public.task_events (task_id, household_id, kind, undoes_event_id)
    values (t.id, t.household_id, 'undone', last.id) returning * into e;
  return e;
end $$;

/** Pausar / reanudar (solo desde Gestionar). Al reanudar, p_next_due viene de TypeScript. */
create function public.set_task_paused(p_task uuid, p_paused boolean, p_next_due timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.tasks;
begin
  t := public._lock_task(p_task);
  if p_paused then
    update public.tasks set paused_at = now(), paused_by = auth.uid(), updated_at = now() where id = t.id;
  else
    if p_next_due is null then raise exception 'next_due_required' using errcode = '22023'; end if;
    update public.tasks set paused_at = null, paused_by = null, next_due_at = p_next_due,
      cycle_started_at = now(), updated_at = now() where id = t.id;
  end if;
end $$;

/** Borrado lógico de una tarea (cualquier miembro) y restauración (admin, desde la Papelera). */
create function public.delete_task(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare t public.tasks;
begin
  t := public._lock_task(p_task);
  update public.tasks set deleted_at = now(), deleted_by = auth.uid(), updated_at = now() where id = t.id;
end $$;

create function public.restore_task(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid;
begin
  select household_id into hh from public.tasks where id = p_task for update;
  if not found then raise exception 'task_not_found' using errcode = 'P0002'; end if;
  if not (public.is_admin(hh) or public.is_super_admin()) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.tasks set deleted_at = null, deleted_by = null, updated_at = now() where id = p_task;
end $$;

create function public.delete_todo(p_todo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid;
begin
  select household_id into hh from public.household_todos where id = p_todo and deleted_at is null for update;
  if not found then raise exception 'todo_not_found' using errcode = 'P0002'; end if;
  if not public.is_member(hh) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.household_todos set deleted_at = now(), deleted_by = auth.uid() where id = p_todo;
end $$;

/** Aceptar una invitación (el hash del token lo calcula el servidor). */
create function public.accept_invitation(p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare inv public.invitations;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select * into inv from public.invitations where token_hash = p_token_hash for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'invalid_invitation' using errcode = 'P0001';
  end if;
  update public.invitations set accepted_by = auth.uid(), accepted_at = now() where id = inv.id;
  if inv.kind = 'household' then
    insert into public.household_members (household_id, user_id, role)
      values (inv.household_id, auth.uid(), coalesce(inv.role, 'member'))
      on conflict (household_id, user_id) do nothing;
  end if;
  return inv.household_id;
end $$;

-- Todo hogar conserva al menos un admin.
create function public._keep_one_admin() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'DELETE' or new.role <> 'admin') and old.role = 'admin' and not exists (
    select 1 from public.household_members
    where household_id = old.household_id and role = 'admin' and user_id <> old.user_id
  ) then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end $$;
create trigger keep_one_admin before update or delete on public.household_members
  for each row execute function public._keep_one_admin();

-- ---------------------------------------------------------------------------
-- Permisos de ejecución: solo usuarios autenticados
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.is_super_admin(), public.is_member(uuid), public.is_admin(uuid), public.shares_household(uuid),
  public.create_household(text, text, text),
  public.complete_task(uuid, timestamptz, timestamptz, uuid),
  public.skip_task(uuid, timestamptz, timestamptz),
  public.snooze_task(uuid, timestamptz),
  public.undo_last_event(uuid),
  public.set_task_paused(uuid, boolean, timestamptz),
  public.delete_task(uuid), public.restore_task(uuid), public.delete_todo(uuid),
  public.accept_invitation(text)
to authenticated;
