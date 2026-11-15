import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { toggleWireCenterWorked } from "@/app/actions";
import SearchInput from "@/components/SearchInput";
import {
  Empty,
  PageHeader,
  Pill,
  SourceLink,
  Table,
  TableFrame,
  Td,
  Th,
  Tr,
  btnGhost,
  daysUntil,
  fmtDate,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const views = [
  { key: "open", label: "Not yet worked" },
  { key: "all", label: "All" },
  { key: "worked", label: "Worked" },
];

function sanitize(q: string) {
  return q
    .replace(/[,()\\%*{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export default async function WireCenters({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const { q, view } = await searchParams;
  const supabase = await supabaseServer();

  let query = supabase
    .from("wire_centers")
    .select("*")
    .order("discontinue_date", { ascending: true, nullsFirst: false })
    .limit(500);

  const current = view ?? "open";
  if (current === "open") query = query.eq("worked", false);
  if (current === "worked") query = query.eq("worked", true);

  const term = q ? sanitize(q) : "";
  if (term) {
    const conditions = [
      `carrier.ilike.%${term}%`,
      `name.ilike.%${term}%`,
      `state.ilike.%${term}%`,
      `notes.ilike.%${term}%`,
    ];
    // ZIPs live in a text[], so an exact element match is the right operator.
    if (/^\d{3,5}$/.test(term)) conditions.push(`zips.cs.{${term}}`);
    query = query.or(conditions.join(","));
  }

  const { data, error } = await query;
  const centers = data ?? [];

  const hrefFor = (v: string) => {
    const p = new URLSearchParams();
    if (v !== "open") p.set("view", v);
    if (q) p.set("q", q);
    const qs = p.toString();
    return `/wire-centers${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Wire centers"
        count={centers.length}
        lead="Every date here comes from a carrier filing. No date goes into an email without one."
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <SearchInput
          placeholder="Search carrier, wire center, state, ZIP"
          hint="Searches carrier, wire center name, state and notes. A 3-5 digit term also matches an exact ZIP."
        />
        <nav aria-label="Filter" className="flex flex-wrap items-center gap-1">
          {views.map((v) => {
            const active = current === v.key;
            return (
              <Link
                key={v.key}
                href={hrefFor(v.key)}
                aria-current={active ? "true" : undefined}
                className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-ink text-canvas"
                    : "text-muted ring-1 ring-inset ring-line hover:bg-surface-2 hover:text-ink"
                }`}
              >
                {v.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {error ? (
        <div className="rounded-xl border border-danger/35 bg-danger-soft/50 px-4 py-3 text-sm text-ink">
          Could not load wire centers: {error.message}
        </div>
      ) : null}

      <TableFrame>
        {centers.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Wire center</Th>
                <Th>Carrier</Th>
                <Th>State</Th>
                <Th>ZIPs</Th>
                <Th>Filed date</Th>
                <Th>Source</Th>
                <Th align="right">Worked</Th>
              </tr>
            </thead>
            <tbody>
              {centers.map((c) => {
                const left = daysUntil(c.discontinue_date);
                const past = left !== null && left < 0;
                const soon = left !== null && left >= 0 && left <= 45;
                return (
                  <Tr key={c.id} dimmed={c.worked}>
                    <Td className="font-medium text-ink">{c.name}</Td>
                    <Td className="max-w-[20rem]">
                      <span className="block truncate text-muted" title={c.carrier}>
                        {c.carrier}
                      </span>
                    </Td>
                    <Td className="text-muted">{c.state}</Td>
                    <Td className="max-w-[14rem]">
                      <span className="block truncate font-mono text-xs text-muted">
                        {(c.zips ?? []).slice(0, 6).join(", ")}
                        {(c.zips?.length ?? 0) > 6 ? ` +${c.zips.length - 6}` : ""}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap">
                      {c.discontinue_date ? (
                        <span
                          className={
                            soon
                              ? "font-semibold text-warn"
                              : past
                                ? "text-subtle"
                                : "text-muted"
                          }
                        >
                          {fmtDate(c.discontinue_date)}
                          {soon ? <span className="text-xs"> · in {left}d</span> : null}
                          {past ? <span className="text-xs"> · window open</span> : null}
                        </span>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>
                    <Td>
                      {c.source_url ? <SourceLink href={c.source_url}>filing</SourceLink> : "—"}
                    </Td>
                    <Td align="right">
                      <form action={toggleWireCenterWorked} className="flex justify-end">
                        <input type="hidden" name="wire_center_id" value={c.id} />
                        <input type="hidden" name="worked" value={String(c.worked)} />
                        <button className={`${btnGhost} text-xs`}>
                          {c.worked ? <Pill tone="ok">done</Pill> : "Mark done"}
                        </button>
                      </form>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <Empty>
            {term
              ? `No wire center matches “${term}”.`
              : current === "open"
                ? "Nothing left unworked. Switch to All to see the archive."
                : "The agent records wire centers here as it finds new filings."}
          </Empty>
        )}
      </TableFrame>
    </>
  );
}
