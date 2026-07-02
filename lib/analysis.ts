import type {Asset, AssetType, Fund, InvestorProfile, MarketEvent, ReviewRecord, Stock, TradeDecision} from "./types";

export function sum(values: number[]) {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? value : 0), 0);
}

export function totalAssets(assets: Asset[]) {
  return sum(assets.map((asset) => asset.amount));
}

export function assetTotalsByType(assets: Asset[]) {
  return assets.reduce<Record<AssetType, number>>(
    (acc, asset) => {
      acc[asset.type] += asset.amount;
      return acc;
    },
    {cash: 0, fixed_deposit: 0, money_fund: 0, fund: 0, stock: 0, other: 0},
  );
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function scoreRange(value: number | undefined, good: number, weak: number, reverse = false) {
  if (value === undefined || Number.isNaN(value)) return 0.5;
  if (reverse) {
    if (value <= good) return 1;
    if (value >= weak) return 0;
    return (weak - value) / (weak - good);
  }
  if (value >= good) return 1;
  if (value <= weak) return 0;
  return (value - weak) / (good - weak);
}

export function equityAmount(funds: Fund[], stocks: Stock[]) {
  const equityFunds = sum(funds.filter((fund) => fund.type === "stock" || fund.type === "hybrid" || fund.type === "index").map((fund) => fund.holdingAmount));
  const stockValue = sum(stocks.filter((stock) => stock.status === "holding").map((stock) => stock.holdingAmount ?? (stock.currentPrice * (stock.shares ?? 0))));
  return equityFunds + stockValue;
}

export function equityRatio(profile: InvestorProfile, funds: Fund[], stocks: Stock[]) {
  return (equityAmount(funds, stocks) / Math.max(profile.totalAssets, 1)) * 100;
}

export function calculateFundScoreParts(fund: Fund) {
  return {
    收益能力: Math.round(scoreRange(fund.threeYearReturn, 24, 0) * 12 + scoreRange(fund.oneYearReturn, 8, -8) * 8),
    回撤控制: Math.round(scoreRange(fund.maxDrawdown, 10, 35, true) * 20),
    波动稳定: Math.round(scoreRange(fund.volatility, 10, 28, true) * 15),
    基金经理: fund.manager ? 12 : 6,
    行业质量: fund.industries && fund.industries.length >= 2 ? 13 : 7,
    费用流动性: Math.round(scoreRange(fund.fundSize, 30, 3) * 10),
    配置互补性: fund.type === "bond" || fund.type === "money" || fund.type === "index" ? 5 : 3,
  };
}

export function calculateFundScore(fund: Fund) {
  return Math.round(clamp(sum(Object.values(calculateFundScoreParts(fund)))));
}

export function calculateStockScoreParts(stock: Stock) {
  return {
    估值合理性: Math.round(scoreRange(stock.pe, 15, 55, true) * 12 + scoreRange(stock.pb, 2.5, 10, true) * 8),
    增长能力: Math.round(scoreRange(stock.profitGrowth, 18, -5) * 12 + scoreRange(stock.revenueGrowth, 12, -5) * 8),
    盈利质量: Math.round(scoreRange(stock.roe, 18, 5) * 10 + scoreRange(stock.netMargin, 18, 3) * 6 + scoreRange(stock.cashFlow, 1, -1) * 4),
    财务安全: Math.round(scoreRange(stock.debtRatio, 30, 75, true) * 15),
    价格纪律: stock.targetBuyPrice && stock.currentPrice <= stock.targetBuyPrice ? 13 : stock.targetBuyPrice ? 8 : 6,
    行业景气: stock.industryTrend === "up" ? 10 : stock.industryTrend === "neutral" ? 7 : 4,
  };
}

export function calculateStockScore(stock: Stock) {
  return Math.round(clamp(sum(Object.values(calculateStockScoreParts(stock)))));
}

export function diagnoseFund(fund: Fund, profile: InvestorProfile) {
  const warnings: string[] = [];
  let action: "hold" | "regular_invest" | "add" | "pause_add" | "reduce" | "sell" = fund.monthlyInvestment ? "regular_invest" : "hold";
  const holdingRatio = (fund.holdingAmount / Math.max(profile.totalAssets, 1)) * 100;

  if (holdingRatio > profile.maxSingleFundRatio) {
    warnings.push("单只基金仓位过高，需要控制集中度风险。");
    action = "reduce";
  }
  if (fund.returnRate >= (fund.targetProfitRate || 20)) {
    warnings.push("当前收益率已达到目标收益区间，需要重新确认继续持有理由。");
    action = "reduce";
  }
  if (fund.returnRate <= -20) {
    warnings.push("当前亏损超过 20%，不建议盲目追加，应重新检查基金逻辑是否失效。");
    action = "pause_add";
  }
  if (fund.maxDrawdown !== undefined && fund.maxDrawdown > 30) {
    warnings.push("历史最大回撤偏高，追加前需要确认自己能承受波动。");
  }
  if (fund.returnRate <= -5 && fund.returnRate >= -15 && holdingRatio < profile.maxSingleFundRatio && fund.investmentReason) {
    warnings.push("当前处于可观察回撤区间，如长期逻辑仍成立，可考虑小额分批追加。");
    action = "add";
  }
  if (!fund.investmentReason) {
    warnings.push("缺少买入理由，系统无法判断是否适合继续持有或追加。");
  }
  if (!fund.exitCondition) {
    warnings.push("缺少退出条件，后续减仓或止盈容易变成临时判断。");
  }

  return {
    action,
    label: fundActionLabel(action),
    holdingRatio,
    warnings: warnings.length ? warnings : ["当前未触发明显风险，重点是继续按计划复盘基金经理、回撤和持仓行业。"],
    summary: generateFundSummary(action, warnings),
  };
}

export function diagnoseStock(stock: Stock, profile: InvestorProfile) {
  const warnings: string[] = [];
  let action: "watch" | "small_position" | "add" | "hold" | "reduce" | "sell" | "avoid" = stock.status === "holding" ? "hold" : "watch";
  const holdingAmount = stock.holdingAmount ?? stock.currentPrice * (stock.shares ?? 0);
  const holdingRatio = stock.status === "holding" ? (holdingAmount / Math.max(profile.totalAssets, 1)) * 100 : 0;
  const profitRate = stock.cost ? ((stock.currentPrice - stock.cost) / stock.cost) * 100 : 0;

  if (holdingRatio > profile.maxSingleStockRatio) {
    warnings.push("单只股票仓位超过上限，存在集中持仓风险。");
    action = "reduce";
  }
  if (stock.targetSellPrice && stock.currentPrice >= stock.targetSellPrice) {
    warnings.push("当前价格已达到目标卖出价，建议考虑分批止盈。");
    action = "reduce";
  }
  if (stock.stopLossPrice && stock.currentPrice <= stock.stopLossPrice) {
    warnings.push("当前价格已触发止损线，需要重新评估是否继续持有。");
    action = "sell";
  }
  if (stock.targetBuyPrice && stock.currentPrice <= stock.targetBuyPrice && stock.status === "watching") {
    warnings.push("当前价格接近或低于目标买入价，可以进入买入决策流程。");
    action = "small_position";
  }
  if (stock.pe && stock.pe > 60) warnings.push("当前 PE 较高，需要警惕估值透支。");
  if (stock.profitGrowth !== undefined && stock.profitGrowth < 0) warnings.push("净利润增速为负，需要检查基本面是否恶化。");
  if (stock.industryTrend === "down") warnings.push("行业趋势偏弱，不适合用短期反弹理由加仓。");
  if (!stock.investmentReason) warnings.push("缺少投资理由，不建议直接买入或追加。");
  if (!stock.exitCondition && stock.status === "holding") warnings.push("缺少退出条件，容易在亏损或盈利时失去纪律。");

  return {
    action,
    label: stockActionLabel(action),
    holdingRatio,
    profitRate,
    warnings: warnings.length ? warnings : ["当前未触发明显风险，继续观察估值、盈利增速和行业趋势。"],
    summary: generateStockSummary(action, warnings),
  };
}

export function evaluateTradeDecision(decision: TradeDecision, profile: InvestorProfile, currentHoldingAmount: number) {
  const warnings: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";
  let actionSuggestion: "approve" | "reduce_amount" | "wait" | "avoid" = "approve";
  const tradeRatio = (decision.amount / Math.max(profile.totalAssets, 1)) * 100;

  if (tradeRatio > profile.maxSingleTradeRatio) {
    warnings.push("单次交易金额超过总资产上限，建议降低买入金额。");
    riskLevel = "high";
    actionSuggestion = "reduce_amount";
  }
  if (decision.action === "add" && currentHoldingAmount > 0 && decision.amount > currentHoldingAmount * 0.3) {
    warnings.push("单次追加金额超过当前持仓 30%，建议拆分为多次执行。");
    riskLevel = riskLevel === "high" ? "high" : "medium";
    actionSuggestion = "reduce_amount";
  }
  if (!decision.reason || decision.reason.length < 20) {
    warnings.push("买卖理由过短，可能不是经过充分判断的决策。");
    riskLevel = riskLevel === "high" ? "high" : "medium";
    actionSuggestion = "wait";
  }
  if (!decision.stopLossCondition && (decision.action === "buy" || decision.action === "add")) {
    warnings.push("缺少止损条件，不建议直接买入或追加。");
    riskLevel = riskLevel === "high" ? "high" : "medium";
  }
  if (!decision.takeProfitCondition && (decision.action === "buy" || decision.action === "add")) {
    warnings.push("缺少止盈或复盘条件，后续容易变成被动持有。");
  }
  if (decision.isEmotionDriven) {
    warnings.push("该决策被标记为情绪驱动，建议至少延迟 24 小时再执行。");
    riskLevel = "high";
    actionSuggestion = "wait";
  }
  if (decision.confidenceLevel <= 2) {
    warnings.push("信心等级较低，不建议执行较大金额交易。");
    riskLevel = riskLevel === "high" ? "high" : "medium";
    actionSuggestion = "reduce_amount";
  }

  return {
    riskLevel,
    actionSuggestion,
    warnings: warnings.length ? warnings : ["当前决策未触发主要风控项，但仍建议按计划复盘。"],
    summary: generateDecisionSummary(riskLevel, actionSuggestion, warnings),
    tradeRatio,
  };
}

export function todayInsights(assets: Asset[], funds: Fund[], stocks: Stock[], profile: InvestorProfile, events: MarketEvent[]) {
  const byType = assetTotalsByType(assets);
  const defensiveRatio = ((byType.cash + byType.fixed_deposit + byType.money_fund) / Math.max(profile.totalAssets, 1)) * 100;
  const currentEquityRatio = equityRatio(profile, funds, stocks);
  const missingReasons = funds.filter((fund) => !fund.investmentReason || !fund.exitCondition).length + stocks.filter((stock) => !stock.investmentReason || !stock.exitCondition).length;
  const insights: string[] = [];

  if (defensiveRatio >= 70) insights.push(`当前现金与定期等防御资产占比约 ${defensiveRatio.toFixed(1)}%，安全性较高，但长期收益弹性不足，可先建立观察池。`);
  if (currentEquityRatio < profile.targetEquityRatio) insights.push(`当前权益仓位约 ${currentEquityRatio.toFixed(1)}%，距离目标 ${profile.targetEquityRatio}% 仍有空间，但不建议一次性大额买入。`);
  if (missingReasons > 0) insights.push(`有 ${missingReasons} 个持仓缺少投资理由或退出条件，请优先补齐，否则系统无法判断是否适合追加或卖出。`);
  const highRiskEvent = events.find((event) => event.riskLevel === "high");
  if (insights.length < 3 && highRiskEvent) insights.push(`${highRiskEvent.title} 属于高波动研究线索，更适合加入自选池等待回调，不适合直接重仓追涨。`);
  return insights.slice(0, 3);
}

export function riskWarnings(assets: Asset[], funds: Fund[], stocks: Stock[], profile?: InvestorProfile) {
  const total = profile?.totalAssets || totalAssets(assets);
  if (total <= 0) return ["请先录入资产，系统才能计算风险。"];
  const warnings: string[] = [];
  const currentEquityRatio = profile ? equityRatio(profile, funds, stocks) : (equityAmount(funds, stocks) / total) * 100;
  const maxEquity = profile?.maxEquityRatio ?? 40;
  if (currentEquityRatio > maxEquity) warnings.push("当前权益资产占比较高，需确认是否能承受较大回撤。");
  if (currentEquityRatio < 10) warnings.push("当前资产结构非常保守，长期收益可能偏低，但短期风险较低。");
  funds.forEach((fund) => {
    const ratio = (fund.holdingAmount / total) * 100;
    if (ratio > (profile?.maxSingleFundRatio ?? 20)) warnings.push(`${fund.name} 占总资产 ${ratio.toFixed(1)}%，需要检查是否过度集中。`);
    if (fund.returnRate < -20) warnings.push(`${fund.name} 当前亏损已超过 20%，需要明确继续持有、减仓还是止损。`);
    else if (fund.returnRate < -10) warnings.push(`${fund.name} 当前亏损已超过 10%，请重新检查买入逻辑是否仍然成立。`);
  });
  stocks.forEach((stock) => {
    const marketValue = stock.holdingAmount ?? (stock.shares ?? 0) * stock.currentPrice;
    const ratio = (marketValue / total) * 100;
    if (stock.status === "holding" && ratio > (profile?.maxSingleStockRatio ?? 10)) warnings.push(`${stock.name} 占总资产 ${ratio.toFixed(1)}%，单只股票仓位风险较高。`);
  });
  return warnings.length ? warnings : ["当前未触发集中度或回撤风险，建议继续保持分批和复盘纪律。"];
}

export function dashboardJudgement(assets: Asset[], funds: Fund[], stocks: Stock[], profile?: InvestorProfile) {
  const total = profile?.totalAssets || totalAssets(assets);
  const byType = assetTotalsByType(assets);
  const defensive = ((byType.cash + byType.fixed_deposit + byType.money_fund) / Math.max(total, 1)) * 100;
  const equity = profile ? equityRatio(profile, funds, stocks) : (equityAmount(funds, stocks) / Math.max(total, 1)) * 100;
  if (defensive >= 75) return "当前资产结构偏稳健，现金与定期占比较高，适合逐步建立权益类仓位，但不建议一次性大额买入。";
  if (equity > (profile?.maxEquityRatio ?? 40)) return "当前权益资产占比较高，下一步重点不是加仓，而是检查回撤承受能力和单一标的集中度。";
  return "当前资产结构较均衡，建议继续用诊断、买卖决策卡和复盘记录来约束每次操作。";
}

export function valuationStatus(stock: Stock) {
  if (!stock.targetBuyPrice) return "信息不足";
  const ratio = stock.currentPrice / stock.targetBuyPrice;
  if (ratio <= 1) return "低估或接近买点";
  if (ratio <= 1.15) return "合理";
  if (ratio <= 1.35) return "偏贵";
  return "明显高估";
}

export function fundamentalStatus(stock: Stock) {
  if ((stock.profitGrowth ?? 0) < 0 || stock.industryTrend === "down") return "需复核";
  if ((stock.roe ?? 0) >= 18 && (stock.netMargin ?? 0) >= 15) return "质量较高";
  if ((stock.revenueGrowth ?? 0) >= 5 || (stock.profitGrowth ?? 0) >= 5) return "相对稳定";
  return "信息不足";
}

export function monthlyReviewStats(reviews: ReviewRecord[]) {
  const month = new Date().toISOString().slice(0, 7);
  const current = reviews.filter((review) => review.reviewDate.startsWith(month) || review.createdAt.startsWith(month));
  const profitable = current.filter((review) => (review.profitRate ?? 0) > 0);
  const loss = current.filter((review) => (review.profitRate ?? 0) < 0);
  const worst = [...current].sort((a, b) => (a.profitRate ?? 0) - (b.profitRate ?? 0))[0];
  const best = [...current].sort((a, b) => (b.profitRate ?? 0) - (a.profitRate ?? 0))[0];
  return {
    month,
    tradeCount: current.length,
    profitableCount: profitable.length,
    lossCount: loss.length,
    disciplineCount: current.filter((review) => review.disciplineFollowed).length,
    emotionalCount: current.filter((review) => review.emotionalTrade).length,
    worstName: worst?.instrumentName ?? "暂无",
    bestName: best?.instrumentName ?? "暂无",
    conclusion: current.some((review) => !review.disciplineFollowed || review.emotionalTrade)
      ? "本月最大问题不是单一标的涨跌，而是纪律执行不足。下月所有买入都应先经过买卖决策卡。"
      : "本月交易纪律整体可控，下一步应继续减少临时交易，并补充每笔操作的退出条件。",
  };
}

function generateFundSummary(action: ReturnType<typeof fundActionKey>, warnings: string[]) {
  if (action === "add") return "当前处于可观察回撤区间，可以考虑小额分批追加，但必须确认长期逻辑仍成立。";
  if (action === "pause_add") return "当前不适合继续追加，应先复核基金逻辑和回撤承受能力。";
  if (action === "reduce") return "当前需要控制仓位或重新确认收益目标，适合考虑分批减仓。";
  if (action === "sell") return "当前触发较强退出信号，建议进入卖出决策流程。";
  if (warnings.length) return "当前可以继续持有，但需要补充依据并按月复盘。";
  return "当前可以继续持有，重点跟踪基金经理、回撤和长期收益。";
}

function generateStockSummary(action: ReturnType<typeof stockActionKey>, warnings: string[]) {
  if (action === "small_position") return "当前接近观察买点，可以进入决策卡流程，但不适合直接重仓。";
  if (action === "reduce") return "当前触发止盈、估值或仓位风险，建议考虑分批减仓。";
  if (action === "sell") return "当前触发止损或基本面风险，需要重新评估是否继续持有。";
  if (action === "avoid") return "当前风险较高，不适合新增仓位。";
  if (warnings.length) return "当前可以继续观察，但需要补充投资理由、退出条件和基本面依据。";
  return "当前未触发主要风险，继续观察估值、盈利和行业趋势。";
}

function generateDecisionSummary(riskLevel: "low" | "medium" | "high", suggestion: "approve" | "reduce_amount" | "wait" | "avoid", warnings: string[]) {
  if (suggestion === "wait") return "系统判断：建议等待。原因是当前决策依据或纪律条件不足，应先补充估值、基本面、仓位和止损条件。";
  if (suggestion === "reduce_amount") return "系统判断：建议降低金额。当前交易触发仓位或信心约束，更适合小额分批处理。";
  if (suggestion === "avoid") return "系统判断：建议回避。当前风险不适合执行交易。";
  return riskLevel === "low" && warnings.length === 0 ? "系统判断：低风险通过，但仍需按计划复盘。" : "系统判断：可以进入执行前检查，但需处理提示项。";
}

function fundActionKey(action: "hold" | "regular_invest" | "add" | "pause_add" | "reduce" | "sell") {
  return action;
}

function stockActionKey(action: "watch" | "small_position" | "add" | "hold" | "reduce" | "sell" | "avoid") {
  return action;
}

export function fundActionLabel(action: "hold" | "regular_invest" | "add" | "pause_add" | "reduce" | "sell") {
  return {hold: "继续持有", regular_invest: "适合定投", add: "可以追加", pause_add: "暂停追加", reduce: "考虑减仓", sell: "考虑卖出"}[action];
}

export function stockActionLabel(action: "watch" | "small_position" | "add" | "hold" | "reduce" | "sell" | "avoid") {
  return {watch: "继续观察", small_position: "小仓位试探", add: "分批买入", hold: "继续持有", reduce: "减仓", sell: "考虑卖出", avoid: "回避"}[action];
}

export function actionTone(label: string) {
  if (label.includes("追加") || label.includes("买入") || label.includes("试探")) return "bg-emerald-50 text-emerald-800 border-emerald-100";
  if (label.includes("暂停")) return "bg-amber-50 text-amber-800 border-amber-100";
  if (label.includes("减仓")) return "bg-orange-50 text-orange-800 border-orange-100";
  if (label.includes("卖出") || label.includes("回避")) return "bg-red-50 text-red-800 border-red-100";
  if (label.includes("观察")) return "bg-stone-100 text-stone-700 border-stone-200";
  return "bg-blue-50 text-blue-800 border-blue-100";
}
