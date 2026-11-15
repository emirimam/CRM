import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import SearchInput from "@/components/SearchInput";
import {
  Empty,
  PageHeader,
  Pill,
  ProspectLink,
  StatusBadge,
  Table,
  TableFrame,
  Td,
  Th,
  Tr,
  TriggerBadge,
  daysUntil,
  fmtDate,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const statuses = [
  "all", "new", "researched", "drafted", "contacted", "replied", "qualified", "won", "lost", "dnc",
];

/*
  Fields the free-text box looks in. Searching only `company` was the main
  reason the list felt unsearchable — the useful handles (a contact's name, a
  ZIP, the wire-center fact) all live in other columns.
*/
const SEARCH_COLUMNS = [
  "company",
  "contact_name",
  "contact_email",
  "contact_phone",
  "city",
  "state",
  "zip",
  "industry",
  "current_provider",
  "current_system",
  "trigger_detail",
  "notes",
];

/**
 * PostgREST parses `or=(...)` by splitting on commas and parentheses, so those
 * characters in user input would corrupt the filter rather than match. Strip
 * them, plus the LIKE wildcards, and cap the length.
 */
function sanitize(q: string) {
  return q
    .replace(/[,()\\%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

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

  const term = q ? sanitize(q) : "";
  if (term) {
    query = query.or(SEARCH_COLUMNS.map((c) => `${c}.ilike.%${term}%`).join(","));
  }

  const { data: prospects, error } = await query;
  const rows = prospects ?? [];

  const hrefFor = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/prospects${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Prospects"
        count={`${rows.length}${rows.length === 200 ? "+" : ""}`}
        lead={
          term
            ? `Searching company, contact, location, provider, trigger detail and notes for “${term}”.`
            : "Press / to search across company, contact, location, trigger detail and notes."
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput
          placeholder="Search prospects"
          hint="Searches company, contact name, email, phone, city, state, ZIP, industry, provider, trigger detail and notes."
        />

        <nav aria-label="Filter by status" className="flex flex-wrap items-center gap-1">
          {statuses.map((s) => {
            const active = (status ?? "all") === s;
            return (
              <Link
                key={s}
                href={hrefFor(s)}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg px-2 py-1 text-xs font-medium capitalize transition-colors ${
                  active
                    ? "bg-ink text-canvas"
                    : "text-muted ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {s}
              </Link>
            );
          })}
        </nav>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/35 bg-danger-soft/50 px-4 py-3 text-sm text-ink">
          Could not load prospects: {error.message}
        </div>
      ) : null}

      <TableFrame>
        {rows.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Where</Th>
                <Th>Trigger</Th>
                <Th>Contact</Th>
                <Th align="right">Seats</Th>
                <Th>Renewal</Th>
                <Th align="right">Touches</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const left = daysUntil(p.renewal_date);
                const soon = left !== null && left >= 0 && left <= 75;
                return (
                  <Tr key={p.id} dimmed={p.do_not_contact}>
                    <Td className="max-w-[22rem]">
                      <div className="flex items-center gap-1.5">
                        <ProspectLink id={p.id} company={p.company} />
                        {p.do_not_contact ? <Pill tone="danger">DNC</Pill> : null}
                      </div>
                      {p.industry ? (
                        <div className="truncate text-xs text-subtle">{p.industry}</div>
                      ) : null}
                    </Td>

                    <Td className="whitespace-nowrap text-muted">
                      {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                      {p.zip ? <span className="text-subtle"> {p.zip}</span> : null}
                    </Td>

                    <Td>
                      <TriggerBadge trigger={p.trigger} />
                    </Td>

                    <Td className="max-w-[18rem]">
                      {p.contact_name ? (
                        <div className="truncate text-ink">{p.contact_name}</div>
                      ) : null}
                      {p.contact_email ? (
                        <a
                          href={`mailto:${p.contact_email}`}
                          className="truncate text-xs text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                        >
                          {p.contact_email}
                        </a>
                      ) : (
                        <span className="text-xs font-medium text-danger">no email</span>
                      )}
                    </Td>

                    <Td align="right" className="tabular-nums text-muted">
                      {p.est_seats ?? "—"}
                    </Td>

                    <Td className="whitespace-nowrap">
                      {p.renewal_date ? (
                        <span className={soon ? "font-medium text-warn" : "text-muted"}>
                          {fmtDate(p.renewal_date)}
                          {soon ? <span className="text-xs"> · {left}d</span> : null}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>

                    <Td align="right">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          aria-hidden
                          className="flex gap-0.5"
                          title={`${p.touch_count} of 4 touches used`}
                        >
                          {[0, 1, 2, 3].map((i) => (
                            <span
                              key={i}
                              className={`h-3 w-1 rounded-sm ${
                                i < p.touch_count
                                  ? p.touch_count >= 4
                                    ? "bg-danger"
                                    : "bg-accent"
                                  : "bg-surface-3"
                              }`}
                            />
                          ))}
                        </span>
                        <span className="tabular-nums text-xs text-muted">{p.touch_count}/4</span>
                      </span>
                    </Td>

                    <Td>
                      <StatusBadge status={p.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <Empty>
            {term
              ? `Nothing matches “${term}”.`
              : status && status !== "all"
                ? `No prospects with status “${status}”.`
                : "No prospects yet. The agent adds them as it researches."}
          </Empty>
        )}
      </TableFrame>
    </>
  );
}
