import { supabaseServer } from "@/lib/supabase/server";
import { Empty, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Runs() {
  const supabase = await supabaseServer();

  const { data: runs } = await supabase
    .from("agent_runs")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(60);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Agent runs</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          One row per morning. A gap here means the scheduled task did not fire.
        </p>
      </div>

      <div className="space-y-3">
        {runs?.length ? (
          runs.map((r) => (
            <article key={r.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-3 text-sm">
                <span className="font-medium">{fmtDate(r.ran_at)}</span>
                {r.area_worked ? <span className="text-stone-600">{r.area_worked}</span> : null}
                <span className="ml-auto text-xs text-stone-500">
                  {r.prospects_added} prospects · {r.drafts_written} drafts ·{" "}
                  {r.wire_centers_found} wire centers
                </span>
              </div>
              {r.summary ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                  {r.summary}
                </p>
              ) : null}
              {r.needs_decision ? (
                <p className="mt-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span className="font-medium">Needs decision: </span>
                  {r.needs_decision}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-stone-200 bg-white">
            <Empty>No runs yet.</Empty>
          </div>
        )}
      </div>
    </div>
  );
}
