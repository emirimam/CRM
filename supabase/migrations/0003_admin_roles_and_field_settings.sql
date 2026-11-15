-- ===================================================================
-- Admin section: roles, configurable field presentation, custom fields
--
-- Design note on the enums. prospect_status and trigger_kind stay as
-- Postgres enums and the STORED value never changes, because the
-- on_draft_sent trigger, the three views and the agent's own SQL all
-- key off those literals. What becomes configurable is everything the
-- human sees: label, colour, order, and whether an option is offered
-- at all. New values can be added through add_enum_value(); renaming
-- is a label change, which is safer than rewriting stored data.
--
-- Forced password change is NOT stored here: it lives in the auth
-- user's app_metadata, which only the service role can write, so a
-- user cannot clear their own flag to skip the change.
-- ===================================================================

-- ---------------------------------------------------------------- roles

create table if not exists app_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'viewer' check (role in ('admin','sales','viewer')),
  email      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table app_roles is
  'One row per human. Absent means viewer, which is the safe default.';

-- Security definer so it can read app_roles regardless of the caller's own
-- policies, which is what stops the policies below recursing.
create or replace function public.auth_role() returns text
  language sql stable security definer set search_path = public as $$
  select coalesce((select role from app_roles where user_id = auth.uid()), 'viewer')
$$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from app_roles where user_id = auth.uid()), false)
$$;

-- Whoever is already using the tool keeps full control.
insert into app_roles (user_id, role, email)
select id, 'admin', email from auth.users
on conflict (user_id) do nothing;

-- ------------------------------------------------- field presentation

create table if not exists field_options (
  id          uuid primary key default gen_random_uuid(),
  field       text not null check (field in ('status','trigger')),
  value       text not null,            -- the stored enum literal, never edited
  label       text not null,            -- what the user sees, freely editable
  tone        text not null default 'neutral'
              check (tone in ('neutral','accent','ok','warn','danger','info')),
  sort_order  integer not null default 0,
  hidden      boolean not null default false,
  locked      boolean not null default false,  -- business logic depends on it
  unique (field, value)
);

comment on column field_options.value is
  'The enum literal stored on prospects. Editing the label never touches this.';
comment on column field_options.locked is
  'Set where a trigger or view depends on the literal. Cannot be hidden.';

insert into field_options (field, value, label, tone, sort_order, locked) values
  ('status','new','New','neutral',10,true),
  ('status','researched','Researched','info',20,true),
  ('status','drafted','Drafted','warn',30,true),
  ('status','contacted','Contacted','accent',40,true),
  ('status','replied','Replied','ok',50,false),
  ('status','qualified','Qualified','ok',60,false),
  ('status','won','Won','ok',70,false),
  ('status','lost','Lost','neutral',80,false),
  ('status','dnc','Do not contact','danger',90,true),
  ('trigger','copper_sunset','Copper sunset','warn',10,false),
  ('trigger','pbx_eol','PBX end-of-life','info',20,false),
  ('trigger','switch_intent','Switch intent','accent',30,false),
  ('trigger','multi_location','Multi-location','neutral',40,false),
  ('trigger','msp_partner','MSP partner','ok',50,false),
  ('trigger','other','Other','neutral',60,false)
on conflict (field, value) do nothing;

-- Adding a value to an enum needs DDL, so it goes through one guarded
-- entry point rather than letting the app issue ALTER TYPE.
create or replace function public.add_enum_value(p_field text, p_value text, p_label text)
  returns void language plpgsql security definer set search_path = public as $$
declare
  type_name text;
  clean     text;
begin
  if not is_admin() then
    raise exception 'Only an admin can add an option';
  end if;

  clean := lower(regexp_replace(trim(p_value), '[^a-zA-Z0-9]+', '_', 'g'));
  if clean = '' or length(clean) > 40 then
    raise exception 'Value must be 1-40 characters of letters, numbers or underscores';
  end if;

  type_name := case p_field
                 when 'status'  then 'prospect_status'
                 when 'trigger' then 'trigger_kind'
                 else null end;
  if type_name is null then
    raise exception 'Unknown field %', p_field;
  end if;

  execute format('alter type %I add value if not exists %L', type_name, clean);

  insert into field_options (field, value, label, sort_order)
  values (p_field, clean, coalesce(nullif(trim(p_label), ''), clean),
          coalesce((select max(sort_order) + 10 from field_options where field = p_field), 10))
  on conflict (field, value) do nothing;
