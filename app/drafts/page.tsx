import { supabaseServer } from "@/lib/supabase/server";
import { approveDraft, discardDraft, markSent } from "@/app/actions";
import CopyButton from "@/components/CopyButton";
import SearchInput from "@/components/SearchInput";
import {
  Empty,
  PageHeader,
  Pill,
  ProspectLink,
  SourceLink,
  TriggerBadge,
  btn,
  btnDanger,
  btnPrimary,
  fmtRelative,
  input,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type Prospect = {
  id: string;
  company: string;
  city: string | null;
  state: string | null;
  contact_name: string | null;
  contact_email: string | null;
  trigger: string;
  trigger_detail: string | null;
  trigger_source_url: string | null;
  est_seats: number | null;
  touch_count: number;
};

/* A draft still carrying a fill-me-in marker must not go out. */
const PLACEHOLDER = /\[[^\]]*(?:MUST BE FILLED|TO BE FILLED|TODO|PLACEHOLDER|FILL IN)[^\]]*\]/i;

export default async function Drafts({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await supabaseServer();

  const { data } = await supabase
    .from("drafts")
    .select(
      "id, subject, body, sequence_step, status, created_at, prospects(id, company, city, state, contact_name, contact_email, trigger, trigger_detail, trigger_source_url, est_seats, touch_count)"
    )
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true });

  const all = data ?? [];

  /*
    Filtered here rather than in SQL: the review queue is tens of rows, and
    this way one box searches the body text and the joined company together,
    which a PostgREST `or` across an embedded table will not do.
  */
  const term = (q ?? "").trim().toLowerCase();
  const drafts = term
    ? all.filter((d) => {
        const p = d.prospects as unknown as Prospect;
        return [d.subject, d.body, p?.company, p?.contact_name, p?.contact_email, p?.city, p?.state]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term));
      })
    : all;

  const blocked = all.filter((d) => {
    const p = d.prospects as unknown as Prospect;
    return !p?.contact_email || !p?.trigger_detail || !p?.trigger_source_url || PLACEHOLDER.test(d.body);
  }).length;

  return (
    <>
      <PageHeader
        title="Drafts"
        count={all.length}
        lead={
          all.length
            ? "Copy the body into Outlook, send it, then mark it sent here. Anything flagged in red must be fixed first."
            : "No drafts to review."
        }
      />

      {all.length ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SearchInput
            placeholder="Search drafts"
            hint="Searches subject, body text, company and contact."
          />
          {blocked > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-danger-soft/50 px-2.5 py-1.5 text-xs font-semibold text-danger ring-1 ring-inset ring-danger/25">
              <span aria-hidden className="size-1.5 rounded-full bg-danger" />
              {blocked} not ready to send
            </span>
          ) : (
            <span className="text-xs font-medium text-ok">All drafts have a contact and a source.</span>
          )}
          {term ? (
            <span className="text-xs text-muted">
              {drafts.length} of {all.length} shown
            </span>
          ) : null}
        </div>
      ) : null}

      {!all.length ? (
        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <Empty>The agent writes new drafts each morning.</Empty>
        </div>
      ) : !drafts.length ? (
        <div className="rounded-xl border border-line bg-surface shadow-xs">
          <Empty>Nothing matches “{term}”.</Empty>
        </div>
      ) : null}

      {drafts.map((d) => {
        const p = d.prospects as unknown as Prospect;
        const hasPlaceholder = PLACEHOLDER.test(d.body);
        const problems = !p.contact_email || !p.trigger_detail || !p.trigger_source_url || hasPlaceholder;

        return (
          <article
            key={d.id}
            className={`overflow-hidden rounded-xl border bg-surface shadow-xs ${
              problems ? "border-danger/40" : "border-line"
            }`}
          >
            <header className="flex flex-wrap items-center gap-2.5 border-b border-line bg-surface-2/40 px-4 py-3">
              <ProspectLink id={p.id} company={p.company} />
              <TriggerBadge trigger={p.trigger} />
              <span className="text-xs text-muted">
                {[p.city, p.state].filter(Boolean).join(", ")}
                {p.est_seats ? ` · ~${p.est_seats} seats` : ""}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                {d.status === "approved" ? <Pill tone="ok">approved</Pill> : null}
                <Pill>step {d.sequence_step} of 4</Pill>
                <Pill tone={p.touch_count >= 4 ? "danger" : "neutral"}>{p.touch_count} sent</Pill>
                <span className="text-2xs text-subtle">{fmtRelative(d.created_at)}</span>
              </div>
            </header>

            <div className="space-y-3.5 px-4 py-4">
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-subtle">To</span>
                {p.contact_name ? <span className="text-ink">{p.contact_name}</span> : null}
                {p.contact_email ? (
                  <a
                    href={`mailto:${p.contact_email}`}
                    className="font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    {p.contact_email}
                  </a>
                ) : (
                  <span className="font-semibold text-danger">
                    no email address — find one before sending
                  </span>
                )}
              </div>

              {p.trigger_detail ? (
                <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5 text-xs leading-relaxed text-muted">
                  <span className="font-semibold uppercase tracking-wide text-subtle">
                    Claim in this email
                  </span>
                  <p className="mt-1 text-ink/90">{p.trigger_detail}</p>
                  <p className="mt-1.5">
                    {p.trigger_source_url ? (
                      <SourceLink href={p.trigger_source_url}>source</SourceLink>
                    ) : (
                      <span className="font-semibold text-danger">
                        no source — verify before sending
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-danger/35 bg-danger-soft/50 px-3 py-2.5 text-xs font-medium text-danger">
                  No verifiable fact recorded for this company. Do not send a generic email.
                </div>
              )}

              {hasPlaceholder ? (
                <div className="rounded-lg border border-danger/35 bg-danger-soft/50 px-3 py-2.5 text-xs font-medium text-danger">
                  This body still contains a fill-me-in placeholder. Replace it before sending —
                  CAN-SPAM needs a real postal address.
                </div>
              ) : null}

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-subtle">Subject</div>
                <div className="mt-1 text-base font-semibold tracking-tight text-ink">{d.subject}</div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-subtle">Body</div>
                <pre className="mt-1.5 max-h-[32rem] overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-surface-2/50 px-3.5 py-3 font-sans text-sm leading-[1.65] text-ink">
                  {d.body}
                </pre>
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2/30 px-4 py-3">
              <CopyButton text={d.body} label="Copy body" />
              <CopyButton text={d.subject} label="Copy subject" />

              {d.status === "pending" ? (
                <form action={approveDraft}>
                  <input type="hidden" name="draft_id" value={d.id} />
                  <button className={btn}>Approve</button>
                </form>
              ) : null}

              <form action={markSent} className="flex items-center gap-2">
                <input type="hidden" name="draft_id" value={d.id} />
                <input name="sent_from" placeholder="sent from (mailbox)" className={`w-44 ${input}`} />
                <button className={btnPrimary}>Mark sent</button>
              </form>

              <form action={discardDraft} className="ml-auto flex items-center gap-2">
                <input type="hidden" name="draft_id" value={d.id} />
                <input name="reason" placeholder="why discarded" className={`w-40 ${input}`} />
                <button className={btnDanger}>Discard</button>
              </form>
            </footer>
          </article>
        );
      })}
    </>
  );
}
