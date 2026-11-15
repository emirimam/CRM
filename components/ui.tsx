import Link from "next/link";

/* ---------------------------------------------------------------- shells -- */

export function PageHeader({
  title,
  lead,
  count,
  actions,
}: {
  title: string;
  lead?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {count !== undefined && count !== null ? (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-muted ring-1 ring-inset ring-line">
              {count}
            </span>
          ) : null}
        </div>
        {lead ? <p className="mt-1.5 max-w-2xl text-sm text-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  bodyClass = "px-4 py-3",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  bodyClass?: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/40 px-4 py-2.5">
          <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  tone?: "neutral" | "accent" | "warn" | "ok" | "danger";
}) {
  const accentBar = {
    neutral: "bg-line-strong",
    accent: "bg-accent",
    warn: "bg-warn",
    ok: "bg-ok",
    danger: "bg-danger",
  }[tone];

  const inner = (
    <>
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-[2px] ${accentBar} opacity-70`}
      />
      <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      {hint ? <div className="mt-1 text-xs text-subtle">{hint}</div> : null}
    </>
  );

  const base =
    "relative overflow-hidden rounded-xl border border-line bg-surface px-4 py-3.5 shadow-xs";

  return href ? (
    <Link
      href={href}
      className={`${base} block transition-[box-shadow,border-color,transform] duration-200 ease-snap hover:-translate-y-px hover:border-line-strong hover:shadow-md`}
    >
      {inner}
    </Link>
  ) : (
    <div className={base}>{inner}</div>
  );
}

export function Callout({
  tone = "warn",
  title,
  children,
}: {
  tone?: "warn" | "danger" | "info";
  title?: string;
  children: React.ReactNode;
}) {
  const tones = {
    warn: "border-warn/35 bg-warn-soft/50 text-ink",
    danger: "border-danger/35 bg-danger-soft/50 text-ink",
    info: "border-info/35 bg-info-soft/50 text-ink",
  }[tone];
  const dot = { warn: "bg-warn", danger: "bg-danger", info: "bg-info" }[tone];

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${tones}`}>
      {title ? (
        <div className="mb-1 flex items-center gap-2 font-semibold">
          <span aria-hidden className={`size-1.5 rounded-full ${dot}`} />
          {title}
        </div>
      ) : null}
      <div className="whitespace-pre-wrap text-ink/90">{children}</div>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <p className="text-sm font-medium text-muted">{children}</p>
    </div>
  );
}

/* ----------------------------------------------------------------- table -- */

export function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-xs">
      <div className="max-h-[calc(100vh-15rem)] overflow-auto">{children}</div>
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-separate border-spacing-0 text-sm">{children}</table>;
}

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 whitespace-nowrap border-b border-line bg-surface-2/95 px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-muted backdrop-blur ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <td
      className={`border-b border-line/60 px-3 py-2 ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Tr({
  children,
  dimmed = false,
}: {
  children: React.ReactNode;
  dimmed?: boolean;
}) {
  /*
    Deliberately not `opacity-*` for the dimmed state. Two reasons: it drags
    the whole row below a readable contrast ratio, and an opacity layer makes
    Chromium mis-composite the oklch-with-alpha badge fills inside it (DNC
    pills rendered cyan). A tinted background plus muted text reads as
    de-emphasised without either problem.
  */
  return (
    <tr
      className={`group transition-colors ${
        dimmed
          ? "bg-surface-2/50 text-subtle hover:bg-surface-2 [&_a]:text-subtle"
          : "hover:bg-accent/[0.055]"
      }`}
    >
      {children}
    </tr>
  );
}

/* ---------------------------------------------------------------- badges -- */

const triggerLabels: Record<string, string> = {
  copper_sunset: "Copper sunset",
  pbx_eol: "PBX end-of-life",
  switch_intent: "Switch intent",
  multi_location: "Multi-location",
  msp_partner: "MSP partner",
  other: "Other",
};

const triggerTone: Record<string, string> = {
  copper_sunset: "bg-warn-soft/60 text-warn ring-warn/25",
  pbx_eol: "bg-info-soft/60 text-info ring-info/25",
  switch_intent: "bg-accent-soft/60 text-accent ring-accent/25",
  multi_location: "bg-surface-3 text-muted ring-line-strong",
  msp_partner: "bg-ok-soft/60 text-ok ring-ok/25",
  other: "bg-surface-3 text-muted ring-line-strong",
};

export function TriggerBadge({ trigger }: { trigger: string | null }) {
  if (!trigger) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-semibold ring-1 ring-inset ${
        triggerTone[trigger] ?? triggerTone.other
      }`}
    >
      {triggerLabels[trigger] ?? trigger}
    </span>
  );
}

const statusTone: Record<string, string> = {
  new: "bg-surface-3 text-muted ring-line-strong",
  researched: "bg-info-soft/60 text-info ring-info/25",
  drafted: "bg-warn-soft/60 text-warn ring-warn/25",
  contacted: "bg-accent-soft/60 text-accent ring-accent/25",
  replied: "bg-ok-soft/60 text-ok ring-ok/30",
  qualified: "bg-ok text-canvas ring-transparent",
  won: "bg-ok text-canvas ring-transparent",
  lost: "bg-surface-3 text-subtle ring-line",
  dnc: "bg-danger-soft/60 text-danger ring-danger/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-semibold capitalize ring-1 ring-inset ${
        statusTone[status] ?? statusTone.new
      }`}
    >
      {status}
    </span>
  );
}

/* Small neutral chip for counts, steps, "3/4 touches" and the like. */
export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "danger" | "ok";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted ring-line",
    danger: "bg-danger-soft/60 text-danger ring-danger/30",
    ok: "bg-ok-soft/60 text-ok ring-ok/30",
  }[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-2xs font-medium tabular-nums ring-1 ring-inset ${tones}`}
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------------- links -- */

export function ProspectLink({ id, company }: { id: string; company: string }) {
  return (
    <Link
      href={`/prospects/${id}`}
      className="font-medium text-ink decoration-line-strong decoration-1 underline-offset-2 transition-colors hover:text-accent hover:underline hover:decoration-accent/50"
    >
      {company}
    </Link>
  );
}

export function SourceLink({ href, children = "filing" }: { href: string; children?: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-accent underline decoration-accent/35 underline-offset-2 transition-colors hover:decoration-accent"
    >
      {children}
      <svg aria-hidden viewBox="0 0 12 12" className="size-2.5 shrink-0" fill="none">
        <path
          d="M4.5 1.5h6v6M10.5 1.5 4 8M8 10.5H1.5V4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

/* --------------------------------------------------- shared control classes */

export const btn =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-xs transition-colors hover:bg-surface-2 active:bg-surface-3 disabled:opacity-50";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg shadow-xs transition-colors hover:bg-accent-hover disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink";

export const btnDanger =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-danger-soft/60 hover:text-danger";

export const input =
  "rounded-lg border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink shadow-xs transition-colors placeholder:text-subtle hover:border-line-strong focus:border-accent";

/* ------------------------------------------------------------------ dates -- */

export function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "today", "yesterday", "4 days ago" — for the agent's last-run line. */
export function fmtRelative(d: string | null) {
  if (!d) return "—";
  const then = new Date(d);
  const days = Math.round((Date.now() - then.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
}

/** Days until a date, negative if already past. Null-safe. */
export function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}
