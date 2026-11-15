import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, getViewer } from "@/lib/perms";
import { getSettings, optionLabel, optionTone, selectable } from "@/lib/settings";
import InlineField from "@/components/InlineField";
import SearchInput from "@/components/SearchInput";
import {
  Badge,
  Empty,
  PageHeader,
  Pill,
  ProspectLink,
  Table,
  TableFrame,
  Td,
  Th,
  Tr,
  daysUntil,
  fmtDate,
} from "@/components/ui";

export const dynamic = "force-dynamic";

/*
  Fields the free-text box looks in. Searching only `company` was the main
  reason the list felt unsearchable — the useful handles (a contact's name, a
  ZIP, the wire-center fact) all live in other columns. This stays independent
  of which columns are visible: you can search what you cannot see.
*/
const SEARCH_COLUMNS = [
  "company", "contact_name", "contact_email", "contact_phone", "city", "state", "zip",
  "industry", "current_provider", "current_system", "trigger_detail", "notes",
];

/**
 * PostgREST parses `or=(...)` by splitting on commas and parentheses, so those
 * characters in user input would corrupt the filter rather than match.
 */
function sanitize(q: string) {
  return q.replace(/[,()\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export default async function Prospects({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const supabase = await supabaseServer();
  const [viewer, settings] = await Promise.all([getViewer(), getSettings()]);
  const editable = canWrite(viewer);

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

  const visible = settings.columns.filter((c) => c.visible);
  const statusOptions = selectable(settings.status).map((o) => ({
    value: o.value,
    label: o.label,
  }));
  // "dnc" goes through the do-not-contact button, which also discards drafts.
  const inlineStatusOptions = statusOptions.filter((o) => o.value !== "dnc");

  const hrefFor = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/prospects${qs ? `?${qs}` : ""}`;
  };

  const filters = [{ value: "all", label: "All" }, ...statusOptions];

  function cell(key: string, p: Record<string, unknown>) {
    switch (key) {
      case "company":
        return (
          <Td key={key} className="max-w-[22rem]">
            <div className="flex items-center gap-1.5">
              <ProspectLink id={p.id as string} company={p.company as string} />
              {p.do_not_contact ? <Pill tone="danger">DNC</Pill> : null}
            </div>
            {p.industry ? (
              <div className="truncate text-xs text-subtle">{p.industry as string}</div>
            ) : null}
          </Td>
        );
      case "where":
        return (
          <Td key={key} className="whitespace-nowrap text-muted">
            {[p.city, p.state].filter(Boolean).join(", ") || "—"}
            {p.zip ? <span className="text-subtle"> {p.zip as string}</span> : null}
          </Td>
        );
      case "trigger":
        return (
          <Td key={key}>
            <Badge
              label={optionLabel(settings.trigger, p.trigger as string)}
              tone={optionTone(settings.trigger, p.trigger as string)}
            />
          </Td>
        );
      case "contact":
        return (
          <Td key={key} className="max-w-[18rem]">
            {p.contact_name ? (
              <div className="truncate text-ink">{p.contact_name as string}</div>
            ) : null}
            {p.contact_email ? (
              <a
                href={`mailto:${p.contact_email}`}
                className="truncate text-xs text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
              >
                {p.contact_email as string}
              </a>
            ) : (
              <span className="text-xs font-medium text-danger">no email</span>
            )}
          </Td>
        );
      case "est_seats":
      case "locations":
        return (
          <Td key={key} align="right" className="tabular-nums text-muted">
            {(p[key] as number) ?? "—"}
          </Td>
        );
      case "renewal_date": {
        const left = daysUntil(p.renewal_date as string | null);
        const soon = left !== null && left >= 0 && left <= 75;
        return (
          <Td key={key} className="whitespace-nowrap">
            {p.renewal_date ? (
              <span className={soon ? "font-medium text-warn" : "text-muted"}>
                {fmtDate(p.renewal_date as string)}
                {soon ? <span className="text-xs"> · {left}d</span> : null}
              </span>
            ) : (
              <span className="text-subtle">—</span>
            )}
          </Td>
        );
      }
      case "next_touch_at":
        return (
          <Td key={key} className="whitespace-nowrap text-muted">
            {p.next_touch_at ? fmtDate(p.next_touch_at as string) : <span className="text-subtle">—</span>}
          </Td>
        );
      case "touches": {
        const n = p.touch_count as number;
        return (
          <Td key={key} align="right">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="flex gap-0.5" title={`${n} of 4 touches used`}>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-3 w-1 rounded-sm ${
                      i < n ? (n >= 4 ? "bg-danger" : "bg-accent") : "bg-surface-3"
                    }`}
                  />
                ))}
              </span>
              <span className="tabular-nums text-xs text-muted">{n}/4</span>
            </span>
          </Td>
        );
      }
      case "status":
        return (
          <Td key={key}>
            {p.do_not_contact || !editable ? (
              <Badge
                label={optionLabel(settings.status, p.status as string)}
                tone={optionTone(settings.status, p.status as string)}
              />
            ) : (
              <InlineField
                prospectId={p.id as string}
                field="status"
                value={p.status as string}
                kind="select"
                options={inlineStatusOptions}
                align="left"
              />
            )}
          </Td>
        );
      default:
        return (
          <Td key={key} className="max-w-[14rem] text-muted">
            <span className="block truncate">{(p[key] as string) ?? "—"}</span>
          </Td>
        );
    }
  }

  return (
    <>
      <PageHeader
        title="Prospects"
        count={`${rows.length}${rows.length === 200 ? "+" : ""}`}
        lead={
          term
            ? `Searching company, contact, location, provider, trigger detail and notes for “${term}”.`
            : editable
              ? "Press / to search across every field. Click a status to change it."
              : "Press / to search across every field. Your account is read-only."
        }
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput
          placeholder="Search prospects"
          hint="Searches company, contact name, email, phone, city, state, ZIP, industry, provider, trigger detail and notes."
        />

        <nav aria-label="Filter by status" className="flex flex-wrap items-center gap-1">
          {filters.map((s) => {
            const active = (status ?? "all") === s.value;
            return (
              <Link
                key={s.value}
                href={hrefFor(s.value)}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-ink text-canvas"
                    : "text-muted ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {s.label}
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
                {visible.map((c) => (
                  <Th
                    key={c.key}
                    align={["est_seats", "locations", "touches"].includes(c.key) ? "right" : "left"}
                  >
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <Tr key={p.id} dimmed={p.do_not_contact}>
                  {visible.map((c) => cell(c.key, p as Record<string, unknown>))}
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>
            {term
              ? `Nothing matches “${term}”.`
              : status && status !== "all"
                ? "No prospects with that status."
                : "No prospects yet. The agent adds them as it researches."}
          </Empty>
        )}
      </TableFrame>
    </>
  );
}
