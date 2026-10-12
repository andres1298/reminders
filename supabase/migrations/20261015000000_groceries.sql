-- =============================================================================
-- Lukas · lista de compras (Súper)
-- Cada fila es un artículo del historial del hogar y lleva su estado en la
-- lista actual (on_list, cantidad, nota, tachado). Borrar del historial es
-- lógico: si se vuelve a escribir el mismo nombre (name_key), reaparece.
-- =============================================================================

create table public.grocery_items (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid not null references public.households (id),
  name           text not null check (char_length(name) between 1 and 60),
  name_key       text not null check (char_length(name_key) between 1 and 60),  -- minúsculas, sin tildes (lo calcula la app)
  category       text not null default 'other' check (category in
                   ('produce', 'bakery', 'dairy', 'meat', 'pantry', 'drinks', 'frozen', 'cleaning', 'hygiene', 'pets', 'other')),
  on_list        boolean not null default false,
  quantity       text check (char_length(quantity) <= 20),
  note           text check (char_length(note) <= 80),
  checked_at     timestamptz,
  times_bought   integer not null default 0,
  last_bought_at timestamptz,
  deleted_at     timestamptz,
  deleted_by     uuid references public.profiles (id),
  created_by     uuid not null references public.profiles (id),
  created_at     timestamptz not null default now(),
  unique (household_id, name_key)
);
create index on public.grocery_items (household_id) where deleted_at is null;

alter table public.grocery_items enable row level security;
-- miembros leen lo no borrado (admins también lo borrado); sin acceso del super admin; sin DELETE
create policy groceries_select on public.grocery_items for select to authenticated
  using (public.is_member(household_id) and (deleted_at is null or public.is_admin(household_id)));
create policy groceries_insert on public.grocery_items for insert to authenticated
  with check (public.is_member(household_id) and deleted_at is null);
create policy groceries_update on public.grocery_items for update to authenticated
  using (public.is_member(household_id) and deleted_at is null)
  with check (public.is_member(household_id) and deleted_at is null);

/** Agregar a la lista: crea el artículo o, si ya existe (aunque esté borrado), lo trae de vuelta. */
create function public.add_grocery(
  p_id uuid, p_household uuid, p_name text, p_name_key text, p_category text, p_quantity text, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_member(p_household) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into public.grocery_items (id, household_id, name, name_key, category, on_list, quantity, note, created_by)
    values (p_id, p_household, p_name, p_name_key, p_category, true, nullif(p_quantity, ''), nullif(p_note, ''), auth.uid())
  on conflict (household_id, name_key) do update set
    name = excluded.name, category = excluded.category, on_list = true, checked_at = null,
    quantity = excluded.quantity, note = excluded.note, deleted_at = null, deleted_by = null
  returning id into v_id;
  return v_id;
end $$;

/** Terminar compra: lo tachado sale de la lista y cuenta como comprado. */
create function public.finish_shopping(p_household uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if not public.is_member(p_household) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.grocery_items set
    on_list = false, checked_at = null, quantity = null, note = null,
    times_bought = times_bought + 1, last_bought_at = now()
  where household_id = p_household and on_list and checked_at is not null and deleted_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

/** Borrar del historial (y "Deshacer"). Va por función porque la lectura oculta lo borrado a quien no es admin. */
create function public.set_grocery_deleted(p_id uuid, p_deleted boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare hh uuid;
begin
  select household_id into hh from public.grocery_items where id = p_id for update;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
  if not public.is_member(hh) then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.grocery_items set
    deleted_at = case when p_deleted then now() end,
    deleted_by = case when p_deleted then auth.uid() end,
    on_list = case when p_deleted then false else on_list end,
    checked_at = case when p_deleted then null else checked_at end
  where id = p_id;
end $$;

revoke execute on function
  public.add_grocery(uuid, uuid, text, text, text, text, text), public.finish_shopping(uuid), public.set_grocery_deleted(uuid, boolean)
from public, anon;
grant execute on function
  public.add_grocery(uuid, uuid, text, text, text, text, text), public.finish_shopping(uuid), public.set_grocery_deleted(uuid, boolean)
to authenticated;
