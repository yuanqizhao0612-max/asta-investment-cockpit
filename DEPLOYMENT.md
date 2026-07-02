# Asta 投资驾驶舱部署说明

## 当前保存机制

- 未配置 Supabase 时：数据保存在当前浏览器的 `localStorage`，同一浏览器、同一域名会保留。
- 配置 Supabase 后：数据会同步到 `investment_state` 表，换设备登录同一个部署地址也能读取。

## Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 添加：

```text
ASTA_APP_PASSWORD=YOUR_LOGIN_PASSWORD_HERE
AUTH_SECRET=YOUR_RANDOM_AUTH_SECRET_HERE
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE
ASTA_USER_ID=owner
TUSHARE_TOKEN=YOUR_TUSHARE_TOKEN_HERE
FRED_API_KEY=YOUR_FRED_API_KEY_HERE
FINNHUB_API_KEY=YOUR_FINNHUB_API_KEY_HERE
ALPHA_VANTAGE_API_KEY=YOUR_ALPHA_VANTAGE_API_KEY_HERE
```

`ASTA_APP_PASSWORD` 是你的登录密码。不要提交真实值到代码仓库。

## Supabase 建表

在 Supabase SQL Editor 执行：

```sql
create table if not exists public.investment_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.investment_state enable row level security;

create policy if not exists "service role can manage investment state"
on public.investment_state
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
```

也可以直接使用 `supabase/schema.sql`。

## 部署命令

```bash
npx next build --webpack
```

当前项目默认 `next build` 的 Turbopack 路径会受父级依赖结构影响；部署前用 webpack 构建路径验证。

## 定时任务

`vercel.json` 已配置：

- 北京时间 08:00 扫描机会日报
- 北京时间 20:00 补充扫描

扫描只读取公开数据，不会下单，不会给出直接买入建议。
