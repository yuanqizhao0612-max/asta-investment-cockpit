"use client";

import {useEffect, useMemo, useState} from "react";
import {initialState} from "./mock-data";
import type {Asset, Fund, InvestorProfile, OpportunityAnalysis, OpportunityDailyReport, OpportunityFeedback, OpportunitySignal, OpportunitySource, OpportunityValidationRecord, OpportunityValidationReview, RawExternalItem, ReviewRecord, Stock, StoreState, TradeDecision, WatchItem} from "./types";

const STORAGE_KEY = "investment-cockpit:state";
const MIGRATION_KEYS = ["investment-cockpit:state", "investment-cockpit:v23", "investment-cockpit:v22", "investment-cockpit:v21", "investment-cockpit:v1"];

function mergeState(parsed: Partial<StoreState>): StoreState {
  return {
    assets: parsed.assets?.length ? parsed.assets : initialState.assets,
    funds: parsed.funds?.length ? parsed.funds : initialState.funds,
    stocks: parsed.stocks?.length ? parsed.stocks.map((stock) => ({...stock, status: stock.status ?? "watching"})) : initialState.stocks,
    watchItems: parsed.watchItems?.length ? parsed.watchItems : initialState.watchItems,
    decisions: parsed.decisions?.length ? parsed.decisions : initialState.decisions,
    reviews: parsed.reviews?.length ? parsed.reviews : initialState.reviews,
    profile: parsed.profile ? {...initialState.profile, ...parsed.profile} : initialState.profile,
    marketEvents: parsed.marketEvents?.length ? parsed.marketEvents : initialState.marketEvents,
    opportunitySources: parsed.opportunitySources?.length ? parsed.opportunitySources : initialState.opportunitySources,
    rawExternalItems: parsed.rawExternalItems?.length ? parsed.rawExternalItems : initialState.rawExternalItems,
    opportunitySignals: parsed.opportunitySignals?.length ? parsed.opportunitySignals : initialState.opportunitySignals,
    opportunityAnalyses: parsed.opportunityAnalyses?.length ? parsed.opportunityAnalyses : initialState.opportunityAnalyses,
    opportunityDailyReports: parsed.opportunityDailyReports?.length ? parsed.opportunityDailyReports : initialState.opportunityDailyReports,
    opportunityFeedback: parsed.opportunityFeedback?.length ? parsed.opportunityFeedback : initialState.opportunityFeedback,
    opportunityValidationRecords: parsed.opportunityValidationRecords?.length
      ? parsed.opportunityValidationRecords
      : buildValidationRecords(parsed.opportunityAnalyses?.length ? parsed.opportunityAnalyses : initialState.opportunityAnalyses, parsed.opportunityFeedback?.length ? parsed.opportunityFeedback : initialState.opportunityFeedback, []),
  };
}

function readState(): StoreState {
  if (typeof window === "undefined") return initialState;
  const raw = MIGRATION_KEYS.map((key) => window.localStorage.getItem(key)).find(Boolean);
  if (!raw) return initialState;
  try {
    const state = mergeState(JSON.parse(raw) as Partial<StoreState>);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    return initialState;
  }
}

async function readCloudState() {
  try {
    const response = await fetch("/api/state", {cache: "no-store"});
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.ok && payload.state ? mergeState(payload.state as Partial<StoreState>) : null;
  } catch {
    return null;
  }
}

async function saveCloudState(state: StoreState) {
  try {
    await fetch("/api/state", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({state}),
    });
  } catch {
    // Local storage remains the primary fallback when cloud persistence is not configured.
  }
}

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function stamp<T extends {id?: string; createdAt?: string; updatedAt?: string}>(prefix: string, value: T) {
  const date = today();
  return {...value, id: value.id || id(prefix), createdAt: value.createdAt || date, updatedAt: date};
}

function upsert<T extends {id: string}>(items: T[], next: T) {
  return items.some((item) => item.id === next.id) ? items.map((item) => (item.id === next.id ? next : item)) : [next, ...items];
}

function buildValidationRecord(analysis: OpportunityAnalysis, feedback: OpportunityFeedback[], existing?: OpportunityValidationRecord): OpportunityValidationRecord {
  const createdAt = existing?.createdAt || analysis.createdAt || today();
  const userFeedbackTypes = feedback.filter((item) => item.opportunityAnalysisId === analysis.id).map((item) => item.feedbackType);
  return {
    id: existing?.id || `validation-${analysis.id}`,
    opportunityAnalysisId: analysis.id,
    title: analysis.title,
    discoveredAt: existing?.discoveredAt || analysis.createdAt || today(),
    judgmentLogic: [
      `机会类型：${analysis.beneficiaryIndustries.join("、") || "待判断"}`,
      `证据强度：${analysis.qualityGate?.evidenceStrength ?? analysis.confidenceLevel ?? "待判断"}`,
      `产业链：${analysis.qualityGate?.chainClarity ?? "待拆解"}`,
      `财务影响：${analysis.financialImpacts?.join("、") || "待验证"}`,
      `估值风险：${analysis.qualityGate?.valuationRisk ?? "待判断"}`,
      `行动门槛：${analysis.qualityGate?.actionThresholdPassed ? "已通过" : "未通过"}`,
    ],
    relatedStockTypes: analysis.stockTypeScores?.map((item) => item.typeName) ?? analysis.beneficiaryCompanyTypes,
    systemScore: analysis.opportunityScore,
    systemAction: analysis.nextAction,
    relatedIndustries: analysis.beneficiaryIndustries,
    consensusScore: analysis.consensus?.consensusScore,
    priceAtDiscovery: analysis.relatedTickers.map((ticker) => ticker.code ? `${ticker.name}（${ticker.code}）：待补充` : `${ticker.name}：待补充`).join("；") || "待补充",
    valuationAtDiscovery: "待补充",
    userFeedbackTypes,
    review30d: existing?.review30d,
    review90d: existing?.review90d,
    review180d: existing?.review180d,
    finalVerdict: existing?.finalVerdict,
    createdAt,
    updatedAt: today(),
  };
}

