"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today" },
  { href: "/drafts", label: "Drafts" },
  { href: "/prospects", label: "Prospects" },
  { href: "/wire-centers", label: "Wire centers" },
  { href: "/runs", label: "Agent runs" },
];

export default function NavLinks({ draftCount = 0 }: { draftCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/70 hover:text-ink"
            }`}
          >
            {l.label}
            {l.href === "/drafts" && draftCount > 0 ? (
              <span
                className={`rounded px-1 py-px text-2xs font-semibold tabular-nums ${
                  active ? "bg-accent text-accent-fg" : "bg-accent/15 text-accent"
                }`}
              >
                {draftCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
