const TUSHARE_ENDPOINT = "http://api.tushare.pro";

const allowedApis = new Set([
  "daily",
  "daily_basic",
  "fund_basic",
  "fund_nav",
  "fund_portfolio",
  "fund_share",
  "index_daily",
  "stock_basic",
  "trade_cal",
]);

type TushareResponse = {
  code?: number;
  msg?: string;
  data?: {
    fields?: string[];
    items?: unknown[][];
  };
};

export async function POST(request: Request) {
  const token = process.env.TUSHARE_TOKEN;
  if (!token) {
    return Response.json(
      {
        ok: false,
        error: "TUSHARE_TOKEN_NOT_CONFIGURED",
        message: "还没有配置 TUSHARE_TOKEN。后续接真实行情时，把 token 放到服务端环境变量里，前端不用填写密钥。",
      },
      {status: 503},
    );
  }

  let body: {apiName?: unknown; params?: unknown; fields?: unknown};
  try {
    body = await request.json();
  } catch {
    return Response.json({ok: false, error: "BAD_JSON", message: "请求格式不正确。"}, {status: 400});
  }

  const apiName = typeof body.apiName === "string" ? body.apiName : "";
  if (!allowedApis.has(apiName)) {
    return Response.json({ok: false, error: "API_NOT_ALLOWED", message: "这个行情接口暂未开放。"}, {status: 400});
  }

  const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : {};
  const fields = typeof body.fields === "string" ? body.fields : "";

  try {
    const response = await fetch(TUSHARE_ENDPOINT, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        api_name: apiName,
        token,
        params,
        fields,
      }),
      cache: "no-store",
    });
    const payload = (await response.json()) as TushareResponse;
    if (!response.ok || payload.code !== 0) {
      return Response.json(
        {ok: false, error: "TUSHARE_ERROR", message: payload.msg || "Tushare 返回异常，请检查 token、权限或接口参数。"},
        {status: 502},
      );
    }

    const fieldNames = payload.data?.fields || [];
    const items = (payload.data?.items || []).map((row) => Object.fromEntries(fieldNames.map((field, index) => [field, row[index]])));

    return Response.json({ok: true, apiName, fields: fieldNames, items});
  } catch {
    return Response.json({ok: false, error: "NETWORK_ERROR", message: "无法连接 Tushare，请稍后重试或检查网络。"}, {status: 502});
  }
}
