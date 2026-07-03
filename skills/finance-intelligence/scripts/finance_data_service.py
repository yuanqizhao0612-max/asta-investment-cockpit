"""Optional local finance data microservice for Asta.

This service is intentionally read-only. It does not connect to broker accounts,
does not place orders, and does not expose API keys to the browser.

Run locally:
    python -m uvicorn finance_data_service:app --host 127.0.0.1 --port 8765
"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Asta Finance Data Service", version="0.1.0")


class LookupResponse(BaseModel):
    ok: bool
    data: dict[str, Any]
    warning: str = "数据仅用于研究辅助，不构成投资建议。"


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/fund/{code}", response_model=LookupResponse)
def fund_lookup(code: str) -> LookupResponse:
    try:
        import akshare as ak  # type: ignore

        base = ak.fund_individual_basic_info_xq(symbol=code)
        data = {"code": code}
        for _, row in base.iterrows():
            item = str(row.get("item", ""))
            value = row.get("value")
            if "基金名称" in item:
                data["name"] = value
            elif "基金公司" in item:
                data["fundCompany"] = value
            elif "基金经理" in item:
                data["manager"] = value
            elif "成立" in item:
                data["inceptionDate"] = value
            elif "类型" in item:
                data["rawType"] = value
        return LookupResponse(ok=True, data=data)
    except Exception as exc:  # pragma: no cover - runtime adapter
        raise HTTPException(status_code=502, detail=f"AKShare fund lookup failed: {exc}") from exc


@app.get("/stock/{symbol}", response_model=LookupResponse)
def stock_lookup(symbol: str) -> LookupResponse:
    try:
        import yfinance as yf  # type: ignore

        ticker = yf.Ticker(symbol)
        info = ticker.info or {}
        data = {
            "code": symbol.upper(),
            "name": info.get("longName") or info.get("shortName"),
            "industry": info.get("industry") or info.get("sector"),
            "currentPrice": info.get("currentPrice") or info.get("regularMarketPrice"),
            "marketCap": info.get("marketCap"),
            "pe": info.get("trailingPE"),
            "pb": info.get("priceToBook"),
            "ps": info.get("priceToSalesTrailing12Months"),
            "revenue": info.get("totalRevenue"),
            "netProfit": info.get("netIncomeToCommon"),
            "grossMargin": (info.get("grossMargins") or 0) * 100 if info.get("grossMargins") is not None else None,
            "roe": (info.get("returnOnEquity") or 0) * 100 if info.get("returnOnEquity") is not None else None,
            "debtRatio": info.get("debtToEquity"),
            "cashFlow": info.get("freeCashflow"),
        }
        return LookupResponse(ok=True, data={k: v for k, v in data.items() if v is not None})
    except Exception as exc:  # pragma: no cover - runtime adapter
        raise HTTPException(status_code=502, detail=f"yfinance stock lookup failed: {exc}") from exc

