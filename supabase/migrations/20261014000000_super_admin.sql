-- =============================================================================
-- Lukas · panel de super admin
-- - Privacidad: el super admin ya no lee listas, tareas, historial ni
--   pendientes de hogares a los que no pertenece.
-- - Funciones admin_*: administrar hogares y miembros sin ver su contenido.
--   Todas verifican is_super_admin() y hacen cada acción en una transacción.
-- =============================================================================

-- Privacidad -------------------------------------------------------------------
drop policy lists_select on public.lists;
create policy lists_select on public.lists for select to authenticated
  using (public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id)));
drop policy tasks_select on public.tasks;
create policy tasks_select on public.tasks for select to authenticated
  using (public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id)));
drop policy events_select on public.task_events;
create policy events_select on public.task_events for select to authenticated
  using (public.is_member(household_id));
drop policy todos_select on public.household_todos;
create policy todos_select on public.household_todos for select to authenticated
  using (public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id)));

/** Restaurar: admin del hogar o quien la borró ("Deshacer"). */
create or replace function public.restore_task(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid; v_by uuid;
begin
  select household_id, deleted_by into hh, v_by from public.tasks where id = p_task for update;
  if not found then raise exception 'task_not_found' using errcode = 'P0002'; end if;
  if not (public.is_admin(hh) or (v_by = auth.uid() and public.is_member(hh))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.tasks set deleted_at = null, deleted_by = null, updated_at = now() where id = p_task;
end $$;

-- Panel -------------------------------------------------------------------------
create function public._require_super_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
end $$;
revoke all on function public._require_super_admin() from public, anon, authenticated;

/** Hogares con sus miembros y cuántas tareas tiene asignadas cada uno. Sin contenido de tareas. */
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public._require_super_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', h.id, 'name', h.name, 'emoji', h.emoji, 'timezone', h.timezone,
      'disabled', h.disabled_at is not null,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'user_id', m.user_id, 'name', p.display_name, 'emoji', p.avatar_emoji, 'role', m.role,
          'tasks', (
            select count(*) from public.tasks t
            where t.household_id = h.id and t.deleted_at is null and t.completed_at is null
              and ((t.assignment_mode = 'fixed' and t.current_assignee_id = m.user_id)
                or exists (select 1 from public.task_rotation r where r.task_id = t.id and r.user_id = m.user_id))
          )
        ) order by m.joined_at)
        from public.household_members m join public.profiles p on p.id = m.user_id
        where m.household_id = h.id
      ), '[]'::jsonb)
    ) order by h.created_at)
    from public.households h where h.deleted_at is null
  ), '[]'::jsonb);
end $$;

