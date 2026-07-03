import type {
  InvestorProfile,
  OpportunityAnalysis,
  OpportunityChainMap,
  OpportunityClueTree,
  OpportunityFinancialImpact,
  OpportunityNextAction,
  OpportunityQualityGate,
  OpportunitySignalType,
  OpportunityStockTypeScore,
} from "@/lib/types";

type ScoreBreakdown = OpportunityAnalysis["scoreBreakdown"];

export function buildOpportunityQuality(input: {
  signalType: OpportunitySignalType;
  industry: string;
  industries: string[];
  score: ScoreBreakdown;
  sourceCount: number;
  relatedTickerCount: number;
  profile?: InvestorProfile;
}) {
  const inCircle = isInAbilityCircle(input.industries, input.profile);
  const stockTypeScores = buildStockTypeScores(input.signalType, input.industry, input.score.userFit, inCircle);
  const chainMap = buildChainMap(input.industry, input.signalType);
  const clueTree = buildClueTree(input.industry, input.signalType);
  const financialImpacts = buildFinancialImpacts(input.signalType);
  const qualityGate = buildQualityGate({
    ...input,
    inCircle,
    financialImpacts,
    chainMap,
  });
  const cappedScore = applyScoreCaps(input.score, qualityGate);
  const nextAction = decideQualityAction(cappedScore, qualityGate);

  return {
    inCircle,
    stockTypeScores,
    chainMap,
    clueTree,
    financialImpacts,
    qualityGate,
    opportunityScore: cappedScore,
    nextAction,
    entryConditions: buildEntryConditions(input.industry),
    noEntryConditions: buildNoEntryConditions(),
    beginnerJudgment: buildBeginnerJudgment(input.industry),
    userFitReason: buildUserFitReason(qualityGate),
    conclusion: buildQualityConclusion(nextAction, qualityGate),
  };
}

export function isInAbilityCircle(industries: string[], profile?: InvestorProfile) {
  const defaultCircle = ["品牌消费", "文旅商业", "科技趋势", "新消费", "AI 应用", "城市更新", "医疗健康", "稳健基金配置"];
  const sectors = profile?.preferredSectors?.length ? profile.preferredSectors : defaultCircle;
  return industries.some((industry) => sectors.some((sector) => industry.includes(sector) || sector.includes(industry)));
}

function buildQualityGate(input: {
  signalType: OpportunitySignalType;
  industry: string;
  industries: string[];
  score: ScoreBreakdown;
  sourceCount: number;
  relatedTickerCount: number;
  profile?: InvestorProfile;
  inCircle: boolean;
  financialImpacts: OpportunityFinancialImpact[];
  chainMap: OpportunityChainMap;
}): OpportunityQualityGate {
  const evidenceStrength = input.sourceCount >= 2 || input.relatedTickerCount >= 2
    ? "高证据"
    : input.signalType === "sentiment_heat"
      ? "低证据"
      : "中证据";
  const chainClarity = input.industry === "综合产业线索" || input.score.chainClarity < 12 ? "模糊" : input.score.chainClarity >= 16 ? "清晰" : "一般";
  const valuationRisk = input.signalType === "sentiment_heat"
    ? "已经过热"
    : input.score.valuationSafety >= 15
      ? "估值可研究"
      : input.score.valuationSafety >= 11
        ? "数据不足"
        : "估值偏贵";
  const beginnerFriendly = input.signalType === "tech_breakthrough" || input.signalType === "sentiment_heat" ? "偏难" : "可理解";
  const userFit = input.inCircle && beginnerFriendly === "可理解"
    ? "适合学习账户"
    : input.inCircle
      ? "适合观察"
      : "暂不适合用户";
  const blockers = [
    evidenceStrength === "低证据" ? "证据强度低，不能进入可小仓学习。" : "",
    chainClarity === "模糊" ? "产业链无法拆清，只能趋势记录或忽略。" : "",
    input.financialImpacts.includes("估值情绪提升") && input.financialImpacts.length === 1 ? "只有估值情绪，没有收入、利润、现金流验证路径。" : "",
    valuationRisk === "已经过热" ? "估值或情绪已经过热，不能进入可小仓学习。" : "",
    userFit === "暂不适合用户" ? "不在当前能力圈或商业模式不够易懂。" : "",
  ].filter(Boolean);

  return {
    evidenceStrength,
    chainClarity,
    financialImpacts: input.financialImpacts,
    valuationRisk,
    userFit,
    beginnerFriendly,
    learningAccountOnly: blockers.length === 0 && userFit === "适合学习账户",
    blockers,
  };
}

