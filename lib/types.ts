export type AssetType = "cash" | "fixed_deposit" | "money_fund" | "fund" | "stock" | "other";

export type Asset = {
  id: string;
  name: string;
  type: AssetType;
  amount: number;
  annualYield?: number;
  maturityDate?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type FundType = "hybrid" | "stock" | "bond" | "index" | "money" | "qdii";
export type Market = "A_SHARE" | "HK" | "US";

export type Fund = {
  id: string;
  name: string;
  code: string;
  type: FundType;
  holdingAmount: number;
  cost: number;
  currentNav: number;
  returnRate: number;
  holdingDays?: number;
  targetProfitRate?: number;
  maxAcceptableLossRate?: number;
  monthlyInvestment?: number;
  manager?: string;
  fundSize?: number;
  oneYearReturn?: number;
  threeYearReturn?: number;
  maxDrawdown?: number;
  volatility?: number;
  industries?: string[];
  investmentReason?: string;
  holdReason?: string;
  exitCondition?: string;
  score?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type Stock = {
  id: string;
  name: string;
  code: string;
  market: Market;
  status: "holding" | "watching";
  industry?: string;
  holdingAmount?: number;
  currentPrice: number;
  targetBuyPrice?: number;
  targetSellPrice?: number;
  stopLossPrice?: number;
  shares?: number;
  cost?: number;
  pe?: number;
  pb?: number;
  ps?: number;
  revenueGrowth?: number;
  profitGrowth?: number;
  grossMargin?: number;
  netMargin?: number;
  roe?: number;
  cashFlow?: number;
  debtRatio?: number;
  industryTrend?: "up" | "neutral" | "down";
  investmentReason?: string;
  riskReason?: string;
  exitCondition?: string;
  score?: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type InvestorProfile = {
  totalAssets: number;
  availableCash: number;
  monthlyIncome?: number;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  maxEquityRatio: number;
  targetEquityRatio: number;
  maxSingleStockRatio: number;
  maxSingleFundRatio: number;
  maxSingleTradeRatio: number;
  preferredMarkets: Market[];
  preferredSectors: string[];
  forbiddenSectors?: string[];
  investmentGoal: string;
  updatedAt: string;
};

export type RelatedStock = {
  name: string;
  code?: string;
  market: Market;
  sector: string;
  reason: string;
  risk: string;
  action: "observe" | "small_position" | "wait_for_pullback" | "avoid";
};

export type RelatedFund = {
  name: string;
  code?: string;
  fundType: "ETF" | "index" | "active";
  reason: string;
  risk: string;
  action: "observe" | "small_position" | "wait_for_pullback" | "avoid";
};

export type MarketEvent = {
  id: string;
  title: string;
  eventDate: string;
  eventType: "price_increase" | "policy" | "earnings" | "supply_shortage" | "technology_breakthrough" | "demand_growth" | "macro";
  summary: string;
  source?: string;
  affectedSectors: string[];
  industryChain: {
    upstream: string[];
    midstream: string[];
    downstream: string[];
  };
  relatedStocks: RelatedStock[];
  relatedFunds: RelatedFund[];
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  riskLevel: "low" | "medium" | "high";
  conclusion: string;
  createdAt: string;
};

export type OpportunitySignalType =
  | "price_anomaly"
  | "supply_shrink"
  | "demand_boom"
  | "tech_breakthrough"
  | "policy_catalyst"
  | "company_change"
  | "sentiment_heat"
  | "contrarian";

export type OpportunitySource = {
  id: string;
  sourceName: string;
  sourceType: "rss" | "gdelt" | "sec" | "fred" | "market" | "trends" | "filing" | "macro" | "custom";
  sourceUrl: string;
  apiProvider?: "gdelt" | "rss" | "sec" | "fred" | "alpha_vantage" | "finnhub" | "manual";
  keywords?: string[];
  tickers?: string[];
  indicators?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type RawExternalItem = {
  id: string;
  sourceId: string;
  title: string;
  summary: string;
  url?: string;
  publishedAt?: string;
  rawContent: string;
  detectedKeywords: string[];
  hash: string;
  createdAt: string;
};

export type OpportunitySignal = {
  id: string;
  sourceId: string;
  rawItemId?: string;
  signalTitle: string;
  signalType: OpportunitySignalType;
  rawContent: string;
  keywords: string[];
  relatedIndustries: string[];
  relatedCompanies: string[];
  signalStrength: number;
  confidenceScore?: number;
  detectedAt: string;
  createdAt: string;
};

export type OpportunityAnalysis = {
  id: string;
  signalId: string;
  title: string;
  signalSources: string[];
  whatHappened: string;
  whyItMatters: string;
  transmissionChain: string[];
  beneficiaryIndustries: string[];
  beneficiaryCompanyTypes: string[];
  relatedTickers: {
    name: string;
    code?: string;
    market?: Market;
    reason: string;
  }[];
  riskPoints: string[];
  nextQuestions: string[];
  scoreBreakdown: {
    signalStrength: number;
    chainClarity: number;
    fundamentalRelevance: number;
    valuationSafety: number;
    userFit: number;
  };
  opportunityScore: number;
  suitabilityScore: number;
  riskLevel: "low" | "medium" | "high";
  status: "new" | "watching" | "ignored" | "researching";
  conclusion: string;
  createdAt: string;
};

export type OpportunityDailyReport = {
  id: string;
  reportDate: string;
  summary: string;
  topOpportunityIds: string[];
  ignoredNoise: string[];
  riskWarnings: string[];
  createdAt: string;
};

export type OpportunityFeedbackType = "useful" | "noise" | "too_late" | "too_speculative" | "worth_tracking" | "add_to_watchlist";

export type OpportunityFeedback = {
  id: string;
  userId?: string;
  opportunityAnalysisId: string;
  feedbackType: OpportunityFeedbackType;
  comment?: string;
  createdAt: string;
};

export type WatchItem = {
  id: string;
  instrumentType: "fund" | "stock" | "sector" | "event";
  name: string;
  code?: string;
  market?: Market;
  source: "manual" | "market_radar" | "fund_page" | "stock_page";
  watchReason: string;
  targetBuyPrice?: number;
  currentPrice?: number;
  triggerCondition?: string;
  riskNote?: string;
  status: "watching" | "near_buy" | "bought" | "abandoned";
  createdAt: string;
  updatedAt: string;
};

export type TradeDecision = {
  id: string;
  instrumentType: "fund" | "stock";
  instrumentName: string;
  instrumentCode?: string;
  action: "buy" | "add" | "reduce" | "sell";
  amount: number;
  reason: string;
  expectedHoldingPeriod: "short" | "medium" | "long";
  maxAcceptableLossRate: number;
  targetProfitRate?: number;
  stopLossCondition?: string;
  takeProfitCondition?: string;
  isEmotionDriven: boolean;
  confidenceLevel: 1 | 2 | 3 | 4 | 5;
  createdAt: string;
};

export type ReviewRecord = {
  id: string;
  decisionId?: string;
  instrumentType: "fund" | "stock";
  instrumentName: string;
  action: "buy" | "add" | "reduce" | "sell";
  decisionDate: string;
  reviewDate: string;
  originalReason: string;
  actualResult: string;
  profitRate?: number;
  disciplineFollowed: boolean;
  emotionalTrade: boolean;
  lesson: string;
  nextImprovement: string;
  createdAt: string;
};

export type StoreState = {
  assets: Asset[];
  funds: Fund[];
  stocks: Stock[];
  watchItems: WatchItem[];
  decisions: TradeDecision[];
  reviews: ReviewRecord[];
  profile: InvestorProfile;
  marketEvents: MarketEvent[];
  opportunitySources: OpportunitySource[];
  rawExternalItems: RawExternalItem[];
  opportunitySignals: OpportunitySignal[];
  opportunityAnalyses: OpportunityAnalysis[];
  opportunityDailyReports: OpportunityDailyReport[];
  opportunityFeedback: OpportunityFeedback[];
};
