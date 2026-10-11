-- Panel de super admin (20261014000000_super_admin.sql). Corre después de
-- rls_and_rpc.test.sql: reutiliza sus usuarios (a, m, x) y la tabla temporal ids.
\set ON_ERROR_STOP 1
\set a '00000000-0000-0000-0000-0000000000a1'
\set m '00000000-0000-0000-0000-0000000000b2'
\set x '00000000-0000-0000-0000-0000000000c3'
\set s '00000000-0000-0000-0000-0000000000f6'
\set y '00000000-0000-0000-0000-0000000000a7'
\set z '00000000-0000-0000-0000-0000000000a8'

insert into auth.users (id, email) values (:'s', 'super@example.com'), (:'y', 'y@example.com'), (:'z', 'z@example.com');
update public.profiles set is_super_admin = true where id = :'s';

-- Privacidad: el super admin no lee tareas, listas, historial ni pendientes ajenos ------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'super no lee tareas ajenas';
  assert (select count(*) from public.lists) = 0, 'super no lee listas ajenas';
  assert (select count(*) from public.task_events) = 0, 'super no lee historial ajeno';
  assert (select count(*) from public.household_todos) = 0, 'super no lee pendientes ajenos';
  begin perform public.restore_task((select v from ids where k = 'trastes')); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'super no restaura: ' || sqlerrm; end;
end $$;
commit;

-- Nadie más usa las funciones admin_* ------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$ begin
  begin perform public.admin_overview(); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'miembro no ve el panel: ' || sqlerrm; end;
  begin perform public.admin_create_household('x', '🏡', 'America/Costa_Rica'); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'miembro no crea hogares: ' || sqlerrm; end;
end $$;
commit;

-- Crear un hogar para otra persona ----------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
insert into ids values ('mama', public.admin_create_household('Casa de mamá', '🏡', 'America/Costa_Rica'));
select public.admin_create_invitation(v, 'hash-mama-x') from ids where k = 'mama';
commit;
do $$ begin
  assert not exists (select 1 from public.household_members
    where household_id = (select v from ids where k = 'mama') and user_id = '00000000-0000-0000-0000-0000000000f6'), 'super no es miembro';
  assert exists (select 1 from public.lists
    where household_id = (select v from ids where k = 'mama') and name = 'General' and position = 0), 'lista General';
end $$;

begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
select public.accept_invitation('hash-mama-x');
-- x (admin) invita a y y a z como miembros
insert into public.invitations (kind, household_id, token_hash, role, invited_by)
  select 'household', v, h, 'member', :'x' from ids, (values ('hash-mama-y'), ('hash-mama-z')) t(h) where k = 'mama';
commit;
do $$ begin
  assert (select role from public.household_members
    where household_id = (select v from ids where k = 'mama') and user_id = '00000000-0000-0000-0000-0000000000c3') = 'admin', 'entra como admin';
end $$;
begin; set local role authenticated; set local request.jwt.claim.sub = :'y'; select public.accept_invitation('hash-mama-y'); commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'z'; select public.accept_invitation('hash-mama-z'); commit;

-- El panel ve personas y conteos, no títulos ----------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
do $$
declare o jsonb := public.admin_overview(); h jsonb;
begin
  select e into h from jsonb_array_elements(o) e where e ->> 'name' = 'Casa de mamá';
  assert h is not null, 'el panel ve Casa de mamá';
  assert (h ->> 'disabled')::boolean = false, 'activo';
  assert jsonb_array_length(h -> 'members') = 3, 'tres miembros';
  assert position('title' in o::text) = 0, 'sin títulos de tareas';
end $$;
commit;

-- Tareas de y en Casa de mamá ---------------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
insert into public.tasks (id, household_id, emoji, title, schedule_type, schedule, assignment_mode, current_assignee_id, created_by)
  select t.id::uuid, v, '🧽', t.title, 'interval', '{"every":1,"unit":"day"}', t.mode, t.who::uuid, :'x'
  from ids, (values
    ('00000000-0000-0000-0000-00000000f001', 'Fija 1', 'fixed', :'y'),
    ('00000000-0000-0000-0000-00000000f002', 'Fija 2', 'fixed', :'y'),
    ('00000000-0000-0000-0000-00000000e001', 'Rota y z', 'rotation', :'y'),
    ('00000000-0000-0000-0000-00000000e002', 'Rota solo y', 'rotation', :'y')
  ) t(id, title, mode, who)
  where k = 'mama';
insert into public.task_rotation (task_id, user_id, position) values
  ('00000000-0000-0000-0000-00000000e001', :'y', 0), ('00000000-0000-0000-0000-00000000e001', :'z', 1),
  ('00000000-0000-0000-0000-00000000e002', :'y', 0);
commit;

