-- Pruebas de RLS y funciones de dominio. Cada bloque actúa como un usuario
-- (role authenticated + request.jwt.claim.sub). Falla con la primera aserción rota.
\set ON_ERROR_STOP 1
\set a '00000000-0000-0000-0000-0000000000a1'
\set m '00000000-0000-0000-0000-0000000000b2'
\set x '00000000-0000-0000-0000-0000000000c3'

insert into auth.users (id, email) values (:'a', 'andres@example.com'), (:'m', 'mari@example.com'), (:'x', 'otra@example.com');
-- el perfil lo crea el trigger de auth.users; aquí solo se le pone nombre y emoji
update public.profiles set display_name = 'Andrés', avatar_emoji = '🌵' where id = :'a';
update public.profiles set display_name = 'Mari', avatar_emoji = '🌸' where id = :'m';
update public.profiles set display_name = 'Otra', avatar_emoji = '🦊' where id = :'x';

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
  -- "Deshacer": quien la borró la puede restaurar aunque no sea admin
  perform public.restore_task((select v from ids where k = 'basura'));
  assert (select count(*) from public.tasks) = 1, 'quien la borró la restaura';
  perform public.delete_task((select v from ids where k = 'basura'));
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

-- Suscripciones push: cada quien solo ve las suyas ------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (:'m', 'https://push.example/mari', 'k', 'a');
do $$ begin
  begin insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000a1', 'https://push.example/x', 'k', 'a');
    raise exception 'debió fallar';
  exception when insufficient_privilege then null; end;
end $$;
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin assert (select count(*) from public.push_subscriptions) = 0, 'Andrés no ve las suscripciones de Mari'; end $$;
commit;
-- el registro admite el mismo aviso por los dos canales, pero no repetido por canal
insert into public.notification_log (user_id, kind, occurrence_key, channel) values (:'m', 'due', 'basura:1', 'push'), (:'m', 'due', 'basura:1', 'telegram');
do $$ begin
  begin insert into public.notification_log (user_id, kind, occurrence_key, channel) values ('00000000-0000-0000-0000-0000000000b2', 'due', 'basura:1', 'push');
    raise exception 'debió fallar';
  exception when unique_violation then null; end;
end $$;

\echo 'SQL push: todas las aserciones pasaron'

-- Cuentas (20261013000000_accounts.sql) ----------------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d4', 'nuevo@example.com', '{"display_name":"Nuevo"}'),
  ('00000000-0000-0000-0000-0000000000e5', 'sinnombre.largo@example.com', null);
do $$ begin
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000d4') = 'Nuevo', 'perfil con el nombre del registro';
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-0000000000e5') = 'sinnombre.largo', 'perfil con la parte local del correo';
end $$;

-- Un miembro no restaura lo que borró otra persona
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
insert into public.tasks (household_id, emoji, title, schedule_type, schedule, created_by)
  select v, '🧽', 'Lavar trastes', 'interval', '{"every":1,"unit":"day"}', :'a' from ids where k = 'casa'
  returning id as trastes \gset
insert into ids values ('trastes', :'trastes');
select public.delete_task(:'trastes');
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$ begin
  begin perform public.restore_task((select v from ids where k = 'trastes')); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'miembro no restaura lo de otro: ' || sqlerrm; end;
end $$;
commit;

-- Pendientes: borrar y restaurar (solo miembros)
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
insert into public.household_todos (household_id, text, created_by)
  select v, 'Colgar la repisa', :'m' from ids where k = 'casa'
  returning id as repisa \gset
insert into ids values ('repisa', :'repisa');
select public.delete_todo(:'repisa');
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin
  begin perform public.restore_todo((select v from ids where k = 'repisa')); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'otro hogar no restaura: ' || sqlerrm; end;
end $$;
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
select public.restore_todo(:'repisa');
do $$ begin assert (select deleted_at from public.household_todos where id = (select v from ids where k = 'repisa')) is null, 'pendiente restaurado'; end $$;
commit;

\echo 'SQL cuentas: todas las aserciones pasaron'
