import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import AutoRefresh from "@/components/AutoRefresh";
import {
  Callout,
  Card,
  Empty,
  PageHeader,
  Pill,
  ProspectLink,
  Stat,
  StatusBadge,
  TriggerBadge,
  daysUntil,
  fmtDate,
  fmtRelative,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/** A run that has said nothing for this long is probably dead, not slow. */
const STALE_MS = 20 * 60 * 1000;

export default async function Today() {
  const supabase = await supabaseServer();

  const [queue, followups, renewals, lastRun, counts] = await Promise.all([
    supabase.from("daily_queue").select("*").limit(10),
    supabase.from("followups_due").select("*").limit(10),
    supabase.from("renewals_coming").select("*").limit(10),
    supabase.from("agent_runs").select("*").order("ran_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("prospects").select("status", { count: "exact", head: false }),
  ]);

  const rows = counts.data ?? [];
  const by = (s: string) => rows.filter((r) => r.status === s).length;

  const run = lastRun.data;
  const running = run?.status === "running" && Date.now() - new Date(run.updated_at).getTime() < STALE_MS;
  const pct = run ? Math.max(3, Math.round((run.steps_done / Math.max(1, run.steps_total)) * 100)) : 0;

  return (
    <>
      {running ? <AutoRefresh seconds={10} /> : null}

      <PageHeader
        title="Today"
        lead={
          running ? (
            "The agent is working right now."
          ) : run ? (
            <>
              Agent last ran <span className="font-medium text-ink">{fmtRelative(run.ran_at)}</span> —{" "}
              {run.prospects_added} prospects, {run.drafts_written} drafts
              {run.wire_centers_found ? `, ${run.wire_centers_found} wire centers` : ""}
              {run.area_worked ? (
                <>
                  {" · "}
                  <span className="text-ink">{run.area_worked}</span>
                </>
              ) : null}
            </>
          ) : (
            "The agent has not run yet."
          )
        }
        actions={
          <Link
            href="/runs"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            Run history →
          </Link>
        }
      />

      {running && run ? (
        <Link
          href="/runs"
          className="block rounded-xl border border-accent/35 bg-accent/[0.07] px-4 py-3 transition-colors hover:bg-accent/[0.12]"
        >
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent" />
            <span className="font-semibold text-ink">{run.step ?? "Starting"}</span>
            <span className="ml-auto whitespace-nowrap text-xs font-medium tabular-nums text-accent">
              step {run.steps_done} of {run.steps_total} · details →
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-accent/15">
            <div
              className="h-full rounded-full bg-accent transition-all duration-700 ease-snap"
              style={{ width: `${pct}%` }}
            />
          </div>
        </Link>
      ) : null}

      {run?.needs_decision ? (
        <Callout tone="warn" title="Needs your decision">
          {run.needs_decision}
        </Callout>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat
          label="Drafts waiting"
          value={queue.data?.length ?? 0}
          href="/drafts"
          tone={queue.data?.length ? "accent" : "neutral"}
        />
        <Stat
          label="Follow-ups due"
          value={followups.data?.length ?? 0}
          tone={followups.data?.length ? "warn" : "neutral"}
        />
        <Stat label="Contacted" value={by("contacted")} href="/prospects?status=contacted" />
        <Stat
          label="Replied"
          value={by("replied") + by("qualified")}
          href="/prospects?status=replied"
          tone={by("replied") + by("qualified") ? "ok" : "neutral"}
        />
        <Stat label="Won" value={by("won")} href="/prospects?status=won" tone="ok" />
      </div>

      <Card
        title="Drafts waiting for you"
        action={
          <Link
            href="/drafts"
            className="text-xs font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            Review all →
          </Link>
        }
        bodyClass="px-2 py-1"
      >
        {queue.data?.length ? (
          <ul className="divide-y divide-line/60">
            {queue.data.map((d) => (
              <li key={d.draft_id} className="flex items-center gap-2.5 px-2 py-2.5 text-sm">
                <ProspectLink id={d.prospect_id} company={d.company} />
                <TriggerBadge trigger={d.trigger} />
                <span className="min-w-0 flex-1 truncate text-muted">{d.subject}</span>
                <Pill>step {d.sequence_step}</Pill>
                {d.est_seats ? <Pill>~{d.est_seats} seats</Pill> : null}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing waiting. The agent writes new drafts each morning.</Empty>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Follow-ups due" bodyClass="px-2 py-1">
          {followups.data?.length ? (
            <ul className="divide-y divide-line/60">
              {followups.data.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 px-2 py-2.5 text-sm">
                  <ProspectLink id={p.id} company={p.company} />
                  <StatusBadge status={p.status} />
                  <span className="ml-auto whitespace-nowrap text-xs text-muted">
                    {fmtDate(p.next_touch_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>None due today.</Empty>
          )}
        </Card>

        <Card title="Renewals within 75 days" bodyClass="px-2 py-1">
          {renewals.data?.length ? (
            <ul className="divide-y divide-line/60">
              {renewals.data.map((p) => {
                const left = daysUntil(p.renewal_date);
                return (
                  <li key={p.id} className="flex items-center gap-2.5 px-2 py-2.5 text-sm">
                    <ProspectLink id={p.id} company={p.company} />
                    <span className="min-w-0 truncate text-xs text-muted">
                      {p.current_provider ?? "provider unknown"}
                    </span>
                    <span className="ml-auto whitespace-nowrap text-xs font-medium text-warn">
                      {fmtDate(p.renewal_date)}
                      {left !== null && left >= 0 ? ` · ${left}d` : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No renewal dates recorded yet — ask for one in every first email.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
