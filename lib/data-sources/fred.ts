import {fetchWithTimeout, fredIndicators, makeRawItem, today} from "./common";
import type {OpportunitySource, RawExternalItem} from "@/lib/types";

type FredObservation = {
  date: string;
  value: string;
};

const indicatorLabels: Record<string, string> = {
  FEDFUNDS: "联邦基金利率",
  CPIAUCSL: "美国 CPI",
  UNRATE: "美国失业率",
  DGS10: "美国 10 年期国债收益率",
  DGS2: "美国 2 年期国债收益率",
  M2SL: "M2 货币供应",
  DTWEXBGS: "美元指数",
};

export async function fetchFredItems(source: OpportunitySource): Promise<RawExternalItem[]> {
  if (!source.enabled) return [];
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    return (source.indicators?.length ? source.indicators : fredIndicators).slice(0, 4).map((indicator) =>
      makeRawItem(source, {
        title: `${indicatorLabels[indicator] ?? indicator} 待配置 FRED_API_KEY`,
        summary: "已建立 FRED 指标接入位。配置 FRED_API_KEY 后可读取最新宏观数据。",
        publishedAt: today(),
        rawContent: `${indicator} macro indicator waiting for FRED_API_KEY`,
        detectedKeywords: [indicator, "macro", "interest rate"],
      }),
    );
  }

  const indicators = (source.indicators?.length ? source.indicators : fredIndicators).slice(0, 7);
  const results = await Promise.all(indicators.map((indicator) => fetchFredIndicator(source, indicator, apiKey)));
  return results.flat();
}

async function fetchFredIndicator(source: OpportunitySource, indicator: string, apiKey: string): Promise<RawExternalItem[]> {
  const url = new URL(source.sourceUrl || "https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("series_id", indicator);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "2");
  try {
    const response = await fetchWithTimeout(url.toString());
    if (!response.ok) return [];
    const payload = (await response.json()) as {observations?: FredObservation[]};
    const observations = payload.observations ?? [];
    const latest = observations[0];
    const previous = observations[1];
    if (!latest) return [];
    const latestValue = Number(latest.value);
    const previousValue = Number(previous?.value);
    const change = Number.isFinite(latestValue) && Number.isFinite(previousValue) ? latestValue - previousValue : 0;
    const label = indicatorLabels[indicator] ?? indicator;
    const direction = change > 0 ? "上行" : change < 0 ? "下行" : "持平";
    return [
      makeRawItem(source, {
        title: `${label}${direction}`,
        summary: `${indicator} 最新值 ${latest.value}，日期 ${latest.date}。较上一期变化 ${change.toFixed(2)}。`,
        publishedAt: latest.date,
        rawContent: `${indicator} ${label} latest ${latest.value}, previous ${previous?.value ?? "NA"}, direction ${direction}`,
        detectedKeywords: [indicator, label, "macro", "interest rate"],
      }),
    ];
  } catch {
    return [];
  }
}
