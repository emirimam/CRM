import { supabaseServer } from "@/lib/supabase/server";

export type Role = "admin" | "sales" | "viewer";

export type Viewer = {
  id: string | null;
  email: string | null;
  role: Role;
  /**
   * False when migration 0003 has not been applied yet. Everything that
   * depends on roles is hidden rather than broken while that is the case.
   */
  rolesReady: boolean;
  mustChangePassword: boolean;
};

/*
  Deliberate fallback: if app_roles is missing the answer is "admin", not
  "viewer". Before 0003 every signed-in user had full access, and this code
  ships to a live tool — degrading it to read-only because a migration has
  not run yet would be a worse failure than the one it guards against.
*/
export async function getViewer(): Promise<Viewer> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { id: null, email: null, role: "viewer", rolesReady: false, mustChangePassword: false };
  }

  const mustChangePassword =
    (user.app_metadata as Record<string, unknown> | null)?.must_change_password === true;

  const { data, error } = await supabase
    .from("app_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return {
      id: user.id,
      email: user.email ?? null,
      role: "admin",
      rolesReady: false,
      mustChangePassword,
    };
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: (data?.role as Role) ?? "viewer",
    rolesReady: true,
    mustChangePassword,
  };
}

export function canWrite(v: Viewer) {
  return !v.rolesReady || v.role === "admin" || v.role === "sales";
}

export function canAdmin(v: Viewer) {
  return !v.rolesReady || v.role === "admin";
}

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  sales: "Sales",
  viewer: "Viewer",
};

export const roleBlurb: Record<Role, string> = {
  admin: "Everything, plus this Admin section and do-not-contact.",
  sales: "Day-to-day work: edit prospects, send drafts, log calls.",
  viewer: "Read only. Cannot change anything.",
};
