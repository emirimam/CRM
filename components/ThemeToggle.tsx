"use client";

import { useEffect, useState } from "react";

type Mode = "system" | "light" | "dark";

/**
 * Writes `data-theme` on <html> and remembers the choice. The matching
 * pre-paint script lives in app/layout.tsx so there is no flash on load.
 */
export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    setMode(stored === "light" || stored === "dark" ? stored : "system");
  }, []);

  function apply(next: Mode) {
    setMode(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem("theme");
    } else {
      root.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    }
  }

  const options: { value: Mode; label: string; icon: React.ReactNode }[] = [
    {
      value: "light",
      label: "Light",
      icon: (
        <>
          <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M8 1.4v1.3M8 13.3v1.3M1.4 8h1.3M13.3 8h1.3M3.3 3.3l.9.9M11.8 11.8l.9.9M12.7 3.3l-.9.9M4.2 11.8l-.9.9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      ),
    },
    {
      value: "system",
      label: "System",
      icon: (
        <>
          <rect x="1.9" y="2.6" width="12.2" height="8.4" rx="1.3" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 13.4h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ),
    },
    {
      value: "dark",
      label: "Dark",
      icon: (
        <path
          d="M13 9.4A5.6 5.6 0 0 1 6.6 3a5.6 5.6 0 1 0 6.4 6.4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      ),
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5"
    >
      {options.map((o) => {
        const active = mode === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => apply(o.value)}
            className={`grid size-6 place-items-center rounded-md transition-colors ${
              active
                ? "bg-surface text-ink shadow-xs"
                : "text-subtle hover:text-ink"
            }`}
          >
            <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3.5">
              {o.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
