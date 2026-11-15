import { signInWithPassword } from "@/app/actions";
import { btnPrimary, input } from "@/components/ui";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-7 flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid size-8 place-items-center rounded-lg bg-accent text-xs font-bold text-accent-fg"
          >
            IT
          </span>
          <div>
            <h1 className="text-base font-semibold tracking-tight text-ink">ITDVoIP CRM</h1>
            <p className="text-xs text-muted">Outbound pipeline. Internal use.</p>
          </div>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <form action={signInWithPassword} className="space-y-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-subtle">Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="you@itdreamwire.com"
                className={`mt-1 w-full py-2 ${input}`}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wide text-subtle">Password</span>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={`mt-1 w-full py-2 ${input}`}
              />
            </label>

            <button className={`w-full py-2 ${btnPrimary}`}>Sign in</button>
          </form>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-danger/35 bg-danger-soft/50 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-subtle">
          No public sign-up. Accounts are created in Supabase.
        </p>
      </div>
    </div>
  );
}
