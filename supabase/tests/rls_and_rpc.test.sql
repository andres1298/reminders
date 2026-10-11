-- Pruebas de RLS y funciones de dominio. Cada bloque actúa como un usuario
-- (role authenticated + request.jwt.claim.sub). Falla con la primera aserción rota.
\set ON_ERROR_STOP 1
\set a '00000000-0000-0000-0000-0000000000a1'
\set m '00000000-0000-0000-0000-0000000000b2'
\set x '00000000-0000-0000-0000-0000000000c3'

insert into auth.users (id, email) values (:'a', 'andres@example.com'), (:'m', 'mari@example.com'), (:'x', 'otra@example.com');
insert into public.profiles (id, display_name, avatar_emoji) values (:'a', 'Andrés', '🌵'), (:'m', 'Mari', '🌸'), (:'x', 'Otra', '🦊');

create temp table ids (k text primary key, v uuid);
grant all on ids to authenticated;

-- Andrés crea "Casa" e invita a Mari ------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
insert into ids values ('casa', public.create_household('Casa'));
insert into public.invitations (kind, household_id, token_hash, invited_by)
  select 'household', v, 'hash-mari', :'a' from ids where k = 'casa';
commit;

begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$ begin assert public.accept_invitation('hash-mari') = (select v from ids where k = 'casa'), 'Mari entra a Casa'; end $$;
do $$ begin
  begin perform public.accept_invitation('hash-mari'); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'invalid_invitation', 'invitación de un solo uso: ' || sqlerrm; end;
end $$;
commit;

-- Otra persona tiene su propio hogar ------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
insert into ids values ('otra', public.create_household('Otra casa'));
commit;

-- Tarea con rotación [Andrés, Mari] -------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
insert into public.tasks (household_id, emoji, title, schedule_type, schedule, due_time, assignment_mode,
                          current_assignee_id, cycle_started_at, next_due_at, created_by)
  select v, '🗑️', 'Sacar la basura', 'weekly', '{"weekdays":[2,4],"everyWeeks":1}', '19:00', 'rotation',
         :'a', '2026-10-08 19:00-06', '2026-10-13 19:00-06', :'a'
  from ids where k = 'casa'
  returning id as basura \gset
insert into ids values ('basura', :'basura');
insert into public.task_rotation (task_id, user_id, position) values (:'basura', :'a', 0), (:'basura', :'m', 1);
commit;

-- Mari la completa sin elegir quién: crédito para Andrés, el turno pasa a Mari --
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$
declare e public.task_events; t public.tasks;
begin
  e := public.complete_task((select v from ids where k = 'basura'), '2026-10-13 19:00-06', '2026-10-15 19:00-06');
  assert e.credited_to = '00000000-0000-0000-0000-0000000000a1', 'crédito por defecto al responsable';
  assert e.assignee_at_time = '00000000-0000-0000-0000-0000000000a1', 'le tocaba a Andrés';
  select * into t from public.tasks where id = e.task_id;
  assert t.current_assignee_id = '00000000-0000-0000-0000-0000000000b2', 'el turno pasa a Mari';
  assert t.next_due_at = '2026-10-15 19:00-06', 'próximo jueves';
  -- tocar "Hecha" otra vez sobre la misma ocurrencia (Telegram: "Ya estaba hecha")
  begin perform public.complete_task(e.task_id, '2026-10-13 19:00-06', '2026-10-15 19:00-06'); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'already_done', 'doble completado: ' || sqlerrm; end;
  -- deshacer
  perform public.undo_last_event(e.task_id);
  select * into t from public.tasks where id = e.task_id;
  assert t.current_assignee_id = '00000000-0000-0000-0000-0000000000a1', 'deshacer devuelve el turno';
  assert t.next_due_at = '2026-10-13 19:00-06', 'deshacer devuelve el vencimiento';
  -- "La hizo alguien más": Mari
  e := public.complete_task(e.task_id, '2026-10-13 19:00-06', '2026-10-15 19:00-06', '00000000-0000-0000-0000-0000000000b2');
  assert e.credited_to = '00000000-0000-0000-0000-0000000000b2', 'crédito elegido';
  -- crédito a alguien que no es del hogar
  begin perform public.complete_task(e.task_id, '2026-10-15 19:00-06', '2026-10-20 19:00-06', '00000000-0000-0000-0000-0000000000c3'); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'credit_not_member', 'crédito ajeno: ' || sqlerrm; end;
end $$;
-- no se guarda quién tocó "Hecha"
do $$ begin
  assert not exists (select 1 from information_schema.columns where table_name = 'task_events' and column_name = 'actor_id'), 'sin actor_id';
end $$;
commit;

-- Aislamiento: otra persona no ve ni toca "Casa" -----------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin
  assert (select count(*) from public.tasks) = 0, 'no ve tareas ajenas';
  assert (select count(*) from public.households) = 1, 'solo ve su hogar';
  assert (select count(*) from public.task_events) = 0, 'no ve eventos ajenos';
  begin perform public.complete_task((select v from ids where k = 'basura'), '2026-10-15 19:00-06', null); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'completar ajena: ' || sqlerrm; end;
end $$;
commit;

-- Borrado lógico y Papelera ------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$ begin
  perform public.delete_task((select v from ids where k = 'basura'));
  assert (select count(*) from public.tasks) = 0, 'borrada desaparece para el miembro';
  begin perform public.restore_task((select v from ids where k = 'basura')); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'miembro no restaura: ' || sqlerrm; end;
end $$;
commit;

begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin
  assert (select count(*) from public.tasks where deleted_at is not null) = 1, 'el admin la ve en la Papelera';
  perform public.restore_task((select v from ids where k = 'basura'));
end $$;
delete from public.tasks;  -- sin política DELETE: no borra nada
commit;
do $$ begin assert (select count(*) from public.tasks where deleted_at is null) = 1, 'nada se borra definitivamente'; end $$;

-- Último admin no puede salir ---------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin
  begin delete from public.household_members where user_id = auth.uid(); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'last_admin', 'último admin: ' || sqlerrm; end;
end $$;
commit;

-- Pendientes de casa ------------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
insert into public.household_todos (household_id, text, emoji, created_by)
  select v, 'Cambiar el bombillo del pasillo', '💡', :'m' from ids where k = 'casa';
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin assert (select count(*) from public.household_todos) = 1, 'Andrés ve el pendiente'; end $$;
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin assert (select count(*) from public.household_todos) = 0, 'Otra no lo ve'; end $$;
commit;

-- Anónimos no ejecutan funciones de dominio --------------------------------------
begin;
set local role anon;
do $$ begin
  begin perform public.create_household('x'); raise exception 'debió fallar';
  exception when insufficient_privilege then null; end;
end $$;
commit;

\echo 'SQL: todas las aserciones pasaron'