end $$;

-- ---------------------------------------------------- custom fields

create table if not exists custom_fields (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique check (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label       text not null,
  type        text not null default 'text'
              check (type in ('text','number','date','boolean','select','url')),
  options     text[] not null default '{}',   -- for type = select
  help        text,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table custom_fields is
  'Admin-defined extra fields. Values live in prospects.custom (jsonb), so
   adding one needs no schema change and cannot break the agent.';

alter table prospects add column if not exists custom jsonb not null default '{}'::jsonb;

-- ------------------------------------------------- list column layout

create table if not exists list_columns (
  key        text primary key,
  label      text not null,
  visible    boolean not null default true,
  sort_order integer not null default 0,
  required_before_send boolean not null default false
);

insert into list_columns (key, label, visible, sort_order, required_before_send) values
  ('company','Company',true,10,false),
  ('where','Where',true,20,false),
  ('trigger','Trigger',true,30,false),
  ('contact','Contact',true,40,true),
  ('est_seats','Seats',true,50,false),
  ('renewal_date','Renewal',true,60,false),
  ('touches','Touches',true,70,false),
  ('status','Status',true,80,false),
  ('industry','Industry',false,90,false),
  ('current_provider','Provider',false,100,false),
  ('current_system','System',false,110,false),
  ('locations','Locations',false,120,false),
  ('next_touch_at','Next touch',false,130,false)
on conflict (key) do nothing;

-- ------------------------------------- only an admin may close a record

create or replace function guard_dnc() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the agent's service-role connection, which must
  -- keep working: the four-touch rule sets do_not_contact automatically.
  if auth.uid() is not null
     and new.do_not_contact is distinct from old.do_not_contact
     and not is_admin() then
    raise exception 'Only an admin can change do-not-contact';
  end if;
  return new;
end $$;

drop trigger if exists prospects_guard_dnc on prospects;
create trigger prospects_guard_dnc
  before update on prospects
  for each row execute function guard_dnc();

-- ---------------------------------------------------------------- RLS

alter table app_roles     enable row level security;
alter table field_options enable row level security;
alter table custom_fields enable row level security;
alter table list_columns  enable row level security;

-- Everyone signed in can read the settings; only admins change them.
do $$
declare t text;
begin
  foreach t in array array['app_roles','field_options','custom_fields','list_columns'] loop
    execute format('drop policy if exists "read for signed in" on %I', t);
    execute format('drop policy if exists "admin writes" on %I', t);
    execute format('create policy "read for signed in" on %I for select to authenticated using (true)', t);
    execute format('create policy "admin writes" on %I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- Replace the blanket "any signed-in user does anything" policies from 0001.
do $$
declare t text;
begin
  foreach t in array array['prospects','drafts','touches','wire_centers','agent_runs'] loop
    execute format('drop policy if exists "signed in full access" on %I', t);
    execute format('drop policy if exists "read for signed in" on %I', t);
    execute format('drop policy if exists "sales and admin write" on %I', t);
    execute format('create policy "read for signed in" on %I for select to authenticated using (true)', t);
  end loop;

  -- Viewers get read only. Sales and admin do the day-to-day work.
  foreach t in array array['prospects','drafts','touches','wire_centers'] loop
    execute format($f$create policy "sales and admin write" on %I for all to authenticated
                      using (auth_role() in ('admin','sales'))
                      with check (auth_role() in ('admin','sales'))$f$, t);
  end loop;
end $$;

-- agent_runs stays read-only for humans; the agent writes with the service
-- role key, which bypasses RLS entirely.

grant execute on function public.auth_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.add_enum_value(text, text, text) to authenticated;
