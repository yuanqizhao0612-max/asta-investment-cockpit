import type {InvestorProfile, OpportunitySignalType} from "@/lib/types";

const typeRules: {type: OpportunitySignalType; words: string[]}[] = [
  {type: "price_anomaly", words: ["price", "涨价", "价格", "inflation", "gold", "oil", "copper", "lithium", "freight", "commodity", "yield"]},
  {type: "supply_shrink", words: ["supply", "shortage", "出口管制", "停产", "中断", "restriction", "ban", "disruption"]},
  {type: "demand_boom", words: ["demand", "growth", "AI", "robot", "算力", "机器人", "储能", "增长", "boom"]},
  {type: "tech_breakthrough", words: ["breakthrough", "model", "battery", "solid-state", "自动驾驶", "脑机", "技术", "突破"]},
  {type: "policy_catalyst", words: ["policy", "regulation", "stimulus", "政策", "监管", "审批", "补贴", "低空经济"]},
  {type: "company_change", words: ["earnings", "order", "guidance", "capex", "inventory", "filing", "10-k", "10-q", "8-k", "财报", "订单", "库存", "回购"]},
  {type: "sentiment_heat", words: ["trend", "viral", "热搜", "爆火", "出圈", "社交媒体", "consumer"]},
  {type: "contrarian", words: ["selloff", "undervalued", "悲观", "误杀", "估值压缩", "下跌"]},
];

const industryRules = [
  {industry: "AI 算力", words: ["AI", "算力", "data center", "GPU", "server"]},
  {industry: "存储芯片", words: ["storage", "memory", "SSD", "HDD", "DRAM", "NAND", "HBM", "存储", "semiconductor"]},
  {industry: "机器人", words: ["robot", "机器人", "automation", "自动化"]},
  {industry: "低空经济", words: ["drone", "low altitude", "低空", "无人机"]},
  {industry: "能源与原材料", words: ["oil", "gold", "copper", "lithium", "energy", "黄金", "铜", "锂", "原油"]},
  {industry: "宏观利率", words: ["interest rate", "fedfunds", "DGS10", "DGS2", "CPI", "inflation", "unrate", "利率", "通胀"]},
  {industry: "消费", words: ["consumer", "brand", "retail", "消费", "品牌", "零售", "tourism"]},
  {industry: "医药", words: ["drug", "pharma", "biotech", "medicine", "医药", "创新药", "pharmaceutical"]},
];

function includesAny(text: string, words: string[]) {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word.toLowerCase()));
}

export function classifySignal(text: string): OpportunitySignalType {
  return typeRules.find((rule) => includesAny(text, rule.words))?.type ?? "sentiment_heat";
}

export function detectIndustries(text: string) {
  const industries = industryRules.filter((rule) => includesAny(text, rule.words)).map((rule) => rule.industry);
  return industries.length ? industries : ["综合产业线索"];
}

export function extractKeywords(text: string) {
  const tokens = text
    .replace(/[^\p{Script=Han}a-zA-Z0-9 ]/gu, " ")
    .split(/\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 18);
  return Array.from(new Set(tokens)).slice(0, 8);
}

export function scoreSignal(type: OpportunitySignalType, industries: string[], sourceCount: number, profile?: InvestorProfile) {
  const typeBase: Record<OpportunitySignalType, number> = {
    price_anomaly: 15,
    supply_shrink: 15,
    demand_boom: 15,
    tech_breakthrough: 14,
    policy_catalyst: 13,
    company_change: 17,
    sentiment_heat: 10,
    contrarian: 13,
  };
  const multiSourceBonus = Math.min(5, Math.max(0, sourceCount - 1) * 2);
  const signalStrength = Math.min(20, typeBase[type] + multiSourceBonus);
  const chainClarity = industries[0] === "综合产业线索" ? 10 : 15;
  const fundamentalRelevance = type === "sentiment_heat" ? 9 : type === "company_change" ? 18 : type === "policy_catalyst" ? 13 : 14;
  const valuationSafety = type === "contrarian" ? 16 : type === "sentiment_heat" ? 8 : 12;
  const userFit = profile ? Math.min(20, 10 + industries.filter((industry) => profile.preferredSectors.some((sector) => industry.includes(sector) || sector.includes(industry))).length * 4) : 13;
  return {
    signalStrength,
    chainClarity,
    fundamentalRelevance,
    valuationSafety,
    userFit,
    total: signalStrength + chainClarity + fundamentalRelevance + valuationSafety + userFit,
  };
}
