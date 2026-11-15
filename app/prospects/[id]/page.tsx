import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { addTouch, markDoNotContact, updateProspect } from "@/app/actions";
import {
  Callout,
  Card,
  Empty,
  Pill,
  SourceLink,
  StatusBadge,
  TriggerBadge,
  btn,
  btnPrimary,
  fmtDate,
  input,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statuses = ["new", "researched", "drafted", "contacted", "replied", "qualified", "won", "lost"];

const touchKindLabel: Record<string, string> = {
  email_out: "Email out",
  email_in: "Email in",
  call_out: "Call out",
  call_in: "Call in",
  note: "Note",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm text-ink">{children}</dd>
    </div>
  );
}

export default async function ProspectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [{ data: p }, { data: touches }, { data: drafts }] = await Promise.all([
    supabase
      .from("prospects")
      .select("*, wire_centers(carrier, name, state, discontinue_date, source_url)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("touches").select("*").eq("prospect_id", id).order("occurred_at", { ascending: false }),
    supabase.from("drafts").select("*").eq("prospect_id", id).order("created_at", { ascending: false }),
  ]);

  if (!p) notFound();

  const wc = p.wire_centers as unknown as
    | { carrier: string; name: string; state: string; discontinue_date: string | null; source_url: string }
    | null;

  const field = `w-full ${input}`;
  const label = "block text-xs font-medium uppercase tracking-wide text-subtle";

  return (
    <>
      <div>
        <Link
          href="/prospects"
          className="text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          ← All prospects
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{p.company}</h1>
          <StatusBadge status={p.status} />
          <TriggerBadge trigger={p.trigger} />
          <div className="ml-auto flex items-center gap-1.5">
            <Pill tone={p.touch_count >= 4 ? "danger" : "neutral"}>
              {p.touch_count} of 4 touches used
            </Pill>
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {[p.city, p.state].filter(Boolean).length ? (
            <span>
              {[p.city, p.state].filter(Boolean).join(", ")}
              {p.zip ? ` ${p.zip}` : ""}
            </span>
          ) : null}
          {p.website ? (
            <a
              href={p.website}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              {p.website.replace(/^https?:\/\//, "")}
            </a>
          ) : null}
          {p.industry ? <span className="text-subtle">{p.industry}</span> : null}
        </div>
      </div>

      {p.do_not_contact ? (
        <Callout tone="danger" title="On the do-not-contact list">
          {p.dnc_reason ?? "No reason recorded."}
        </Callout>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="What we can verifiably say">
            {p.trigger_detail ? (
              <>
                <p className="max-w-[72ch] text-sm leading-[1.65] text-ink">{p.trigger_detail}</p>
                <p className="mt-2">
                  {p.trigger_source_url ? (
                    <SourceLink href={p.trigger_source_url}>source</SourceLink>
                  ) : (
                    <span className="text-xs font-semibold text-danger">— no source recorded</span>
                  )}
                </p>
              </>
            ) : (
              <Empty>Nothing verified yet. No email should go out until there is.</Empty>
            )}

            {wc ? (
              <div className="mt-3.5 border-t border-line pt-3 text-sm text-muted">
                <span className="text-xs font-medium uppercase tracking-wide text-subtle">
                  Wire center
                </span>
                <p className="mt-1 text-ink">
                  {wc.name}, {wc.state}
                  <span className="text-muted"> — {wc.carrier}</span>
                  {wc.discontinue_date ? (
                    <span className="text-muted"> · filed for {fmtDate(wc.discontinue_date)}</span>
                  ) : null}
                  {wc.source_url ? (
                    <>
                      {" "}
                      <SourceLink href={wc.source_url}>filing</SourceLink>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}
          </Card>

          <Card title="Edit">
            <form action={updateProspect} className="grid gap-3.5 sm:grid-cols-2">
              <input type="hidden" name="prospect_id" value={p.id} />

              <label className={label}>
                Contact name
                <input name="contact_name" defaultValue={p.contact_name ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Role
                <input name="contact_role" defaultValue={p.contact_role ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Email
                <input name="contact_email" type="email" defaultValue={p.contact_email ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Phone
                <input name="contact_phone" defaultValue={p.contact_phone ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Current provider
                <input name="current_provider" defaultValue={p.current_provider ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Current system
                <input name="current_system" defaultValue={p.current_system ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Estimated seats
                <input name="est_seats" type="number" defaultValue={p.est_seats ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Locations
                <input name="locations" type="number" defaultValue={p.locations ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Renewal date
                <input name="renewal_date" type="date" defaultValue={p.renewal_date ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Next touch
                <input name="next_touch_at" type="date" defaultValue={p.next_touch_at ?? ""} className={`mt-1 ${field}`} />
              </label>
              <label className={label}>
                Status
                <select name="status" defaultValue={p.status} className={`mt-1 ${field}`}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`sm:col-span-2 ${label}`}>
                Notes
                <textarea
                  name="notes"
                  defaultValue={p.notes ?? ""}
                  rows={4}
                  className={`mt-1 leading-relaxed ${field}`}
                />
              </label>

              <div className="sm:col-span-2">
                <button className={btnPrimary}>Save changes</button>
              </div>
            </form>
          </Card>

          <Card title="History" bodyClass="px-4 py-3">
            {touches?.length ? (
              <ul className="divide-y divide-line/60">
                {touches.map((t) => (
                  <li key={t.id} className="py-2.5 text-sm first:pt-0">
                    <div className="flex items-baseline gap-2">
                      <Pill>{touchKindLabel[t.kind] ?? t.kind}</Pill>
                      <span className="text-xs text-subtle">{fmtDate(t.occurred_at)}</span>
                    </div>
                    {t.subject ? <div className="mt-1 font-medium text-ink">{t.subject}</div> : null}
                    {t.summary ? (
                      <div className="mt-0.5 max-w-[72ch] leading-relaxed text-muted">{t.summary}</div>
                    ) : null}
                    {t.outcome ? (
                      <div className="mt-0.5 text-xs font-medium text-ink/80">→ {t.outcome}</div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No contact yet.</Empty>
            )}

            <form action={addTouch} className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              <input type="hidden" name="prospect_id" value={p.id} />
              <select name="kind" className={input} aria-label="Touch kind">
                <option value="call_out">Call out</option>
                <option value="call_in">Call in</option>
                <option value="email_in">Email in</option>
                <option value="note">Note</option>
              </select>
              <input
                name="summary"
                placeholder="What happened"
                aria-label="What happened"
                className={`min-w-48 flex-1 ${input}`}
              />
              <input name="outcome" placeholder="Outcome" aria-label="Outcome" className={`w-36 ${input}`} />
              <button className={btn}>Log</button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Key facts">
            <dl className="divide-y divide-line/60">
              <Row label="Contact">
                {p.contact_name ? (
                  <>
                    {p.contact_name}
                    {p.contact_role ? (
                      <span className="text-muted"> · {p.contact_role}</span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </Row>
              <Row label="Email">
                {p.contact_email ? (
                  <a
                    href={`mailto:${p.contact_email}`}
                    className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    {p.contact_email}
                  </a>
                ) : (
                  <span className="font-medium text-danger">none</span>
                )}
              </Row>
              <Row label="Phone">
                {p.contact_phone ? (
                  <a href={`tel:${p.contact_phone}`} className="tabular-nums hover:text-accent">
                    {p.contact_phone}
                  </a>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </Row>
              <Row label="Seats">{p.est_seats ?? <span className="text-subtle">—</span>}</Row>
              <Row label="Locations">{p.locations ?? <span className="text-subtle">—</span>}</Row>
              <Row label="Fax line">
                {p.has_fax_line === true ? (
                  <Pill tone="ok">yes</Pill>
                ) : p.has_fax_line === false ? (
                  <span className="text-subtle">no</span>
                ) : (
                  <span className="text-subtle">unknown</span>
                )}
              </Row>
              <Row label="Provider">{p.current_provider ?? <span className="text-subtle">—</span>}</Row>
              <Row label="System">{p.current_system ?? <span className="text-subtle">—</span>}</Row>
              <Row label="Renewal">
                {p.renewal_date ? fmtDate(p.renewal_date) : <span className="text-subtle">—</span>}
              </Row>
              <Row label="Next touch">
                {p.next_touch_at ? fmtDate(p.next_touch_at) : <span className="text-subtle">—</span>}
              </Row>
            </dl>
          </Card>

          <Card title="Drafts" bodyClass="px-4 py-2">
            {drafts?.length ? (
              <ul className="divide-y divide-line/60">
                {drafts.map((d) => (
                  <li key={d.id} className="py-2.5 text-sm">
                    <div className="flex items-baseline gap-2">
                      <Pill>step {d.sequence_step}</Pill>
                      <span className="text-xs capitalize text-subtle">{d.status}</span>
                    </div>
                    <div className="mt-1 truncate text-ink">{d.subject}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>None.</Empty>
            )}
          </Card>

          {p.notes ? (
            <Card title="Research notes">
              <p className="whitespace-pre-wrap text-sm leading-[1.6] text-muted">{p.notes}</p>
            </Card>
          ) : null}

          {!p.do_not_contact ? (
            <Card title="Stop contacting">
              <form action={markDoNotContact} className="space-y-2">
                <input type="hidden" name="prospect_id" value={p.id} />
                <input
                  name="reason"
                  placeholder="Reason"
                  aria-label="Reason"
                  defaultValue="Asked not to be contacted"
                  className={field}
                />
                <button className="w-full rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft/60">
                  Add to do-not-contact
                </button>
                <p className="text-xs text-subtle">Permanent. Also discards any waiting drafts.</p>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
