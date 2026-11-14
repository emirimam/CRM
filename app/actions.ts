"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

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
