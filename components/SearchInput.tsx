"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Search-as-you-type. Pushes `q` into the URL after a short debounce, so the
 * server component re-queries and the result stays shareable/bookmarkable.
 *
 * Press "/" anywhere to focus it, Escape to clear.
 */
export default function SearchInput({
  placeholder = "Search",
  hint,
  autoFocus = false,
}: {
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlQ = params.get("q") ?? "";
  const [value, setValue] = useState(urlQ);
  const ref = useRef<HTMLInputElement>(null);
  const touched = useRef(false);

  // Keep in step when the URL changes from somewhere else (back button,
  // a status chip click) without stomping on what is being typed.
  useEffect(() => {
    if (!touched.current) setValue(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (!touched.current) return;
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      startTransition(() => {
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }, 220);
    return () => clearTimeout(t);
    // `params` is intentionally read fresh inside the timeout only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router]);

  // "/" focuses the box from anywhere on the page.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el as HTMLElement | null)?.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function clear() {
    touched.current = true;
    setValue("");
    ref.current?.focus();
  }

  return (
    <div className="relative min-w-0 flex-1 sm:max-w-sm">
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
      >
        <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="m10.5 10.5 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <input
        ref={ref}
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => {
          touched.current = true;
          setValue(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") clear();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-describedby={hint ? "search-hint" : undefined}
        className="w-full rounded-lg border border-line-strong bg-surface py-1.5 pl-9 pr-16 text-sm text-ink shadow-xs transition-colors placeholder:text-subtle focus:border-accent [&::-webkit-search-cancel-button]:hidden"
      />

      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {pending ? (
          <span
            aria-hidden
            className="size-3 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent"
          />
        ) : null}

        {value ? (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="rounded px-1 text-xs font-medium text-subtle transition-colors hover:text-ink"
          >
            Clear
          </button>
        ) : (
          <kbd className="hidden select-none rounded border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-subtle sm:block">
            /
          </kbd>
        )}
      </div>

      {hint ? (
        <span id="search-hint" className="sr-only">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
