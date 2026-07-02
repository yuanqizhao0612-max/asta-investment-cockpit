import {fetchWithTimeout, makeRawItem, today} from "./common";
import type {OpportunitySource, RawExternalItem} from "@/lib/types";

type SecSubmission = {
  name?: string;
  filings?: {
    recent?: {
      accessionNumber?: string[];
      form?: string[];
      filingDate?: string[];
      primaryDocument?: string[];
    };
  };
};

const tickerCik: Record<string, string> = {
  AAPL: "0000320193",
  MSFT: "0000789019",
  NVDA: "0001045810",
  TSLA: "0001318605",
  META: "0001326801",
  GOOGL: "0001652044",
  AMZN: "0001018724",
};

export async function fetchSecItems(source: OpportunitySource): Promise<RawExternalItem[]> {
  if (!source.enabled) return [];
  const tickers = (source.tickers?.length ? source.tickers : ["AAPL", "MSFT", "NVDA", "TSLA"]).slice(0, 6);
  const results = await Promise.all(tickers.map((ticker) => fetchSecTicker(source, ticker.toUpperCase())));
  return results.flat();
}

async function fetchSecTicker(source: OpportunitySource, ticker: string): Promise<RawExternalItem[]> {
  const cik = tickerCik[ticker];
  if (!cik) {
    return [
      makeRawItem(source, {
        title: `${ticker} SEC CIK 待补充`,
        summary: "第一阶段支持常用美股 ticker。后续可接入 ticker-CIK 映射表自动查询。",
        publishedAt: today(),
        rawContent: `${ticker} SEC CIK mapping missing`,
        detectedKeywords: [ticker, "SEC", "filing"],
      }),
    ];
  }
  try {
    const response = await fetchWithTimeout(`https://data.sec.gov/submissions/CIK${cik}.json`);
    if (!response.ok) return [];
    const payload = (await response.json()) as SecSubmission;
    const recent = payload.filings?.recent;
    if (!recent?.form?.length) return [];
    return recent.form
      .map((form, index) => ({form, index}))
      .filter(({form}) => ["10-K", "10-Q", "8-K"].includes(form))
      .slice(0, 3)
      .map(({form, index}) => {
        const accession = recent.accessionNumber?.[index] ?? "";
        const document = recent.primaryDocument?.[index] ?? "";
        const filingDate = recent.filingDate?.[index] ?? today();
        const url = accession && document ? `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replaceAll("-", "")}/${document}` : undefined;
        return makeRawItem(source, {
          title: `${ticker} ${form} filing`,
          summary: `${payload.name ?? ticker} 于 ${filingDate} 披露 ${form}。需要检查订单、资本开支、风险提示和管理层表述变化。`,
          url,
          publishedAt: filingDate,
          rawContent: `${ticker} ${form} filing ${filingDate} ${payload.name ?? ""}`,
          detectedKeywords: [ticker, form, "SEC", "filing", "capex", "risk"],
        });
      });
  } catch {
    return [];
  }
}
