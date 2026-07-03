import {today} from "@/lib/data-sources/common";
import {classifySignal, detectIndustries, scoreSignal} from "./scoring";
import type {InvestorProfile, OpportunityAnalysis, OpportunityClueTree, OpportunityFunnel, OpportunityNextAction, OpportunitySignal, OpportunitySignalType, OpportunityStockTypeScore, RawExternalItem} from "@/lib/types";

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
  const inCircle = profile ? signal.relatedIndustries.some((industry) => profile.preferredSectors.some((sector) => industry.includes(sector) || sector.includes(industry))) : false;
  const nextAction = decideNextAction(opportunityScore, score.userFit, signal.relatedIndustries[0] === "综合产业线索", signal.signalType === "sentiment_heat");
  const confidenceLevel = opportunityScore >= 78 && score.chainClarity >= 15 ? "high" : opportunityScore >= 62 ? "medium" : "low";
  const stockTypeScores = buildStockTypeScores(signal.signalType, primaryIndustry, score.userFit, inCircle);
  const opportunityFunnel = buildOpportunityFunnel(signal.signalType, score, opportunityScore, inCircle, relatedTickers.length);
  const clueTree = buildClueTree(primaryIndustry, signal.signalType);
  const investmentChain = [
    `发生了什么：${signal.signalTitle}`,
    `噪音还是趋势：${signal.signalType === "sentiment_heat" ? "目前更像情绪热度，需要更多证据。" : "已经出现可追踪的公开变化，但仍需验证持续性。"}`,
    `影响产业链：${primaryIndustry}`,
    "收入影响：先看订单、销量、价格或客户预算是否改善。",
    "成本影响：再看原材料、算力、物流、融资成本是否下降或上升。",
    "业绩兑现：必须回到财报、公告和管理层指引验证。",
    "是否已反映：如果相关标的已经大涨，优先记录而不是追高。",
    `用户适配：${inCircle ? "在你的能力圈附近，可以优先解释和跟踪。" : "不在当前能力圈内，需要额外学习后再判断。"}`,
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
    userFitReason: inCircle ? "这条线索和你的能力圈有交集，可以优先学习和跟踪。" : "这条线索暂时不在你的能力圈内，建议先补行业常识，不急于行动。",
    stockTypeScores,
    opportunityFunnel,
    entryConditions: buildEntryConditions(primaryIndustry),
    noEntryConditions: buildNoEntryConditions(),
    clueTree,
    beginnerJudgment: `这条线索目前只能说明「${primaryIndustry}」可能发生变化，还不能证明某家公司一定会赚钱。你现在最应该做的不是买入，而是先确认公司是否真的处在受益环节、这块业务收入占比有多高、股价是否已经提前涨过。如果这三个问题答不上来，这条机会只能进入观察池。`,
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
    conclusion: buildConclusion(nextAction),
    createdAt: today(),
  };
}

function buildStockTypeScores(type: OpportunitySignalType, industry: string, userFitScore: number, inCircle: boolean): OpportunityStockTypeScore[] {
  const templates: Record<string, {typeName: string; feature: string; warning: string; base: [number, number, number, number]}[]> = {
    price_anomaly: [
      {typeName: "上游供给受益型公司", feature: "拥有资源、产能或定价权，价格上涨时利润弹性较大。", warning: "需要确认涨价能持续，并且不是一次性扰动。", base: [22, 20, 14, 10]},
      {typeName: "中游制造改善型公司", feature: "订单增加、产能利用率提升，但要关注原材料成本压力。", warning: "收入增长不一定带来利润改善。", base: [18, 17, 13, 12]},
      {typeName: "下游成本受损型公司", feature: "如果无法向消费者转嫁成本，利润可能被压缩。", warning: "这类公司更适合做风险排查，不适合当受益标的。", base: [10, 8, 10, 11]},
    ],
    demand_boom: [
      {typeName: "行业龙头", feature: "已有收入和利润，行业地位清晰，更容易承接需求增长。", warning: "龙头也可能估值已经反映预期。", base: [22, 22, 13, 15]},
      {typeName: "核心零部件公司", feature: "处在关键供应链环节，订单变化可能更敏感。", warning: "需要确认客户集中度和议价能力。", base: [20, 19, 12, 12]},
      {typeName: "应用落地公司", feature: "把行业需求转成真实场景收入。", warning: "概念热度高但收入占比低的公司要谨慎。", base: [17, 16, 11, 10]},
    ],
    tech_breakthrough: [
      {typeName: "技术拥有者", feature: "掌握核心技术或专利，可能获得长期竞争优势。", warning: "技术突破不等于商业化成功。", base: [18, 15, 10, 8]},
      {typeName: "基础设施提供者", feature: "提供算力、设备、材料或工具链，商业化路径可能更清晰。", warning: "要验证真实订单和毛利率。", base: [20, 18, 12, 12]},
      {typeName: "概念炒作公司", feature: "业务关联弱但股价跟随主题波动。", warning: "新手应少碰，避免把故事当业绩。", base: [8, 5, 6, 3]},
    ],
    policy_catalyst: [
      {typeName: "政策直接受益公司", feature: "订单、补贴、审批或资质直接受政策影响。", warning: "政策落地节奏和执行力度需要验证。", base: [20, 18, 12, 12]},
      {typeName: "政策间接受益公司", feature: "通过需求改善、资本开支或行业景气传导受益。", warning: "传导链越长，不确定性越高。", base: [15, 13, 11, 10]},
      {typeName: "短期情绪受益公司", feature: "主要受题材情绪推动。", warning: "政策不是买入理由，订单和现金流才是研究重点。", base: [9, 6, 7, 5]},
    ],
    contrarian: [
      {typeName: "基本面未恶化的龙头", feature: "短期利空下跌，但现金流和竞争力仍稳定。", warning: "必须验证基本面确实没有恶化。", base: [20, 20, 18, 14]},
      {typeName: "分红稳定公司", feature: "现金流稳定、分红纪律较强，适合新手学习估值修复。", warning: "低估可能来自长期衰退而不是误杀。", base: [17, 18, 18, 15]},
      {typeName: "周期见底公司", feature: "行业周期可能触底，盈利弹性较大。", warning: "周期底部很难判断，仓位必须保守。", base: [15, 14, 15, 10]},
    ],
    default: [
      {typeName: "直接受益型公司", feature: "业务处在变化最直接影响的环节。", warning: "需要验证收入占比和利润弹性。", base: [18, 16, 12, 11]},
      {typeName: "间接受益型公司", feature: "通过产业链传导获得需求或成本变化。", warning: "传导链较长，确定性较弱。", base: [14, 12, 11, 10]},
      {typeName: "可能受损型公司", feature: "成本、需求或竞争格局可能被负面影响。", warning: "更适合做风险排查。", base: [8, 7, 10, 9]},
    ],
  };
  const selected = templates[type] ?? templates.default;
  return selected.map((item) => {
    const userFit = Math.min(15, Math.max(4, Math.round(userFitScore * 0.65 + (inCircle ? 2 : -2))));
    const total = item.base[0] + item.base[1] + item.base[2] + item.base[3] + userFit;
    return {
      typeName: item.typeName,
      feature: item.feature,
      benefitCertainty: item.base[0],
      financialConversion: item.base[1],
      valuationSafety: item.base[2],
      beginnerFriendly: item.base[3],
      userFit,
      total,
      warning: item.warning,
    };
  }).sort((a, b) => b.total - a.total);
}

