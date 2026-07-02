"use client";

import {useEffect, useMemo, useState} from "react";
import type React from "react";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  FileText,
  LineChart,
  LogOut,
  PieChart as PieChartIcon,
  Plus,
  RefreshCcw,
  Settings,
  ShieldAlert,
  Trash2,
  WalletCards,
} from "lucide-react";
import {Cell, Pie, PieChart, ResponsiveContainer, Tooltip} from "recharts";
import {
  assetTotalsByType,
  calculateFundScore,
  calculateFundScoreParts,
  calculateStockScore,
  calculateStockScoreParts,
  dashboardJudgement,
  diagnoseFund,
  diagnoseStock,
  equityRatio,
  evaluateTradeDecision,
  monthlyReviewStats,
  riskWarnings,
  totalAssets,
} from "@/lib/analysis";
import {
  assetTypeLabels,
  decisionActionLabels,
  fundTypeLabels,
  holdingPeriodLabels,
  marketLabels,
  money,
  opportunityNextActionLabels,
  opportunityFeedbackLabels,
  opportunitySignalTypeLabels,
  opportunitySourceTypeLabels,
  pct,
  riskToleranceLabels,
} from "@/lib/labels";
import {useInvestmentStore} from "@/lib/storage";
import type {Asset, AssetType, Fund, FundType, InvestorProfile, Market, OpportunityAnalysis, OpportunityFeedbackType, OpportunitySource, ReviewRecord, Stock, StoreState, TradeDecision} from "@/lib/types";

type Store = ReturnType<typeof useInvestmentStore>;
type View = "dashboard" | "holdings" | "fund" | "stock" | "buy" | "add" | "sell" | "review" | "radar" | "settings";

const navItems: {id: View; label: string; icon: React.ComponentType<{size?: number}>}[] = [
  {id: "dashboard", label: "首页", icon: BarChart3},
  {id: "holdings", label: "持仓", icon: WalletCards},
  {id: "fund", label: "基金分析", icon: FileText},
  {id: "stock", label: "股票分析", icon: LineChart},
  {id: "buy", label: "买入单", icon: ClipboardCheck},
  {id: "add", label: "加仓单", icon: Plus},
  {id: "sell", label: "卖出单", icon: ShieldAlert},
  {id: "review", label: "复盘", icon: BookOpenCheck},
  {id: "radar", label: "机会雷达", icon: Compass},
  {id: "settings", label: "设置", icon: Settings},
];

const palette = ["#1f2937", "#315a49", "#8a7862", "#57708a", "#b86b5e", "#c7cdd2"];
const today = () => new Date().toISOString().slice(0, 10);

const emptyAsset: Asset = {id: "", name: "", type: "cash", amount: 0, createdAt: "", updatedAt: ""};
const emptyFund: Fund = {
  id: "",
  name: "",
  code: "",
  type: "hybrid",
  holdingAmount: 0,
  cost: 0,
  currentNav: 0,
  profitLoss: 0,
  returnRate: 0,
  holdingDays: 0,
  targetProfitRate: 15,
  maxAcceptableLossRate: 15,
  monthlyInvestment: 0,
  manager: "",
  fundSize: 0,
  oneYearReturn: 0,
  threeYearReturn: 0,
  maxDrawdown: 0,
  volatility: 0,
  industries: [],
  investmentReason: "",
  exitCondition: "",
  createdAt: "",
  updatedAt: "",
};
const emptyStock: Stock = {
  id: "",
  name: "",
  code: "",
  market: "A_SHARE",
  status: "watching",
  industry: "",
  holdingAmount: 0,
  currentPrice: 0,
  targetBuyPrice: 0,
  targetSellPrice: 0,
  stopLossPrice: 0,
  shares: 0,
  cost: 0,
  marketCap: 0,
  pe: 0,
  pb: 0,
  ps: 0,
  revenue: 0,
  netProfit: 0,
  revenueGrowth: 0,
  profitGrowth: 0,
  grossMargin: 0,
  netMargin: 0,
  roe: 0,
  cashFlow: 0,
  debtRatio: 0,
  industryTrend: "neutral",
  investmentReason: "",
  riskReason: "",
  exitCondition: "",
  createdAt: "",
  updatedAt: "",
};

function numberValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").replace(/[%¥,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function splitConfigList(value: string) {
  return value.split(/,|，|、|\n/).map((item) => item.trim()).filter(Boolean);
}

function buildFeedbackStats(feedback: {feedbackType: OpportunityFeedbackType}[]) {
  const total = feedback.length;
  const useful = feedback.filter((item) => item.feedbackType === "useful" || item.feedbackType === "worth_tracking" || item.feedbackType === "add_to_watchlist" || item.feedbackType === "generate_research_task").length;
  const noise = feedback.filter((item) => item.feedbackType === "noise" || item.feedbackType === "too_speculative" || item.feedbackType === "too_generic" || item.feedbackType === "hard_to_understand" || item.feedbackType === "overheated").length;
  return {
    total,
    usefulRatio: total ? (useful / total) * 100 : 0,
    noiseRatio: total ? (noise / total) * 100 : 0,
    watchlistCount: feedback.filter((item) => item.feedbackType === "add_to_watchlist").length,
  };
}

export function InvestmentApp() {
  const store = useInvestmentStore();
  const [view, setView] = useState<View>("dashboard");

  async function logout() {
    await fetch("/api/auth/logout", {method: "POST"});
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[210px_1fr] lg:px-6">
        <aside className="min-w-0 lg:sticky lg:top-5 lg:h-fit">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b9490]">Asta</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#111827]">投资驾驶舱</h1>
          </div>
          <nav className="glass-nav flex max-w-full gap-1 overflow-auto p-1 lg:grid">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => setView(item.id)} className={`nav-pill ${view === item.id ? "nav-pill-active" : ""}`}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
          <button className="mt-3 hidden w-full items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-sm font-semibold text-[#68726d] transition hover:bg-white/70 hover:text-[#111827] lg:flex" onClick={logout}>
            <LogOut size={16} />
            退出登录
          </button>
        </aside>

        <section className="min-w-0">
          {view === "dashboard" && <Dashboard store={store} />}
          {view === "holdings" && <Holdings store={store} />}
          {view === "fund" && <FundAnalyzer store={store} />}
          {view === "stock" && <StockAnalyzer store={store} />}
          {view === "buy" && <DecisionPage store={store} action="buy" />}
          {view === "add" && <DecisionPage store={store} action="add" />}
          {view === "sell" && <DecisionPage store={store} action="sell" />}
          {view === "review" && <ReviewPage store={store} />}
          {view === "radar" && <OpportunityRadar store={store} />}
          {view === "settings" && <SettingsPage store={store} />}
          <p className="mt-6 text-center text-xs leading-5 text-[#8b9490]">本工具只做记录、分析和风险提醒，不构成投资建议。每次交易都应留下理由并按计划复盘。</p>
        </section>
      </div>
    </main>
  );
}

