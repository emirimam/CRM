import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";
import NavLinks from "@/components/NavLinks";
import ThemeToggle from "@/components/ThemeToggle";

export default async function Nav() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Badge on the Drafts tab: the queue is the whole point of the tool, so the
  // count belongs where it is visible from every page.
  const { count: draftCount } = await supabase
    .from("drafts")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "approved"]);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/70">
      <div className="mx-auto flex max-w-[86rem] items-center gap-3 px-4 py-2.5 sm:px-6">
        <span className="flex shrink-0 items-center gap-2 pr-1">
          <span
            aria-hidden
            className="grid size-6 place-items-center rounded-md bg-accent text-2xs font-bold text-accent-fg"
          >
            IT
          </span>
          <span className="hidden text-sm font-semibold tracking-tight text-ink sm:block">
            ITDVoIP
          </span>
        </span>

        <NavLinks draftCount={draftCount ?? 0} />

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <form action={signOut}>
            <button
              title={`Sign out ${user.email}`}
              className="rounded-lg px-2 py-1.5 text-xs font-medium text-subtle transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <span className="hidden max-w-[14ch] truncate align-middle md:inline">
                {user.email}
              </span>
              <span className="md:ml-1.5">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
