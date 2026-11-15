"use client";

import { useEffect, useRef, useState } from "react";
import { updateProspectField } from "@/app/actions";

type Kind = "text" | "email" | "tel" | "url" | "number" | "date" | "select" | "textarea";

/**
 * Click-to-edit value. Shows the current value as a button; clicking turns it
 * into the right control, Enter or blur saves, Escape cancels.
 *
 * The value shown while saving is the one just typed, so the field never
 * flickers back to the old value waiting for the server. If the save is
 * rejected it reverts and shows why.
 */
export default function InlineField({
  prospectId,
  field,
  value,
  kind = "text",
  options,
  placeholder = "—",
  align = "right",
}: {
  prospectId: string;
  field: string;
  value: string | number | boolean | null;
  kind?: Kind;
  options?: { value: string; label: string }[];
  placeholder?: string;
  align?: "left" | "right";
}) {
  const initial = value === null || value === undefined ? "" : String(value);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [shown, setShown] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Follow the server once it confirms, unless the user is mid-edit.
  useEffect(() => {
    if (!editing && state !== "saving") {
      setShown(initial);
      setDraft(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  useEffect(() => {
    if (editing) {
      ref.current?.focus();
      if (ref.current instanceof HTMLInputElement) ref.current.select();
    }
  }, [editing]);

  async function save(next: string) {
    setEditing(false);
    if (next === shown) return;

    const previous = shown;
    setShown(next);
    setState("saving");
    setError(null);

    const res = await updateProspectField(prospectId, field, next);

    if (res.ok) {
      setState("saved");
      setTimeout(() => setState("idle"), 1400);
    } else {
      setShown(previous);
      setDraft(previous);
      setError(res.error);
      setState("error");
    }
  }

  const label =
    kind === "select"
      ? (options?.find((o) => o.value === shown)?.label ?? shown)
      : shown;

  if (!editing) {
    return (
      <span className={`inline-flex min-w-0 items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Click to edit"
          className={`group/f min-w-0 truncate rounded px-1 py-0.5 -mx-1 text-left transition-colors hover:bg-accent/10 focus-visible:bg-accent/10 ${
            shown ? "text-ink" : "text-subtle italic"
          }`}
        >
          {label || placeholder}
          <span
            aria-hidden
            className="ml-1 align-middle text-2xs text-subtle opacity-0 transition-opacity group-hover/f:opacity-100"
          >
            edit
          </span>
        </button>

        {state === "saving" ? (
          <span
            aria-hidden
            className="size-2.5 shrink-0 animate-spin rounded-full border-[1.5px] border-line-strong border-t-accent"
          />
        ) : null}
        {state === "saved" ? (
          <span aria-hidden className="shrink-0 text-2xs font-semibold text-ok">
            saved
          </span>
        ) : null}
        {state === "error" && error ? (
          <span className="shrink-0 text-2xs font-semibold text-danger" title={error}>
            {error}
          </span>
        ) : null}
      </span>
    );
  }

  const shared =
    "w-full min-w-0 rounded-lg border border-accent bg-surface px-2 py-1 text-sm text-ink shadow-xs";

  if (kind === "select") {
    return (
      <select
        ref={ref as React.RefObject<HTMLSelectElement>}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          save(e.target.value);
        }}
        onBlur={() => setEditing(false)}
        className={shared}
      >
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (kind === "textarea") {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        value={draft}
        rows={5}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => save(draft)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setDraft(shown);
            setEditing(false);
          }
          // Enter makes a new line here; Cmd/Ctrl+Enter saves.
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save(draft);
        }}
        className={`${shared} leading-relaxed`}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      type={kind === "number" ? "number" : kind}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => save(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save(draft);
        }
        if (e.key === "Escape") {
          setDraft(shown);
          setEditing(false);
        }
      }}
      className={shared}
    />
  );
}
