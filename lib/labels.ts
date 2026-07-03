import type {AssetType, FundType, Market, OpportunityNextAction, OpportunitySignalType} from "./types";

export const assetTypeLabels: Record<AssetType, string> = {
  cash: "现金",
  fixed_deposit: "定期",
  money_fund: "货币基金",
  fund: "公募基金",
  stock: "股票",
  other: "其他",
};

export const fundTypeLabels: Record<FundType, string> = {
  hybrid: "混合型",
  stock: "股票型",
  bond: "债券型",
  index: "指数型",
  money: "货币型",
  qdii: "QDII",
};

export const marketLabels: Record<Market, string> = {
  A_SHARE: "A股",
  HK: "港股",
  US: "美股",
};

export const riskToleranceLabels = {
  conservative: "稳健",
  balanced: "均衡",
  aggressive: "进取",
};

export const eventTypeLabels = {
  price_increase: "涨价",
  policy: "政策",
  earnings: "业绩",
  supply_shortage: "供给紧张",
  technology_breakthrough: "技术突破",
  demand_growth: "需求增长",
  macro: "宏观",
};

export const opportunitySignalTypeLabels: Record<OpportunitySignalType, string> = {
  price_anomaly: "价格异常",
  supply_shrink: "供给收缩",
  demand_boom: "需求爆发",
  tech_breakthrough: "技术突破",
  policy_catalyst: "政策催化",
  company_change: "公司经营变化",
  sentiment_heat: "舆论热度变化",
  macro_cycle: "宏观周期变化",
  contrarian: "反向机会",
};

export const opportunityNextActionLabels: Record<OpportunityNextAction, string> = {
  ignore: "忽略",
  record: "趋势记录",
  add_to_watchlist: "加入观察池",
  generate_research_task: "生成研究任务",
  small_position_learning: "可小仓学习",
};

export const opportunitySourceTypeLabels = {
  gdelt: "GDELT",
  rss: "RSS",
  sec: "SEC EDGAR",
  fred: "FRED",
  market: "市场数据",
  trends: "搜索热度",
  filing: "公告",
  macro: "宏观",
  custom: "自定义",
};

export const opportunityFeedbackLabels = {
  useful: "有价值",
  too_generic: "太泛了",
  overheated: "已经过热",
  hard_to_understand: "看不懂",
  worth_tracking: "值得追踪",
  add_to_watchlist: "加入观察池",
  generate_research_task: "生成研究任务",
  later_valid: "后来验证有效",
  later_invalid: "后来验证无效",
  noise: "噪音",
  too_late: "太晚了",
  too_speculative: "太概念化",
};

export const decisionActionLabels = {
  buy: "买入",
  add: "追加",
  reduce: "减仓",
  sell: "卖出",
};

export const watchStatusLabels = {
  watching: "观察中",
  near_buy: "接近买点",
  bought: "已买入",
  abandoned: "已放弃",
};

export const holdingPeriodLabels = {
  short: "短期",
  medium: "中期",
  long: "长期",
};

export const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
  maximumFractionDigits: 0,
});

export function pct(value: number) {
  return `${value.toFixed(1)}%`;
}