-- Quitar a y: destino inválido no quita a nadie ---------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
do $$ begin
  begin perform public.admin_remove_member((select v from ids where k = 'mama'), '00000000-0000-0000-0000-0000000000a7', 'reassign', '00000000-0000-0000-0000-0000000000a7');
    raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'invalid_target', 'reasignar a sí misma: ' || sqlerrm; end;
  begin perform public.admin_remove_member((select v from ids where k = 'mama'), '00000000-0000-0000-0000-0000000000a7', 'reassign', '00000000-0000-0000-0000-0000000000a1');
    raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'invalid_target', 'reasignar a alguien de otro hogar: ' || sqlerrm; end;
end $$;
commit;
do $$ begin
  assert exists (select 1 from public.household_members
    where household_id = (select v from ids where k = 'mama') and user_id = '00000000-0000-0000-0000-0000000000a7'), 'y sigue en el hogar';
end $$;

-- Quitar a y pasando sus tareas a z ----------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
select public.admin_remove_member(v, :'y', 'reassign', :'z') from ids where k = 'mama';
commit;
do $$
declare z uuid := '00000000-0000-0000-0000-0000000000a8';
begin
  assert (select count(*) from public.tasks where id in ('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000f002')
          and current_assignee_id = z) = 2, 'fijas pasan a z';
  assert (select array_agg(user_id::text || ':' || position order by position) from public.task_rotation
          where task_id = '00000000-0000-0000-0000-00000000e001') = array[z::text || ':0'], 'rotación queda [z] en posición 0';
  assert (select current_assignee_id from public.tasks where id = '00000000-0000-0000-0000-00000000e001') = z, 'el turno pasa a z';
  assert (select assignment_mode from public.tasks where id = '00000000-0000-0000-0000-00000000e002') = 'anyone', 'rotación vacía → Cualquiera';
  assert (select current_assignee_id from public.tasks where id = '00000000-0000-0000-0000-00000000e002') is null, 'sin responsable';
  assert not exists (select 1 from public.task_rotation where task_id = '00000000-0000-0000-0000-00000000e002'), 'sin filas de rotación';
  assert not exists (select 1 from public.household_members
    where household_id = (select v from ids where k = 'mama') and user_id = '00000000-0000-0000-0000-0000000000a7'), 'y ya no es miembro';
end $$;

-- Quitar a y borrando sus tareas, y luego a "Cualquiera" ------------------------------------
create or replace function pg_temp.rejoin_y(token text, task uuid) returns void language plpgsql as $$
begin
  insert into public.invitations (kind, household_id, token_hash, role, invited_by)
    select 'household', v, token, 'member', '00000000-0000-0000-0000-0000000000c3' from ids where k = 'mama';
  insert into public.household_members (household_id, user_id) select v, '00000000-0000-0000-0000-0000000000a7' from ids where k = 'mama';
  insert into public.tasks (id, household_id, emoji, title, schedule_type, schedule, assignment_mode, current_assignee_id, created_by)
    select task, v, '🧽', 'Otra fija', 'interval', '{"every":1,"unit":"day"}', 'fixed', '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000c3'
    from ids where k = 'mama';
end $$;
select pg_temp.rejoin_y('hash-y2', '00000000-0000-0000-0000-00000000f003');
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
select public.admin_remove_member(v, :'y', 'delete') from ids where k = 'mama';
commit;
do $$ begin
  assert (select deleted_at from public.tasks where id = '00000000-0000-0000-0000-00000000f003') is not null, 'borrada (lógico)';
end $$;
select pg_temp.rejoin_y('hash-y3', '00000000-0000-0000-0000-00000000f004');
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
select public.admin_remove_member(v, :'y', 'anyone') from ids where k = 'mama';
commit;
do $$ begin
  assert (select assignment_mode from public.tasks where id = '00000000-0000-0000-0000-00000000f004') = 'anyone', 'pasa a Cualquiera';
end $$;

-- Roles: no se queda sin admin --------------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
do $$ begin
  begin perform public.admin_remove_member((select v from ids where k = 'mama'), '00000000-0000-0000-0000-0000000000c3', 'anyone');
    raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'last_admin', 'último admin: ' || sqlerrm; end;
end $$;
select public.admin_set_role(v, :'z', 'admin') from ids where k = 'mama';
select public.admin_remove_member(v, :'x', 'anyone') from ids where k = 'mama';
commit;
do $$ begin
  assert (select role from public.household_members
    where household_id = (select v from ids where k = 'mama') and user_id = '00000000-0000-0000-0000-0000000000a8') = 'admin', 'z es admin';
end $$;

-- Desactivar y reactivar ----------------------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
select public.admin_set_household_disabled(v, true) from ids where k = 'mama';
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'z';
do $$ begin assert (select count(*) from public.households where id = (select v from ids where k = 'mama')) = 0, 'desactivado: z no lo ve'; end $$;
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'s';
select public.admin_set_household_disabled(v, false) from ids where k = 'mama';
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'z';
do $$ begin assert (select count(*) from public.households where id = (select v from ids where k = 'mama')) = 1, 'reactivado: z lo ve'; end $$;
commit;

\echo 'SQL super admin: todas las aserciones pasaron'
