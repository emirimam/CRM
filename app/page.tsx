import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card, Empty, ProspectLink, Stat, StatusBadge, TriggerBadge, fmtDate } from "@/components/ui";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

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
  const running =
    run?.status === "running" &&
    Date.now() - new Date(run.updated_at).getTime() < 20 * 60 * 1000;

  return (
    <div className="space-y-6">
      {running ? <AutoRefresh seconds={10} /> : null}

      <div>
        <h1 className="text-lg font-semibold tracking-tight">Today</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {running
            ? "The agent is working right now."
            : run
              ? `Agent last ran ${fmtDate(run.ran_at)} — ${run.prospects_added} prospects, ${run.drafts_written} drafts${run.area_worked ? ` · ${run.area_worked}` : ""}`
              : "The agent has not run yet."}
        </p>
      </div>

      {running && run ? (
        <Link
          href="/runs"
          className="block rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 hover:bg-blue-100"
        >
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
            <span className="font-medium">{run.step ?? "Starting"}</span>
            <span className="ml-auto tabular-nums text-xs text-blue-700">
              step {run.steps_done} of {run.steps_total} · details →
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-700"
              style={{ width: `${Math.max(3, Math.round((run.steps_done / Math.max(1, run.steps_total)) * 100))}%` }}
            />
          </div>
        </Link>
      ) : null}

      {lastRun.data?.needs_decision ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Needs your decision: </span>
          {lastRun.data.needs_decision}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Drafts waiting" value={queue.data?.length ?? 0} />
        <Stat label="Follow-ups due" value={followups.data?.length ?? 0} />
        <Stat label="Contacted" value={by("contacted")} />
        <Stat label="Replied" value={by("replied") + by("qualified")} />
        <Stat label="Won" value={by("won")} />
      </div>

      <Card
        title="Drafts waiting for you"
        action={
          <Link href="/drafts" className="text-xs text-stone-500 hover:text-stone-900">
            Review all →
          </Link>
        }
      >
        {queue.data?.length ? (
          <ul className="divide-y divide-stone-100">
            {queue.data.map((d) => (
              <li key={d.draft_id} className="flex items-center gap-3 py-2 text-sm">
                <ProspectLink id={d.prospect_id} company={d.company} />
                <TriggerBadge trigger={d.trigger} />
                <span className="truncate text-stone-500">{d.subject}</span>
                <span className="ml-auto whitespace-nowrap text-xs text-stone-400">
                  step {d.sequence_step}
                  {d.est_seats ? ` · ~${d.est_seats} seats` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing waiting. The agent writes new drafts each morning.</Empty>
        )}
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Follow-ups due">
          {followups.data?.length ? (
            <ul className="divide-y divide-stone-100">
              {followups.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <ProspectLink id={p.id} company={p.company} />
                  <StatusBadge status={p.status} />
                  <span className="ml-auto text-xs text-stone-400">{fmtDate(p.next_touch_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>None due today.</Empty>
          )}
        </Card>

        <Card title="Renewals within 75 days">
          {renewals.data?.length ? (
            <ul className="divide-y divide-stone-100">
              {renewals.data.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                  <ProspectLink id={p.id} company={p.company} />
                  <span className="text-xs text-stone-500">{p.current_provider ?? "provider unknown"}</span>
                  <span className="ml-auto text-xs font-medium text-stone-600">
                    {fmtDate(p.renewal_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No renewal dates recorded yet — ask for one in every first email.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
