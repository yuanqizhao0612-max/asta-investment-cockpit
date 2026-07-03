import type {OpportunityAnalysis} from "@/lib/types";

export function buildOpportunityResearchTask(opportunity: OpportunityAnalysis) {
  const questions = opportunity.researchQuestions?.length ? opportunity.researchQuestions : opportunity.nextQuestions;
  return {
    title: `研究任务：${opportunity.title}`,
    reminder: "机会不等于买点。任何机会都必须经过基本面、估值、仓位和风险验证。",
    checklist: [
      "这家公司靠什么赚钱？",
      "这次机会会影响它哪一块收入？",
      "这个收入占公司总收入多少？",
      "毛利率会不会改善？",
      "公司是否有竞争优势？",
      "过去三年收入和利润是否稳定？",
      "当前估值在历史区间高位还是低位？",
      "股价是否已经提前大涨？",
      "最大风险是什么？",
      "如果判断错了，亏损边界在哪里？",
      ...questions,
    ],
    mistakeWarning: opportunity.mistakeWarning || "不要把新闻热度直接当作公司利润增长。",
    nextAction: opportunity.nextAction || "generate_research_task",
  };
}

