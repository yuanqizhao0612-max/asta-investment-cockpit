import type {StoreState} from "./types";

const TABLE = "investment_state";
const OWNER_ID = process.env.ASTA_USER_ID || "owner";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? {url: url.replace(/\/$/, ""), key} : null;
}

export function cloudStateConfigured() {
  return Boolean(supabaseConfig());
}

export async function readCloudState() {
  const config = supabaseConfig();
  if (!config) return null;
  const response = await fetch(`${config.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(OWNER_ID)}&select=payload`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
    },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const rows = (await response.json()) as {payload?: Partial<StoreState>}[];
  return rows[0]?.payload ?? null;
}

export async function writeCloudState(state: StoreState) {
  const config = supabaseConfig();
  if (!config) return false;
  const response = await fetch(`${config.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: OWNER_ID,
      payload: state,
      updated_at: new Date().toISOString(),
    }),
  });
  return response.ok;
}
