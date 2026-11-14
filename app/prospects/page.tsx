import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Empty, ProspectLink, StatusBadge, TriggerBadge, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const statuses = [
  "all", "new", "researched", "drafted", "contacted", "replied", "qualified", "won", "lost", "dnc",
];

export default async function Prospects({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("prospects")
    .select("*")
    .order("est_seats", { ascending: false, nullsFirst: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("company", `%${q}%`);

  const { data: prospects } = await query;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-lg font-semibold tracking-tight">Prospects</h1>
        <span className="text-sm text-stone-500">{prospects?.length ?? 0} shown</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search company"
            className="w-56 rounded-md border border-stone-300 px-3 py-1.5 text-sm"
          />
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
            Search
          </button>
        </form>

        <nav className="flex flex-wrap gap-1 text-xs">
          {statuses.map((s) => (
            <Link
              key={s}
              href={`/prospects?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded px-2 py-1 ${
                (status ?? "all") === s
                  ? "bg-stone-900 text-white"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {s}
            </Link>
          ))}
        </nav>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        {prospects?.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Where</th>
                <th className="px-4 py-2 font-medium">Trigger</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 text-right font-medium">Seats</th>
                <th className="px-4 py-2 font-medium">Renewal</th>
                <th className="px-4 py-2 text-right font-medium">Touches</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {prospects.map((p) => (
                <tr key={p.id} className={p.do_not_contact ? "opacity-50" : undefined}>
                  <td className="px-4 py-2">
                    <ProspectLink id={p.id} company={p.company} />
                  </td>
                  <td className="px-4 py-2 text-stone-600">
                    {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-2">
                    <TriggerBadge trigger={p.trigger} />
                  </td>
                  <td className="px-4 py-2 text-stone-600">{p.contact_email ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-stone-600">
                    {p.est_seats ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{fmtDate(p.renewal_date)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-stone-600">
                    {p.touch_count}/4
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>No prospects match.</Empty>
        )}
      </div>
    </div>
  );
}
