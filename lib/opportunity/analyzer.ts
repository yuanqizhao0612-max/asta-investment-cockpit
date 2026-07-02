import {today} from "@/lib/data-sources/common";
import {classifySignal, detectIndustries, scoreSignal} from "./scoring";
import type {InvestorProfile, OpportunityAnalysis, OpportunitySignal, RawExternalItem} from "@/lib/types";

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
  const opportunityScore = Math.min(100, score.total);
  return {
    id: `analysis-${signal.id}`,
    signalId: signal.id,
    title: signal.signalTitle,
    signalSources: [sourceName],
    whatHappened: signal.rawContent,
    whyItMatters: `${primaryIndustry} 出现异常信息变化，可能沿产业链传导到收入、利润、库存、资本开支或估值预期。`,
    transmissionChain: ["外部数据变化", "异常信号确认", "产业链传导", "受益行业筛选", "公司财务验证", "风险过滤后加入观察池"],
    beneficiaryIndustries: signal.relatedIndustries,
    beneficiaryCompanyTypes: [`${primaryIndustry} 中订单、毛利率或现金流可能受影响的公司`, "有真实业绩兑现而不是只蹭概念的公司"],
    relatedTickers,
    riskPoints: ["新闻热度不等于投资价值。", "短期价格波动不等于长期趋势。", "需要确认相关资产是否已经大幅上涨。"],
    nextQuestions: ["这个变化是否持续？", "是否能反映到收入、利润或现金流？", "估值是否仍有安全边际？", "有哪些证据能反驳这个机会？"],
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
    conclusion: opportunityScore >= 85 ? "重点研究机会。先加入观察池，验证财务和估值后再进入买入决策单。" : opportunityScore >= 70 ? "加入观察池。先跟踪证据，不直接买入。" : opportunityScore >= 60 ? "趋势记录。等待更多基本面证据。" : "噪音或过热，不建议跟进。",
    createdAt: today(),
  };
}
