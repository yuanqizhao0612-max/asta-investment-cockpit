import {today} from "@/lib/data-sources/common";
import type {OpportunityAnalysis, OpportunityDailyReport} from "@/lib/types";

export function buildDailyReport(analyses: OpportunityAnalysis[]): OpportunityDailyReport {
  const top = [...analyses].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
  return {
    id: `report-${today()}`,
    reportDate: today(),
    summary: `今日外部数据扫描识别到 ${analyses.length} 条研究线索，最高分机会为「${top[0]?.title ?? "暂无"}」。所有机会默认进入观察流程，不直接构成买入建议。`,
    topOpportunityIds: top.slice(0, 3).map((item) => item.id),
    ignoredNoise: ["只有热度、没有产业链验证的短期话题", "只有股价波动、没有基本面信息的异动", "重复新闻或公告已按 hash 去重"],
    riskWarnings: ["新闻热度不等于投资价值。", "每条机会必须验证反方风险。", "买入前仍需完成买入决策单。"],
    createdAt: today(),
  };
}
