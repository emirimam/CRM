import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getViewer, roleBlurb, roleLabel, type Role } from "@/lib/perms";
import { getSettings } from "@/lib/settings";
import {
  AddCustomFieldForm,
  AddOptionForm,
  ColumnRow,
  CreateUserForm,
  CustomFieldRow,
  OptionRow,
  UserRow,
} from "@/components/AdminControls";
import { Callout, Card, Empty, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — ITDVoIP CRM" };

export default async function Admin() {
  const viewer = await getViewer();
  if (!viewer.id) notFound();

  // Hidden entirely from non-admins rather than shown disabled: there is
  // nothing on this page a sales or viewer account can act on.
  if (viewer.rolesReady && viewer.role !== "admin") notFound();

  const supabase = await supabaseServer();
  const [{ data: users }, settings] = await Promise.all([
    supabase.from("app_roles").select("*").order("created_at"),
    getSettings(),
  ]);

  const [allCustom] = await Promise.all([
    supabase.from("custom_fields").select("*").order("sort_order"),
  ]);

  return (
    <>
      <PageHeader
        title="Admin"
        lead="Who gets in, what the dropdowns offer, which fields exist and which columns show."
      />

      {!settings.ready || !viewer.rolesReady ? (
        <Callout tone="warn" title="Settings tables are missing">
          Migration 0003 has not been applied, so this page cannot save anything and the rest of
          the app is running on its built-in defaults. Apply
          supabase/migrations/0003_admin_roles_and_field_settings.sql and reload.
        </Callout>
      ) : null}

      {/* ---------------------------------------------------------- users */}
      <Card title="People and roles">
        <div className="mb-3 grid gap-2 sm:grid-cols-3">
          {(["admin", "sales", "viewer"] as Role[]).map((r) => (
            <div key={r} className="rounded-lg border border-line bg-surface-2/40 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink">
                {roleLabel[r]}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">{roleBlurb[r]}</p>
            </div>
          ))}
        </div>

        <div className="divide-y divide-line/60">
          {users?.length ? (
            users.map((u) => (
              <UserRow
                key={u.user_id}
                userId={u.user_id}
                email={u.email ?? "(no email recorded)"}
                role={u.role}
                isYou={u.user_id === viewer.id}
              />
            ))
          ) : (
            <Empty>No accounts yet.</Empty>
          )}
        </div>

        <CreateUserForm />
      </Card>

      {/* -------------------------------------------------------- options */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Statuses">
          <p className="mb-2 text-xs leading-relaxed text-muted">
            Rename anything here freely — the label is all that changes. The stored value stays
            put, because the four-touch rule, the daily queue and the agent all key off it. The
            ones marked locked are the ones those rules name directly.
          </p>
          <div className="divide-y divide-line/60">
            {settings.status.map((o) => (
              <OptionRow
                key={o.value}
                id={(o as unknown as { id: string }).id}
                value={o.value}
                label={o.label}
                tone={o.tone}
                hidden={o.hidden}
                locked={o.locked}
              />
            ))}
          </div>
          <AddOptionForm field="status" />
        </Card>

        <Card title="Triggers">
          <p className="mb-2 text-xs leading-relaxed text-muted">
            Why a company is on the list. The agent writes these values, so a new one only starts
            appearing once the agent is told to use it.
          </p>
          <div className="divide-y divide-line/60">
            {settings.trigger.map((o) => (
              <OptionRow
                key={o.value}
                id={(o as unknown as { id: string }).id}
                value={o.value}
                label={o.label}
                tone={o.tone}
                hidden={o.hidden}
                locked={o.locked}
              />
            ))}
          </div>
          <AddOptionForm field="trigger" />
        </Card>
      </div>

      {/* --------------------------------------------------- custom fields */}
      <Card title="Your own fields">
        <div className="divide-y divide-line/60">
          {allCustom.data?.length ? (
            allCustom.data.map((f) => (
              <CustomFieldRow
                key={f.id}
                id={f.id}
                label={f.label}
                fieldKey={f.key}
                type={f.type}
                options={f.options ?? []}
                active={f.active}
              />
            ))
          ) : (
            <Empty>None yet. Add one below and it appears on every prospect.</Empty>
          )}
        </div>
        <AddCustomFieldForm />
      </Card>

      {/* --------------------------------------------------- list columns */}
      <Card title="Columns in the prospects table">
        <p className="mb-2 text-xs leading-relaxed text-muted">
          Tick what you want to see. Search always covers every field, whether or not its column is
          showing.
        </p>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {settings.columns.map((c) => (
            <ColumnRow
              key={c.key}
              columnKey={c.key}
              label={c.label}
              visible={c.visible}
              canHide={c.key !== "company"}
            />
          ))}
        </div>
      </Card>
    </>
  );
}
