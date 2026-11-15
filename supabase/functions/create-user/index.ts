// Admin user management, kept inside Supabase on purpose.
//
// Creating a user and clearing the forced-password-change flag both need the
// secret key, and the project's rule is that key never goes into Vercel. An
// Edge Function gets it from its own environment, so nothing has to be copied
// anywhere and the key never leaves Supabase.
//
// Deploy:  supabase functions deploy create-user

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

/**
 * Legacy `service_role` keys stop working at the end of 2026, and the
 * replacement arrives as a JSON dictionary. Read the new shape first and fall
 * back, so this keeps working across the switch without a code change.
 */
function secretKey(): string {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through to the legacy variable
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

function publishableKey(): string {
  const modern = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (parsed.default) return parsed.default;
    } catch {
      // fall through
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY")!;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not signed in" }, 401);

  const admin = createClient(SUPABASE_URL, secretKey());

  // Who is calling? Their JWT, not anything they put in the body.
  const caller = createClient(SUPABASE_URL, publishableKey(), {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user: me },
  } = await caller.auth.getUser();
  if (!me) return json({ error: "Not signed in" }, 401);

  let payload: Record<string, string>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad request body" }, 400);
  }

  // ------------------------------------------------ change your own password
  //
  // The whole point of the forced change is that a user cannot skip it, so
  // clearing the flag is not a separate call they could make on its own: it
  // happens here, only after the new password has actually been set.
  if (payload.action === "set_own_password") {
    const password = payload.password ?? "";
    if (password.length < 10) {
      return json({ error: "Password must be at least 10 characters" }, 400);
    }

    // Reject reusing the temporary password. If signing in with the "new"
    // password works, it is the one they were given.
    const probe = createClient(SUPABASE_URL, publishableKey());
    const { error: sameAsCurrent } = await probe.auth.signInWithPassword({
      email: me.email!,
      password,
    });
    if (!sameAsCurrent) {
      return json({ error: "Choose a different password from the temporary one" }, 400);
    }

    const { error } = await admin.auth.admin.updateUserById(me.id, {
      password,
      app_metadata: { must_change_password: false },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true });
  }

  // ------------------------------------------------------------ create a user
  if (payload.action === "create_user") {
    const { data: isAdmin } = await caller.rpc("is_admin");
    if (!isAdmin) return json({ error: "Only an admin can add users" }, 403);

    const email = (payload.email ?? "").trim().toLowerCase();
    const password = payload.password ?? "";
    const role = payload.role ?? "viewer";

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: "That is not an email address" }, 400);
    }
    if (password.length < 10) {
      return json({ error: "Temporary password must be at least 10 characters" }, 400);
    }
    if (!["admin", "sales", "viewer"].includes(role)) {
      return json({ error: "Unknown role" }, 400);
    }

    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // no confirmation mail; the temporary password is the handoff
      app_metadata: { must_change_password: true },
    });
    if (error) return json({ error: error.message }, 400);

    const { error: roleError } = await admin
      .from("app_roles")
      .upsert({ user_id: created.user.id, role, email }, { onConflict: "user_id" });
    if (roleError) {
      return json(
        { error: `User created but role not set: ${roleError.message}` },
        500
      );
    }

    return json({ ok: true, id: created.user.id, email });
  }

  return json({ error: "Unknown action" }, 400);
});
