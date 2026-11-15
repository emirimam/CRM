-- Live progress for agent runs. Defaults keep the old one-row-at-the-end insert working.
alter table agent_runs
  add column status      text not null default 'done' check (status in ('running','done','failed')),
  add column step        text,
  add column steps_done  integer not null default 0,
  add column steps_total integer not null default 9,
  add column log         jsonb not null default '[]'::jsonb,
  add column finished_at timestamptz,
  add column updated_at  timestamptz not null default now();

create index agent_runs_status_idx on agent_runs (status) where status = 'running';

create or replace function agent_start() returns uuid
language plpgsql security invoker as $$
declare rid uuid;
begin
  insert into agent_runs (status, step, steps_done, log)
  values ('running', 'Starting', 0,
          jsonb_build_array(jsonb_build_object('at', now(), 'msg', 'Run started')))
  returning id into rid;
  return rid;
end $$;

create or replace function agent_progress(run_id uuid, step_no integer, label text, msg text default null)
returns void
language plpgsql security invoker as $$
begin
  update agent_runs
     set step = label,
         steps_done = greatest(steps_done, step_no),
         log = log || jsonb_build_array(jsonb_build_object('at', now(), 'msg', coalesce(msg, label))),
         updated_at = now()
   where id = run_id;
end $$;

create or replace function agent_finish(
  run_id uuid, p_status text, p_area text,
  p_prospects integer, p_drafts integer, p_wire_centers integer,
  p_summary text, p_needs_decision text default null
) returns void
language plpgsql security invoker as $$
begin
  update agent_runs
     set status = p_status,
         step = case when p_status = 'done' then 'Finished' else 'Failed' end,
         steps_done = case when p_status = 'done' then steps_total else steps_done end,
         area_worked = p_area,
         prospects_added = coalesce(p_prospects, 0),
         drafts_written = coalesce(p_drafts, 0),
         wire_centers_found = coalesce(p_wire_centers, 0),
         summary = p_summary,
         needs_decision = p_needs_decision,
         finished_at = now(),
         updated_at = now(),
         log = log || jsonb_build_array(jsonb_build_object('at', now(), 'msg',
                 case when p_status = 'done' then 'Run finished' else 'Run failed' end))
   where id = run_id;
end $$;

revoke execute on function agent_start() from public, anon, authenticated;
revoke execute on function agent_progress(uuid, integer, text, text) from public, anon, authenticated;
revoke execute on function agent_finish(uuid, text, text, integer, integer, integer, text, text) from public, anon, authenticated;
