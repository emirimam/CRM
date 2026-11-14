"use client";

import { useState } from "react";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      setDone(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
    >
      {done ? "Copied" : label}
    </button>
  );
}
