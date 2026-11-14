import Link from "next/link";

export function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white">
      <div className="flex items-baseline justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-stone-600">{label}</div>
      {hint ? <div className="mt-1 text-xs text-stone-400">{hint}</div> : null}
    </div>
  );
}

const triggerLabels: Record<string, string> = {
  copper_sunset: "Copper sunset",
  pbx_eol: "PBX end-of-life",
  switch_intent: "Switch intent",
  multi_location: "Multi-location",
  msp_partner: "MSP partner",
  other: "Other",
};

export function TriggerBadge({ trigger }: { trigger: string | null }) {
  if (!trigger) return null;
  return (
    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
      {triggerLabels[trigger] ?? trigger}
    </span>
  );
}

const statusTone: Record<string, string> = {
  new: "bg-stone-100 text-stone-600",
  researched: "bg-blue-50 text-blue-700",
  drafted: "bg-amber-50 text-amber-700",
  contacted: "bg-indigo-50 text-indigo-700",
  replied: "bg-emerald-50 text-emerald-700",
  qualified: "bg-emerald-100 text-emerald-800",
  won: "bg-emerald-600 text-white",
  lost: "bg-stone-200 text-stone-500",
  dnc: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusTone[status] ?? ""}`}>
      {status}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-stone-400">{children}</p>;
}

export function ProspectLink({ id, company }: { id: string; company: string }) {
  return (
    <Link href={`/prospects/${id}`} className="font-medium hover:underline">
      {company}
    </Link>
  );
}

export function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
