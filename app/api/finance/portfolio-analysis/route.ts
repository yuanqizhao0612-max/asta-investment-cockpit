import {analyzePortfolioRisk} from "@/lib/finance-analysis/portfolio";
import type {Asset, Fund, InvestorProfile, Stock} from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = {
  assets?: Asset[];
  funds?: Fund[];
  stocks?: Stock[];
  profile?: InvestorProfile;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    if (!body.profile) {
      return Response.json({ok: false, message: "缺少用户风险设置。"}, {status: 400});
    }
    const report = analyzePortfolioRisk(body.assets ?? [], body.funds ?? [], body.stocks ?? [], body.profile);
    return Response.json({ok: true, report});
  } catch {
    return Response.json({ok: false, message: "组合分析失败，请检查输入数据。"}, {status: 400});
  }
}

