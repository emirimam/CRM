import { signInWithPassword } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto mt-24 max-w-sm">
      <h1 className="text-xl font-semibold tracking-tight">ITDVoIP CRM</h1>
      <p className="mt-1 text-sm text-stone-500">Outbound pipeline. Internal use.</p>

      <form action={signInWithPassword} className="mt-8 space-y-3">
        <input
          name="email"
          type="email"
          required
          placeholder="you@itdreamwire.com"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
        />
        <button className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700">
          Sign in
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
