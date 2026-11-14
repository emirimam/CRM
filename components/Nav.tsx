import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

const links = [
  { href: "/", label: "Today" },
  { href: "/drafts", label: "Drafts" },
  { href: "/prospects", label: "Prospects" },
  { href: "/wire-centers", label: "Wire centers" },
  { href: "/runs", label: "Agent runs" },
];

export default async function Nav() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
        <span className="font-semibold tracking-tight">ITDVoIP</span>
        <nav className="flex gap-4 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-stone-600 transition-colors hover:text-stone-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <form action={signOut} className="ml-auto">
          <button className="text-sm text-stone-400 hover:text-stone-700">
            {user.email} · sign out
          </button>
        </form>
      </div>
    </header>
  );
}
