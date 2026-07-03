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
  profitLoss?: number;
  returnRate: number;
  navDate?: string;
  holdingDays?: number;
  targetProfitRate?: number;
  maxAcceptableLossRate?: number;
  monthlyInvestment?: number;
  manager?: string;
  fundCompany?: string;
  inceptionDate?: string;
  fundSize?: number;
  oneYearReturn?: number;
  threeYearReturn?: number;
  fiveYearReturn?: number;
  maxDrawdown?: number;
  volatility?: number;
  industries?: string[];
  topHoldings?: string[];
  managementFee?: number;
  custodyFee?: number;
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
  marketCap?: number;
  pe?: number;
  pb?: number;
  ps?: number;
  revenue?: number;
  netProfit?: number;
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
  targetAnnualReturn?: number;
  maxAcceptableDrawdown?: number;
  learningAccountAmount?: number;
  maxEquityRatio: number;
  targetEquityRatio: number;
  maxSingleStockRatio: number;
  maxSingleFundRatio: number;
  maxSingleTradeRatio: number;
  preferredMarkets: Market[];
  preferredSectors: string[];
  forbiddenSectors?: string[];
  defaultAllocation?: {
    cash: number;
    bond: number;
    fund: number;
    stock: number;
    alternative: number;
  };
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
  | "macro_cycle"
  | "contrarian";

export type OpportunityNextAction = "ignore" | "record" | "add_to_watchlist" | "generate_research_task" | "small_position_learning";
export type OpportunityConfidenceLevel = "low" | "medium" | "high";
export type OpportunityEvidenceStrength = "高证据" | "中证据" | "低证据";
export type OpportunityValuationRisk = "估值可研究" | "估值偏贵" | "已经过热" | "数据不足";
export type OpportunityFinancialImpact =
  | "收入增长"
  | "成本下降"
  | "毛利率提升"
  | "订单增加"
  | "库存改善"
  | "资本开支增加"
  | "经营现金流改善"
  | "估值情绪提升"
  | "暂无明确财务影响";

export type OpportunityStockTypeScore = {
  typeName: string;
  feature: string;
  benefitCertainty: number;
  financialConversion: number;
  valuationSafety: number;
  beginnerFriendly: number;
  userFit: number;
  total: number;
  warning: string;
};

export type OpportunityFunnel = {
  informationCredibility: "高可信" | "中可信" | "低可信";
  chainClarity: "清晰" | "一般" | "模糊";
  financialImpact: "可能影响利润" | "可能影响收入但利润不确定" | "主要是情绪影响" | "暂无财务影响";
  valuationHeat: "估值仍可研究" | "估值偏贵" | "已经过热" | "数据不足";
  userFit: "适合观察" | "适合生成研究任务" | "只适合小仓学习" | "暂不适合用户";
};

export type OpportunityClueTree = {
  directBeneficiaries: string[];
  indirectBeneficiaries: string[];
  possibleLosers: string[];
  substituteOpportunities: string[];
  secondOrderEffects: string[];
  contrarianOpportunities: string[];
};

export type OpportunityChainMap = {
  upstream: string[];
  midstream: string[];
  downstream: string[];
};

export type OpportunityQualityGate = {
  evidenceStrength: OpportunityEvidenceStrength;
  chainClarity: "清晰" | "一般" | "模糊";
  financialImpacts: OpportunityFinancialImpact[];
  valuationRisk: OpportunityValuationRisk;
  userFit: "适合学习账户" | "适合观察" | "暂不适合用户";
  beginnerFriendly: "可理解" | "偏难";
  positionFit: "仓位允许" | "仓位偏紧" | "仓位不允许";
  actionThresholdPassed: boolean;
  learningAccountOnly: boolean;
  blockers: string[];
};

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
  beginnerExplanation?: string;
  investmentChain?: string[];
  cashflowImpact?: string;
  pricedInRisk?: string;
  userFitReason?: string;
  stockTypeScores?: OpportunityStockTypeScore[];
  opportunityFunnel?: OpportunityFunnel;
  qualityGate?: OpportunityQualityGate;
  financialImpacts?: OpportunityFinancialImpact[];
  chainMap?: OpportunityChainMap;
  entryConditions?: string[];
  noEntryConditions?: string[];
  clueTree?: OpportunityClueTree;
  beginnerJudgment?: string;
  nextAction?: OpportunityNextAction;
  researchQuestions?: string[];
  mistakeWarning?: string;
  confidenceLevel?: OpportunityConfidenceLevel;
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

export type OpportunityFeedbackType = "useful" | "too_generic" | "overheated" | "hard_to_understand" | "worth_tracking" | "add_to_watchlist" | "generate_research_task" | "later_valid" | "later_invalid" | "noise" | "too_late" | "too_speculative";

export type OpportunityFeedback = {
  id: string;
  userId?: string;
  opportunityAnalysisId: string;
  feedbackType: OpportunityFeedbackType;
  comment?: string;
  createdAt: string;
};

export type OpportunityValidationReview = {
  reviewDate: string;
  priceChanged: "上涨" | "下跌" | "横盘" | "未跟踪";
  financialRealized: "已兑现" | "部分兑现" | "未兑现" | "无法判断";
  originalJudgmentValid: "成立" | "部分成立" | "不成立" | "待观察";
  effectiveOpportunity: boolean;
  note: string;
};

export type OpportunityValidationRecord = {
  id: string;
  opportunityAnalysisId: string;
  title: string;
  discoveredAt: string;
  judgmentLogic: string[];
  relatedStockTypes: string[];
  systemScore: number;
  systemAction?: OpportunityNextAction;
  userFeedbackTypes: OpportunityFeedbackType[];
  review30d?: OpportunityValidationReview;
  review90d?: OpportunityValidationReview;
  review180d?: OpportunityValidationReview;
  createdAt: string;
  updatedAt: string;
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
  opportunityValidationRecords: OpportunityValidationRecord[];
};
