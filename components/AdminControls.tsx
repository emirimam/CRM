"use client";

import { useState, useTransition } from "react";
import {
  addCustomField,
  addFieldOption,
  createUser,
  retireCustomField,
  setRole,
  updateCustomField,
  updateFieldOption,
  updateListColumn,
} from "@/app/admin/actions";
import { Badge, btn, btnPrimary, input, toneClass } from "@/components/ui";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/** Shared pending/feedback handling so every control behaves the same. */
function useAction() {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  function run(fn: () => Promise<Result>, successText?: string) {
    setNote(null);
    start(async () => {
      const res = await fn();
      if (res.ok) {
        setNote({ ok: true, text: res.message ?? successText ?? "Saved" });
        setTimeout(() => setNote(null), 2500);
      } else {
        setNote({ ok: false, text: res.error });
      }
    });
  }

  const Note = () =>
    note ? (
      <p
        className={`text-xs font-medium ${note.ok ? "text-ok" : "text-danger"}`}
        role={note.ok ? "status" : "alert"}
      >
        {note.text}
      </p>
    ) : null;

  return { pending, run, Note };
}

const TONES = ["neutral", "accent", "ok", "warn", "danger", "info"];
const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "viewer", label: "Viewer" },
];

/* ------------------------------------------------------------- users --- */

export function UserRow({
  userId,
  email,
  role,
  isYou,
}: {
  userId: string;
  email: string;
  role: string;
  isYou: boolean;
}) {
  const { pending, run, Note } = useAction();

  return (
    <div className="flex flex-wrap items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-ink">
          {email}
          {isYou ? <span className="ml-1.5 text-xs font-normal text-subtle">(you)</span> : null}
        </div>
        <Note />
      </div>
      <select
        defaultValue={role}
        disabled={pending}
        onChange={(e) => run(() => setRole(userId, e.target.value))}
        className={input}
        aria-label={`Role for ${email}`}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CreateUserForm() {
  const { pending, run, Note } = useAction();
  const [pw, setPw] = useState("");

  function suggest() {
    // Readable but random enough for a one-time password.
    const words = ["copper", "wire", "harbor", "quartz", "cedar", "ember", "lantern", "marble"];
    const pick = () => words[Math.floor(Math.random() * words.length)];
    setPw(`${pick()}-${pick()}-${Math.floor(1000 + Math.random() * 9000)}`);
  }

  return (
    <form
      action={(fd) => run(() => createUser(fd))}
      className="space-y-2.5 border-t border-line pt-3"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        <label className="block text-xs font-medium uppercase tracking-wide text-subtle">
          Email
          <input name="email" type="email" required placeholder="name@itdreamwire.com" className={`mt-1 w-full ${input}`} />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide text-subtle">
          Role
          <select name="role" defaultValue="sales" className={`mt-1 w-full ${input}`}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs font-medium uppercase tracking-wide text-subtle">
        Temporary password
        <div className="mt-1 flex gap-2">
          <input
            name="password"
            required
            minLength={10}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="at least 10 characters"
            className={`flex-1 font-mono ${input}`}
          />
          <button type="button" onClick={suggest} className={btn}>
            Suggest
          </button>
        </div>
      </label>

      <p className="text-xs text-subtle">
        They sign in with this once and are forced to change it before they can use anything.
        Send it to them by a different channel than email if you can.
      </p>

      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Adding…" : "Add user"}
        </button>
        <Note />
      </div>
    </form>
  );
}

/* ----------------------------------------------------- field options --- */

export function OptionRow({
  id,
  value,
  label,
  tone,
  hidden,
  locked,
}: {
  id: string;
  value: string;
  label: string;
  tone: string;
  hidden: boolean;
  locked: boolean;
}) {
  const { pending, run, Note } = useAction();
  const [draft, setDraft] = useState(label);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <input
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== label && draft.trim() && run(() => updateFieldOption(id, { label: draft.trim() }))}
        className={`w-44 ${input}`}
        aria-label={`Label for ${value}`}
      />

      <select
        defaultValue={tone}
        disabled={pending}
        onChange={(e) => run(() => updateFieldOption(id, { tone: e.target.value }))}
        className={input}
        aria-label={`Colour for ${value}`}
      >
        {TONES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <Badge label={draft || value} tone={tone} />

      <code className="font-mono text-2xs text-subtle">{value}</code>

      <div className="ml-auto flex items-center gap-2">
        {locked ? (
          <span className="text-2xs font-medium text-subtle" title="The app's own rules depend on this value">
            locked
          </span>
        ) : (
          <label className="flex items-center gap-1.5 text-2xs font-medium text-muted">
            <input
              type="checkbox"
              defaultChecked={hidden}
              disabled={pending}
              onChange={(e) => run(() => updateFieldOption(id, { hidden: e.target.checked }))}
            />
            hide
          </label>
        )}
      </div>
      <div className="w-full"><Note /></div>
    </div>
  );
}

export function AddOptionForm({ field }: { field: "status" | "trigger" }) {
  const { pending, run, Note } = useAction();

  return (
    <form
      action={(fd) => run(() => addFieldOption(fd))}
      className="flex flex-wrap items-end gap-2 border-t border-line pt-3"
    >
      <input type="hidden" name="field" value={field} />
      <label className="text-xs font-medium uppercase tracking-wide text-subtle">
        Label
        <input name="label" required placeholder="Nurturing" className={`mt-1 w-40 ${input}`} />
      </label>
      <label className="text-xs font-medium uppercase tracking-wide text-subtle">
        Stored value
        <input name="value" required placeholder="nurturing" className={`mt-1 w-40 font-mono ${input}`} />
      </label>
      <button disabled={pending} className={btn}>
        {pending ? "Adding…" : "Add option"}
      </button>
      <Note />
      <p className="w-full text-xs text-subtle">
        The stored value is permanent — it goes into the database and the agent writes against it.
        The label above it can be changed any time.
      </p>
    </form>
  );
}

/* ----------------------------------------------------- custom fields --- */

export function CustomFieldRow({
  id,
  label,
  fieldKey,
  type,
  options,
  active,
}: {
  id: string;
  label: string;
  fieldKey: string;
  type: string;
  options: string[];
  active: boolean;
}) {
  const { pending, run, Note } = useAction();
  const [draft, setDraft] = useState(label);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <input
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== label && draft.trim() && run(() => updateCustomField(id, { label: draft.trim() }))}
        className={`w-48 ${input}`}
        aria-label={`Label for ${fieldKey}`}
      />
      <span className={`rounded-md px-1.5 py-0.5 text-2xs font-semibold ring-1 ring-inset ${toneClass.neutral}`}>
        {type}
      </span>
      {options.length ? (
        <span className="truncate text-xs text-subtle">{options.join(", ")}</span>
      ) : null}
      <code className="font-mono text-2xs text-subtle">custom.{fieldKey}</code>

      <div className="ml-auto flex items-center gap-2">
        {active ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => retireCustomField(id))}
            className="text-2xs font-medium text-muted transition-colors hover:text-danger"
          >
            Turn off
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => updateCustomField(id, { active: true }))}
            className="text-2xs font-medium text-accent"
          >
            Turn back on
          </button>
        )}
      </div>
      <div className="w-full"><Note /></div>
    </div>
  );
}