function Dashboard({store}: {store: Store}) {
  const total = store.profile.totalAssets || totalAssets(store.assets);
  const byType = assetTotalsByType(store.assets);
  const chartData = Object.entries(byType)
    .map(([type, amount]) => ({name: assetTypeLabels[type as AssetType], value: amount}))
    .filter((item) => item.value > 0);
  const currentEquityRatio = equityRatio(store.profile, store.funds, store.stocks);
  const warnings = riskWarnings(store.assets, store.funds, store.stocks, store.profile);
  const dueReviews = store.decisions.filter((decision) => !store.reviews.some((review) => review.decisionId === decision.id)).length;
  const nearBuy = store.stocks.filter((stock) => stock.targetBuyPrice && stock.currentPrice <= stock.targetBuyPrice).length;
  const dailyFocus = buildDailyFocus(store);

  return (
    <div className="grid gap-5">
      <Hero
        title="今日投资状态"
        subtitle={dashboardJudgement(store.assets, store.funds, store.stocks, store.profile)}
        action={<button className="btn btn-secondary" onClick={store.reset}><RefreshCcw size={16} />恢复示例</button>}
      />

      <section className="hero-panel grid gap-5 p-5 lg:grid-cols-[1fr_310px]">
        <div>
          <p className="text-sm font-medium text-[#68726d]">总资产</p>
          <p className="mt-2 text-5xl font-semibold tracking-tight text-[#111827]">{money.format(total)}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <MiniMetric label="现金类资产" value={money.format(byType.cash + byType.fixed_deposit + byType.money_fund)} />
            <MiniMetric label="基金资产" value={money.format(byType.fund)} />
            <MiniMetric label="股票资产" value={money.format(byType.stock)} />
            <MiniMetric label="权益仓位" value={pct(currentEquityRatio)} />
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={98} paddingAngle={3}>
                {chartData.map((_, index) => <Cell key={index} fill={palette[index % palette.length]} />)}
              </Pie>
              <Tooltip formatter={(value) => money.format(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="今日最值得看的 3 条" icon={<Compass size={18} />}>
          <Stack>
            {dailyFocus.map((item, index) => <ActionLine key={item} index={index + 1} text={item} />)}
          </Stack>
        </Panel>
        <Panel title="风险提示" icon={<ShieldAlert size={18} />}>
          <Stack>{warnings.slice(0, 4).map((item) => <Notice key={item}>{item}</Notice>)}</Stack>
        </Panel>
        <Panel title="今日待关注" icon={<Activity size={18} />}>
          <Stack>
            <ActionLine index={1} text={`${dueReviews} 笔交易需要补充复盘。`} />
            <ActionLine index={2} text={`${nearBuy} 个股票观察项接近设定买入区间。`} />
            <ActionLine index={3} text="热点事件只进入研究方向，不直接触发买入。" />
          </Stack>
        </Panel>
        <Panel title="投资纪律" icon={<CheckCircle2 size={18} />}>
          <Stack>
            <ActionLine index={1} text="没有写清楚买入理由，不买。" />
            <ActionLine index={2} text="看不懂公司靠什么赚钱，不买。" />
            <ActionLine index={3} text="不能承受 20% 下跌，不重仓。" />
          </Stack>
        </Panel>
      </section>
    </div>
  );
}

function Holdings({store}: {store: Store}) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [fund, setFund] = useState<Fund | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);

  return (
    <div className="grid gap-5">
      <Hero title="资产与持仓" subtitle="先把资产底座录清楚，再看基金和股票是否超出自己的风险边界。" />
      <Panel title="资产录入" icon={<PieChartIcon size={18} />}>
        <AssetForm editing={asset} onSave={(next) => { store.upsertAsset(next); setAsset(null); }} />
        <CardGrid>
          {store.assets.map((item) => (
            <RecordCard key={item.id} title={item.name} meta={`${assetTypeLabels[item.type]} · ${money.format(item.amount)}`} onEdit={() => setAsset(item)} onDelete={() => store.deleteAsset(item.id)}>
              <p>{item.note || "该资产用于计算资产结构和风险边界。"}</p>
            </RecordCard>
          ))}
        </CardGrid>
      </Panel>

      <Panel title="基金持仓" icon={<FileText size={18} />}>
        <FundForm editing={fund} onSave={(next) => { store.upsertFund(next); setFund(null); }} />
        <CardGrid>
          {store.funds.map((item) => <FundCard key={item.id} fund={item} profile={store.profile} onEdit={() => setFund(item)} onDelete={() => store.deleteFund(item.id)} />)}
        </CardGrid>
      </Panel>

      <Panel title="股票持仓" icon={<LineChart size={18} />}>
        <StockForm editing={stock} onSave={(next) => { store.upsertStock(next); setStock(null); }} />
        <CardGrid>
          {store.stocks.map((item) => <StockCard key={item.id} stock={item} profile={store.profile} onEdit={() => setStock(item)} onDelete={() => store.deleteStock(item.id)} />)}
        </CardGrid>
      </Panel>
    </div>
  );
}

function buildDailyFocus(store: Store) {
  const opportunities = [...store.opportunityAnalyses].sort((a, b) => b.opportunityScore - a.opportunityScore);
  const focus = opportunities.find((item) => item.nextAction === "generate_research_task" || item.nextAction === "small_position_learning") ?? opportunities[0];
  const trend = opportunities.find((item) => item.nextAction === "record" || item.nextAction === "add_to_watchlist");
  const warning = riskWarnings(store.assets, store.funds, store.stocks, store.profile)[0];
  const scanned = store.rawExternalItems.length;
  const ignored = store.opportunityAnalyses.filter((item) => item.nextAction === "ignore" || item.status === "ignored").length;
  return [
    focus ? `重点机会：${focus.title}。${focus.conclusion}` : `今天系统尚未生成重点机会。可进入机会雷达扫描公开信息。`,
    trend ? `趋势记录：${trend.title}。先观察证据，不直接买入。` : `趋势记录：当前没有足够清晰的趋势线索。`,
    warning ? `风险提醒：${warning}` : `今日摘要：系统发现 ${scanned} 条市场动态，过滤 ${ignored} 条噪音。机会不等于买点。`,
  ];
}

function FundAnalyzer({store}: {store: Store}) {
  const [selectedId, setSelectedId] = useState(store.funds[0]?.id ?? "");
  const selected = store.funds.find((fund) => fund.id === selectedId) ?? store.funds[0];
  const score = selected ? calculateFundScore(selected) : 0;
  const parts = selected ? calculateFundScoreParts(selected) : {};
  const diagnosis = selected ? diagnoseFund(selected, store.profile) : null;

  return (
    <div className="grid gap-5">
      <Hero title="基金分析器" subtitle="用手动录入的数据生成结构化报告：基金经理、长期业绩、回撤、持仓质量和操作建议。" />
      <Panel title="选择基金" icon={<FileText size={18} />}>
        <Select label="基金" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} options={Object.fromEntries(store.funds.map((fund) => [fund.id, `${fund.name}（${fund.code}）`]))} />
      </Panel>
      {selected && diagnosis ? (
        <ReportLayout
          title={selected.name}
          meta={`${selected.code} · ${fundTypeLabels[selected.type]} · 综合评分 ${score}`}
          conclusion={diagnosis.summary}
          sections={[
            ["基础信息", [`基金经理：${selected.manager || "待补充"}`, `基金规模：${selected.fundSize || 0} 亿元`, `近 1 年收益：${selected.oneYearReturn || 0}%`, `近 3 年收益：${selected.threeYearReturn || 0}%`]],
            ["业绩质量", [`最大回撤：${selected.maxDrawdown || 0}%`, `波动率：${selected.volatility || 0}%`, `当前收益率：${selected.returnRate}%`, `是否依赖单一年份表现：需要结合年度收益补充判断。`]],
            ["持仓分析", [`行业分布：${selected.industries?.join("、") || "待补充"}`, `与现有资产重合：需在后续接入持仓穿透后判断。`, `适合定位：${score >= 85 ? "核心配置候选" : score >= 70 ? "持有观察" : score >= 60 ? "谨慎持有" : "考虑替换"}`]],
            ["操作建议", diagnosis.warnings],
          ]}
          scoreParts={parts}
        />
      ) : <EmptyState text="请先在持仓页录入基金。" />}
    </div>
  );
}

function StockAnalyzer({store}: {store: Store}) {
  const [selectedId, setSelectedId] = useState(store.stocks[0]?.id ?? "");
  const selected = store.stocks.find((stock) => stock.id === selectedId) ?? store.stocks[0];
  const score = selected ? calculateStockScore(selected) : 0;
  const parts = selected ? calculateStockScoreParts(selected) : {};
  const diagnosis = selected ? diagnoseStock(selected, store.profile) : null;

  return (
    <div className="grid gap-5">
      <Hero title="股票分析器" subtitle="先把生意质量、护城河、财务质量、估值和趋势拆开，不直接跳到买卖结论。" />
      <Panel title="选择股票" icon={<LineChart size={18} />}>
        <Select label="股票" value={selectedId} onChange={(event) => setSelectedId(event.target.value)} options={Object.fromEntries(store.stocks.map((stock) => [stock.id, `${stock.name}（${stock.code}）`]))} />
      </Panel>
      {selected && diagnosis ? (
        <ReportLayout
          title={selected.name}
          meta={`${marketLabels[selected.market]} · ${selected.industry || "行业待补充"} · 综合评分 ${score}`}
          conclusion={diagnosis.summary}
          sections={[
            ["公司基础信息", [`股票代码：${selected.code}`, `主营业务：${selected.investmentReason || "待补充"}`, `当前价格：${selected.currentPrice}`, `持仓状态：${selected.status === "holding" ? "已持有" : "观察中"}`]],
            ["生意与护城河", [`收入增长：${selected.revenueGrowth || 0}%`, `利润增长：${selected.profitGrowth || 0}%`, `ROE：${selected.roe || 0}%`, `现金流：${selected.cashFlow || 0}`]],
            ["财务与估值", [`PE：${selected.pe || 0}`, `PB：${selected.pb || 0}`, `净利率：${selected.netMargin || 0}%`, `负债率：${selected.debtRatio || 0}%`]],
            ["综合结论", [`结论：${diagnosis.label}`, ...diagnosis.warnings]],
          ]}
          scoreParts={parts}
        />
      ) : <EmptyState text="请先在持仓页录入股票。" />}
    </div>
  );
}

