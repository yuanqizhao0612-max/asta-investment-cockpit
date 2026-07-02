import {dedupeRawItems} from "./data-sources/common";
import {fetchFredItems} from "./data-sources/fred";
import {fetchGdeltItems} from "./data-sources/gdelt";
import {fetchMarketItems} from "./data-sources/market";
import {fetchRssItems} from "./data-sources/rss";
import {fetchSecItems} from "./data-sources/sec";
import {mockOpportunityAnalyses, mockOpportunityDailyReports, mockOpportunitySignals, mockOpportunitySources, mockRawExternalItems} from "./mock-data";
import {buildAnalysisFromSignal, buildSignalsFromRawItems} from "./opportunity/analyzer";
import {buildDailyReport} from "./opportunity/report-generator";
import type {InvestorProfile, OpportunitySource, RawExternalItem} from "./types";

export const defaultPublicSources: OpportunitySource[] = mockOpportunitySources.filter((source) => source.enabled);

async function fetchSourceItems(source: OpportunitySource): Promise<RawExternalItem[]> {
  if (!source.enabled) return [];
  if (source.sourceType === "gdelt") return fetchGdeltItems(source);
  if (source.sourceType === "rss") return fetchRssItems(source);
  if (source.sourceType === "fred") return fetchFredItems(source);
  if (source.sourceType === "sec" || source.sourceType === "filing") return fetchSecItems(source);
  if (source.sourceType === "market") return fetchMarketItems(source);
  return [];
}

export async function scanOpportunitySources(profile?: InvestorProfile, sources: OpportunitySource[] = defaultPublicSources) {
  const enabledSources = sources.filter((source) => source.enabled);
  const fetchedItems = dedupeRawItems((await Promise.all(enabledSources.map(fetchSourceItems))).flat()).slice(0, 30);
  const rawItems = fetchedItems.length ? fetchedItems : mockRawExternalItems;
  const sourceNames = Object.fromEntries(sources.map((source) => [source.id, source.sourceName]));
  const signals = fetchedItems.length ? buildSignalsFromRawItems(rawItems, profile).slice(0, 16) : mockOpportunitySignals;
  const analyses = fetchedItems.length ? signals.map((signal) => buildAnalysisFromSignal(signal, sourceNames[signal.sourceId] ?? "公开数据源", profile)) : mockOpportunityAnalyses;

  return {
    sources,
    rawItems,
    signals,
    analyses,
    report: fetchedItems.length ? buildDailyReport(analyses) : mockOpportunityDailyReports[0],
    fallback: fetchedItems.length === 0,
  };
}

export function getMockOpportunityRadar() {
  return {
    sources: mockOpportunitySources,
    rawItems: mockRawExternalItems,
    signals: mockOpportunitySignals,
    analyses: mockOpportunityAnalyses,
    report: mockOpportunityDailyReports[0],
    fallback: true,
  };
}
