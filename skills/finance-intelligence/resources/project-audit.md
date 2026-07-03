# Finance Open Source Project Audit

Checked on 2026-07-03 using public GitHub repository metadata.

| Project | GitHub | Main Use | Stars | Last Push | Open Issues | License | API Key | Security / Product Risk | Fit | Recommended Action |
|---|---|---:|---:|---|---:|---|---|---|---|---|
| AKShare | https://github.com/akfamily/akshare | China A-share, funds, macro, index data | 20944 | 2026-05-27 | 39 | MIT | No for many public endpoints | Public-source stability can vary; keep server-side | High | Install in optional Python service |
| Tushare | https://github.com/waditu/tushare | A-share, fund, financial, macro data | 15201 | 2024-03-13 | 741 | BSD-3-Clause | Yes | Token and quota limits; token must stay server-side | Medium | Server-side enhancement only |
| yfinance | https://github.com/ranaroussi/yfinance | US/global ticker quote and fundamentals | 24514 | 2026-06-28 | 159 | Apache-2.0 | No | Yahoo data is unofficial/delayed/rate-limited; personal research only | Medium | Install in optional Python service |
| edgartools | https://github.com/dgunning/edgartools | SEC filings and XBRL financials | 2430 | 2026-06-29 | 10 | MIT | No | Must identify app/user agent to SEC; do not expose public MCP | High | Add to optional Python service later |
| QuantStats | https://github.com/ranaroussi/quantstats | Portfolio return/risk reports | 7385 | 2026-06-19 | 22 | Apache-2.0 | No | Needs historical prices; explain metrics plainly | Medium | Reference now, install when historical price pipeline exists |
| backtesting.py | https://github.com/kernc/backtesting.py | Strategy backtesting | 8619 | 2025-12-20 | 79 | AGPL-3.0 | No | AGPL obligations; easy for users to misuse as trading signal | Low | Reference only for learning mode |
| awesome-quant | https://github.com/wilsonfreitas/awesome-quant | Curated quant project list | 27337 | 2026-07-03 | 46 | No license file in metadata | No | Discovery list, not executable dependency | Medium | Reference only |

## Final Integration Decision

Integrated in this phase:
- Project-local Finance Intelligence Skill.
- Optional Python data service scaffold with AKShare and yfinance adapters.
- Server-side portfolio risk analysis API.
- Research-task generation API scaffold.

Not installed into the Next.js runtime:
- No new npm dependencies.
- No broker, auto-trading, or account integrations.
- No front-end API keys.

## Environment Variables

- `FINANCE_DATA_SERVICE_URL`: optional local Python service URL, for example `http://127.0.0.1:8765`.
- `TUSHARE_TOKEN`: optional server-side Tushare token.
- `SEC_USER_AGENT`: optional SEC-compliant user agent string for future filing work.

