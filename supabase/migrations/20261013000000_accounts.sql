-- =============================================================================
-- Lukas · cuentas (fase 2a)
-- - El perfil se crea solo al crear el usuario (registro por invitación o
--   "Add user" en el dashboard).
-- - "Deshacer" un borrado: quien borró una tarea la puede restaurar aunque no
--   sea admin; los pendientes se restauran con restore_todo.
-- =============================================================================

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)), 40)
  )
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

/** Restaurar: admin del hogar, super admin o quien la borró ("Deshacer"). */
create or replace function public.restore_task(p_task uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid; v_by uuid;
begin
  select household_id, deleted_by into hh, v_by from public.tasks where id = p_task for update;
  if not found then raise exception 'task_not_found' using errcode = 'P0002'; end if;
  if not (public.is_admin(hh) or public.is_super_admin() or (v_by = auth.uid() and public.is_member(hh))) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.tasks set deleted_at = null, deleted_by = null, updated_at = now() where id = p_task;
end $$;

create function public.restore_todo(p_todo uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid;
begin
  select household_id into hh from public.household_todos where id = p_todo and deleted_at is not null for update;
  if not found then raise exception 'todo_not_found' using errcode = 'P0002'; end if;
  if not public.is_member(hh) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.household_todos set deleted_at = null, deleted_by = null where id = p_todo;
end $$;

revoke execute on function public.restore_todo(uuid) from public, anon;
grant execute on function public.restore_todo(uuid) to authenticated;
