"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOwnPassword } from "@/app/admin/actions";
import { btnPrimary, input } from "@/components/ui";

export default function ChangePassword() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    start(async () => {
      const res = await setOwnPassword(password, confirm);
      if (res.ok) {
        setDone(true);
        // The flag is cleared server-side; a full reload picks up the new
        // session state so middleware stops redirecting here.
        setTimeout(() => {
          router.replace("/");
          router.refresh();
        }, 900);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="grid min-h-[70dvh] place-items-center px-4">
      <div className="w-full max-w-sm animate-fade-up">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Choose a new password</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          You signed in with a temporary password. Pick your own before carrying on — this is the
          only screen available until you do.
        </p>

        <form action={submit} className="mt-6 space-y-3 rounded-xl border border-line bg-surface p-5 shadow-sm">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-subtle">
              New password
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={10}
              autoFocus
              autoComplete="new-password"
              className={`mt-1 w-full py-2 ${input}`}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-subtle">
              Again
            </span>
            <input
              name="confirm"
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              className={`mt-1 w-full py-2 ${input}`}
            />
          </label>

          <p className="text-xs text-subtle">At least 10 characters, and not the one you were given.</p>

          <button disabled={pending || done} className={`w-full py-2 ${btnPrimary}`}>
            {done ? "Saved — taking you in…" : pending ? "Saving…" : "Set password"}
          </button>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-danger/35 bg-danger-soft/50 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
