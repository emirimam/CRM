"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer } from "@/lib/perms";

type Result = { ok: true; message?: string } | { ok: false; error: string };

async function requireAdmin(): Promise<Result> {
  const v = await getViewer();
  if (!v.id) return { ok: false, error: "Not signed in" };
  if (v.rolesReady && v.role !== "admin") return { ok: false, error: "Admins only" };
  return { ok: true };
}

function refresh() {
  revalidatePath("/admin");
  revalidatePath("/prospects");
  revalidatePath("/");
}

/*
  User creation and password changes run in a Supabase Edge Function, because
  both need the secret key and this project keeps that key out of Vercel. The
  function re-checks who is calling using the forwarded JWT — it does not
  trust anything sent in the body.
*/
async function callUserFunction(payload: Record<string, string>): Promise<Result> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { ok: false, error: "Supabase environment is not configured" };

  const supabase = await supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Not signed in" };

  let res: Response;
  try {
    res = await fetch(`${url}/functions/v1/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "Could not reach the user-management function" };
  }

  if (res.status === 404) {
    return {
      ok: false,
      error: "The create-user function is not deployed yet. Run: supabase functions deploy create-user",
    };
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) return { ok: false, error: body.error ?? `Failed (${res.status})` };
  return { ok: true };
}

export async function createUser(formData: FormData): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "viewer");

  const res = await callUserFunction({ action: "create_user", email, password, role });
  if (res.ok) refresh();
  return res.ok
    ? { ok: true, message: `${email} added. They must change the password at first sign-in.` }
    : res;
}

/** Used by /change-password. Not admin-gated: everyone changes their own. */
export async function setOwnPassword(password: string, confirm: string): Promise<Result> {
  if (password !== confirm) return { ok: false, error: "The two passwords do not match" };
  if (password.length < 10) return { ok: false, error: "Password must be at least 10 characters" };
  return callUserFunction({ action: "set_own_password", password });
}

export async function setRole(userId: string, role: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  if (!["admin", "sales", "viewer"].includes(role)) {
    return { ok: false, error: "Unknown role" };
  }

  const v = await getViewer();
  if (v.id === userId && role !== "admin") {
    // Dropping your own admin rights locks you out of this page with no way
    // back in through the app.
    const { count } = await (await supabaseServer())
      .from("app_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "You are the only admin — promote someone else first" };
    }
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("app_roles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/* ------------------------------------------------------- field options --- */

export async function updateFieldOption(
  id: string,
  patch: { label?: string; tone?: string; sort_order?: number; hidden?: boolean }
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const supabase = await supabaseServer();

  if (patch.hidden === true) {
    const { data } = await supabase.from("field_options").select("locked").eq("id", id).maybeSingle();
    if (data?.locked) {
      return { ok: false, error: "This option is used by the app's own rules and cannot be hidden" };
    }
  }

  const { error } = await supabase.from("field_options").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

export async function addFieldOption(formData: FormData): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const field = String(formData.get("field") ?? "");
  const value = String(formData.get("value") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!value) return { ok: false, error: "Give the option a value" };

  // Adding to a Postgres enum is DDL, so it goes through the guarded
  // add_enum_value() function rather than a plain insert.
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("add_enum_value", {
    p_field: field,
    p_value: value,
    p_label: label,
  });

  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, message: `Added “${label || value}”` };
}

/* ------------------------------------------------------- custom fields --- */

export async function addCustomField(formData: FormData): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type") ?? "text");
  const optionsRaw = String(formData.get("options") ?? "").trim();
  const help = String(formData.get("help") ?? "").trim();

  if (!label) return { ok: false, error: "Give the field a label" };

  const key = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  if (!/^[a-z][a-z0-9_]*$/.test(key)) {
    return { ok: false, error: "Label must contain at least one letter" };
  }

  const options = type === "select" ? optionsRaw.split(",").map((o) => o.trim()).filter(Boolean) : [];
  if (type === "select" && options.length === 0) {
    return { ok: false, error: "A choice field needs at least one option" };
  }

  const supabase = await supabaseServer();
  const { data: last } = await supabase
    .from("custom_fields")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("custom_fields").insert({
    key,
    label,
    type,
    options,
    help: help || null,
    sort_order: (last?.sort_order ?? 0) + 10,
  });

  if (error) {
    return {
      ok: false,
      error: error.code === "23505" ? `A field called “${label}” already exists` : error.message,
    };
  }
  refresh();
  return { ok: true, message: `Added “${label}”` };
}

export async function updateCustomField(
  id: string,
  patch: { label?: string; active?: boolean; sort_order?: number; help?: string | null }
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  const supabase = await supabaseServer();
  const { error } = await supabase.from("custom_fields").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}

/*
  Deactivates rather than deletes. The values stay in prospects.custom, so
  turning a field back on brings the data back instead of losing it.
*/
export async function retireCustomField(id: string): Promise<Result> {
  return updateCustomField(id, { active: false });
}

/* -------------------------------------------------------- list columns --- */

export async function updateListColumn(
  key: string,
  patch: { visible?: boolean; sort_order?: number; label?: string; required_before_send?: boolean }
): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.ok) return gate;

  if (patch.visible === false && key === "company") {
    return { ok: false, error: "The company column cannot be hidden" };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from("list_columns").update(patch).eq("key", key);
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true };
}
