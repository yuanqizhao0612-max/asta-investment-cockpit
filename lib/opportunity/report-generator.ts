import {today} from "@/lib/data-sources/common";
import type {OpportunityAnalysis, OpportunityDailyReport} from "@/lib/types";

export function buildDailyReport(analyses: OpportunityAnalysis[]): OpportunityDailyReport {
  const top = [...analyses].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 5);
  const ignored = analyses.filter((item) => item.nextAction === "ignore").length;
  const trends = analyses.filter((item) => item.nextAction === "record" || item.nextAction === "add_to_watchlist").length;
  const research = analyses.filter((item) => item.nextAction === "generate_research_task" || item.nextAction === "small_position_learning").length;
  return {
    id: `report-${today()}`,
    reportDate: today(),
    summary: `今天系统发现 ${analyses.length} 条市场动态，其中 ${ignored} 条被过滤为噪音，${trends} 条进入趋势记录，${research} 条值得进一步研究。基于你的资产结构和能力圈，今天最值得看的是：「${top[0]?.title ?? "暂无"}」。机会不等于买点。`,
    topOpportunityIds: top.slice(0, 3).map((item) => item.id),
    ignoredNoise: ["只有热度、没有产业链验证的短期话题", "只有股价波动、没有基本面信息的异动", "重复新闻或公告已按 hash 去重"],
    riskWarnings: ["新闻热度不等于投资价值。", "每条机会必须验证反方风险。", "买入前仍需完成买入决策单。"],
    createdAt: today(),
  };
}
