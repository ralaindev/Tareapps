begin;

create schema cloud_private;
revoke all on schema cloud_private from public, anon, authenticated;

create table public.boards (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null check (name = pg_catalog.btrim(name) and pg_catalog.char_length(name) between 1 and 120),
  created_at timestamptz not null default pg_catalog.now()
);

create table public.board_members (
  board_id uuid not null references public.boards(id),
  user_id uuid not null references auth.users(id),
  active boolean not null default true,
  primary key (board_id, user_id)
);

create table public.tasks (
  id uuid primary key,
  board_id uuid not null references public.boards(id),
  title text not null check (title = pg_catalog.btrim(title, E' \t\n\r\f\013') and pg_catalog.char_length(title) between 1 and 120),
  description text not null default '' check (pg_catalog.char_length(description) <= 2000),
  status text not null check (status in ('pending', 'in_progress', 'done')),
  version bigint not null default 1 check (version > 0),
  deleted_at timestamptz,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now()
);
create index tasks_board_id_idx on public.tasks(board_id, id);

create table cloud_private.task_operations (
  actor_id uuid not null references auth.users(id),
  operation_id uuid not null,
  payload jsonb not null,
  result jsonb not null,
  primary key (actor_id, operation_id)
);
alter table cloud_private.task_operations enable row level security;
revoke all on cloud_private.task_operations from public, anon, authenticated;

-- No recursión RLS: esta función consulta membresía como propietario de la función.
-- Solo responde sobre el usuario de la sesión; no acepta un actor del cliente.
create function public.cloud_is_member(p_board_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.board_members m
    where m.board_id = p_board_id and m.user_id = auth.uid() and m.active
  );
$$;

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.tasks enable row level security;
create policy boards_member_read on public.boards for select to authenticated
  using (public.cloud_is_member(id));
create policy members_member_read on public.board_members for select to authenticated
  using (public.cloud_is_member(board_id));
create policy tasks_member_read on public.tasks for select to authenticated
  using (public.cloud_is_member(board_id));

revoke all on public.boards, public.board_members, public.tasks from public, anon, authenticated;
grant select on public.boards, public.board_members, public.tasks to authenticated;

