import { supabaseServer } from "@/lib/supabase/server";
import AutoRefresh from "@/components/AutoRefresh";
import SearchInput from "@/components/SearchInput";
import { Callout, Empty, PageHeader, Pill, fmtDate } from "@/components/ui";

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
  if (run.status === "running" && stale) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-warn-soft/60 px-1.5 py-0.5 text-2xs font-semibold text-warn ring-1 ring-inset ring-warn/25">
        no update for {minutesSince(run.updated_at)} min
      </span>
    );
  }
  if (run.status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft/60 px-1.5 py-0.5 text-2xs font-semibold text-accent ring-1 ring-inset ring-accent/25">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent" />
        running
      </span>
    );
  }
  if (run.status === "failed") {
    return (
      <span className="inline-flex items-center rounded-md bg-danger-soft/60 px-1.5 py-0.5 text-2xs font-semibold text-danger ring-1 ring-inset ring-danger/30">
        failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-ok-soft/60 px-1.5 py-0.5 text-2xs font-semibold text-ok ring-1 ring-inset ring-ok/30">
      done
    </span>
  );
}

export default async function Runs({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("agent_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(60);

  const all = (data ?? []) as Run[];
  const anyRunning = all.some((r) => r.status === "running" && minutesSince(r.updated_at) < STALE_MINUTES);

  // Small result set, so one box can search the long summary prose too.
  const term = (q ?? "").trim().toLowerCase();
  const runs = term
    ? all.filter((r) =>
        [r.area_worked, r.summary, r.needs_decision, r.step]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      )
    : all;

  return (
    <>
      {anyRunning ? <AutoRefresh seconds={8} /> : null}

      <PageHeader
        title="Agent runs"
        count={all.length}
        lead={
          anyRunning
            ? "A run is in progress. This page refreshes itself every few seconds."
            : "One row per run. A gap on a weekday means the scheduled task did not fire."
        }
      />

      {all.length ? (
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            placeholder="Search runs"
            hint="Searches area worked, summary, current step and decisions needed."
          />
          {term ? (
            <span className="text-xs text-muted">
              {runs.length} of {all.length} shown
            </span>
          ) : null}
        </div>
      ) : null}

      {!all.length ? (
        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <Empty>No runs yet.</Empty>
        </div>
      ) : !runs.length ? (
        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <Empty>Nothing matches “{term}”.</Empty>
        </div>
      ) : null}

      <div className="space-y-4">
        {runs.map((r) => {
          const stale = r.status === "running" && minutesSince(r.updated_at) >= STALE_MINUTES;
          const pct = Math.min(100, Math.round((r.steps_done / Math.max(1, r.steps_total)) * 100));
          const log = (r.log ?? []).slice().reverse();

          return (
            <article
              key={r.id}
              className={`overflow-hidden rounded-xl border bg-surface shadow-xs ${
                r.status === "failed" ? "border-danger/40" : stale ? "border-warn/40" : "border-line"
              }`}
            >
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface-2/40 px-4 py-2.5">
                <span className="text-sm font-semibold tracking-tight text-ink">{fmtDate(r.ran_at)}</span>
                <span className="text-xs tabular-nums text-subtle">{fmtTime(r.ran_at)}</span>
                <StatusPill run={r} stale={stale} />
                {r.area_worked ? (
                  <span className="min-w-0 flex-1 truncate text-xs text-muted" title={r.area_worked}>
                    {r.area_worked}
                  </span>
                ) : null}
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <Pill>{r.prospects_added} prospects</Pill>
                  <Pill>{r.drafts_written} drafts</Pill>
                  <Pill>{r.wire_centers_found} wire centers</Pill>
                  <span className="text-2xs tabular-nums text-subtle">
                    {duration(r.ran_at, r.finished_at)}
                  </span>
                </div>
              </header>

              <div className="space-y-3 px-4 py-3.5">
                {r.status === "running" ? (
                  <div>
                    <div className="flex items-baseline justify-between gap-3 text-xs">
                      <span className="font-semibold text-ink">{r.step ?? "Starting"}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        step {r.steps_done} of {r.steps_total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-snap ${
                          stale ? "bg-warn" : "bg-accent"
                        }`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                    {stale ? (
                      <p className="mt-2 text-xs font-medium text-warn">
                        Nothing reported for {minutesSince(r.updated_at)} minutes. The run may have
                        stopped without finishing — check the task&apos;s output in Claude.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {r.summary ? (
                  <p className="max-w-[75ch] whitespace-pre-wrap text-sm leading-[1.65] text-ink/90">
                    {r.summary}
                  </p>
                ) : null}

                {r.needs_decision ? (
                  <Callout tone="warn" title="Needs decision">
                    {r.needs_decision}
                  </Callout>
                ) : null}

                {log.length ? (
                  <details className="group" open={r.status === "running"}>
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted transition-colors hover:text-ink">
                      Activity ({log.length})
                    </summary>
                    <ol className="mt-2 space-y-1 border-l border-line pl-3">
                      {log.map((l, i) => (
                        <li key={i} className="text-xs">
                          <span className="tabular-nums text-subtle">{fmtTime(l.at)}</span>{" "}
                          <span className="text-ink/85">{l.msg}</span>
                        </li>
                      ))}
                    </ol>
                  </details>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
