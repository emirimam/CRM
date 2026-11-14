import { supabaseServer } from "@/lib/supabase/server";
import { toggleWireCenterWorked } from "@/app/actions";
import { Empty, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function WireCenters() {
  const supabase = await supabaseServer();

  const { data: centers } = await supabase
    .from("wire_centers")
    .select("*")
    .order("discontinue_date", { ascending: true, nullsFirst: false });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Wire centers</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Every date here comes from a carrier filing. No date goes into an email without one.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
        {centers?.length ? (
          <table className="w-full text-sm">
            <thead className="border-b border-stone-100 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-2 font-medium">Carrier</th>
                <th className="px-4 py-2 font-medium">Wire center</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 font-medium">ZIPs</th>
                <th className="px-4 py-2 font-medium">Filed date</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Worked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {centers.map((c) => (
                <tr key={c.id} className={c.worked ? "opacity-50" : undefined}>
                  <td className="px-4 py-2">{c.carrier}</td>
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-stone-600">{c.state}</td>
                  <td className="px-4 py-2 text-xs text-stone-500">
                    {(c.zips ?? []).slice(0, 6).join(", ")}
                    {(c.zips?.length ?? 0) > 6 ? ` +${c.zips.length - 6}` : ""}
                  </td>
                  <td className="px-4 py-2 text-stone-600">{fmtDate(c.discontinue_date)}</td>
                  <td className="px-4 py-2">
                    <a href={c.source_url} target="_blank" rel="noreferrer" className="text-xs underline">
                      filing
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <form action={toggleWireCenterWorked}>
                      <input type="hidden" name="wire_center_id" value={c.id} />
                      <input type="hidden" name="worked" value={String(c.worked)} />
                      <button className="text-xs text-stone-500 hover:text-stone-900">
                        {c.worked ? "done" : "mark done"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty>The agent records wire centers here as it finds new filings.</Empty>
        )}
      </div>
    </div>
  );
}
