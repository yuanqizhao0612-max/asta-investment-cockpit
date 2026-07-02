import type {OpportunitySource, RawExternalItem} from "@/lib/types";

export const defaultKeywords = [
  "AI",
  "semiconductor",
  "storage",
  "data center",
  "robot",
  "battery",
  "gold",
  "oil",
  "copper",
  "interest rate",
  "China economy",
  "US inflation",
  "electric vehicle",
  "pharmaceutical",
  "tourism",
  "consumer spending",
];

export const fredIndicators = ["FEDFUNDS", "CPIAUCSL", "UNRATE", "DGS10", "DGS2", "M2SL", "DTWEXBGS"];

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function hashText(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return `h${(hash >>> 0).toString(16)}`;
}

export function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'");
}

export function makeRawItem(source: OpportunitySource, item: Omit<RawExternalItem, "id" | "sourceId" | "hash" | "createdAt">): RawExternalItem {
  const hash = hashText(`${source.id}:${item.title}:${item.url ?? ""}:${item.publishedAt ?? ""}`);
  return {
    ...item,
    id: `raw-${hash}`,
    sourceId: source.id,
    hash,
    createdAt: today(),
  };
}

export function dedupeRawItems(items: RawExternalItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.hash)) return false;
    seen.add(item.hash);
    return true;
  });
}

export async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {"User-Agent": "Asta-Investment-Cockpit/1.0"},
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}