export function AddCustomFieldForm() {
  const { pending, run, Note } = useAction();
  const [type, setType] = useState("text");

  return (
    <form
      action={(fd) => run(() => addCustomField(fd))}
      className="space-y-2.5 border-t border-line pt-3"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium uppercase tracking-wide text-subtle">
          Label
          <input name="label" required placeholder="Contract end" className={`mt-1 w-48 ${input}`} />
        </label>
        <label className="text-xs font-medium uppercase tracking-wide text-subtle">
          Type
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={`mt-1 ${input}`}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="boolean">Yes / no</option>
            <option value="select">Choice</option>
            <option value="url">Link</option>
          </select>
        </label>
        {type === "select" ? (
          <label className="text-xs font-medium uppercase tracking-wide text-subtle">
            Choices, comma separated
            <input name="options" placeholder="Low, Medium, High" className={`mt-1 w-56 ${input}`} />
          </label>
        ) : null}
        <button disabled={pending} className={btn}>
          {pending ? "Adding…" : "Add field"}
        </button>
      </div>
      <Note />
      <p className="text-xs text-subtle">
        Appears on every prospect, editable by clicking. Values are stored separately from the
        built-in columns, so adding or removing a field never touches the agent.
      </p>
    </form>
  );
}

/* ------------------------------------------------------ list columns --- */

export function ColumnRow({
  columnKey,
  label,
  visible,
  canHide,
}: {
  columnKey: string;
  label: string;
  visible: boolean;
  canHide: boolean;
}) {
  const { pending, run, Note } = useAction();

  return (
    <div className="flex items-center gap-3 py-1.5">
      <label className="flex flex-1 items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          defaultChecked={visible}
          disabled={pending || !canHide}
          onChange={(e) => run(() => updateListColumn(columnKey, { visible: e.target.checked }))}
        />
        {label}
        {!canHide ? <span className="text-2xs text-subtle">always shown</span> : null}
      </label>
      <Note />
    </div>
  );
}
