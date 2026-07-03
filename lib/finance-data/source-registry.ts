export type FinanceSourceStatus = "integrated" | "optional_service" | "server_env_only" | "reference_only" | "rejected";

export type FinanceSourceRecord = {
  name: string;
  url: string;
  status: FinanceSourceStatus;
  purpose: string;
  license: string;
  keyPolicy: string;
  riskNote: string;
};

export const financeSourceRegistry: FinanceSourceRecord[] = [
  {
    name: "AKShare",
    url: "https://github.com/akfamily/akshare",
    status: "optional_service",
    purpose: "A 股、基金、指数、宏观与行业数据",
    license: "MIT",
    keyPolicy: "多数公开接口不需要 key；只允许服务端调用。",
    riskNote: "公开数据源可能变化，失败时必须允许手动覆盖。",
  },
  {
    name: "Tushare",
    url: "https://github.com/waditu/tushare",
    status: "server_env_only",
    purpose: "A 股、基金、财务与宏观增强数据",
    license: "BSD-3-Clause",
    keyPolicy: "需要 TUSHARE_TOKEN，必须放在服务端环境变量。",
    riskNote: "有积分、额度和权限限制。",
  },
  {
    name: "yfinance",
    url: "https://github.com/ranaroussi/yfinance",
    status: "optional_service",
    purpose: "美股和全球 ticker 初步补全",
    license: "Apache-2.0",
    keyPolicy: "不需要 key；仅限个人研究。",
    riskNote: "Yahoo 数据非官方，可能限流或延迟，不用于商业化生产承诺。",
  },
  {
    name: "edgartools",
    url: "https://github.com/dgunning/edgartools",
    status: "reference_only",
    purpose: "SEC EDGAR 财报、公告、XBRL 和风险因素分析",
    license: "MIT",
    keyPolicy: "无需 key，但应配置 SEC_USER_AGENT。",
    riskNote: "不能在公网无认证运行 MCP 或文件分析服务。",
  },
  {
    name: "QuantStats",
    url: "https://github.com/ranaroussi/quantstats",
    status: "reference_only",
    purpose: "组合收益、波动、回撤和风险报告",
    license: "Apache-2.0",
    keyPolicy: "不需要 key。",
    riskNote: "需要历史价格序列，本阶段先实现基础版组合风险。",
  },
];