function applyScoreCaps(score: ScoreBreakdown, gate: OpportunityQualityGate) {
  let total = score.signalStrength + score.chainClarity + score.fundamentalRelevance + score.valuationSafety + score.userFit;
  if (gate.valuationRisk === "已经过热") total = Math.min(total, 70);
  if (gate.evidenceStrength === "低证据") total = Math.min(total, 60);
  if (gate.chainClarity === "模糊") total = Math.min(total, 69);
  if (gate.blockers.some((item) => item.includes("收入"))) total = Math.min(total, 84);
  return Math.max(0, Math.min(100, total));
}

function decideQualityAction(score: number, gate: OpportunityQualityGate): OpportunityNextAction {
  if (score < 60) return "ignore";
  if (score < 70) return "record";
  if (gate.valuationRisk === "已经过热" || gate.evidenceStrength === "低证据") return "add_to_watchlist";
  if (gate.learningAccountOnly && score >= 90) return "small_position_learning";
  if (score >= 85) return "generate_research_task";
  return "add_to_watchlist";
}

function buildFinancialImpacts(type: OpportunitySignalType): OpportunityFinancialImpact[] {
  const map: Record<OpportunitySignalType, OpportunityFinancialImpact[]> = {
    price_anomaly: ["收入增长", "毛利率提升", "库存改善"],
    supply_shrink: ["订单增加", "毛利率提升", "库存改善"],
    demand_boom: ["收入增长", "订单增加", "资本开支增加"],
    tech_breakthrough: ["收入增长", "资本开支增加", "估值情绪提升"],
    policy_catalyst: ["订单增加", "资本开支增加", "估值情绪提升"],
    company_change: ["收入增长", "成本下降", "毛利率提升", "订单增加", "经营现金流改善"],
    sentiment_heat: ["估值情绪提升"],
    macro_cycle: ["成本下降", "估值情绪提升"],
    contrarian: ["估值情绪提升", "经营现金流改善"],
  };
  return map[type] ?? ["暂无明确财务影响"];
}

function buildChainMap(industry: string, type: OpportunitySignalType): OpportunityChainMap {
  if (type === "macro_cycle") {
    return {
      upstream: ["利率、汇率、流动性等宏观变量"],
      midstream: ["融资成本敏感行业", "估值久期较长的成长资产"],
      downstream: ["消费、地产链、科技成长与宽基资产"],
    };
  }
  return {
    upstream: [`${industry} 原材料、核心技术、关键资源或基础设施`],
    midstream: [`${industry} 设备制造、零部件、系统集成与渠道服务`],
    downstream: [`${industry} 应用场景、终端品牌、企业客户和消费者需求`],
  };
}

