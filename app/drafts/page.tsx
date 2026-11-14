import { supabaseServer } from "@/lib/supabase/server";
import { approveDraft, discardDraft, markSent } from "@/app/actions";
import { Empty, ProspectLink, TriggerBadge } from "@/components/ui";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function Drafts() {
  const supabase = await supabaseServer();

  const { data: drafts } = await supabase
    .from("drafts")
    .select(
      "id, subject, body, sequence_step, status, created_at, prospects(id, company, city, state, contact_name, contact_email, trigger, trigger_detail, trigger_source_url, est_seats, touch_count)"
    )
    .in("status", ["pending", "approved"])
    .order("created_at", { ascending: true });

  if (!drafts?.length) {
    return (
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Drafts</h1>
        <div className="mt-6 rounded-lg border border-stone-200 bg-white">
          <Empty>No drafts to review.</Empty>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Drafts</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {drafts.length} waiting. Copy the body into Outlook, send it, then mark it sent here.
        </p>
      </div>

      {drafts.map((d) => {
        const p = d.prospects as unknown as {
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

        return (
          <article key={d.id} className="rounded-lg border border-stone-200 bg-white">
            <header className="flex flex-wrap items-center gap-3 border-b border-stone-100 px-4 py-3">
              <ProspectLink id={p.id} company={p.company} />
              <TriggerBadge trigger={p.trigger} />
              <span className="text-xs text-stone-500">
                {[p.city, p.state].filter(Boolean).join(", ")}
                {p.est_seats ? ` · ~${p.est_seats} seats` : ""}
              </span>
              <span className="ml-auto text-xs text-stone-400">
                step {d.sequence_step} of 4 · {p.touch_count} sent
                {d.status === "approved" ? " · approved" : ""}
              </span>
            </header>

            <div className="space-y-3 px-4 py-3">
              <div className="text-sm">
                <span className="text-stone-400">To: </span>
                {p.contact_name ? `${p.contact_name} · ` : ""}
                {p.contact_email ? (
                  <span className="font-medium">{p.contact_email}</span>
                ) : (
                  <span className="text-red-600">no email address — find one before sending</span>
                )}
              </div>

              {p.trigger_detail ? (
                <div className="rounded border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-600">
                  <span className="font-medium">Claim in this email: </span>
                  {p.trigger_detail}
                  {p.trigger_source_url ? (
                    <>
                      {" — "}
                      <a
                        href={p.trigger_source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        source
                      </a>
                    </>
                  ) : (
                    <span className="ml-1 font-medium text-red-600">no source — verify before sending</span>
                  )}
                </div>
              ) : (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  No verifiable fact recorded for this company. Do not send a generic email.
                </div>
              )}

              <div>
                <div className="text-xs font-medium text-stone-500">Subject</div>
                <div className="mt-0.5 text-sm font-medium">{d.subject}</div>
              </div>

              <div>
                <div className="text-xs font-medium text-stone-500">Body</div>
                <pre className="mt-1 whitespace-pre-wrap rounded border border-stone-200 bg-stone-50 px-3 py-2 font-sans text-sm leading-relaxed">
                  {d.body}
                </pre>
              </div>
            </div>

            <footer className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3">
              <CopyButton text={d.body} label="Copy body" />
              <CopyButton text={d.subject} label="Copy subject" />

              {d.status === "pending" ? (
                <form action={approveDraft}>
                  <input type="hidden" name="draft_id" value={d.id} />
                  <button className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">
                    Approve
                  </button>
                </form>
              ) : null}

              <form action={markSent} className="flex items-center gap-2">
                <input type="hidden" name="draft_id" value={d.id} />
                <input
                  name="sent_from"
                  placeholder="sent from (mailbox)"
                  className="w-44 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
                />
                <button className="rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-stone-700">
                  Mark sent
                </button>
              </form>

              <form action={discardDraft} className="ml-auto flex items-center gap-2">
                <input type="hidden" name="draft_id" value={d.id} />
                <input
                  name="reason"
                  placeholder="why discarded"
                  className="w-40 rounded-md border border-stone-200 px-2 py-1.5 text-sm"
                />
                <button className="rounded-md px-2 py-1.5 text-sm text-stone-500 hover:text-red-600">
                  Discard
                </button>
              </form>
            </footer>
          </article>
        );
      })}
    </div>
  );
}
