import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { addTouch, markDoNotContact } from "@/app/actions";
import { canAdmin, canWrite, getViewer } from "@/lib/perms";
import { getSettings, optionLabel, optionTone, selectable } from "@/lib/settings";
import InlineField from "@/components/InlineField";
import {
  Badge,
  Callout,
  Card,
  Empty,
  Pill,
  SourceLink,
  btn,
  fmtDate,
  input,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const touchKindLabel: Record<string, string> = {
  email_out: "Email out",
  email_in: "Email in",
  call_out: "Call out",
  call_in: "Call in",
  note: "Note",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-subtle">{label}</dt>
      <dd className="min-w-0 text-right text-sm">{children}</dd>
    </div>
  );
}

export default async function ProspectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const [viewer, settings] = await Promise.all([getViewer(), getSettings()]);

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

  const editable = !p.do_not_contact && canWrite(viewer);
  const statusOptions = selectable(settings.status)
    .filter((o) => o.value !== "dnc")
    .map((o) => ({ value: o.value, label: o.label }));
  const custom = (p.custom ?? {}) as Record<string, unknown>;

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
          {editable ? (
            <span className="text-sm">
              <InlineField
                prospectId={p.id}
                field="status"
                value={p.status}
                kind="select"
                options={statusOptions}
                align="left"
              />
            </span>
          ) : (
            <Badge
              label={optionLabel(settings.status, p.status)}
              tone={optionTone(settings.status, p.status)}
            />
          )}
          <Badge
            label={optionLabel(settings.trigger, p.trigger)}
            tone={optionTone(settings.trigger, p.trigger)}
          />
          <div className="ml-auto">
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
        </div>

        {editable ? (
          <p className="mt-2 text-xs text-subtle">
            Click any value below to edit it. It saves when you press Enter or click away —
            there is no Save button.
          </p>
        ) : null}
      </div>

      {p.do_not_contact ? (
        <Callout tone="danger" title="On the do-not-contact list">
          {p.dnc_reason ?? "No reason recorded."} Editing is switched off for this record, and any
          waiting drafts were discarded.
        </Callout>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card title="What we can verifiably say">
            {p.trigger_detail ? (
              <div className="max-w-[72ch] text-sm leading-[1.65]">
                {editable ? (
                  <InlineField
                    prospectId={p.id}
                    field="trigger_detail"
                    value={p.trigger_detail}
                    kind="textarea"
                    align="left"
                  />
                ) : (
                  <p className="text-ink">{p.trigger_detail}</p>
                )}
              </div>
            ) : (
              <Empty>Nothing verified yet. No email should go out until there is.</Empty>
            )}

            <p className="mt-2 text-xs">
              {p.trigger_source_url ? (
                <SourceLink href={p.trigger_source_url}>source</SourceLink>
              ) : (
                <span className="font-semibold text-danger">no source recorded</span>
              )}
            </p>

            {wc ? (
              <div className="mt-3.5 border-t border-line pt-3 text-sm">
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

          <Card title="Research notes">
            {editable ? (
              <div className="text-sm leading-[1.6]">
                <InlineField
                  prospectId={p.id}
                  field="notes"
                  value={p.notes}
                  kind="textarea"
                  placeholder="Nothing recorded — click to add"
                  align="left"
                />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-[1.6] text-muted">
                {p.notes ?? "—"}
              </p>
            )}
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
          <Card title="Contact">
            <dl className="divide-y divide-line/60">
              <Row label="Name">
                <InlineField prospectId={p.id} field="contact_name" value={p.contact_name} />
              </Row>
              <Row label="Role">
                <InlineField prospectId={p.id} field="contact_role" value={p.contact_role} />
              </Row>
              <Row label="Email">
                <InlineField
                  prospectId={p.id}
                  field="contact_email"
                  value={p.contact_email}
                  kind="email"
                  placeholder="none — add one"
                />
              </Row>
              <Row label="Phone">
                <InlineField
                  prospectId={p.id}
                  field="contact_phone"
                  value={p.contact_phone}
                  kind="tel"
                />
              </Row>
            </dl>
          </Card>

          <Card title="Account">
            <dl className="divide-y divide-line/60">
              <Row label="Industry">
                <InlineField prospectId={p.id} field="industry" value={p.industry} />
              </Row>
              <Row label="Seats">
                <InlineField prospectId={p.id} field="est_seats" value={p.est_seats} kind="number" />
              </Row>
              <Row label="Locations">
                <InlineField prospectId={p.id} field="locations" value={p.locations} kind="number" />
              </Row>
              <Row label="Fax line">
                <InlineField
                  prospectId={p.id}
                  field="has_fax_line"
                  value={p.has_fax_line === null ? "" : String(p.has_fax_line)}
                  kind="select"
                  options={[
                    { value: "", label: "unknown" },
                    { value: "true", label: "yes" },
                    { value: "false", label: "no" },
                  ]}
                />
              </Row>
              <Row label="Provider">
                <InlineField prospectId={p.id} field="current_provider" value={p.current_provider} />
              </Row>
              <Row label="System">
                <InlineField prospectId={p.id} field="current_system" value={p.current_system} />
              </Row>
              <Row label="Renewal">
                <InlineField
                  prospectId={p.id}
                  field="renewal_date"
                  value={p.renewal_date}
                  kind="date"
                  placeholder="ask in the first email"
                />
              </Row>
              <Row label="Next touch">
                <InlineField
                  prospectId={p.id}
                  field="next_touch_at"
                  value={p.next_touch_at}
                  kind="date"
                />
              </Row>
            </dl>
          </Card>

          {settings.customFields.length ? (
            <Card title="Your own fields">
              <dl className="divide-y divide-line/60">
                {settings.customFields.map((f) => (
                  <Row key={f.key} label={f.label}>
                    {editable ? (
                      <InlineField
                        prospectId={p.id}
                        field={`custom.${f.key}`}
                        value={
                          custom[f.key] === undefined || custom[f.key] === null
                            ? ""
                            : String(custom[f.key])
                        }
                        kind={
                          f.type === "select"
                            ? "select"
                            : f.type === "boolean"
                              ? "select"
                              : f.type === "number"
                                ? "number"
                                : f.type === "date"
                                  ? "date"
                                  : f.type === "url"
                                    ? "url"
                                    : "text"
                        }
                        options={
                          f.type === "select"
                            ? [{ value: "", label: "—" }, ...f.options.map((o) => ({ value: o, label: o }))]
                            : f.type === "boolean"
                              ? [
                                  { value: "", label: "unknown" },
                                  { value: "true", label: "yes" },
                                  { value: "false", label: "no" },
                                ]
                              : undefined
                        }
                      />
                    ) : (
                      <span className="text-muted">
                        {custom[f.key] === undefined || custom[f.key] === null
                          ? "—"
                          : String(custom[f.key])}
                      </span>
                    )}
                  </Row>
                ))}
              </dl>
            </Card>
          ) : null}

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

          {!p.do_not_contact && canAdmin(viewer) ? (
            <Card title="Stop contacting">
              <form action={markDoNotContact} className="space-y-2">
                <input type="hidden" name="prospect_id" value={p.id} />
                <input
                  name="reason"
                  placeholder="Reason"
                  aria-label="Reason"
                  defaultValue="Asked not to be contacted"
                  className={`w-full ${input}`}
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