create function public.cloud_create_board(p_name text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_board uuid;
begin
  if v_actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  insert into public.boards(owner_id, name) values (v_actor, pg_catalog.btrim(p_name)) returning id into v_board;
  insert into public.board_members(board_id, user_id) values (v_board, v_actor);
  return v_board;
end;
$$;

-- Alta/reactivación y revocación. El propietario es inmutable en este experimento.
create function public.cloud_set_member(p_board_id uuid, p_user_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_owner uuid;
begin
  -- Todas las mutaciones del tablero adquieren este mismo lock antes de comprobar acceso.
  select b.owner_id into v_owner from public.boards b where b.id = p_board_id for update;
  if auth.uid() is null or v_owner is distinct from auth.uid()
     or not public.cloud_is_member(p_board_id) then
    raise exception 'owner_required' using errcode = '42501';
  end if;
  if p_user_id is null or p_active is null then
    raise exception 'invalid_member' using errcode = '22023';
  end if;
  if p_user_id = v_owner and not p_active then
    raise exception 'cannot_revoke_owner' using errcode = '22023';
  end if;
  insert into public.board_members(board_id, user_id, active)
    values (p_board_id, p_user_id, p_active)
    on conflict (board_id, user_id) do update set active = excluded.active;
end;
$$;

create function public.cloud_apply_task(
  p_board_id uuid, p_task_id uuid, p_operation_id uuid,
  p_action text, p_expected_version bigint, p_data jsonb default '{}'::jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payload jsonb;
  v_previous cloud_private.task_operations%rowtype;
  v_task public.tasks%rowtype;
  v_result jsonb;
  v_title text;
  v_description text;
  v_status text;
begin
  perform 1 from public.boards b where b.id = p_board_id for update;
  if v_actor is null or not public.cloud_is_member(p_board_id) then
    raise exception 'membership_required' using errcode = '42501';
  end if;
  if p_operation_id is null or p_task_id is null or p_expected_version is null
     or p_expected_version < 0 or p_action is null
     or p_action not in ('create', 'update', 'delete', 'restore') then
    raise exception 'invalid_operation' using errcode = '22023';
  end if;

  -- Actor/op es global, incluso si se reutiliza mal desde otro tablero.
  -- Colisiones del hash solo serializan más; la PK sigue siendo la identidad real.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text || ':' || p_operation_id::text, 0));
  v_payload := pg_catalog.jsonb_build_object('board_id', p_board_id, 'task_id', p_task_id,
    'action', p_action, 'expected_version', p_expected_version, 'data', p_data);
  select * into v_previous from cloud_private.task_operations
    where actor_id = v_actor and operation_id = p_operation_id;
  if found then
    if v_previous.payload is distinct from v_payload then
      raise exception 'operation_id_reused' using errcode = '22023';
    end if;
    return v_previous.result;
  end if;

  if p_data is null or pg_catalog.jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid_data' using errcode = '22023';
  end if;
  if p_action in ('create', 'update') then
    if (p_data - array['title', 'description', 'status']::text[]) <> '{}'::jsonb
       or pg_catalog.jsonb_typeof(p_data -> 'title') is distinct from 'string'
       or pg_catalog.jsonb_typeof(p_data -> 'status') is distinct from 'string'
       or (p_data ? 'description' and pg_catalog.jsonb_typeof(p_data -> 'description') is distinct from 'string') then
      raise exception 'invalid_fields' using errcode = '22023';
    end if;
    v_title := pg_catalog.btrim(p_data ->> 'title', E' \t\n\r\f\013');
    v_description := coalesce(p_data ->> 'description', '');
    v_status := p_data ->> 'status';
    if pg_catalog.char_length(v_title) not between 1 and 120
       or pg_catalog.char_length(v_description) > 2000
       or v_status not in ('pending', 'in_progress', 'done') then
      raise exception 'invalid_task' using errcode = '22023';
    end if;
  elsif p_data <> '{}'::jsonb then
    raise exception 'unexpected_fields' using errcode = '22023';
  end if;
  if (p_action = 'create' and p_expected_version <> 0)
     or (p_action <> 'create' and p_expected_version < 1) then
    raise exception 'invalid_expected_version' using errcode = '22023';
  end if;

  select * into v_task from public.tasks where id = p_task_id and board_id = p_board_id for update;
  if p_action = 'create' then
    if v_task.id is null then
      insert into public.tasks(id, board_id, title, description, status)
        values (p_task_id, p_board_id, v_title, v_description, v_status)
        on conflict (id) do nothing returning * into v_task;
      if found then
        v_result := pg_catalog.jsonb_build_object('outcome', 'applied', 'task', pg_catalog.to_jsonb(v_task));
      end if;
    end if;
  elsif v_task.id is null then
    raise exception 'task_not_found' using errcode = 'P0002';
  elsif v_task.version = p_expected_version
    and ((p_action in ('update', 'delete') and v_task.deleted_at is null)
      or (p_action = 'restore' and v_task.deleted_at is not null)) then
    update public.tasks set
      title = case when p_action = 'update' then v_title else title end,
      description = case when p_action = 'update' then v_description else description end,
      status = case when p_action = 'update' then v_status else status end,
      deleted_at = case when p_action = 'delete' then pg_catalog.clock_timestamp() else null end,
      version = version + 1, updated_at = pg_catalog.clock_timestamp()
    where id = p_task_id and board_id = p_board_id returning * into v_task;
    v_result := pg_catalog.jsonb_build_object('outcome', 'applied', 'task', pg_catalog.to_jsonb(v_task));
  end if;
  if v_result is null then
    -- Jamás devolver una tarea de otro tablero, ni siquiera en conflictos de UUID.
    v_result := pg_catalog.jsonb_build_object('outcome', 'conflict', 'task',
      case when v_task.id is not null then pg_catalog.to_jsonb(v_task) else 'null'::jsonb end);
  end if;
  insert into cloud_private.task_operations(actor_id, operation_id, payload, result)
    values (v_actor, p_operation_id, v_payload, v_result);
  return v_result;
end;
$$;

revoke execute on function public.cloud_is_member(uuid) from public, anon;
revoke execute on function public.cloud_create_board(text) from public, anon;
revoke execute on function public.cloud_set_member(uuid, uuid, boolean) from public, anon;
revoke execute on function public.cloud_apply_task(uuid, uuid, uuid, text, bigint, jsonb) from public, anon;
grant execute on function public.cloud_is_member(uuid) to authenticated;
grant execute on function public.cloud_create_board(text) to authenticated;
grant execute on function public.cloud_set_member(uuid, uuid, boolean) to authenticated;
grant execute on function public.cloud_apply_task(uuid, uuid, uuid, text, bigint, jsonb) to authenticated;

commit;