function DecisionPage({store, action}: {store: Store; action: TradeDecision["action"]}) {
  const [result, setResult] = useState<ReturnType<typeof evaluateTradeDecision> | null>(null);
  const title = action === "buy" ? "买入决策单" : action === "add" ? "加仓决策单" : "卖出决策单";
  const subtitle = action === "buy"
    ? "像起飞前检查清单一样，先确认理由、仓位、下跌预案和退出条件。"
    : action === "add"
      ? "加仓必须来自逻辑仍然成立和估值更合理，不能来自亏损焦虑。"
      : "卖出不是情绪动作，而是因为逻辑、估值、仓位或现金需求发生变化。";

  function submit(formData: FormData) {
    const decision: TradeDecision = {
      id: "",
      instrumentType: formData.get("instrumentType") as TradeDecision["instrumentType"],
      instrumentName: textValue(formData.get("instrumentName")),
      instrumentCode: textValue(formData.get("instrumentCode")),
      action,
      amount: numberValue(formData.get("amount")),
      reason: textValue(formData.get("reason")),
      expectedHoldingPeriod: formData.get("expectedHoldingPeriod") as TradeDecision["expectedHoldingPeriod"],
      maxAcceptableLossRate: numberValue(formData.get("maxAcceptableLossRate")),
      targetProfitRate: numberValue(formData.get("targetProfitRate")),
      stopLossCondition: textValue(formData.get("stopLossCondition")),
      takeProfitCondition: textValue(formData.get("takeProfitCondition")),
      isEmotionDriven: formData.get("isEmotionDriven") === "on",
      confidenceLevel: numberValue(formData.get("confidenceLevel")) as TradeDecision["confidenceLevel"],
      createdAt: today(),
    };
    const currentHolding = [...store.funds, ...store.stocks].find((item) => item.name === decision.instrumentName || item.code === decision.instrumentCode);
    const currentHoldingAmount = "holdingAmount" in (currentHolding ?? {}) ? Number(currentHolding?.holdingAmount ?? 0) : 0;
    const evaluated = evaluateTradeDecision(decision, store.profile, currentHoldingAmount);
    setResult(evaluated);
    store.upsertDecision(decision);
  }

  return (
    <div className="grid gap-5">
      <Hero title={title} subtitle={subtitle} />
      <Panel title="执行前检查" icon={<ClipboardCheck size={18} />}>
        <form action={submit} className="grid gap-3 md:grid-cols-3">
          <Select name="instrumentType" label="类型" defaultValue="fund" options={{fund: "基金", stock: "股票"}} />
          <Input name="instrumentName" label="标的名称" required />
          <Input name="instrumentCode" label="代码" />
          <Input name="amount" label={action === "sell" ? "卖出金额/市值" : "计划金额"} type="number" />
          <Input name="maxAcceptableLossRate" label="最大可承受亏损 %" type="number" defaultValue={20} />
          <Input name="targetProfitRate" label="目标收益/复盘线 %" type="number" defaultValue={15} />
          <Select name="expectedHoldingPeriod" label="计划持有周期" defaultValue="long" options={holdingPeriodLabels} />
          <Select name="confidenceLevel" label="信心等级" defaultValue="3" options={{1: "1 低", 2: "2", 3: "3 中", 4: "4", 5: "5 高"}} />
          <label className="label md:col-span-1">是否受情绪驱动<span className="check-row"><input name="isEmotionDriven" type="checkbox" /> 是，先标记出来</span></label>
          <Textarea name="reason" label={action === "sell" ? "卖出原因" : "买入/加仓理由"} required />
          <Textarea name="stopLossCondition" label={action === "sell" ? "如果判断错误，如何处理" : "如果下跌 10%-20%，我怎么办"} />
          <Textarea name="takeProfitCondition" label="触发卖出或复盘的条件" />
          <div className="md:col-span-3"><button className="btn btn-primary" type="submit">生成系统反馈并保存</button></div>
        </form>
      </Panel>
      {result && (
        <Panel title="系统反馈" icon={<Brain size={18} />}>
          <Stack>
            <Notice>{result.summary}</Notice>
            {result.warnings.map((warning) => <ActionLine key={warning} index={result.warnings.indexOf(warning) + 1} text={warning} />)}
          </Stack>
        </Panel>
      )}
    </div>
  );
}

function ReviewPage({store}: {store: Store}) {
  const stats = monthlyReviewStats(store.reviews);

  function submit(formData: FormData) {
    const review: ReviewRecord = {
      id: "",
      decisionId: textValue(formData.get("decisionId")),
      instrumentType: formData.get("instrumentType") as ReviewRecord["instrumentType"],
      instrumentName: textValue(formData.get("instrumentName")),
      action: formData.get("action") as ReviewRecord["action"],
      decisionDate: textValue(formData.get("decisionDate")) || today(),
      reviewDate: textValue(formData.get("reviewDate")) || today(),
      originalReason: textValue(formData.get("originalReason")),
      actualResult: textValue(formData.get("actualResult")),
      profitRate: numberValue(formData.get("profitRate")),
      disciplineFollowed: formData.get("disciplineFollowed") === "on",
      emotionalTrade: formData.get("emotionalTrade") === "on",
      lesson: textValue(formData.get("lesson")),
      nextImprovement: textValue(formData.get("nextImprovement")),
      createdAt: today(),
    };
    store.upsertReview(review);
  }

  return (
    <div className="grid gap-5">
      <Hero title="投资复盘" subtitle="复盘不是证明自己对错，而是把每次交易变成下一次更清晰的判断。" />
      <section className="grid gap-4 lg:grid-cols-4">
        <MiniMetric label="本月复盘" value={`${stats.tradeCount} 笔`} />
        <MiniMetric label="纪律执行" value={`${stats.disciplineCount} 笔`} />
        <MiniMetric label="情绪交易" value={`${stats.emotionalCount} 笔`} />
        <MiniMetric label="本月结论" value={stats.lossCount > stats.profitableCount ? "先降频" : "继续记录"} />
      </section>
      <Panel title="新增复盘" icon={<BookOpenCheck size={18} />}>
        <form action={submit} className="grid gap-3 md:grid-cols-3">
          <Select name="decisionId" label="关联决策" options={{"": "不关联", ...Object.fromEntries(store.decisions.map((decision) => [decision.id, `${decisionActionLabels[decision.action]} ${decision.instrumentName}`]))}} />
          <Select name="instrumentType" label="类型" defaultValue="fund" options={{fund: "基金", stock: "股票"}} />
          <Input name="instrumentName" label="标的名称" required />
          <Select name="action" label="动作" defaultValue="buy" options={decisionActionLabels} />
          <Input name="decisionDate" label="买入/卖出日期" type="date" defaultValue={today()} />
          <Input name="reviewDate" label="复盘日期" type="date" defaultValue={today()} />
          <Input name="profitRate" label="最终收益率 %" type="number" />
          <label className="label">是否符合原计划<span className="check-row"><input name="disciplineFollowed" type="checkbox" defaultChecked /> 符合</span></label>
          <label className="label">是否情绪交易<span className="check-row"><input name="emotionalTrade" type="checkbox" /> 是</span></label>
          <Textarea name="originalReason" label="原始理由" />
          <Textarea name="actualResult" label="实际结果" />
          <Textarea name="lesson" label="赚钱/亏钱原因" />
          <Textarea name="nextImprovement" label="下次如何改进" />
          <div className="md:col-span-3"><button className="btn btn-primary" type="submit">保存复盘</button></div>
        </form>
      </Panel>
      <Panel title="复盘记录" icon={<Activity size={18} />}>
        <CardGrid>
          {store.reviews.map((review) => (
            <RecordCard key={review.id} title={review.instrumentName} meta={`${decisionActionLabels[review.action]} · 收益 ${review.profitRate ?? 0}%`} onDelete={() => store.deleteReview(review.id)}>
              <p>{review.lesson || review.actualResult || "暂无复盘结论。"}</p>
            </RecordCard>
          ))}
        </CardGrid>
      </Panel>
    </div>
  );
}

