import type {FundType} from "@/lib/types";

type FundLookup = {
  code: string;
  name?: string;
  type?: FundType;
  currentNav?: number;
  navDate?: string;
  manager?: string;
  fundSize?: number;
  oneYearReturn?: number;
  threeYearReturn?: number;
  source: string;
};

function numberFromText(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.replace(/[%亿,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferFundType(text: string): FundType {
  if (/货币/.test(text)) return "money";
  if (/债券|债/.test(text)) return "bond";
  if (/指数|ETF|联接|增强/.test(text)) return "index";
  if (/QDII|全球|海外|纳斯达克|标普|恒生/.test(text)) return "qdii";
  if (/股票/.test(text)) return "stock";
  return "hybrid";
}

function readJsString(source: string, name: string) {
  const match = source.match(new RegExp(`var\\s+${name}\\s*=\\s*["']([^"']*)["']`));
  return match?.[1];
}

function readJsNumber(source: string, name: string) {
  return numberFromText(readJsString(source, name));
}

function readManager(source: string) {
  const match = source.match(/Data_currentFundManager\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return undefined;
  try {
    const managers = JSON.parse(match[1].replace(/'/g, "\"")) as {name?: string}[];
    return managers.map((item) => item.name).filter(Boolean).join("、") || undefined;
  } catch {
    return undefined;
  }
}

async function lookupFromEastMoney(code: string): Promise<FundLookup> {
  const now = Date.now();
  const [quoteResponse, detailResponse] = await Promise.allSettled([
    fetch(`https://fundgz.1234567.com.cn/js/${code}.js?rt=${now}`, {
      headers: {"Referer": "https://fund.eastmoney.com/"},
      cache: "no-store",
    }),
    fetch(`https://fund.eastmoney.com/pingzhongdata/${code}.js?v=${now}`, {
      headers: {"Referer": "https://fund.eastmoney.com/"},
      cache: "no-store",
    }),
  ]);

  const result: FundLookup = {code, source: "东方财富公开基金数据"};

  if (quoteResponse.status === "fulfilled" && quoteResponse.value.ok) {
    const text = await quoteResponse.value.text();
    const jsonText = text.match(/jsonpgz\((.*)\);?/)?.[1];
    if (jsonText) {
      const quote = JSON.parse(jsonText) as Record<string, unknown>;
      result.name = typeof quote.name === "string" ? quote.name : result.name;
      result.currentNav = numberFromText(quote.dwjz) ?? result.currentNav;
      result.navDate = typeof quote.jzrq === "string" ? quote.jzrq : result.navDate;
    }
  }

  if (detailResponse.status === "fulfilled" && detailResponse.value.ok) {
    const detail = await detailResponse.value.text();
    const name = readJsString(detail, "fS_name");
    result.name = name || result.name;
    result.type = inferFundType(name || "");
    result.oneYearReturn = readJsNumber(detail, "syl_1n");
    result.threeYearReturn = readJsNumber(detail, "syl_3n");
    result.manager = readManager(detail);
    const scale = detail.match(/Data_fluctuationScale\s*=\s*\{[\s\S]*?series:\s*\[\{[\s\S]*?y:\s*([\d.]+)/);
    result.fundSize = numberFromText(scale?.[1]);
  }

  if (!result.name && result.currentNav === undefined) {
    throw new Error("基金代码未找到或公开接口暂不可用。");
  }

  return result;
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();
  if (!/^\d{6}$/.test(code)) {
    return Response.json({ok: false, message: "请输入 6 位基金代码。"}, {status: 400});
  }

  try {
    const data = await lookupFromEastMoney(code);
    return Response.json({ok: true, data});
  } catch (error) {
    return Response.json(
      {ok: false, message: error instanceof Error ? error.message : "基金信息自动补全失败。"},
      {status: 502},
    );
  }
}
