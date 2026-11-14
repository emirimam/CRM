-- ITDVoIP outbound CRM — initial schema
-- Agent (Claude scheduled task) writes with the service role key.
-- Humans read/write through the app with Supabase Auth.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type prospect_status as enum (
  'new',          -- found by the agent, not yet researched
  'researched',   -- enriched, ready for a draft
  'drafted',      -- a draft is waiting for approval
  'contacted',    -- at least one email sent
  'replied',      -- they answered
  'qualified',    -- worth a call with Adam
  'won',
  'lost',
  'dnc'           -- do not contact, permanent
);

create type trigger_kind as enum (
  'copper_sunset',
  'pbx_eol',
  'switch_intent',
  'multi_location',
  'msp_partner',
  'other'
);

create type draft_status as enum ('pending', 'approved', 'sent', 'discarded');

create type touch_kind as enum ('email_out', 'email_in', 'call_out', 'call_in', 'note');

-- ---------------------------------------------------------------- wire centers

create table wire_centers (
  id            uuid primary key default gen_random_uuid(),
  carrier       text not null,                 -- AT&T, Verizon, Frontier, Lumen
  name          text not null,
  state         text not null,                 -- two-letter code
  zips          text[] not null default '{}',
  discontinue_date date,                       -- the date in the carrier's filing
  source_url    text not null,                 -- where that date came from
  worked        boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (carrier, name, state)
);

comment on column wire_centers.source_url is
  'Mandatory. No date is ever used in an email without a filing to point at.';

-- ---------------------------------------------------------------- prospects

