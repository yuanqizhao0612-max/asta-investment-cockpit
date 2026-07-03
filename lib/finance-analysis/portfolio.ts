import type {Asset, Fund, InvestorProfile, Stock} from "@/lib/types";
import {assetTotalsByType, sum} from "@/lib/analysis";

export type PortfolioRiskReport = {
  totalAssets: number;
  cashRatio: number;
  fundRatio: number;
  stockRatio: number;
  equityRatio: number;
  largestSingleAssetRatio: number;
  topIndustryExposures: {name: string; ratio: number}[];
  estimatedMaxDrawdown: number;
  volatilityPressure: "low" | "medium" | "high";
  overlapWarnings: string[];
  concentrationWarnings: string[];
  healthScore: number;
  plainLanguageSummary: string;
  validationQuestions: string[];
  riskReminder: string;
};

function ratio(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function stockHoldingAmount(stock: Stock) {
  return stock.holdingAmount ?? stock.currentPrice * (stock.shares ?? 0);
}

export function analyzePortfolioRisk(assets: Asset[], funds: Fund[], stocks: Stock[], profile: InvestorProfile): PortfolioRiskReport {
  const total = profile.totalAssets || sum(assets.map((asset) => asset.amount)) || 1;
  const byType = assetTotalsByType(assets);
  const stockAmount = sum(stocks.filter((stock) => stock.status === "holding").map(stockHoldingAmount));
  const fundAmount = sum(funds.map((fund) => fund.holdingAmount));
  const equityFundAmount = sum(funds.filter((fund) => fund.type === "stock" || fund.type === "hybrid" || fund.type === "index" || fund.type === "qdii").map((fund) => fund.holdingAmount));
  const cashAmount = byType.cash + byType.fixed_deposit + byType.money_fund;

  const positionRatios = [
    ...funds.map((fund) => ({name: fund.name, ratio: ratio(fund.holdingAmount, total), type: "fund"})),
    ...stocks.filter((stock) => stock.status === "holding").map((stock) => ({name: stock.name, ratio: ratio(stockHoldingAmount(stock), total), type: "stock"})),
  ].sort((a, b) => b.ratio - a.ratio);

  const industryMap = new Map<string, number>();
  funds.forEach((fund) => {
    const industries = fund.industries?.length ? fund.industries : [fund.type === "bond" ? "债券基金" : fund.type === "money" ? "货币基金" : "未穿透基金"];
    industries.forEach((industry) => industryMap.set(industry, (industryMap.get(industry) ?? 0) + fund.holdingAmount / industries.length));
  });
  stocks.filter((stock) => stock.status === "holding").forEach((stock) => {
    const industry = stock.industry || "未分类股票";
    industryMap.set(industry, (industryMap.get(industry) ?? 0) + stockHoldingAmount(stock));
  });

  const topIndustryExposures = Array.from(industryMap.entries())
    .map(([name, amount]) => ({name, ratio: ratio(amount, total)}))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 5);

  const equityRatio = ratio(equityFundAmount + stockAmount, total);
  const estimatedMaxDrawdown = Math.min(60, equityRatio * 0.45 + ratio(stockAmount, total) * 0.25);
  const volatilityPressure = estimatedMaxDrawdown >= 25 ? "high" : estimatedMaxDrawdown >= 12 ? "medium" : "low";
  const largestSingleAssetRatio = positionRatios[0]?.ratio ?? 0;

  const concentrationWarnings = [
    ...positionRatios.filter((item) => item.type === "fund" && item.ratio > profile.maxSingleFundRatio).map((item) => `${item.name} 占总资产 ${item.ratio.toFixed(1)}%，超过单只基金上限。`),
    ...positionRatios.filter((item) => item.type === "stock" && item.ratio > profile.maxSingleStockRatio).map((item) => `${item.name} 占总资产 ${item.ratio.toFixed(1)}%，超过单只股票上限。`),
    ...topIndustryExposures.filter((item) => item.ratio >= 25).map((item) => `${item.name} 暴露约 ${item.ratio.toFixed(1)}%，需要检查行业集中度。`),
  ];

  const overlapWarnings = topIndustryExposures
    .filter((item) => item.name !== "未穿透基金" && item.ratio >= 15)
    .map((item) => `${item.name} 在基金和股票中可能重复暴露，建议继续穿透基金前十大持仓。`);

  const healthScore = Math.round(Math.max(0, Math.min(100,
    100
      - Math.max(0, equityRatio - profile.maxEquityRatio) * 1.4
      - Math.max(0, largestSingleAssetRatio - Math.max(profile.maxSingleFundRatio, profile.maxSingleStockRatio)) * 1.6
      - Math.max(0, estimatedMaxDrawdown - 15) * 1.2
      - concentrationWarnings.length * 6
      - overlapWarnings.length * 4,
  )));

  const plainLanguageSummary = healthScore >= 80
    ? "组合结构整体可控，下一步重点是补齐持仓理由、退出条件和基金穿透信息。"
    : healthScore >= 60
      ? "组合有一定风险集中，建议先复核单只资产和行业暴露，再考虑新增仓位。"
      : "组合风险集中度偏高，不建议继续加大权益仓位，应先降低重复暴露并明确退出条件。";

  return {
    totalAssets: total,
    cashRatio: ratio(cashAmount, total),
    fundRatio: ratio(fundAmount, total),
    stockRatio: ratio(stockAmount, total),
    equityRatio,
    largestSingleAssetRatio,
    topIndustryExposures,
    estimatedMaxDrawdown,
    volatilityPressure,
    overlapWarnings,
    concentrationWarnings,
    healthScore,
    plainLanguageSummary,
    validationQuestions: [
      "最大一笔持仓如果下跌 20%，是否会影响你的生活现金流？",
      "基金和股票是否重复押注同一行业？",
      "当前权益仓位是否超过你的最大承受范围？",
      "每个持仓是否都有买入理由和退出条件？",
      "如果市场连续下跌三个月，你会按计划执行还是临时改变？",
    ],
    riskReminder: "组合分析用于研究辅助，不构成买卖建议。机会不等于买点，任何行动都必须经过基本面、估值、仓位和风险验证。",
  };
}

