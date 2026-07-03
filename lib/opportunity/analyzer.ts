import {today} from "@/lib/data-sources/common";
import {buildOpportunityQuality} from "./quality";
import {classifySignal, detectIndustries, scoreSignal} from "./scoring";
import type {InvestorProfile, OpportunityAnalysis, OpportunityNextAction, OpportunitySignal, RawExternalItem} from "@/lib/types";

const tickerMap: Record<string, OpportunityAnalysis["relatedTickers"]> = {
  "存储芯片": [
    {name: "Micron Technology", code: "MU", market: "US", reason: "存储芯片价格和 AI 数据中心需求的敏感样本。"},
    {name: "Western Digital", code: "WDC", market: "US", reason: "企业级存储设备价格周期的观察对象。"},
  ],
  "机器人": [
    {name: "汇川技术", code: "300124", market: "A_SHARE", reason: "工业自动化和控制系统产业链样本。"},
    {name: "绿的谐波", code: "688017", market: "A_SHARE", reason: "机器人减速器产业链样本。"},
  ],
  "低空经济": [
    {name: "中无人机", code: "688297", market: "A_SHARE", reason: "低空经济设备链研究样本。"},
    {name: "亿航智能", code: "EH", market: "US", reason: "低空航空器商业化观察对象。"},
  ],
  "宏观利率": [
    {name: "沪深300指数增强", code: "000300", market: "A_SHARE", reason: "宏观利率变化会影响权益资产估值中枢，可作为宽基观察样本。"},
    {name: "纳斯达克 100 ETF", market: "US", reason: "长端利率变化对成长股估值较敏感。"},
  ],
  "消费": [
    {name: "贵州茅台", code: "600519", market: "A_SHARE", reason: "品牌消费龙头的估值和现金流观察样本。"},
    {name: "腾讯控股", code: "00700", market: "HK", reason: "平台型消费与互联网现金流观察样本。"},
  ],
};

export function buildSignalsFromRawItems(items: RawExternalItem[], profile?: InvestorProfile): OpportunitySignal[] {
  return items.map((item) => {
    const content = `${item.title}。${item.summary}。${item.rawContent}`;
    const signalType = classifySignal(content);
    const relatedIndustries = detectIndustries(content);
    const score = scoreSignal(signalType, relatedIndustries, 1, profile);
    return {
      id: `signal-${item.hash}`,
      sourceId: item.sourceId,
      rawItemId: item.id,
      signalTitle: item.title,
      signalType,
      rawContent: item.rawContent,
      keywords: item.detectedKeywords,
      relatedIndustries,
      relatedCompanies: [],
      signalStrength: score.total,
      confidenceScore: Math.min(100, score.signalStrength * 4),
      detectedAt: item.publishedAt ?? today(),
      createdAt: today(),
    };
  });
}

