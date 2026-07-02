import type {Market} from "@/lib/types";

type StockLookup = {
  code: string;
  name?: string;
  market: Market;
  industry?: string;
  currentPrice?: number;
  marketCap?: number;
  pe?: number;
  pb?: number;
  ps?: number;
  revenue?: number;
  netProfit?: number;
  grossMargin?: number;
  roe?: number;
  debtRatio?: number;
  cashFlow?: number;
  source: string;
};

function inferMarket(code: string): {market: Market; symbol: string} {
  const trimmed = code.trim().toUpperCase();
  if (/^\d{5}$/.test(trimmed)) return {market: "HK", symbol: `${trimmed}.HK`};
  if (/^\d{6}$/.test(trimmed)) return {market: "A_SHARE", symbol: `${trimmed}.${trimmed.startsWith("6") ? "SS" : "SZ"}`};
  return {market: "US", symbol: trimmed};
}

function eastMoneySecid(code: string) {
  if (!/^\d{6}$/.test(code)) return undefined;
  return `${code.startsWith("6") ? "1" : "0"}.${code}`;
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function lookupYahoo(code: string): Promise<StockLookup> {
  const {market, symbol} = inferMarket(code);
  const modules = [
    "price",
    "summaryDetail",
    "defaultKeyStatistics",
    "financialData",
    "assetProfile",
  ].join(",");
  const response = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`, {
    headers: {"User-Agent": "Mozilla/5.0"},
    cache: "no-store",
  });
  if (!response.ok) throw new Error("公开行情接口暂不可用。");
  const payload = await response.json() as {
    quoteSummary?: {
      result?: Array<Record<string, any>>;
      error?: {description?: string};
    };
  };
  const data = payload.quoteSummary?.result?.[0];
  if (!data) throw new Error(payload.quoteSummary?.error?.description || "未找到股票代码。");

  const price = data.price || {};
  const summary = data.summaryDetail || {};
  const stats = data.defaultKeyStatistics || {};
  const financial = data.financialData || {};
  const profile = data.assetProfile || {};
  const revenue = num(financial.totalRevenue?.raw);
  const grossProfit = num(financial.grossProfits?.raw);
  const totalDebt = num(financial.totalDebt?.raw);
  const totalCash = num(financial.totalCash?.raw);

  return {
    code: code.trim().toUpperCase(),
    name: price.longName || price.shortName,
    market,
    industry: profile.industry || profile.sector,
    currentPrice: num(price.regularMarketPrice?.raw),
    marketCap: num(price.marketCap?.raw),
    pe: num(summary.trailingPE?.raw),
    pb: num(stats.priceToBook?.raw),
    ps: num(summary.priceToSalesTrailing12Months?.raw),
    revenue,
    netProfit: num(financial.netIncomeToCommon?.raw),
    grossMargin: revenue && grossProfit ? (grossProfit / revenue) * 100 : undefined,
    roe: num(financial.returnOnEquity?.raw) !== undefined ? Number(financial.returnOnEquity.raw) * 100 : undefined,
    debtRatio: totalDebt && totalCash !== undefined && revenue ? (totalDebt / Math.max(revenue, 1)) * 100 : undefined,
    cashFlow: num(financial.freeCashflow?.raw),
    source: "Yahoo Finance 公开行情数据",
  };
}

async function lookupEastMoneyAShare(code: string): Promise<StockLookup> {
  const secid = eastMoneySecid(code);
  if (!secid) throw new Error("东方财富接口仅支持 6 位 A 股代码。");
  const fields = ["f57", "f58", "f43", "f116", "f162", "f167", "f168", "f127", "f128"].join(",");
  const response = await fetch(`https://push2.eastmoney.com/api/qt/stock/get?secid=${secid}&fields=${fields}`, {
    headers: {"Referer": "https://quote.eastmoney.com/", "User-Agent": "Mozilla/5.0"},
    cache: "no-store",
  });
  if (!response.ok) throw new Error("东方财富股票接口暂不可用。");
  const payload = await response.json() as {data?: Record<string, unknown>};
  const data = payload.data;
  if (!data?.f58) throw new Error("未找到 A 股代码。");
  return {
    code,
    name: String(data.f58),
    market: "A_SHARE",
    industry: [data.f127, data.f128].filter(Boolean).join(" / ") || undefined,
    currentPrice: num(data.f43) !== undefined ? Number(data.f43) / 100 : undefined,
    marketCap: num(data.f116),
    pe: num(data.f162) !== undefined ? Number(data.f162) / 100 : undefined,
    pb: num(data.f167) !== undefined ? Number(data.f167) / 100 : undefined,
    ps: num(data.f168) !== undefined ? Number(data.f168) / 100 : undefined,
    source: "东方财富公开股票行情",
  };
}

async function lookupSinaAShare(code: string): Promise<StockLookup> {
  const symbol = `${code.startsWith("6") ? "sh" : "sz"}${code}`;
  const response = await fetch(`https://hq.sinajs.cn/list=${symbol}`, {
    headers: {"Referer": "https://finance.sina.com.cn/", "User-Agent": "Mozilla/5.0"},
    cache: "no-store",
  });
  if (!response.ok) throw new Error("新浪股票接口暂不可用。");
  const text = new TextDecoder("gb18030").decode(await response.arrayBuffer());
  const raw = text.match(/="([^"]*)"/)?.[1];
  const fields = raw?.split(",") ?? [];
  if (!fields[0]) throw new Error("未找到 A 股代码。");
  return {
    code,
    name: fields[0],
    market: "A_SHARE",
    currentPrice: num(fields[3]),
    source: "新浪公开股票行情",
  };
}

export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const code = (searchParams.get("code") || "").trim();
  if (!code) {
    return Response.json({ok: false, message: "请输入股票代码。"}, {status: 400});
  }

  try {
    const inferred = inferMarket(code);
    const data = inferred.market === "A_SHARE"
      ? await lookupEastMoneyAShare(code).catch(() => lookupSinaAShare(code))
      : await lookupYahoo(code);
    return Response.json({ok: true, data});
  } catch (error) {
    return Response.json(
      {ok: false, message: error instanceof Error ? error.message : "股票信息自动补全失败。"},
      {status: 502},
    );
  }
}
