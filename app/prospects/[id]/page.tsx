import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { addTouch, markDoNotContact, updateProspect } from "@/app/actions";
import { Card, Empty, StatusBadge, TriggerBadge, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const statuses = ["new", "researched", "drafted", "contacted", "replied", "qualified", "won", "lost"];

export default async function ProspectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: p }, { data: touches }, { data: drafts }] = await Promise.all([
    supabase.from("prospects").select("*, wire_centers(carrier, name, state, discontinue_date, source_url)").eq("id", id).maybeSingle(),
    supabase.from("touches").select("*").eq("prospect_id", id).order("occurred_at", { ascending: false }),
    supabase.from("drafts").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
  ]);

  if (!p) notFound();

  const wc = p.wire_centers as unknown as
    | { carrier: string; name: string; state: string; discontinue_date: string | null; source_url: string }
    | null;

  const field = "w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{p.company}</h1>
        <StatusBadge status={p.status} />
        <TriggerBadge trigger={p.trigger} />
        {p.do_not_contact ? (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
            do not contact{p.dnc_reason ? ` — ${p.dnc_reason}` : ""}
          </span>
        ) : null}
        <span className="ml-auto text-sm text-stone-500">{p.touch_count} of 4 touches used</span>
      </div>

      {p.website ? (
        <a href={p.website} target="_blank" rel="noreferrer" className="text-sm text-stone-500 underline">
          {p.website}
        </a>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6 md:col-span-2">
          <Card title="What we can verifiably say">
            {p.trigger_detail ? (
              <p className="text-sm leading-relaxed">
                {p.trigger_detail}
                {p.trigger_source_url ? (
                  <>
                    {" "}
                    <a href={p.trigger_source_url} target="_blank" rel="noreferrer" className="text-stone-500 underline">
                      source
                    </a>
                  </>
                ) : (
                  <span className="ml-1 font-medium text-red-600">— no source recorded</span>
                )}
              </p>
            ) : (
              <Empty>Nothing verified yet. No email should go out until there is.</Empty>
            )}

            {wc ? (
              <p className="mt-3 border-t border-stone-100 pt-3 text-sm text-stone-600">
                Wire center: {wc.name}, {wc.state} ({wc.carrier})
                {wc.discontinue_date ? ` · filed for ${fmtDate(wc.discontinue_date)}` : ""}{" "}
                <a href={wc.source_url} target="_blank" rel="noreferrer" className="underline">
                  filing
                </a>
              </p>
            ) : null}
          </Card>

          <Card title="Edit">
            <form action={updateProspect} className="grid grid-cols-2 gap-3">
              <input type="hidden" name="prospect_id" value={p.id} />

              <label className="text-xs text-stone-500">
                Contact name
                <input name="contact_name" defaultValue={p.contact_name ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Role
                <input name="contact_role" defaultValue={p.contact_role ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Email
                <input name="contact_email" defaultValue={p.contact_email ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Phone
                <input name="contact_phone" defaultValue={p.contact_phone ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Current provider
                <input name="current_provider" defaultValue={p.current_provider ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Current system
                <input name="current_system" defaultValue={p.current_system ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Estimated seats
                <input name="est_seats" type="number" defaultValue={p.est_seats ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Locations
                <input name="locations" type="number" defaultValue={p.locations ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Renewal date
                <input name="renewal_date" type="date" defaultValue={p.renewal_date ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Next touch
                <input name="next_touch_at" type="date" defaultValue={p.next_touch_at ?? ""} className={field} />
              </label>
              <label className="text-xs text-stone-500">
                Status
                <select name="status" defaultValue={p.status} className={field}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 text-xs text-stone-500">
                Notes
                <textarea name="notes" defaultValue={p.notes ?? ""} rows={3} className={field} />
              </label>

              <div className="col-span-2">
                <button className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
                  Save
                </button>
              </div>
            </form>
          </Card>

          <Card title="History">
            {touches?.length ? (
              <ul className="divide-y divide-stone-100">
                {touches.map((t) => (
                  <li key={t.id} className="py-2 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-stone-500">{t.kind}</span>
                      <span className="text-xs text-stone-400">{fmtDate(t.occurred_at)}</span>
                    </div>
                    {t.subject ? <div className="mt-0.5">{t.subject}</div> : null}
                    {t.summary ? <div className="text-stone-600">{t.summary}</div> : null}
                    {t.outcome ? <div className="text-xs text-stone-500">→ {t.outcome}</div> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No contact yet.</Empty>
            )}

            <form action={addTouch} className="mt-3 flex flex-wrap gap-2 border-t border-stone-100 pt-3">
              <input type="hidden" name="prospect_id" value={p.id} />
              <select name="kind" className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                <option value="call_out">call out</option>
                <option value="call_in">call in</option>
                <option value="email_in">email in</option>
                <option value="note">note</option>
              </select>
              <input
                name="summary"
                placeholder="What happened"
                className="min-w-48 flex-1 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <input
                name="outcome"
                placeholder="Outcome"
                className="w-36 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
              />
              <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
                Log
              </button>
            </form>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Drafts">
            {drafts?.length ? (
              <ul className="divide-y divide-stone-100">
                {drafts.map((d) => (
                  <li key={d.id} className="py-2 text-sm">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-stone-500">step {d.sequence_step}</span>
                      <span className="text-xs text-stone-400">{d.status}</span>
                    </div>
                    <div className="truncate">{d.subject}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None.</Empty>
            )}
          </Card>

          {!p.do_not_contact ? (
            <Card title="Stop contacting">
              <form action={markDoNotContact} className="space-y-2">
                <input type="hidden" name="prospect_id" value={p.id} />
                <input
                  name="reason"
                  placeholder="Reason"
                  defaultValue="Asked not to be contacted"
                  className={field}
                />
                <button className="w-full rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                  Add to do-not-contact
                </button>
                <p className="text-xs text-stone-400">
                  Permanent. Also discards any waiting drafts.
                </p>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
