import {buildOpportunityResearchTask} from "@/lib/opportunity-intelligence/research-task";
import type {OpportunityAnalysis} from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {opportunity?: OpportunityAnalysis};
    if (!body.opportunity) {
      return Response.json({ok: false, message: "缺少机会卡片。"}, {status: 400});
    }
    return Response.json({ok: true, task: buildOpportunityResearchTask(body.opportunity)});
  } catch {
    return Response.json({ok: false, message: "研究任务生成失败。"}, {status: 400});
  }
}

