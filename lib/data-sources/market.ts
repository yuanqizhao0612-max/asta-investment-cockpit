import {makeRawItem, today} from "./common";
import type {OpportunitySource, RawExternalItem} from "@/lib/types";

export async function fetchMarketItems(source: OpportunitySource): Promise<RawExternalItem[]> {
  if (!source.enabled) return [];
  const provider = process.env.FINNHUB_API_KEY ? "Finnhub" : process.env.ALPHA_VANTAGE_API_KEY ? "Alpha Vantage" : "";
  if (!provider) {
    return [
      makeRawItem(source, {
        title: "股票行情接口待配置",
        summary: "已预留 Alpha Vantage / Finnhub 服务端接入口。配置 API Key 后可扩展股票价格、公司新闻和基础财务数据。",
        publishedAt: today(),
        rawContent: "Market data provider waiting for ALPHA_VANTAGE_API_KEY or FINNHUB_API_KEY",
        detectedKeywords: ["market", "price", "financial data"],
      }),
    ];
  }
  return [
    makeRawItem(source, {
      title: `${provider} 行情接口已配置`,
      summary: "市场数据接口已具备服务端配置，可在下一阶段接入价格、公司新闻和基础财务数据。",
      publishedAt: today(),
      rawContent: `${provider} market data provider configured`,
      detectedKeywords: ["market", "price", "financial data"],
    }),
  ];
}
