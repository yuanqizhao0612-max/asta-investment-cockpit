# Finance Intelligence Skill

Use this skill for Asta investment cockpit work involving stocks, funds, opportunity radar, SEC filings, portfolio review, or investment retrospectives.

## Core Rule

This skill is a research assistant, not an investment adviser. Never output deterministic return promises or direct buy/sell commands.

Forbidden phrases and claims:
- 必涨
- 立即买入
- 梭哈
- 抄底
- 神股
- 稳赚
- 保证收益
- 一夜翻倍

Always include this reminder when producing an investment-facing conclusion:

> 机会不等于买点。任何机会都必须经过基本面、估值、仓位和风险验证。

## Standard Judgment Chain

Use this chain for stocks, funds, opportunity radar, filings, and portfolio analysis:

1. 公开信息
2. 关键变化
3. 产业链传导
4. 公司收入/成本/利润影响
5. 财务验证
6. 估值验证
7. 用户仓位适配
8. 下一步动作

Allowed next actions only:
- 忽略
- 趋势记录
- 加入观察池
- 生成研究任务
- 可小仓学习

## Data Source Rules

- Do not call finance data APIs from the browser.
- Keep all API keys and tokens on the server side.
- Use `TUSHARE_TOKEN`, `FRED_API_KEY`, `FINNHUB_API_KEY`, and similar values only from environment variables.
- Do not connect broker accounts.
- Do not support automatic trading or order placement.
- Prefer public, read-only data sources.
- Treat all third-party data as potentially delayed, incomplete, or rate-limited.

## Source Preference

1. AKShare: preferred for China A-share, China funds, index, macro, and market data in a Python service.
2. Tushare: server-side enhancement source when a valid token is configured.
3. yfinance: personal research use for US stocks and global tickers; not a production-grade commercial data source.
4. SEC EDGAR / edgartools: US filings, 10-K, 10-Q, 8-K, XBRL financials, risk factors, insider filings.
5. QuantStats: portfolio review and risk report generation when historical price data is available.
6. backtesting.py: learning-only historical rule checks. Never convert backtest output into buy/sell advice.
7. awesome-quant: discovery list only. Do not install frameworks from it without a separate audit.

## Stock Analysis Flow

1. Identify ticker, market, industry, and current price.
2. Pull valuation fields where available: market cap, PE, PB, PS.
3. Pull financial quality fields where available: revenue, net profit, gross margin, ROE, debt ratio, cash flow.
4. Summarize business model in plain language.
5. Explain what would improve revenue, cost, profit, or cash flow.
6. Check whether price may already reflect the story.
7. Compare position size with user risk limits.
8. Output one allowed next action and validation questions.

## Fund Analysis Flow

1. Identify fund name, type, company, manager, NAV, inception date, size, and fee fields.
2. Pull return fields: 1Y, 3Y, 5Y when available.
3. Pull max drawdown, top holdings, and industry distribution when available.
4. Separate public facts from user-specific fields: holding amount, cost, reason, holding period, core holding flag.
5. Check concentration, drawdown tolerance, manager risk, fee burden, and overlap with existing holdings.
6. Output hold/review questions, not buy/sell instructions.

## Opportunity Radar Flow

Each opportunity card must answer:
- 发生了什么
- 这是不是噪音
- 产业链传导路径
- 谁的收入可能增加
- 谁的成本可能下降
- 哪些公司可能受益
- 财务上需要验证什么
- 股价是否可能已经反映
- 对当前用户是否适合
- 下一步动作
- 最大误判风险

## Filing Analysis Flow

For SEC filings:
- Prefer official SEC data or a mature library such as edgartools.
- Extract business change, revenue driver, margin change, risk factor change, liquidity, debt, and management discussion.
- Never expose credentials.
- Do not run public unauthenticated MCP services.

## Portfolio Risk Flow

Calculate and explain:
- Total assets
- Cash ratio
- Fund ratio
- Stock ratio
- Single asset concentration
- Industry exposure
- Estimated max drawdown pressure
- Volatility pressure
- Holding overlap risk
- Concentration risk
- Portfolio health score

Translate professional metrics into plain language for beginner users.

## Backtest Boundary

Backtests are learning tools only.

Required wording:

> 历史回测结果不代表未来收益。该功能用于验证投资规则的历史表现，不构成买卖建议。

