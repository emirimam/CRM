import { supabaseServer } from "@/lib/supabase/server";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "danger" | "info";

export type FieldOption = {
  value: string;
  label: string;
  tone: Tone;
  sort_order: number;
  hidden: boolean;
  locked: boolean;
};

export type CustomField = {
  id: string;
  key: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "select" | "url";
  options: string[];
  help: string | null;
  sort_order: number;
  active: boolean;
};

export type ListColumn = {
  key: string;
  label: string;
  visible: boolean;
  sort_order: number;
  required_before_send: boolean;
};

/*
  Fallbacks mirror what was hard-coded before migration 0003. If the settings
  tables are not there yet, every screen renders exactly as it did — the
  feature is simply inert rather than broken.
*/
const FALLBACK_STATUS: FieldOption[] = [
  ["new", "New", "neutral", true],
  ["researched", "Researched", "info", true],
  ["drafted", "Drafted", "warn", true],
  ["contacted", "Contacted", "accent", true],
  ["replied", "Replied", "ok", false],
  ["qualified", "Qualified", "ok", false],
  ["won", "Won", "ok", false],
  ["lost", "Lost", "neutral", false],
  ["dnc", "Do not contact", "danger", true],
].map(([value, label, tone, locked], i) => ({
  value: value as string,
  label: label as string,
  tone: tone as Tone,
  sort_order: (i + 1) * 10,
  hidden: false,
  locked: locked as boolean,
}));

const FALLBACK_TRIGGER: FieldOption[] = [
  ["copper_sunset", "Copper sunset", "warn"],
  ["pbx_eol", "PBX end-of-life", "info"],
  ["switch_intent", "Switch intent", "accent"],
  ["multi_location", "Multi-location", "neutral"],
  ["msp_partner", "MSP partner", "ok"],
  ["other", "Other", "neutral"],
].map(([value, label, tone], i) => ({
  value: value as string,
  label: label as string,
  tone: tone as Tone,
  sort_order: (i + 1) * 10,
  hidden: false,
  locked: false,
}));

const FALLBACK_COLUMNS: ListColumn[] = [
  ["company", "Company", true],
  ["where", "Where", true],
  ["trigger", "Trigger", true],
  ["contact", "Contact", true],
  ["est_seats", "Seats", true],
  ["renewal_date", "Renewal", true],
  ["touches", "Touches", true],
  ["status", "Status", true],
  ["industry", "Industry", false],
  ["current_provider", "Provider", false],
  ["current_system", "System", false],
  ["locations", "Locations", false],
  ["next_touch_at", "Next touch", false],
].map(([key, label, visible], i) => ({
  key: key as string,
  label: label as string,
  visible: visible as boolean,
  sort_order: (i + 1) * 10,
  required_before_send: key === "contact",
}));

export type Settings = {
  ready: boolean;
  status: FieldOption[];
  trigger: FieldOption[];
  columns: ListColumn[];
  customFields: CustomField[];
};

export async function getSettings(): Promise<Settings> {
  const supabase = await supabaseServer();

  const [opts, cols, custom] = await Promise.all([
    supabase.from("field_options").select("*").order("sort_order"),
    supabase.from("list_columns").select("*").order("sort_order"),
    supabase.from("custom_fields").select("*").order("sort_order"),
  ]);

  if (opts.error || cols.error || custom.error) {
    return {
      ready: false,
      status: FALLBACK_STATUS,
      trigger: FALLBACK_TRIGGER,
      columns: FALLBACK_COLUMNS,
      customFields: [],
    };
  }

  const rows = (opts.data ?? []) as (FieldOption & { field: string })[];
  const status = rows.filter((r) => r.field === "status");
  const trigger = rows.filter((r) => r.field === "trigger");

  return {
    ready: true,
    status: status.length ? status : FALLBACK_STATUS,
    trigger: trigger.length ? trigger : FALLBACK_TRIGGER,
    columns: (cols.data as ListColumn[])?.length ? (cols.data as ListColumn[]) : FALLBACK_COLUMNS,
    customFields: ((custom.data ?? []) as CustomField[]).filter((f) => f.active),
  };
}

/** Lookup helpers so a renamed label shows everywhere without more queries. */
export function optionLabel(options: FieldOption[], value: string | null) {
  if (!value) return "";
  return options.find((o) => o.value === value)?.label ?? value;
}

export function optionTone(options: FieldOption[], value: string | null): Tone {
  if (!value) return "neutral";
  return options.find((o) => o.value === value)?.tone ?? "neutral";
}

/** Options offered in a picker: hidden ones stay stored but are not offered. */
export function selectable(options: FieldOption[], current?: string | null) {
  return options.filter((o) => !o.hidden || o.value === current);
}
