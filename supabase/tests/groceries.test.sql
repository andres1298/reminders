-- Lista de compras (20261015000000_groceries.sql). Corre en la misma sesión que
-- los archivos anteriores: reutiliza a, m (Casa), x (Otra), s (super admin) e ids.
\set ON_ERROR_STOP 1
\set a '00000000-0000-0000-0000-0000000000a1'
\set m '00000000-0000-0000-0000-0000000000b2'
\set x '00000000-0000-0000-0000-0000000000c3'
\set s '00000000-0000-0000-0000-0000000000f6'
\set g1 '00000000-0000-0000-0000-0000000000d1'
\set g2 '00000000-0000-0000-0000-0000000000d2'
\set g3 '00000000-0000-0000-0000-0000000000d3'
\set g4 '00000000-0000-0000-0000-0000000000d4'

-- Mari agrega leche; solo Casa la ve ---------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
do $$ begin
  assert public.add_grocery('00000000-0000-0000-0000-0000000000d1', (select v from ids where k = 'casa'), 'Leche', 'leche', 'dairy', '2', null)
    = '00000000-0000-0000-0000-0000000000d1', 'devuelve el id nuevo';
end $$;
commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin assert (select count(*) from public.grocery_items) = 0, 'otro hogar no la ve'; end $$; commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'s';
do $$ begin assert (select count(*) from public.grocery_items) = 0, 'el super admin no la ve'; end $$; commit;
begin; set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin assert (select count(*) from public.grocery_items) = 1, 'Andrés la ve'; end $$; commit;

-- El mismo nombre (otra mayúscula) no duplica ----------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'a';
do $$ begin
  assert public.add_grocery('00000000-0000-0000-0000-0000000000d2', (select v from ids where k = 'casa'), 'LECHE', 'leche', 'dairy', null, null)
    = '00000000-0000-0000-0000-0000000000d1', 'mismo artículo';
  assert (select count(*) from public.grocery_items) = 1, 'sin duplicado';
  assert (select quantity from public.grocery_items) is null, 'cantidad nueva';
end $$;
commit;

-- Alguien de otro hogar no agrega a Casa -----------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin
  begin perform public.add_grocery(gen_random_uuid(), (select v from ids where k = 'casa'), 'Pan', 'pan', 'bakery', null, null);
    raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'otro hogar: ' || sqlerrm; end;
end $$;
commit;

-- Terminar compra: solo lo tachado ----------------------------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
select public.add_grocery(:'g3', v, 'Pan', 'pan', 'bakery', null, null) from ids where k = 'casa';
update public.grocery_items set checked_at = now() where id = :'g1';
do $$ begin
  assert public.finish_shopping((select v from ids where k = 'casa')) = 1, 'una comprada';
end $$;
commit;
do $$ begin
  assert (select on_list from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1') = false, 'leche sale de la lista';
  assert (select times_bought from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'cuenta la compra';
  assert (select last_bought_at from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1') is not null, 'fecha de compra';
  assert (select on_list from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d3') = true, 'pan sigue en la lista';
end $$;

-- Borrar del historial y deshacer (miembro no admin) -----------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
select public.set_grocery_deleted(:'g1', true);
do $$ begin assert not exists (select 1 from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1'), 'Mari ya no la ve'; end $$;
select public.set_grocery_deleted(:'g1', false);
do $$ begin assert exists (select 1 from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1'), 'vuelve con Deshacer'; end $$;
commit;
begin;
set local role authenticated; set local request.jwt.claim.sub = :'x';
do $$ begin
  begin perform public.set_grocery_deleted('00000000-0000-0000-0000-0000000000d1', true); raise exception 'debió fallar';
  exception when others then assert sqlerrm = 'forbidden', 'otro hogar no borra: ' || sqlerrm; end;
end $$;
commit;

-- Un artículo borrado reaparece al escribirlo de nuevo ---------------------------------------
begin;
set local role authenticated; set local request.jwt.claim.sub = :'m';
select public.set_grocery_deleted(:'g1', true);
do $$ begin
  assert public.add_grocery('00000000-0000-0000-0000-0000000000d4', (select v from ids where k = 'casa'), 'Leché', 'leche', 'dairy', null, null)
    = '00000000-0000-0000-0000-0000000000d1', 'reaparece el mismo';
  assert (select deleted_at from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1') is null, 'ya no está borrado';
  assert (select times_bought from public.grocery_items where id = '00000000-0000-0000-0000-0000000000d1') = 1, 'conserva el historial';
end $$;
commit;

\echo 'SQL lista de compras: todas las aserciones pasaron'