function buildValidationRecords(analyses: OpportunityAnalysis[], feedback: OpportunityFeedback[], existing: OpportunityValidationRecord[]) {
  return analyses.map((analysis) => buildValidationRecord(analysis, feedback, existing.find((item) => item.opportunityAnalysisId === analysis.id)));
}

export function useInvestmentStore() {
  const [state, setState] = useState<StoreState>(initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const localState = readState();
    setState(localState);
    setReady(true);
    readCloudState().then((cloudState) => {
      if (cloudState) {
        setState(cloudState);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudState));
      }
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const timeout = window.setTimeout(() => saveCloudState(state), 600);
    return () => window.clearTimeout(timeout);
  }, [ready, state]);

  return useMemo(
    () => ({
      ...state,
      ready,
      reset: () => setState(initialState),
      saveProfile: (profile: InvestorProfile) =>
        setState((current) => ({...current, profile: {...profile, updatedAt: today()}})),
      upsertAsset: (asset: Asset) =>
        setState((current) => ({...current, assets: upsert(current.assets, stamp("asset", asset))})),
      deleteAsset: (assetId: string) =>
        setState((current) => ({...current, assets: current.assets.filter((asset) => asset.id !== assetId)})),
      upsertFund: (fund: Fund) =>
        setState((current) => ({...current, funds: upsert(current.funds, stamp("fund", fund))})),
      deleteFund: (fundId: string) =>
        setState((current) => ({...current, funds: current.funds.filter((fund) => fund.id !== fundId)})),
      upsertStock: (stock: Stock) =>
        setState((current) => ({...current, stocks: upsert(current.stocks, stamp("stock", stock))})),
      deleteStock: (stockId: string) =>
        setState((current) => ({...current, stocks: current.stocks.filter((stock) => stock.id !== stockId)})),
      upsertWatchItem: (item: WatchItem) =>
        setState((current) => ({...current, watchItems: upsert(current.watchItems, stamp("watch", item))})),
      deleteWatchItem: (itemId: string) =>
        setState((current) => ({...current, watchItems: current.watchItems.filter((item) => item.id !== itemId)})),
      updateWatchStatus: (itemId: string, status: WatchItem["status"]) =>
        setState((current) => ({
          ...current,
          watchItems: current.watchItems.map((item) => (item.id === itemId ? {...item, status, updatedAt: today()} : item)),
        })),
      upsertDecision: (decision: TradeDecision) =>
        setState((current) => ({...current, decisions: upsert(current.decisions, {...decision, id: decision.id || id("decision"), createdAt: decision.createdAt || today()})})),
      deleteDecision: (decisionId: string) =>
        setState((current) => ({...current, decisions: current.decisions.filter((decision) => decision.id !== decisionId)})),
      upsertReview: (review: ReviewRecord) =>
        setState((current) => ({...current, reviews: upsert(current.reviews, {...review, id: review.id || id("review"), createdAt: review.createdAt || today()})})),
      deleteReview: (reviewId: string) =>
        setState((current) => ({...current, reviews: current.reviews.filter((review) => review.id !== reviewId)})),
      replaceOpportunityRadar: (payload: {sources: OpportunitySource[]; rawItems?: RawExternalItem[]; signals: OpportunitySignal[]; analyses: OpportunityAnalysis[]; report: OpportunityDailyReport}) =>
        setState((current) => ({
          ...current,
          opportunitySources: payload.sources,
          rawExternalItems: payload.rawItems?.length ? payload.rawItems : current.rawExternalItems,
          opportunitySignals: payload.signals,
          opportunityAnalyses: payload.analyses,
          opportunityDailyReports: upsert(current.opportunityDailyReports, payload.report),
          opportunityValidationRecords: buildValidationRecords(payload.analyses, current.opportunityFeedback, current.opportunityValidationRecords),
        })),
      upsertOpportunitySource: (source: OpportunitySource) =>
        setState((current) => ({...current, opportunitySources: upsert(current.opportunitySources, stamp("source", source))})),
      deleteOpportunitySource: (sourceId: string) =>
        setState((current) => ({...current, opportunitySources: current.opportunitySources.filter((source) => source.id !== sourceId)})),
      updateOpportunityStatus: (analysisId: string, status: OpportunityAnalysis["status"]) =>
        setState((current) => ({
          ...current,
          opportunityAnalyses: current.opportunityAnalyses.map((analysis) => (analysis.id === analysisId ? {...analysis, status} : analysis)),
        })),
      addOpportunityFeedback: (feedback: OpportunityFeedback) =>
        setState((current) => {
          const nextFeedback = upsert(current.opportunityFeedback, {...feedback, id: feedback.id || id("feedback"), createdAt: feedback.createdAt || today()});
          return {...current, opportunityFeedback: nextFeedback, opportunityValidationRecords: buildValidationRecords(current.opportunityAnalyses, nextFeedback, current.opportunityValidationRecords)};
        }),
      updateOpportunityValidationReview: (recordId: string, horizon: "review30d" | "review90d" | "review180d", review: OpportunityValidationReview) =>
        setState((current) => ({
          ...current,
          opportunityValidationRecords: current.opportunityValidationRecords.map((record) => (record.id === recordId ? {...record, [horizon]: review, updatedAt: today()} : record)),
        })),
      importState: (nextState: Partial<StoreState>) => setState(mergeState(nextState)),
    }),
    [ready, state],
  );
}