function buildStockTypeScores(type: OpportunitySignalType, industry: string, userFitScore: number, inCircle: boolean): OpportunityStockTypeScore[] {
  const templates: Record<string, {typeName: string; feature: string; warning: string; base: [number, number, number, number]}[]> = {
    price_anomaly: [
      {typeName: "上游资源公司", feature: "受价格上涨影响明显，但周期性强，需要关注价格拐点。", warning: "价格上涨可能只是短期扰动。", base: [22, 20, 14, 10]},
      {typeName: "行业龙头", feature: "收入稳定、竞争力清晰、财务质量较好，适合新手优先研究。", warning: "龙头也可能估值已经反映预期。", base: [20, 20, 14, 15]},
      {typeName: "高概念低兑现公司", feature: "新闻热度高，但收入和利润无法验证，默认不适合用户。", warning: "只能做风险排查，不适合作为受益标的。", base: [8, 5, 6, 3]},
    ],
    demand_boom: [
      {typeName: "行业龙头", feature: "收入稳定、竞争力清晰、财务质量较好，适合新手优先研究。", warning: "需要确认需求增长能进入公司订单。", base: [22, 22, 13, 15]},
      {typeName: "核心零部件公司", feature: "处在产业链关键环节，利润弹性可能较高，但波动也更大。", warning: "需要确认客户集中度和议价能力。", base: [20, 19, 12, 12]},
      {typeName: "应用落地公司", feature: "更容易理解收入来源，适合结合消费、品牌、应用场景判断。", warning: "收入占比低的公司要谨慎。", base: [17, 16, 11, 13]},
    ],
    tech_breakthrough: [
      {typeName: "设备制造商", feature: "受资本开支和订单驱动，需要验证订单和交付能力。", warning: "技术突破不等于商业化成功。", base: [20, 18, 12, 12]},
      {typeName: "平台型公司", feature: "商业模式更稳定，但估值通常较高。", warning: "估值可能先于利润兑现。", base: [18, 16, 10, 11]},
      {typeName: "高概念低兑现公司", feature: "新闻热度高，但收入和利润无法验证，默认不适合用户。", warning: "新手应避免把故事当业绩。", base: [8, 5, 6, 3]},
    ],
    policy_catalyst: [
      {typeName: "设备制造商", feature: "受资本开支和订单驱动，需要验证订单和交付能力。", warning: "政策落地节奏和预算强度需要验证。", base: [20, 18, 12, 12]},
      {typeName: "平台型公司", feature: "商业模式更稳定，但估值通常较高。", warning: "政策主题可能先炒估值。", base: [15, 13, 11, 10]},
      {typeName: "高概念低兑现公司", feature: "新闻热度高，但收入和利润无法验证，默认不适合用户。", warning: "政策不是买入理由，订单和现金流才是重点。", base: [9, 6, 7, 5]},
    ],
    contrarian: [
      {typeName: "被错杀的稳健龙头", feature: "行业短期悲观，但公司现金流稳定、估值较低，适合生成研究任务。", warning: "必须验证基本面确实没有恶化。", base: [20, 20, 18, 14]},
      {typeName: "行业龙头", feature: "收入稳定、竞争力清晰、财务质量较好，适合新手优先研究。", warning: "估值便宜可能来自长期衰退。", base: [17, 18, 18, 15]},
      {typeName: "平台型公司", feature: "商业模式更稳定，但估值通常较高。", warning: "需要确认监管和增长预期。", base: [15, 14, 15, 10]},
    ],
    default: [
      {typeName: "行业龙头", feature: "收入稳定、竞争力清晰、财务质量较好，适合新手优先研究。", warning: "仍需验证估值和收入占比。", base: [18, 16, 12, 14]},
      {typeName: "核心零部件公司", feature: "处在产业链关键环节，利润弹性可能较高，但波动也更大。", warning: "传导链较长，确定性较弱。", base: [14, 12, 11, 10]},
      {typeName: "高概念低兑现公司", feature: "新闻热度高，但收入和利润无法验证，默认不适合用户。", warning: "只适合排除风险。", base: [8, 7, 10, 5]},
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

function buildEntryConditions(industry: string) {
  return [
    `公司确实处在 ${industry} 受益产业链关键环节。`,
    "相关业务收入占比不低，用户能说清公司靠什么赚钱。",
    "财报或公告能看到收入、订单、利润或经营现金流改善。",
    "当前估值没有明显透支，股价没有因为概念短期暴涨。",
    "用户仓位允许小额配置，且仅限学习账户时不影响整体组合安全。",
  ];
}

function buildNoEntryConditions() {
  return [
    "只是蹭概念，没有真实收入或订单。",
    "相关业务占比很低，无法验证财务影响。",
    "股价已经提前大涨，估值明显过高。",
    "公司现金流差、负债高，盈利质量弱。",
    "用户看不懂商业模式，买入理由只是别人都在说。",
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

function buildBeginnerJudgment(industry: string) {
  return `这条线索目前只能说明「${industry}」可能发生变化，还不能证明某家公司一定会赚钱。先确认公司是否真的处在受益环节、相关收入占比有多高、财务指标是否改善、股价是否已经提前上涨。答不上来时，只能记录或观察。`;
}

function buildUserFitReason(gate: OpportunityQualityGate) {
  if (gate.learningAccountOnly) return "这条线索在能力圈附近，且证据、产业链、财务影响和估值风险暂未触发硬性拦截；如果继续研究，也只能作为学习账户候选，不代表买入建议。";
  if (gate.userFit === "适合观察") return "这条线索和能力圈有一定交集，但仍需验证财务兑现、估值和收入占比，适合先观察。";
  return `暂不适合直接深入，主要原因：${gate.blockers.join("；") || "能力圈或商业模式理解不足。"}`;
}

function buildQualityConclusion(action: OpportunityNextAction, gate: OpportunityQualityGate) {
  const labels: Record<OpportunityNextAction, string> = {
    ignore: "忽略，不占用注意力。",
    record: "趋势记录，继续观察是否有更多证据。",
    add_to_watchlist: "加入观察池，跟踪产业链、收入占比、估值和股价涨幅。",
    generate_research_task: "生成研究任务，验证财报、公告、估值、竞争格局和最大风险。",
    small_position_learning: "可小仓学习，但仅限学习账户，不代表买入建议。",
  };
  return `${labels[action]} 机会不等于买点。${gate.blockers.length ? `当前拦截点：${gate.blockers.join("；")}` : "任何行动前仍需完成基本面、估值、仓位和风险验证。"}`;
}