function OpportunityRadar({store}: {store: Store}) {
  const [selectedId, setSelectedId] = useState(store.opportunityAnalyses[0]?.id ?? "");
  const [scanMessage, setScanMessage] = useState("等待今日扫描。默认计划：每天 08:00 自动扫描，18:00 可选补充扫描。");
  const [isScanning, setIsScanning] = useState(false);
  const [researchText, setResearchText] = useState("");
  const report = [...store.opportunityDailyReports].sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
  const selected = store.opportunityAnalyses.find((item) => item.id === selectedId) ?? store.opportunityAnalyses[0];
  const topOpportunities = [...store.opportunityAnalyses].sort((a, b) => b.opportunityScore - a.opportunityScore);

  async function scanNow() {
    setIsScanning(true);
    setScanMessage("正在扫描公开 RSS 源并生成机会日报...");
    try {
      const response = await fetch("/opportunities/daily", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({profile: store.profile, sources: store.opportunitySources}),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) throw new Error(payload.message || "扫描失败。");
      store.replaceOpportunityRadar({
        sources: payload.sources,
        rawItems: payload.rawItems,
        signals: payload.signals,
        analyses: payload.analyses,
        report: payload.report,
      });
      setSelectedId(payload.analyses[0]?.id ?? "");
      setScanMessage(payload.message);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : "扫描失败，请稍后重试。");
    } finally {
      setIsScanning(false);
    }
  }

  function addToWatchlist(opportunity: OpportunityAnalysis) {
    const firstTicker = opportunity.relatedTickers[0];
    store.upsertWatchItem({
      id: "",
      instrumentType: firstTicker ? "stock" : "event",
      name: firstTicker?.name ?? opportunity.title,
      code: firstTicker?.code,
      market: firstTicker?.market,
      source: "market_radar",
      watchReason: opportunity.conclusion,
      triggerCondition: opportunity.nextQuestions.join("；"),
      riskNote: opportunity.riskPoints.join("；"),
      status: "watching",
      createdAt: "",
      updatedAt: "",
    });
    store.updateOpportunityStatus(opportunity.id, "watching");
    setScanMessage(`已把「${firstTicker?.name ?? opportunity.title}」加入观察池。`);
  }

  function ignoreOpportunity(opportunity: OpportunityAnalysis) {
    store.updateOpportunityStatus(opportunity.id, "ignored");
    setScanMessage(`已忽略「${opportunity.title}」。`);
  }

  function startResearch(opportunity: OpportunityAnalysis) {
    store.updateOpportunityStatus(opportunity.id, "researching");
    setSelectedId(opportunity.id);
    setResearchText(buildResearchOutline(opportunity));
  }

  function addFeedback(opportunity: OpportunityAnalysis, feedbackType: OpportunityFeedbackType) {
    store.addOpportunityFeedback({
      id: "",
      opportunityAnalysisId: opportunity.id,
      feedbackType,
      createdAt: "",
    });
    if (feedbackType === "noise") store.updateOpportunityStatus(opportunity.id, "ignored");
    if (feedbackType === "worth_tracking") store.updateOpportunityStatus(opportunity.id, "watching");
    if (feedbackType === "add_to_watchlist") addToWatchlist(opportunity);
    if (feedbackType === "generate_research_task") startResearch(opportunity);
    setScanMessage(`已标记「${opportunity.title}」为：${opportunityFeedbackLabels[feedbackType]}。`);
  }

  function saveSource(source: OpportunitySource) {
    store.upsertOpportunitySource(source);
    setScanMessage(`已保存数据源：${source.sourceName}`);
  }

  const feedbackStats = buildFeedbackStats(store.opportunityFeedback);

  return (
    <div className="grid gap-5">
      <Hero
        title="机会雷达日报"
        subtitle="自动扫描全球新闻、公开数据源和用户关注主题，输出研究机会，不输出买入建议。"
        action={<button className="btn btn-primary" onClick={scanNow} disabled={isScanning}>{isScanning ? "扫描中" : "立即扫描"}</button>}
      />

      <section className="hero-panel grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div>
          <StatusPill text={`日报日期 ${report?.reportDate ?? today()}`} />
          <h3 className="mt-4 text-3xl font-semibold tracking-tight text-[#111827]">今日机会摘要</h3>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#4f5954]">{report?.summary ?? "暂无日报。点击立即扫描生成今日机会雷达日报。"}</p>
          <p className="mt-3 text-sm text-[#68726d]">{scanMessage}</p>
        </div>
        <div className="grid gap-3">
          <MiniMetric label="启用数据源" value={`${store.opportunitySources.filter((source) => source.enabled).length} 个`} />
          <MiniMetric label="机会线索" value={`${store.opportunityAnalyses.length} 条`} />
          <MiniMetric label="原始数据" value={`${store.rawExternalItems.length} 条`} />
          <MiniMetric label="自动任务" value="08:00 / 20:00" />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <Panel title="每日机会卡片" icon={<Compass size={18} />}>
          <div className="grid gap-3">
            {topOpportunities.map((opportunity) => {
              const signal = store.opportunitySignals.find((item) => item.id === opportunity.signalId);
              return (
                <article key={opportunity.id} className={`opportunity-card ${selected?.id === opportunity.id ? "opportunity-card-active" : ""}`}>
                  <button className="w-full text-left" onClick={() => setSelectedId(opportunity.id)}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#111827]">{opportunity.title}</p>
                        <p className="mt-1 text-sm text-[#68726d]">{signal ? opportunitySignalTypeLabels[signal.signalType] : "机会线索"} · {opportunity.beneficiaryIndustries.join("、")}</p>
                      </div>
                      <ScoreBadge score={opportunity.opportunityScore} />
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      <MiniMetric label="信号强度" value={`${opportunity.scoreBreakdown.signalStrength}/20`} />
                      <MiniMetric label="综合评分" value={`${opportunity.opportunityScore}`} />
                      <MiniMetric label="风险等级" value={riskText(opportunity.riskLevel)} />
                      <MiniMetric label="下一步" value={opportunity.nextAction ? opportunityNextActionLabels[opportunity.nextAction] : statusText(opportunity.status)} />
                    </div>
                    {opportunity.beginnerExplanation && <p className="mt-3 rounded-[16px] bg-white/72 p-3 text-sm leading-6 text-[#4f5954]">{opportunity.beginnerExplanation}</p>}
                    <p className="mt-3 text-sm leading-6 text-[#5f6964]">{opportunity.conclusion}</p>
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn btn-secondary" onClick={() => addToWatchlist(opportunity)}>加入观察池</button>
                    <button className="btn btn-secondary" onClick={() => ignoreOpportunity(opportunity)}>忽略</button>
                    <button className="btn btn-secondary" onClick={() => startResearch(opportunity)}>生成研究任务</button>
                    <button className="btn btn-secondary" onClick={() => setResearchText(buildResearchReport(opportunity))}>生成研究报告</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(Object.keys(opportunityFeedbackLabels) as OpportunityFeedbackType[]).map((feedbackType) => (
                      <button key={feedbackType} className="feedback-chip" onClick={() => addFeedback(opportunity, feedbackType)}>{opportunityFeedbackLabels[feedbackType]}</button>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <Panel title="机会详情" icon={<Brain size={18} />}>
          {selected ? <OpportunityDetail opportunity={selected} /> : <EmptyState text="暂无机会线索。" />}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="数据源与任务" icon={<Activity size={18} />}>
          <Stack>
            {store.opportunitySources.map((source) => (
              <ActionLine key={source.id} index={store.opportunitySources.indexOf(source) + 1} text={`${source.sourceName} · ${opportunitySourceTypeLabels[source.sourceType]} · ${source.enabled ? "启用" : "停用"}`} />
            ))}
          </Stack>
        </Panel>
        <Panel title="研究输出" icon={<FileText size={18} />}>
          {researchText ? <pre className="research-box">{researchText}</pre> : <Notice>点击“深度研究”或“生成研究报告”后，这里会生成研究提纲。所有结论都需要继续验证，不直接进入买入。</Notice>}
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Panel title="外部数据源配置" icon={<Settings size={18} />}>
          <OpportunitySourceForm onSave={saveSource} />
          <CardGrid>
            {store.opportunitySources.map((source) => (
              <RecordCard key={source.id} title={source.sourceName} meta={`${opportunitySourceTypeLabels[source.sourceType]} · ${source.enabled ? "启用" : "停用"}`} onDelete={() => store.deleteOpportunitySource(source.id)}>
                <p>{source.sourceUrl}</p>
                {source.keywords?.length ? <p className="mt-2">关键词：{source.keywords.join("、")}</p> : null}
                {source.indicators?.length ? <p className="mt-2">指标：{source.indicators.join("、")}</p> : null}
                {source.tickers?.length ? <p className="mt-2">Ticker：{source.tickers.join("、")}</p> : null}
              </RecordCard>
            ))}
          </CardGrid>
        </Panel>
        <Panel title="机会反馈统计" icon={<CheckCircle2 size={18} />}>
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniMetric label="反馈总数" value={`${feedbackStats.total}`} />
            <MiniMetric label="有价值占比" value={pct(feedbackStats.usefulRatio)} />
            <MiniMetric label="噪音占比" value={pct(feedbackStats.noiseRatio)} />
            <MiniMetric label="加入观察池" value={`${feedbackStats.watchlistCount}`} />
          </div>
          <Notice>这些反馈会用于后续校准机会评分：哪些源更有价值、哪些主题太晚、哪些线索太概念化。</Notice>
        </Panel>
      </section>

      <Panel title="日报风险过滤" icon={<ShieldAlert size={18} />}>
        <div className="grid gap-3 md:grid-cols-2">
          {(report?.riskWarnings ?? []).map((warning) => <Notice key={warning}>{warning}</Notice>)}
          {(report?.ignoredNoise ?? []).map((noise) => <Notice key={noise}>已过滤：{noise}</Notice>)}
        </div>
      </Panel>
    </div>
  );
}

function SettingsPage({store}: {store: Store}) {
  const [backupText, setBackupText] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const profile = store.profile;

  function submit(formData: FormData) {
    store.saveProfile({
      ...profile,
      totalAssets: numberValue(formData.get("totalAssets")),
      availableCash: numberValue(formData.get("availableCash")),
      riskTolerance: formData.get("riskTolerance") as InvestorProfile["riskTolerance"],
      targetEquityRatio: numberValue(formData.get("targetEquityRatio")),
      maxEquityRatio: numberValue(formData.get("maxEquityRatio")),
      maxSingleStockRatio: numberValue(formData.get("maxSingleStockRatio")),
      maxSingleFundRatio: numberValue(formData.get("maxSingleFundRatio")),
      maxSingleTradeRatio: numberValue(formData.get("maxSingleTradeRatio")),
      preferredSectors: splitConfigList(textValue(formData.get("preferredSectors"))),
      investmentGoal: textValue(formData.get("investmentGoal")),
    });
  }

  function exportData() {
    const data = JSON.stringify({
      assets: store.assets,
      funds: store.funds,
      stocks: store.stocks,
      watchItems: store.watchItems,
      decisions: store.decisions,
      reviews: store.reviews,
      profile: store.profile,
      marketEvents: store.marketEvents,
      opportunitySources: store.opportunitySources,
      rawExternalItems: store.rawExternalItems,
      opportunitySignals: store.opportunitySignals,
      opportunityAnalyses: store.opportunityAnalyses,
      opportunityDailyReports: store.opportunityDailyReports,
      opportunityFeedback: store.opportunityFeedback,
    }, null, 2);
    const blob = new Blob([data], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `asta-investment-backup-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMessage("已导出当前数据备份。");
  }

  function importData() {
    try {
      const parsed = JSON.parse(backupText) as Partial<StoreState>;
      store.importState(parsed);
      setBackupText("");
      setBackupMessage("已导入备份数据。");
    } catch {
      setBackupMessage("导入失败：请粘贴完整 JSON 备份内容。");
    }
  }

  return (
    <div className="grid gap-5">
      <Hero title="设置" subtitle="把风险边界写在系统里，让每张决策单都自动检查仓位和交易金额。" action={<button className="btn btn-secondary" onClick={store.reset}><RefreshCcw size={16} />恢复示例</button>} />
      <Panel title="我的风险边界" icon={<Settings size={18} />}>
        <form action={submit} className="grid gap-3 md:grid-cols-2">
          <Input name="totalAssets" label="总资产" type="number" defaultValue={profile.totalAssets} />
          <Input name="availableCash" label="可投资现金" type="number" defaultValue={profile.availableCash} />
          <Select name="riskTolerance" label="风险偏好" defaultValue={profile.riskTolerance} options={riskToleranceLabels} />
          <Input name="targetEquityRatio" label="目标权益仓位 %" type="number" defaultValue={profile.targetEquityRatio} />
          <Input name="maxEquityRatio" label="最大权益仓位 %" type="number" defaultValue={profile.maxEquityRatio} />
          <Input name="maxSingleTradeRatio" label="单次交易不超过总资产 %" type="number" defaultValue={profile.maxSingleTradeRatio} />
          <Input name="maxSingleFundRatio" label="单只基金上限 %" type="number" defaultValue={profile.maxSingleFundRatio} />
          <Input name="maxSingleStockRatio" label="单只股票上限 %" type="number" defaultValue={profile.maxSingleStockRatio} />
          <Input name="preferredSectors" label="能力圈标签，逗号分隔" defaultValue={profile.preferredSectors.join("、")} />
          <Textarea name="investmentGoal" label="投资目标" defaultValue={profile.investmentGoal} />
          <div className="md:col-span-2"><button className="btn btn-primary" type="submit">保存设置</button></div>
        </form>
      </Panel>
      <Panel title="数据备份与恢复" icon={<FileText size={18} />}>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid gap-3">
            <MiniMetric label="基金记录" value={`${store.funds.length} 条`} />
            <MiniMetric label="股票记录" value={`${store.stocks.length} 条`} />
            <MiniMetric label="观察池" value={`${store.watchItems.length} 条`} />
            <button className="btn btn-primary" type="button" onClick={exportData}>导出当前数据</button>
          </div>
          <div>
            <label className="label">粘贴 JSON 备份内容<textarea className="field min-h-40 font-mono text-xs" value={backupText} onChange={(event) => setBackupText(event.target.value)} /></label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-secondary" type="button" onClick={importData} disabled={!backupText.trim()}>导入备份</button>
            </div>
            {backupMessage && <p className="mt-3 text-sm font-medium text-[#315a49]">{backupMessage}</p>}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function OpportunitySourceForm({onSave}: {onSave: (source: OpportunitySource) => void}) {
  function submit(formData: FormData) {
    const sourceType = formData.get("sourceType") as OpportunitySource["sourceType"];
    onSave({
      id: "",
      sourceName: textValue(formData.get("sourceName")),
      sourceType,
      sourceUrl: textValue(formData.get("sourceUrl")),
      apiProvider: sourceType === "gdelt" ? "gdelt" : sourceType === "rss" ? "rss" : sourceType === "sec" ? "sec" : sourceType === "fred" ? "fred" : sourceType === "market" ? "manual" : "manual",
      keywords: splitConfigList(textValue(formData.get("keywords"))),
      tickers: splitConfigList(textValue(formData.get("tickers"))),
      indicators: splitConfigList(textValue(formData.get("indicators"))),
      enabled: formData.get("enabled") === "on",
      createdAt: "",
      updatedAt: "",
    });
  }

  return (
    <form action={submit} className="grid gap-3 md:grid-cols-3">
      <Input name="sourceName" label="数据源名称" required />
      <Select name="sourceType" label="类型" defaultValue="rss" options={opportunitySourceTypeLabels} />
      <Input name="sourceUrl" label="URL / API 入口" required />
      <Input name="keywords" label="关键词，逗号分隔" />
      <Input name="tickers" label="美股 ticker，逗号分隔" />
      <Input name="indicators" label="FRED 指标，逗号分隔" />
      <label className="label">启用状态<span className="check-row"><input name="enabled" type="checkbox" defaultChecked /> 启用</span></label>
      <div className="md:col-span-2 flex items-end"><button className="btn btn-primary" type="submit">保存数据源</button></div>
    </form>
  );
}

function AssetForm({editing, onSave}: {editing: Asset | null; onSave: (asset: Asset) => void}) {
  function submit(formData: FormData) {
    onSave({
      ...emptyAsset,
      ...(editing ?? {}),
      name: textValue(formData.get("name")),
      type: formData.get("type") as AssetType,
      amount: numberValue(formData.get("amount")),
      annualYield: numberValue(formData.get("annualYield")),
      note: textValue(formData.get("note")),
    });
  }
  return (
    <form action={submit} className="grid gap-3 md:grid-cols-5">
      <Input name="name" label="资产名称" defaultValue={editing?.name} required />
      <Select name="type" label="类型" defaultValue={editing?.type ?? "cash"} options={assetTypeLabels} />
      <Input name="amount" label="金额" type="number" defaultValue={editing?.amount} />
      <Input name="annualYield" label="年化收益 %" type="number" defaultValue={editing?.annualYield} />
      <Input name="note" label="备注" defaultValue={editing?.note} />
      <div className="md:col-span-5"><button className="btn btn-primary" type="submit">{editing ? "保存资产" : "添加资产"}</button></div>
    </form>
  );
}

function FundForm({editing, onSave}: {editing: Fund | null; onSave: (fund: Fund) => void}) {
  const [draft, setDraft] = useState<Fund>({...emptyFund, ...(editing ?? {})});
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");

  useEffect(() => {
    setDraft({...emptyFund, ...(editing ?? {})});
    setLookupStatus("idle");
    setLookupMessage("");
  }, [editing]);

  const updateDraft = <K extends keyof Fund>(key: K, value: Fund[K]) => {
    setDraft((current) => ({...current, [key]: value}));
  };

  const calculatedReturnRate = draft.cost > 0 && draft.currentNav > 0
    ? ((draft.currentNav - draft.cost) / draft.cost) * 100
    : draft.returnRate;

  async function lookupFund() {
    if (!/^\d{6}$/.test(draft.code.trim())) {
      setLookupStatus("error");
      setLookupMessage("请输入 6 位基金代码后再自动补全。");
      return;
    }
    setLookupStatus("loading");
    setLookupMessage("正在联网补全基金公开信息...");
    try {
      const response = await fetch(`/api/funds/lookup?code=${encodeURIComponent(draft.code.trim())}`, {cache: "no-store"});
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: Partial<Fund> & {source?: string};
      };
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.message || "自动补全失败。");
      }
      setDraft((current) => ({
        ...current,
        name: payload.data?.name || current.name,
        type: payload.data?.type || current.type,
        currentNav: payload.data?.currentNav ?? current.currentNav,
        navDate: payload.data?.navDate || current.navDate,
        manager: payload.data?.manager || current.manager,
        fundSize: payload.data?.fundSize ?? current.fundSize,
        oneYearReturn: payload.data?.oneYearReturn ?? current.oneYearReturn,
        threeYearReturn: payload.data?.threeYearReturn ?? current.threeYearReturn,
      }));
      setLookupStatus("done");
      setLookupMessage(`已补全公开信息${payload.data.source ? `，来源：${payload.data.source}` : ""}。`);
    } catch (error) {
      setLookupStatus("error");
      setLookupMessage(error instanceof Error ? error.message : "自动补全失败，请稍后重试。");
    }
  }

  function submit(formData: FormData) {
    const cost = numberValue(formData.get("cost"));
    const currentNav = numberValue(formData.get("currentNav"));
    const returnRate = cost > 0 && currentNav > 0 ? ((currentNav - cost) / cost) * 100 : numberValue(formData.get("returnRate"));
    onSave({
      ...emptyFund,
      ...(editing ?? {}),
      name: textValue(formData.get("name")),
      code: textValue(formData.get("code")),
      type: formData.get("type") as FundType,
      holdingAmount: numberValue(formData.get("holdingAmount")),
      cost,
      currentNav,
      profitLoss: numberValue(formData.get("profitLoss")),
      returnRate,
      navDate: textValue(formData.get("navDate")),
      manager: textValue(formData.get("manager")),
      fundSize: numberValue(formData.get("fundSize")),
      oneYearReturn: numberValue(formData.get("oneYearReturn")),
      threeYearReturn: numberValue(formData.get("threeYearReturn")),
      maxDrawdown: numberValue(formData.get("maxDrawdown")),
      volatility: numberValue(formData.get("volatility")),
      industries: textValue(formData.get("industries")).split(/,|，|、/).map((item) => item.trim()).filter(Boolean),
      investmentReason: textValue(formData.get("investmentReason")),
      exitCondition: textValue(formData.get("exitCondition")),
    });
  }
  return (
    <form action={submit} className="grid gap-3 md:grid-cols-4">
      <Input name="code" label="基金代码" value={draft.code} onChange={(event) => updateDraft("code", event.target.value)} required />
      <div className="label">
        自动补全
        <button className="btn btn-secondary h-[42px]" type="button" onClick={lookupFund} disabled={lookupStatus === "loading"}>
          {lookupStatus === "loading" ? "补全中..." : "联网补全"}
        </button>
      </div>
      <Input name="holdingAmount" label="持有金额" type="number" value={draft.holdingAmount} onChange={(event) => updateDraft("holdingAmount", Number(event.target.value))} />
      <Input name="cost" label="购买成本/成本净值" type="number" value={draft.cost} onChange={(event) => updateDraft("cost", Number(event.target.value))} />
      <Input name="currentNav" label="当前净值" type="number" value={draft.currentNav} onChange={(event) => updateDraft("currentNav", Number(event.target.value))} />
      <Input name="profitLoss" label="当前盈亏金额" type="number" value={draft.profitLoss ?? 0} onChange={(event) => updateDraft("profitLoss", Number(event.target.value))} />
      <Input name="investmentReason" label="持有原因" value={draft.investmentReason ?? ""} onChange={(event) => updateDraft("investmentReason", event.target.value)} />
      <Input name="exitCondition" label="退出条件" value={draft.exitCondition ?? ""} onChange={(event) => updateDraft("exitCondition", event.target.value)} />

      <input type="hidden" name="returnRate" value={calculatedReturnRate.toFixed(4)} />
      <div className="md:col-span-4 rounded-[18px] bg-[#f6f7f6] p-4 text-sm leading-6 text-[#5f6964]">
        <div className="grid gap-3 md:grid-cols-4">
          <Input name="name" label="基金名称" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
          <Select name="type" label="类型" value={draft.type} onChange={(event) => updateDraft("type", event.target.value as FundType)} options={fundTypeLabels} />
          <Input name="navDate" label="净值日期" value={draft.navDate ?? ""} onChange={(event) => updateDraft("navDate", event.target.value)} />
          <Input name="manager" label="基金经理" value={draft.manager ?? ""} onChange={(event) => updateDraft("manager", event.target.value)} />
          <Input name="fundSize" label="基金规模 亿元" type="number" value={draft.fundSize ?? 0} onChange={(event) => updateDraft("fundSize", Number(event.target.value))} />
          <Input name="oneYearReturn" label="近 1 年收益 %" type="number" value={draft.oneYearReturn ?? 0} onChange={(event) => updateDraft("oneYearReturn", Number(event.target.value))} />
          <Input name="threeYearReturn" label="近 3 年收益 %" type="number" value={draft.threeYearReturn ?? 0} onChange={(event) => updateDraft("threeYearReturn", Number(event.target.value))} />
          <Input name="industries" label="持仓行业" value={draft.industries?.join("、") ?? ""} onChange={(event) => updateDraft("industries", event.target.value.split(/,|，|、/).map((item) => item.trim()).filter(Boolean))} />
          <Input name="maxDrawdown" label="最大回撤 %" type="number" value={draft.maxDrawdown ?? 0} onChange={(event) => updateDraft("maxDrawdown", Number(event.target.value))} />
          <Input name="volatility" label="波动率 %" type="number" value={draft.volatility ?? 0} onChange={(event) => updateDraft("volatility", Number(event.target.value))} />
          <div className="label">
            自动收益率
            <div className="field flex items-center bg-white/80">{calculatedReturnRate.toFixed(2)}%</div>
          </div>
        </div>
        {lookupMessage && (
          <p className={`mt-3 ${lookupStatus === "error" ? "text-[#b86b5e]" : "text-[#315a49]"}`}>{lookupMessage}</p>
        )}
      </div>
      <div className="md:col-span-4"><button className="btn btn-primary" type="submit">{editing ? "保存基金" : "添加基金"}</button></div>
    </form>
  );
}

function StockForm({editing, onSave}: {editing: Stock | null; onSave: (stock: Stock) => void}) {
  const [draft, setDraft] = useState<Stock>({...emptyStock, ...(editing ?? {})});
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [lookupMessage, setLookupMessage] = useState("");

  useEffect(() => {
    setDraft({...emptyStock, ...(editing ?? {})});
    setLookupStatus("idle");
    setLookupMessage("");
  }, [editing]);

  const updateDraft = <K extends keyof Stock>(key: K, value: Stock[K]) => {
    setDraft((current) => ({...current, [key]: value}));
  };

  async function lookupStock() {
    if (!draft.code.trim()) {
      setLookupStatus("error");
      setLookupMessage("请输入股票代码后再自动补全。");
      return;
    }
    setLookupStatus("loading");
    setLookupMessage("正在联网补全股票公开信息...");
    try {
      const response = await fetch(`/api/stocks/lookup?code=${encodeURIComponent(draft.code.trim())}`, {cache: "no-store"});
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: Partial<Stock> & {source?: string};
      };
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.message || "自动补全失败。");
      setDraft((current) => ({
        ...current,
        name: payload.data?.name || current.name,
        market: payload.data?.market || current.market,
        industry: payload.data?.industry || current.industry,
        currentPrice: payload.data?.currentPrice ?? current.currentPrice,
        marketCap: payload.data?.marketCap ?? current.marketCap,
        pe: payload.data?.pe ?? current.pe,
        pb: payload.data?.pb ?? current.pb,
        ps: payload.data?.ps ?? current.ps,
        revenue: payload.data?.revenue ?? current.revenue,
        netProfit: payload.data?.netProfit ?? current.netProfit,
        grossMargin: payload.data?.grossMargin ?? current.grossMargin,
        roe: payload.data?.roe ?? current.roe,
        debtRatio: payload.data?.debtRatio ?? current.debtRatio,
        cashFlow: payload.data?.cashFlow ?? current.cashFlow,
      }));
      setLookupStatus("done");
      setLookupMessage(`已补全公开信息${payload.data.source ? `，来源：${payload.data.source}` : ""}。`);
    } catch (error) {
      setLookupStatus("error");
      setLookupMessage(error instanceof Error ? error.message : "自动补全失败，请稍后重试。");
    }
  }

  function submit(formData: FormData) {
    onSave({
      ...emptyStock,
      ...(editing ?? {}),
      name: textValue(formData.get("name")),
      code: textValue(formData.get("code")),
      market: formData.get("market") as Market,
      status: formData.get("status") as Stock["status"],
      industry: textValue(formData.get("industry")),
      holdingAmount: numberValue(formData.get("holdingAmount")),
      currentPrice: numberValue(formData.get("currentPrice")),
      cost: numberValue(formData.get("cost")),
      targetBuyPrice: numberValue(formData.get("targetBuyPrice")),
      targetSellPrice: numberValue(formData.get("targetSellPrice")),
      stopLossPrice: numberValue(formData.get("stopLossPrice")),
      marketCap: numberValue(formData.get("marketCap")),
      pe: numberValue(formData.get("pe")),
      pb: numberValue(formData.get("pb")),
      ps: numberValue(formData.get("ps")),
      revenue: numberValue(formData.get("revenue")),
      netProfit: numberValue(formData.get("netProfit")),
      revenueGrowth: numberValue(formData.get("revenueGrowth")),
      profitGrowth: numberValue(formData.get("profitGrowth")),
      grossMargin: numberValue(formData.get("grossMargin")),
      netMargin: numberValue(formData.get("netMargin")),
      roe: numberValue(formData.get("roe")),
      cashFlow: numberValue(formData.get("cashFlow")),
      debtRatio: numberValue(formData.get("debtRatio")),
      industryTrend: formData.get("industryTrend") as Stock["industryTrend"],
      investmentReason: textValue(formData.get("investmentReason")),
      riskReason: textValue(formData.get("riskReason")),
      exitCondition: textValue(formData.get("exitCondition")),
    });
  }
  return (
    <form action={submit} className="grid gap-3 md:grid-cols-4">
      <Input name="code" label="股票代码" value={draft.code} onChange={(event) => updateDraft("code", event.target.value)} required />
      <div className="label">
        自动补全
        <button className="btn btn-secondary h-[42px]" type="button" onClick={lookupStock} disabled={lookupStatus === "loading"}>
          {lookupStatus === "loading" ? "补全中..." : "联网补全"}
        </button>
      </div>
      <Select name="status" label="状态" value={draft.status} onChange={(event) => updateDraft("status", event.target.value as Stock["status"])} options={{holding: "已持有", watching: "观察中"}} />
      <Input name="holdingAmount" label="买入/持有金额" type="number" value={draft.holdingAmount ?? 0} onChange={(event) => updateDraft("holdingAmount", Number(event.target.value))} />
      <Input name="cost" label="买入成本" type="number" value={draft.cost ?? 0} onChange={(event) => updateDraft("cost", Number(event.target.value))} />
      <Input name="investmentReason" label="买入理由" value={draft.investmentReason ?? ""} onChange={(event) => updateDraft("investmentReason", event.target.value)} />
      <Input name="exitCondition" label="卖出条件" value={draft.exitCondition ?? ""} onChange={(event) => updateDraft("exitCondition", event.target.value)} />
      <Input name="riskReason" label="风险点" value={draft.riskReason ?? ""} onChange={(event) => updateDraft("riskReason", event.target.value)} />
      <div className="md:col-span-4 rounded-[18px] bg-[#f6f7f6] p-4 text-sm leading-6 text-[#5f6964]">
        <div className="grid gap-3 md:grid-cols-4">
          <Input name="name" label="股票名称" value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
          <Select name="market" label="市场" value={draft.market} onChange={(event) => updateDraft("market", event.target.value as Market)} options={marketLabels} />
          <Input name="industry" label="所属行业" value={draft.industry ?? ""} onChange={(event) => updateDraft("industry", event.target.value)} />
          <Input name="currentPrice" label="当前价格" type="number" value={draft.currentPrice} onChange={(event) => updateDraft("currentPrice", Number(event.target.value))} />
          <Input name="marketCap" label="市值" type="number" value={draft.marketCap ?? 0} onChange={(event) => updateDraft("marketCap", Number(event.target.value))} />
          <Input name="pe" label="PE" type="number" value={draft.pe ?? 0} onChange={(event) => updateDraft("pe", Number(event.target.value))} />
          <Input name="pb" label="PB" type="number" value={draft.pb ?? 0} onChange={(event) => updateDraft("pb", Number(event.target.value))} />
          <Input name="ps" label="PS" type="number" value={draft.ps ?? 0} onChange={(event) => updateDraft("ps", Number(event.target.value))} />
          <Input name="revenue" label="营收" type="number" value={draft.revenue ?? 0} onChange={(event) => updateDraft("revenue", Number(event.target.value))} />
          <Input name="netProfit" label="净利润" type="number" value={draft.netProfit ?? 0} onChange={(event) => updateDraft("netProfit", Number(event.target.value))} />
          <Input name="grossMargin" label="毛利率 %" type="number" value={draft.grossMargin ?? 0} onChange={(event) => updateDraft("grossMargin", Number(event.target.value))} />
          <Input name="roe" label="ROE %" type="number" value={draft.roe ?? 0} onChange={(event) => updateDraft("roe", Number(event.target.value))} />
          <Input name="cashFlow" label="现金流" type="number" value={draft.cashFlow ?? 0} onChange={(event) => updateDraft("cashFlow", Number(event.target.value))} />
          <Input name="debtRatio" label="负债率 %" type="number" value={draft.debtRatio ?? 0} onChange={(event) => updateDraft("debtRatio", Number(event.target.value))} />
          <Input name="targetBuyPrice" label="观察买入价" type="number" value={draft.targetBuyPrice ?? 0} onChange={(event) => updateDraft("targetBuyPrice", Number(event.target.value))} />
          <Input name="targetSellPrice" label="减仓观察价" type="number" value={draft.targetSellPrice ?? 0} onChange={(event) => updateDraft("targetSellPrice", Number(event.target.value))} />
          <Input name="stopLossPrice" label="止损复盘价" type="number" value={draft.stopLossPrice ?? 0} onChange={(event) => updateDraft("stopLossPrice", Number(event.target.value))} />
          <Select name="industryTrend" label="产业趋势" value={draft.industryTrend ?? "neutral"} onChange={(event) => updateDraft("industryTrend", event.target.value as Stock["industryTrend"])} options={{up: "向上", neutral: "中性", down: "走弱"}} />
          <input type="hidden" name="revenueGrowth" value={draft.revenueGrowth ?? 0} />
          <input type="hidden" name="profitGrowth" value={draft.profitGrowth ?? 0} />
          <input type="hidden" name="netMargin" value={draft.netMargin ?? 0} />
        </div>
        {lookupMessage && (
          <p className={`mt-3 ${lookupStatus === "error" ? "text-[#b86b5e]" : "text-[#315a49]"}`}>{lookupMessage}</p>
        )}
      </div>
      <div className="md:col-span-4"><button className="btn btn-primary" type="submit">{editing ? "保存股票" : "添加股票"}</button></div>
    </form>
  );
}

function FundCard({fund, profile, onEdit, onDelete}: {fund: Fund; profile: InvestorProfile; onEdit: () => void; onDelete: () => void}) {
  const diagnosis = diagnoseFund(fund, profile);
  return (
    <RecordCard title={fund.name} meta={`${fund.code} · ${money.format(fund.holdingAmount)} · 盈亏 ${fund.returnRate}%`} badge={diagnosis.label} onEdit={onEdit} onDelete={onDelete}>
      <p>{diagnosis.summary}</p>
    </RecordCard>
  );
}

function StockCard({stock, profile, onEdit, onDelete}: {stock: Stock; profile: InvestorProfile; onEdit: () => void; onDelete: () => void}) {
  const diagnosis = diagnoseStock(stock, profile);
  return (
    <RecordCard title={stock.name} meta={`${stock.code} · ${marketLabels[stock.market]} · 当前价 ${stock.currentPrice}`} badge={diagnosis.label} onEdit={onEdit} onDelete={onDelete}>
      <p>{diagnosis.summary}</p>
    </RecordCard>
  );
}

function ReportLayout({title, meta, conclusion, sections, scoreParts}: {title: string; meta: string; conclusion: string; sections: [string, string[]][]; scoreParts: Record<string, number>}) {
  return (
    <div className="grid gap-5">
      <section className="hero-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-3xl font-semibold tracking-tight text-[#111827]">{title}</h3>
            <p className="mt-2 text-sm text-[#68726d]">{meta}</p>
          </div>
          <StatusPill text="人话总结" />
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#4f5954]">{conclusion}</p>
      </section>
      <Panel title="评分拆解" icon={<Brain size={18} />}>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(scoreParts).map(([name, value]) => <MiniMetric key={name} label={name} value={`${value}`} />)}
        </div>
      </Panel>
      <section className="grid gap-4 lg:grid-cols-2">
        {sections.map(([sectionTitle, items]) => (
          <Panel key={sectionTitle} title={sectionTitle} icon={<CheckCircle2 size={18} />}>
            <Stack>{items.map((item, index) => <ActionLine key={item} index={index + 1} text={item} />)}</Stack>
          </Panel>
        ))}
      </section>
    </div>
  );
}

function OpportunityDetail({opportunity}: {opportunity: OpportunityAnalysis}) {
  return (
    <div className="grid gap-4">
      <Notice>{opportunity.whatHappened}</Notice>
      {opportunity.beginnerExplanation && <DetailBlock title="小白解释模式" items={[opportunity.beginnerExplanation]} />}
      <DetailBlock title="为什么重要" items={[opportunity.whyItMatters]} />
      <DetailBlock title="机会判断链" items={opportunity.investmentChain?.length ? opportunity.investmentChain : opportunity.transmissionChain} />
      <DetailBlock title="现金流影响" items={[opportunity.cashflowImpact || "需要继续验证是否能改善收入、利润、毛利率或现金流。"]} />
      <DetailBlock title="可能受益方向" items={opportunity.beneficiaryIndustries} />
      <DetailBlock title="可能受益公司类型" items={opportunity.beneficiaryCompanyTypes} />
      <DetailBlock title="市场是否可能已反映" items={[opportunity.pricedInRisk || "需要检查相关标的是否已经提前上涨。"]} />
      <DetailBlock title="是否适合你" items={[opportunity.userFitReason || "需要结合你的能力圈、仓位和风险承受能力判断。"]} />
      <DetailBlock title="当前风险" items={opportunity.riskPoints} />
      <DetailBlock title="最容易误判" items={[opportunity.mistakeWarning || "机会不等于买点，不能把新闻热度当成投资结论。"]} />
      <DetailBlock title="下一步需要验证" items={opportunity.researchQuestions?.length ? opportunity.researchQuestions : opportunity.nextQuestions} />
      <div className="grid gap-2">
        <p className="text-sm font-semibold text-[#111827]">相关标的</p>
        {opportunity.relatedTickers.length ? opportunity.relatedTickers.map((ticker) => (
          <div key={`${ticker.name}-${ticker.code}`} className="rounded-[8px] bg-[#f6f7f6] p-3 text-sm leading-6 text-[#4f5954]">
            <span className="font-semibold text-[#111827]">{ticker.name}</span>{ticker.code ? ` · ${ticker.code}` : ""}：{ticker.reason}
          </div>
        )) : <p className="text-sm text-[#8b9490]">暂无明确标的，先按行业方向观察。</p>}
      </div>
    </div>
  );
}

function DetailBlock({title, items}: {title: string; items: string[]}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#111827]">{title}</p>
      <div className="mt-2 grid gap-2">
        {items.map((item, index) => <ActionLine key={`${title}-${item}`} index={index + 1} text={item} />)}
      </div>
    </div>
  );
}

function ScoreBadge({score}: {score: number}) {
  return <span className={`score-badge ${score >= 85 ? "score-high" : score >= 70 ? "score-mid" : score >= 60 ? "score-low" : "score-noise"}`}>{score}</span>;
}

function riskText(risk: OpportunityAnalysis["riskLevel"]) {
  return {low: "低", medium: "中", high: "高"}[risk];
}

function statusText(status: OpportunityAnalysis["status"]) {
  return {new: "新线索", watching: "观察中", ignored: "已忽略", researching: "研究中"}[status];
}

function buildResearchOutline(opportunity: OpportunityAnalysis) {
  const questions = opportunity.researchQuestions?.length ? opportunity.researchQuestions : opportunity.nextQuestions;
  return [
    `研究任务：${opportunity.title}`,
    "",
    "先提醒：机会不等于买点。任何机会都必须经过基本面、估值、仓位和风险验证。",
    "",
    "1. 小白解释",
    `- ${opportunity.beginnerExplanation || opportunity.whyItMatters}`,
    "",
    "2. 判断链",
    ...(opportunity.investmentChain?.length ? opportunity.investmentChain : opportunity.transmissionChain).map((item) => `- ${item}`),
    "",
    "3. 研究清单",
    ...questions.map((item) => `- ${item}`),
    "",
    "4. 反方风险",
    ...opportunity.riskPoints.map((item) => `- ${item}`),
    `- ${opportunity.pricedInRisk || "检查相关资产是否已经提前上涨。"}`,
  ].join("\n");
}

function buildResearchReport(opportunity: OpportunityAnalysis) {
  return [
    `研究报告草稿：${opportunity.title}`,
    "",
    `发生了什么：${opportunity.whatHappened}`,
    `为什么重要：${opportunity.whyItMatters}`,
    `综合评分：${opportunity.opportunityScore}，用户适配度：${opportunity.suitabilityScore}`,
    "",
    `产业链传导：${opportunity.transmissionChain.join(" → ")}`,
    `可能受益方向：${opportunity.beneficiaryIndustries.join("、")}`,
    `可研究标的：${opportunity.relatedTickers.map((ticker) => ticker.code ? `${ticker.name}（${ticker.code}）` : ticker.name).join("、") || "暂无明确标的"}`,
    "",
    "风险提示：",
    ...opportunity.riskPoints.map((item) => `- ${item}`),
    "",
    "系统建议：",
    `- ${opportunity.conclusion}`,
    "- 先进入观察池，不直接买入。",
    "- 买入前仍需完成买入决策单。",
  ].join("\n");
}

function Hero({title, subtitle, action}: {title: string; subtitle: string; action?: React.ReactNode}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-4xl font-semibold tracking-tight text-[#111827]">{title}</h2>
        <p className="mt-2 max-w-3xl text-[15px] leading-6 text-[#68726d]">{subtitle}</p>
      </div>
      {action}
    </header>
  );
}

function Panel({title, icon, children}: {title: string; icon: React.ReactNode; children: React.ReactNode}) {
  return (
    <section className="apple-card p-5">
      <div className="mb-4 flex items-center gap-2 text-[#111827]">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f3f4f4]">{icon}</span>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CardGrid({children}: {children: React.ReactNode}) {
  return <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>;
}

function Stack({children}: {children: React.ReactNode}) {
  return <div className="grid gap-3">{children}</div>;
}

function MiniMetric({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-[22px] bg-white/72 p-4">
      <p className="text-xs font-medium text-[#8b9490]">{label}</p>
      <p className="mt-1 break-words text-xl font-semibold tracking-tight text-[#111827]">{value}</p>
    </div>
  );
}

function Notice({children}: {children: React.ReactNode}) {
  return <div className="soft-warning">{children}</div>;
}

function ActionLine({index, text}: {index: number; text: string}) {
  return (
    <div className="flex gap-3 rounded-[20px] bg-[#f6f7f6] p-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-[#111827]">{index}</span>
      <p className="text-sm leading-6 text-[#4f5954]">{text}</p>
    </div>
  );
}

function RecordCard({title, meta, badge, children, onEdit, onDelete}: {title: string; meta: string; badge?: string; children: React.ReactNode; onEdit?: () => void; onDelete?: () => void}) {
  return (
    <article className="simple-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[#111827]">{title}</p>
          <p className="mt-1 text-sm text-[#68726d]">{meta}</p>
        </div>
        {badge && <StatusPill text={badge} />}
      </div>
      <div className="mt-4 text-sm leading-6 text-[#5f6964]">{children}</div>
      {(onEdit || onDelete) && (
        <div className="mt-4 flex justify-end gap-1">
          {onEdit && <button className="icon-btn" onClick={onEdit}>编辑</button>}
          {onDelete && <button className="icon-btn danger" onClick={onDelete}><Trash2 size={14} /></button>}
        </div>
      )}
    </article>
  );
}

function StatusPill({text}: {text: string}) {
  return <span className="rounded-full bg-[#edf5ef] px-3 py-1 text-xs font-semibold text-[#315a49]">{text}</span>;
}

function EmptyState({text}: {text: string}) {
  return <div className="simple-card text-sm text-[#68726d]">{text}</div>;
}

function Input({label, ...props}: React.InputHTMLAttributes<HTMLInputElement> & {label: string}) {
  const inputProps = props.type === "number" && props.step === undefined ? {...props, step: "any", inputMode: "decimal" as const} : props;
  return <label className="label">{label}<input className="field" {...inputProps} /></label>;
}

function Textarea({label, ...props}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {label: string}) {
  return <label className="label md:col-span-3">{label}<textarea className="field min-h-24" {...props} /></label>;
}

function Select<T extends string>({label, options, ...props}: React.SelectHTMLAttributes<HTMLSelectElement> & {label: string; options: Record<T, string>}) {
  return <label className="label">{label}<select className="field" {...props}>{Object.entries(options).map(([value, text]) => <option key={value} value={value}>{String(text)}</option>)}</select></label>;
}
