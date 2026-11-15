"use client";

import { useState } from "react";
import { btn } from "@/components/ui";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1600);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-live="polite"
      className={`${btn} ${state === "done" ? "border-ok/45 text-ok" : ""} ${
        state === "failed" ? "border-danger/45 text-danger" : ""
      }`}
    >
      {state === "done" ? (
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3.5">
          <path
            d="m3.2 8.4 3 3 6.6-7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 16 16" fill="none" className="size-3.5">
          <rect x="5.4" y="5.4" width="8.2" height="8.2" rx="1.6" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M10.6 5.4V4A1.6 1.6 0 0 0 9 2.4H4A1.6 1.6 0 0 0 2.4 4v5A1.6 1.6 0 0 0 4 10.6h1.4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      )}
      {state === "done" ? "Copied" : state === "failed" ? "Press ⌘C" : label}
    </button>
  );
}