create table prospects (
  id              uuid primary key default gen_random_uuid(),
  company         text not null,
  website         text,
  city            text,
  state           text,
  zip             text,
  wire_center_id  uuid references wire_centers(id) on delete set null,

  trigger         trigger_kind not null default 'other',
  trigger_detail  text,                        -- one verifiable fact about THIS company
  trigger_source_url text,

  contact_name    text,
  contact_role    text,
  contact_email   text,
  contact_phone   text,

  industry        text,
  est_seats       integer,
  current_provider text,
  current_system  text,                        -- Avaya, Mitel, analog, unknown
  has_fax_line    boolean,
  locations       integer,

  status          prospect_status not null default 'new',
  renewal_date    date,                        -- the single most valuable field
  next_touch_at   date,
  touch_count     integer not null default 0,
  do_not_contact  boolean not null default false,
  dnc_reason      text,

  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index prospects_company_zip_key
  on prospects (lower(company), coalesce(zip, ''));

create index prospects_status_idx       on prospects (status);
create index prospects_next_touch_idx   on prospects (next_touch_at) where do_not_contact = false;
create index prospects_renewal_idx      on prospects (renewal_date) where renewal_date is not null;
create index prospects_trigger_idx      on prospects (trigger);

comment on column prospects.trigger_detail is
  'One verifiable fact about this company. No draft goes out without it.';
comment on column prospects.touch_count is
  'Hard cap of 4. Enforced by the trigger below.';

-- ---------------------------------------------------------------- drafts

create table drafts (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references prospects(id) on delete cascade,
  sequence_step integer not null default 1,     -- 1..4
  template     text,                            -- which template it came from
  subject      text not null,
  body         text not null,
  status       draft_status not null default 'pending',
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  sent_at      timestamptz,
  sent_from    text,                            -- which mailbox
  message_id   text,                            -- Graph message id, for reply matching
  discard_reason text
);

create index drafts_status_idx   on drafts (status, created_at);
create index drafts_prospect_idx on drafts (prospect_id);

-- ---------------------------------------------------------------- touches

create table touches (
  id           uuid primary key default gen_random_uuid(),
  prospect_id  uuid not null references prospects(id) on delete cascade,
  kind         touch_kind not null,
  occurred_at  timestamptz not null default now(),
  subject      text,
  summary      text,
  outcome      text,
  created_at   timestamptz not null default now()
);

create index touches_prospect_idx on touches (prospect_id, occurred_at desc);

-- ---------------------------------------------------------------- agent runs

create table agent_runs (
  id              uuid primary key default gen_random_uuid(),
  ran_at          timestamptz not null default now(),
  area_worked     text,
  prospects_added integer not null default 0,
  drafts_written  integer not null default 0,
  wire_centers_found integer not null default 0,
  summary         text,
  needs_decision  text
);

create index agent_runs_ran_at_idx on agent_runs (ran_at desc);

-- ---------------------------------------------------------------- rules in the database, not just the prompt

-- Keep updated_at honest.
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger prospects_updated_at
  before update on prospects
  for each row execute function touch_updated_at();

-- A sent email bumps the touch count and closes the prospect at 4.
create or replace function on_draft_sent() returns trigger
language plpgsql as $$
begin
  if new.status = 'sent' and (old.status is distinct from 'sent') then
    insert into touches (prospect_id, kind, occurred_at, subject, summary)
    values (new.prospect_id, 'email_out', coalesce(new.sent_at, now()), new.subject,
            'Step ' || new.sequence_step);

    update prospects
       set touch_count = touch_count + 1,
           status = case when status in ('new','researched','drafted') then 'contacted' else status end,
           do_not_contact = case when touch_count + 1 >= 4 then true else do_not_contact end,
           dnc_reason = case when touch_count + 1 >= 4
                             then coalesce(dnc_reason, 'Four touches, no reply')
                             else dnc_reason end
     where id = new.prospect_id;
  end if;
  return new;
end $$;

create trigger drafts_sent
  after update on drafts
  for each row execute function on_draft_sent();

-- Refuse to queue a draft for anyone on the do-not-contact list.
create or replace function guard_draft() returns trigger
language plpgsql as $$
declare blocked boolean;
begin
  select do_not_contact into blocked from prospects where id = new.prospect_id;
  if blocked then
    raise exception 'Prospect % is on the do-not-contact list', new.prospect_id;
  end if;
  return new;
end $$;

create trigger drafts_guard
  before insert on drafts
  for each row execute function guard_draft();

-- ---------------------------------------------------------------- the daily queue

create view daily_queue as
select
  d.id            as draft_id,
  d.subject,
  d.body,
  d.sequence_step,
  d.created_at,
  p.id            as prospect_id,
  p.company,
  p.city,
  p.state,
  p.contact_name,
  p.contact_email,
  p.trigger,
  p.trigger_detail,
  p.trigger_source_url,
  p.est_seats
from drafts d
join prospects p on p.id = d.prospect_id
where d.status = 'pending'
  and p.do_not_contact = false
order by p.est_seats desc nulls last, d.created_at;

create view followups_due as
select p.*
from prospects p
where p.do_not_contact = false
  and p.next_touch_at is not null
  and p.next_touch_at <= current_date
order by p.next_touch_at;

create view renewals_coming as
select p.*
from prospects p
where p.do_not_contact = false
  and p.renewal_date is not null
  and p.renewal_date between current_date and current_date + interval '75 days'
order by p.renewal_date;

-- ---------------------------------------------------------------- RLS
-- Single-team internal tool: any signed-in user has full access.
-- The agent bypasses RLS with the service role key.

alter table prospects    enable row level security;
alter table drafts       enable row level security;
alter table touches      enable row level security;
alter table wire_centers enable row level security;
alter table agent_runs   enable row level security;

create policy "signed in full access" on prospects
  for all to authenticated using (true) with check (true);
create policy "signed in full access" on drafts
  for all to authenticated using (true) with check (true);
create policy "signed in full access" on touches
  for all to authenticated using (true) with check (true);
create policy "signed in full access" on wire_centers
  for all to authenticated using (true) with check (true);
create policy "signed in full access" on agent_runs
  for all to authenticated using (true) with check (true);
