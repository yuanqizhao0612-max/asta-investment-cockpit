import {scanOpportunitySources} from "@/lib/opportunity-radar";
import type {InvestorProfile, OpportunitySource} from "@/lib/types";

export const dynamic = "force-dynamic";

type ScanBody = {
  profile?: Partial<InvestorProfile>;
  sources?: OpportunitySource[];
};

export async function GET() {
  const payload = await scanOpportunitySources();
  return Response.json({
    ok: true,
    ...payload,
    message: payload.fallback ? "公开源暂时不可用，已返回本地示例日报。" : "已完成公开 RSS 扫描。",
  });
}

export async function POST(request: Request) {
  let body: ScanBody = {};
  try {
    body = (await request.json()) as ScanBody;
  } catch {
    body = {};
  }
  const profile = body.profile as InvestorProfile | undefined;
  const payload = await scanOpportunitySources(profile, body.sources);
  return Response.json({
    ok: true,
    ...payload,
    message: payload.fallback ? "公开源暂时不可用，已返回本地示例日报。" : "已完成公开 RSS 扫描。",
  });
}
