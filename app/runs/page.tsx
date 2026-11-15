import { supabaseServer } from "@/lib/supabase/server";
import { Empty, fmtDate } from "@/components/ui";
import AutoRefresh from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

type LogLine = { at: string; msg: string };

type Run = {
  id: string;
  ran_at: string;
  status: "running" | "done" | "failed";
  step: string | null;
  steps_done: number;
  steps_total: number;
  log: LogLine[] | null;
  area_worked: string | null;
  prospects_added: number;
  drafts_written: number;
  wire_centers_found: number;
  summary: string | null;
  needs_decision: string | null;
  finished_at: string | null;
  updated_at: string;
};

/** A run that has said nothing for this long is probably dead, not slow. */
const STALE_MINUTES = 20;

function fmtTime(d: string) {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Sarajevo",
  });
}

function minutesSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000);
}

function duration(start: string, end: string | null) {
  const ms = new Date(end ?? Date.now()).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m} min ${s}s` : `${s}s`;
}

function StatusPill({ run, stale }: { run: Run; stale: boolean }) {
  if (run.status === "running" && stale)
    return <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">no update for {minutesSince(run.updated_at)} min</span>;
  if (run.status === "running")
    return (
      <span className="inline-flex items-center gap-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
        running
      </span>
    );
  if (run.status === "failed")
    return <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">failed</span>;
  return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">done</span>;
}

export default async function Runs() {
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("agent_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(60);

  const runs = (data ?? []) as Run[];
  const anyRunning = runs.some((r) => r.status === "running" && minutesSince(r.updated_at) < STALE_MINUTES);

  return (
    <div className="space-y-5">
      {anyRunning ? <AutoRefresh seconds={8} /> : null}

      <div>
        <h1 className="text-lg font-semibold tracking-tight">Agent runs</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {anyRunning
            ? "A run is in progress. This page refreshes itself every few seconds."
            : "One row per run. A gap on a weekday means the scheduled task did not fire."}
        </p>
      </div>

      <div className="space-y-3">
        {runs.length ? (
          runs.map((r) => {
            const stale = r.status === "running" && minutesSince(r.updated_at) >= STALE_MINUTES;
            const pct = Math.min(100, Math.round((r.steps_done / Math.max(1, r.steps_total)) * 100));
            const log = (r.log ?? []).slice().reverse();

            return (
              <article key={r.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-3 text-sm">
                  <span className="font-medium">{fmtDate(r.ran_at)}</span>
                  <span className="text-xs text-stone-400">{fmtTime(r.ran_at)}</span>
                  <StatusPill run={r} stale={stale} />
                  {r.area_worked ? <span className="text-stone-600">{r.area_worked}</span> : null}
                  <span className="ml-auto text-xs text-stone-500">
                    {r.prospects_added} prospects · {r.drafts_written} drafts · {r.wire_centers_found} wire centers
                    {" · "}
                    {duration(r.ran_at, r.finished_at)}
                  </span>
                </div>

                {r.status === "running" ? (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-stone-700">{r.step ?? "Starting"}</span>
                      <span className="tabular-nums text-stone-400">
                        step {r.steps_done} of {r.steps_total}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${stale ? "bg-amber-400" : "bg-blue-600"}`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    {stale ? (
                      <p className="mt-2 text-xs text-amber-800">
                        Nothing reported for {minutesSince(r.updated_at)} minutes. The run may have stopped without
                        finishing — check the task&apos;s output in Claude.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {r.summary ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{r.summary}</p>
                ) : null}

                {r.needs_decision ? (
                  <p className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <span className="font-medium">Needs decision: </span>
                    {r.needs_decision}
                  </p>
                ) : null}

                {log.length ? (
                  <details className="mt-3" open={r.status === "running"}>
                    <summary className="cursor-pointer text-xs text-stone-500 hover:text-stone-800">
                      Activity ({log.length})
                    </summary>
                    <ol className="mt-2 space-y-1 border-l border-stone-200 pl-3">
                      {log.map((l, i) => (
                        <li key={i} className="text-xs">
                          <span className="tabular-nums text-stone-400">{fmtTime(l.at)}</span>{" "}
                          <span className="text-stone-700">{l.msg}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white">
            <Empty>No runs yet.</Empty>
          </div>
        )}
      </div>
    </div>
  );
}
