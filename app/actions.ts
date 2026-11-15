"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { canWrite, getViewer } from "@/lib/perms";

export async function signInWithPassword(formData: FormData) {
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Approved means: Emir has read it and it is cleared to go out. */
export async function approveDraft(formData: FormData) {
  const id = String(formData.get("draft_id"));
  const supabase = await supabaseServer();
  await supabase
    .from("drafts")
    .update({ status: "approved", decided_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/drafts");
  revalidatePath("/");
}

export async function discardDraft(formData: FormData) {
  const id = String(formData.get("draft_id"));
  const reason = String(formData.get("reason") ?? "");
  const supabase = await supabaseServer();
  await supabase
    .from("drafts")
    .update({
      status: "discarded",
      decided_at: new Date().toISOString(),
      discard_reason: reason || null,
    })
    .eq("id", id);
  revalidatePath("/drafts");
  revalidatePath("/");
}

/**
 * Phase 1: Emir sends from Outlook, then marks it sent here.
 * The database trigger bumps touch_count, logs the touch, and
 * closes the prospect at four touches.
 */
export async function markSent(formData: FormData) {
  const id = String(formData.get("draft_id"));
  const from = String(formData.get("sent_from") ?? "");
  const supabase = await supabaseServer();
  await supabase
    .from("drafts")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_from: from || null,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/drafts");
  revalidatePath("/");
}

export async function updateProspect(formData: FormData) {
  const id = String(formData.get("prospect_id"));
  const patch: Record<string, unknown> = {};

  const text = (k: string) => {
    const v = formData.get(k);
    if (v === null) return;
    patch[k] = String(v).trim() === "" ? null : String(v).trim();
  };
  const num = (k: string) => {
    const v = formData.get(k);
    if (v === null) return;
    patch[k] = String(v).trim() === "" ? null : Number(v);
  };

  ["contact_name", "contact_role", "contact_email", "contact_phone", "current_provider",
   "current_system", "industry", "status", "notes", "renewal_date", "next_touch_at"]
    .forEach(text);
  ["est_seats", "locations"].forEach(num);

  const supabase = await supabaseServer();
  await supabase.from("prospects").update(patch).eq("id", id);
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/prospects");
}

/*
  Single-field save, for the click-to-edit fields on a prospect.

  The allowlist is the point: the client sends a field name, so without it
  anything on the row could be written — including touch_count and
  do_not_contact, which the database trigger owns. Those stay out
  deliberately; marking someone do-not-contact goes through
  markDoNotContact, which also kills their waiting drafts.
*/
const EDITABLE = {
  company: "text",
  website: "text",
  city: "text",
  state: "text",
  zip: "text",
  industry: "text",
  contact_name: "text",
  contact_role: "text",
  contact_email: "text",
  contact_phone: "text",
  current_provider: "text",
  current_system: "text",
  notes: "text",
  trigger_detail: "text",
  trigger_source_url: "text",
  renewal_date: "date",
  next_touch_at: "date",
  est_seats: "number",
  locations: "number",
  status: "status",
  has_fax_line: "bool",
} as const;

const STATUSES = [
  "new", "researched", "drafted", "contacted", "replied", "qualified", "won", "lost",
];

export async function updateProspectField(
  id: string,
  field: string,
  raw: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const viewer = await getViewer();
  if (!canWrite(viewer)) return { ok: false, error: "Your account is read-only" };

  // Admin-defined fields live in the prospects.custom jsonb column, so they
  // need no schema change and cannot collide with a real column.
  if (field.startsWith("custom.")) {
    const key = field.slice("custom.".length);
    const supabase = await supabaseServer();

    const { data: def } = await supabase
      .from("custom_fields")
      .select("type, options, active")
      .eq("key", key)
      .maybeSingle();

    if (!def || !def.active) return { ok: false, error: "That field no longer exists" };

    const v = raw.trim();
    let value: string | number | boolean | null = v === "" ? null : v;

    if (def.type === "number" && v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n)) return { ok: false, error: "Needs a number" };
      value = n;
    }
    if (def.type === "boolean") value = v === "" ? null : v === "true";
    if (def.type === "date" && v !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      return { ok: false, error: "Needs a YYYY-MM-DD date" };
    }
    if (def.type === "select" && v !== "" && !(def.options ?? []).includes(v)) {
      return { ok: false, error: "Not one of the allowed choices" };
    }

    const { data: row } = await supabase.from("prospects").select("custom").eq("id", id).maybeSingle();
    const next = { ...((row?.custom as Record<string, unknown>) ?? {}) };
    if (value === null) delete next[key];
    else next[key] = value;

    const { error } = await supabase.from("prospects").update({ custom: next }).eq("id", id);
    if (error) return { ok: false, error: error.message };

    revalidatePath(`/prospects/${id}`);
    revalidatePath("/prospects");
    return { ok: true };
  }

  const kind = EDITABLE[field as keyof typeof EDITABLE];
  if (!kind) return { ok: false, error: `${field} is not editable` };

  const v = raw.trim();
  let value: string | number | boolean | null = v === "" ? null : v;

  if (kind === "number") {
    if (v !== "") {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) return { ok: false, error: "Needs a positive number" };
      value = Math.round(n);
    }
  }

  if (kind === "date" && v !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return { ok: false, error: "Needs a YYYY-MM-DD date" };
  }

  if (kind === "status") {
    // Routed through markDoNotContact so the waiting drafts get discarded too.
    if (v === "dnc") return { ok: false, error: "Use the do-not-contact button" };
    if (!STATUSES.includes(v)) return { ok: false, error: "Unknown status" };
  }

  if (kind === "bool") value = v === "" ? null : v === "true";

  if (field === "contact_email" && value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value))) {
    return { ok: false, error: "That is not an email address" };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("prospects")
    .update({ [field]: value })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/prospects/${id}`);
  revalidatePath("/prospects");
  revalidatePath("/");
  return { ok: true };
}

/** "Not interested" is permanent. No reword, no retry next quarter. */
export async function markDoNotContact(formData: FormData) {
  const id = String(formData.get("prospect_id"));
  const reason = String(formData.get("reason") ?? "Asked not to be contacted");
  const supabase = await supabaseServer();
  await supabase
    .from("prospects")
    .update({ do_not_contact: true, dnc_reason: reason, status: "dnc" })
    .eq("id", id);
  await supabase
    .from("drafts")
    .update({ status: "discarded", discard_reason: "Prospect on do-not-contact" })
    .eq("prospect_id", id)
    .in("status", ["pending", "approved"]);
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/drafts");
}

export async function addTouch(formData: FormData) {
  const prospect_id = String(formData.get("prospect_id"));
  const supabase = await supabaseServer();
  await supabase.from("touches").insert({
    prospect_id,
    kind: String(formData.get("kind") ?? "note"),
    summary: String(formData.get("summary") ?? ""),
    outcome: String(formData.get("outcome") ?? "") || null,
  });
  revalidatePath(`/prospects/${prospect_id}`);
}

export async function toggleWireCenterWorked(formData: FormData) {
  const id = String(formData.get("wire_center_id"));
  const worked = String(formData.get("worked")) === "true";
  const supabase = await supabaseServer();
  await supabase.from("wire_centers").update({ worked: !worked }).eq("id", id);
  revalidatePath("/wire-centers");
}