/** Hogar para otra persona: el super admin no queda como miembro. */
create function public.admin_create_household(p_name text, p_emoji text, p_timezone text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public._require_super_admin();
  insert into public.households (name, emoji, timezone, created_by)
    values (p_name, coalesce(nullif(p_emoji, ''), '🏡'), coalesce(nullif(p_timezone, ''), 'America/Costa_Rica'), auth.uid())
    returning id into v_id;
  insert into public.lists (household_id, name, emoji, position) values (v_id, 'General', '📌', 0);
  return v_id;
end $$;

/** Enlace de admin para un hogar (el token lo genera el servidor; aquí llega su hash). */
create function public.admin_create_invitation(p_household uuid, p_token_hash text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_super_admin();
  insert into public.invitations (kind, household_id, token_hash, role, invited_by)
    values ('household', p_household, p_token_hash, 'admin', auth.uid());
end $$;

create function public.admin_set_role(p_household uuid, p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_super_admin();
  update public.household_members set role = p_role where household_id = p_household and user_id = p_user;
  if not found then raise exception 'not_member' using errcode = 'P0002'; end if;
end $$;

/**
 * Quitar a alguien del hogar. p_tasks decide qué pasa con sus tareas fijas:
 * 'delete' (borrado lógico), 'reassign' (a p_to) o 'anyone'. En rotaciones
 * solo sale del turno; si la rotación queda vacía, la tarea pasa a "Cualquiera".
 */
create function public.admin_remove_member(p_household uuid, p_user uuid, p_tasks text, p_to uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  perform public._require_super_admin();
  if not exists (select 1 from public.household_members where household_id = p_household and user_id = p_user) then
    raise exception 'not_member' using errcode = 'P0002';
  end if;
  if p_tasks not in ('delete', 'reassign', 'anyone') then raise exception 'invalid_target' using errcode = '22023'; end if;
  if p_tasks = 'reassign' and (p_to is null or p_to = p_user or not exists (
    select 1 from public.household_members where household_id = p_household and user_id = p_to
  )) then
    raise exception 'invalid_target' using errcode = '22023';
  end if;

  -- tareas fijas
  if p_tasks = 'delete' then
    update public.tasks set deleted_at = now(), deleted_by = auth.uid(), updated_at = now()
      where household_id = p_household and deleted_at is null and assignment_mode = 'fixed' and current_assignee_id = p_user;
  elsif p_tasks = 'reassign' then
    update public.tasks set current_assignee_id = p_to, updated_at = now()
      where household_id = p_household and deleted_at is null and assignment_mode = 'fixed' and current_assignee_id = p_user;
  else
    update public.tasks set assignment_mode = 'anyone', current_assignee_id = null, updated_at = now()
      where household_id = p_household and deleted_at is null and assignment_mode = 'fixed' and current_assignee_id = p_user;
  end if;

  -- rotaciones: sale del turno
  for t in
    select tk.id, tk.current_assignee_id from public.tasks tk
    join public.task_rotation r on r.task_id = tk.id and r.user_id = p_user
    where tk.household_id = p_household
  loop
    if t.current_assignee_id = p_user then
      update public.tasks set current_assignee_id = public._next_in_rotation(t.id, p_user) where id = t.id;
    end if;
    delete from public.task_rotation where task_id = t.id and user_id = p_user;
    -- renumerar 0..n-1 (primero a negativos para no chocar con unique(task_id, position))
    update public.task_rotation set position = -position - 1 where task_id = t.id;
    update public.task_rotation r set position = n.pos
      from (select user_id, row_number() over (order by position desc) - 1 as pos from public.task_rotation where task_id = t.id) n
      where r.task_id = t.id and r.user_id = n.user_id;
    if not exists (select 1 from public.task_rotation where task_id = t.id) then
      update public.tasks set assignment_mode = 'anyone', current_assignee_id = null, updated_at = now() where id = t.id;
    elsif (select current_assignee_id from public.tasks where id = t.id) = p_user then
      -- era la única persona además de sí misma: el turno queda en quien sigue
      update public.tasks set current_assignee_id = (select user_id from public.task_rotation where task_id = t.id order by position limit 1)
        where id = t.id;
    end if;
  end loop;

  delete from public.household_members where household_id = p_household and user_id = p_user;
end $$;

create function public.admin_set_household_disabled(p_household uuid, p_disabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public._require_super_admin();
  update public.households set disabled_at = case when p_disabled then now() end where id = p_household;
  if not found then raise exception 'not_member' using errcode = 'P0002'; end if;
end $$;

revoke execute on function
  public.admin_overview(), public.admin_create_household(text, text, text), public.admin_create_invitation(uuid, text),
  public.admin_set_role(uuid, uuid, text), public.admin_remove_member(uuid, uuid, text, uuid),
  public.admin_set_household_disabled(uuid, boolean)
from public, anon;
grant execute on function
  public.admin_overview(), public.admin_create_household(text, text, text), public.admin_create_invitation(uuid, text),
  public.admin_set_role(uuid, uuid, text), public.admin_remove_member(uuid, uuid, text, uuid),
  public.admin_set_household_disabled(uuid, boolean)
to authenticated;