export function buildAnalysisFromSignal(signal: OpportunitySignal, sourceName: string, profile?: InvestorProfile): OpportunityAnalysis {
  const score = scoreSignal(signal.signalType, signal.relatedIndustries, 1, profile);
  const primaryIndustry = signal.relatedIndustries[0] ?? "综合产业线索";
  const relatedTickers = signal.relatedIndustries.flatMap((industry) => tickerMap[industry] ?? []).slice(0, 4);
  const quality = buildOpportunityQuality({
    signalType: signal.signalType,
    industry: primaryIndustry,
    industries: signal.relatedIndustries,
    score,
    sourceCount: 1,
    relatedTickerCount: relatedTickers.length,
    profile,
  });
  const opportunityScore = quality.opportunityScore;
  const nextAction = quality.nextAction;
  const confidenceLevel = opportunityScore >= 78 && score.chainClarity >= 15 ? "high" : opportunityScore >= 62 ? "medium" : "low";
  const investmentChain = [
    `发生了什么：${signal.signalTitle}`,
    `噪音还是趋势：${signal.signalType === "sentiment_heat" ? "目前更像情绪热度，需要更多证据。" : "已经出现可追踪的公开变化，但仍需验证持续性。"}`,
    `影响产业链：${primaryIndustry}`,
    "收入影响：先看订单、销量、价格或客户预算是否改善。",
    "成本影响：再看原材料、算力、物流、融资成本是否下降或上升。",
    "业绩兑现：必须回到财报、公告和管理层指引验证。",
    "是否已反映：如果相关标的已经大涨，优先记录而不是追高。",
    `用户适配：${quality.userFitReason}`,
    `下一步：${nextActionText(nextAction)}`,
  ];
  return {
    id: `analysis-${signal.id}`,
    signalId: signal.id,
    title: signal.signalTitle,
    signalSources: [sourceName],
    whatHappened: signal.rawContent,
    whyItMatters: `${primaryIndustry} 出现异常信息变化，可能沿产业链传导到收入、利润、库存、资本开支或估值预期。`,
    transmissionChain: ["公开信息", "关键变化", "商业影响", "财务影响", "估值判断", "用户适配", "下一步动作"],
    beneficiaryIndustries: signal.relatedIndustries,
    beneficiaryCompanyTypes: [`${primaryIndustry} 中订单、毛利率或现金流可能受影响的公司`, "有真实业绩兑现而不是只蹭概念的公司"],
    relatedTickers,
    riskPoints: ["新闻热度不等于投资价值。", "短期价格波动不等于长期趋势。", "需要确认相关资产是否已经大幅上涨。"],
    nextQuestions: ["这个变化是否持续？", "是否能反映到收入、利润或现金流？", "估值是否仍有安全边际？", "有哪些证据能反驳这个机会？"],
    beginnerExplanation: `简单说，这是关于「${primaryIndustry}」的一条市场变化线索。它可能和股票有关，是因为行业变化最终可能影响公司的收入、成本或利润。但它现在还不能证明某家公司一定会赚钱，更不能直接等同于买入理由。`,
    investmentChain,
    cashflowImpact: `需要验证 ${primaryIndustry} 相关公司的订单、回款、毛利率和自由现金流是否真的改善。`,
    pricedInRisk: "如果相关公司股价已经提前大涨，市场可能已经部分反映这条信息，继续追高的风险会上升。",
    userFitReason: quality.userFitReason,
    stockTypeScores: quality.stockTypeScores,
    opportunityFunnel: {
      informationCredibility: quality.qualityGate.evidenceStrength === "高证据" ? "高可信" : quality.qualityGate.evidenceStrength === "中证据" ? "中可信" : "低可信",
      chainClarity: quality.qualityGate.chainClarity,
      financialImpact: quality.financialImpacts.includes("估值情绪提升") && quality.financialImpacts.length === 1 ? "主要是情绪影响" : quality.financialImpacts.includes("收入增长") || quality.financialImpacts.includes("毛利率提升") ? "可能影响利润" : "可能影响收入但利润不确定",
      valuationHeat: quality.qualityGate.valuationRisk === "估值可研究" ? "估值仍可研究" : quality.qualityGate.valuationRisk,
      userFit: quality.qualityGate.userFit === "适合学习账户" ? "只适合小仓学习" : quality.qualityGate.userFit === "适合观察" ? "适合观察" : "暂不适合用户",
    },
    qualityGate: quality.qualityGate,
    consensus: quality.consensus,
    bearCase: quality.bearCase,
    financialImpacts: quality.financialImpacts,
    chainMap: quality.chainMap,
    entryConditions: quality.entryConditions,
    noEntryConditions: quality.noEntryConditions,
    clueTree: quality.clueTree,
    beginnerJudgment: quality.beginnerJudgment,
    nextAction,
    researchQuestions: buildResearchQuestions(primaryIndustry),
    mistakeWarning: "最容易误判的是把行业变化直接等同于公司利润增长。必须验证收入占比、毛利率、竞争格局和估值位置。",
    confidenceLevel,
    scoreBreakdown: {
      signalStrength: score.signalStrength,
      chainClarity: score.chainClarity,
      fundamentalRelevance: score.fundamentalRelevance,
      valuationSafety: score.valuationSafety,
      userFit: score.userFit,
    },
    opportunityScore,
    suitabilityScore: score.userFit * 5,
    riskLevel: opportunityScore >= 78 ? "high" : opportunityScore >= 65 ? "medium" : "low",
    status: "new",
    conclusion: quality.conclusion,
    createdAt: today(),
  };
}

function nextActionText(action: OpportunityNextAction) {
  const labels: Record<OpportunityNextAction, string> = {
    ignore: "忽略，不占用注意力。",
    record: "趋势记录，继续观察是否有更多证据。",
    add_to_watchlist: "加入观察池，跟踪产业链和标的变化。",
    generate_research_task: "生成研究任务，验证财报、公告、估值和竞争格局。",
    small_position_learning: "只允许小仓学习，不允许重仓。",
  };
  return labels[action];
}

function buildResearchQuestions(industry: string) {
  return [
    "这家公司靠什么赚钱？",
    `这次 ${industry} 机会会影响它哪一块收入？`,
    "这个收入占公司总收入多少？",
    "毛利率会不会改善？",
    "公司是否有竞争优势？",
    "过去三年收入和利润是否稳定？",
    "当前估值在历史区间高位还是低位？",
    "股价是否已经提前大涨？",
    "最大风险是什么？",
    "如果判断错了，亏损边界在哪里？",
  ];
}