function buildOpportunityFunnel(type: OpportunitySignalType, score: ReturnType<typeof scoreSignal>, total: number, inCircle: boolean, relatedTickerCount: number): OpportunityFunnel {
  return {
    informationCredibility: relatedTickerCount > 0 && total >= 70 ? "高可信" : total >= 58 ? "中可信" : "低可信",
    chainClarity: score.chainClarity >= 15 ? "清晰" : score.chainClarity >= 11 ? "一般" : "模糊",
    financialImpact: type === "sentiment_heat" ? "主要是情绪影响" : type === "macro_cycle" ? "可能影响收入但利润不确定" : score.fundamentalRelevance >= 14 ? "可能影响利润" : "暂无财务影响",
    valuationHeat: type === "sentiment_heat" ? "已经过热" : score.valuationSafety >= 15 ? "估值仍可研究" : score.valuationSafety >= 11 ? "数据不足" : "估值偏贵",
    userFit: inCircle && total >= 78 ? "适合生成研究任务" : inCircle ? "适合观察" : total >= 82 ? "只适合小仓学习" : "暂不适合用户",
  };
}

function buildEntryConditions(industry: string) {
  return [
    `公司确实处在 ${industry} 受益产业链关键环节。`,
    "该业务收入占比不低，而不是只蹭概念。",
    "财报或公告能看到订单、收入、利润或现金流改善。",
    "当前估值没有明显透支，股价没有短期大幅提前反映。",
    "用户仓位允许小额配置，下跌风险可承受。",
  ];
}

function buildNoEntryConditions() {
  return [
    "只是概念炒作，没有真实收入或订单。",
    "股价已经短期大涨，估值明显透支。",
    "公司负债高、现金流差，盈利质量弱。",
    "用户看不懂公司商业模式或产业链位置。",
    "当前已有相关行业高仓位，继续买入会重复暴露。",
  ];
}

function buildClueTree(industry: string, type: OpportunitySignalType): OpportunityClueTree {
  return {
    directBeneficiaries: [`${industry} 直接供给方`, `${industry} 龙头公司`, "具备真实订单和收入的公司"],
    indirectBeneficiaries: ["设备、材料、软件与服务供应商", "渠道与分销公司", "相关基础设施公司"],
    possibleLosers: ["成本无法转嫁的下游公司", "业务占比低但估值已被炒高的公司", "现金流弱且需要持续融资的公司"],
    substituteOpportunities: ["替代技术路线", "成本更低的替代品", "服务化或平台化替代方案"],
    secondOrderEffects: type === "demand_boom" || type === "tech_breakthrough"
      ? ["资本开支增加", "供应链扩产", "数据安全和运维需求上升"]
      : ["库存周期变化", "价格传导变化", "行业集中度变化"],
    contrarianOpportunities: ["如果市场过度交易主题，高估值概念股可能回落", "如果基本面没有恶化，低估龙头可能出现修复研究机会"],
  };
}

function decideNextAction(score: number, userFit: number, vague: boolean, heatOnly: boolean): OpportunityNextAction {
  if (vague || score < 55) return "ignore";
  if (heatOnly || score < 65) return "record";
  if (score >= 82 && userFit >= 14) return "small_position_learning";
  if (score >= 72) return "generate_research_task";
  return "add_to_watchlist";
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

function buildConclusion(action: OpportunityNextAction) {
  return `${nextActionText(action)} 机会不等于买点，任何行动前都必须经过基本面、估值、仓位和风险验证。`;
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
