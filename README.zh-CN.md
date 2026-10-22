<p align="right"><a href="./README.md">English</a> | <b>简体中文</b></p>

# 译帆 Sailingo —— `outsea`

[![CI](https://github.com/HansenUp/outsea/actions/workflows/ci.yml/badge.svg)](https://github.com/HansenUp/outsea/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

> 面向跨境电商卖家的商品图片与短视频画面文字翻译工作流。运行在 Cloudflare Workers + D1 + R2 上，翻译能力由阿里云 Aidge 提供。

> [!NOTE]
> **状态：实验性项目，已不再商业化运营。** 本项目原为商业试运营而开发，现作为**参考实现**开源。它从未接待过真实客户，也没有发生过真实付费的供应商调用。代码仍有不少粗糙之处，详见[已知限制与路线图](#已知限制与路线图)。

## 这是什么

卖家上传中文商品图（PNG/JPG/WebP）或 5 秒以内的 MP4 短视频，最多选 3 种目标语言，即可得到保留原排版的译文版本。翻译本身调用[阿里云 Aidge](https://help.aliyun.com/zh/aidge/image-translation)（`ImageTranslationStandard`、`VideoTranslation`）。仓库里的大部分代码处理的是模型调用**之外**的事情：账户、积分账本、异步任务、质量检查、返工与客户验收、人工订单和退款记账，让结果真正能交付、能结算。

其中很多基础设施是通用的。如果你在 Cloudflare 上做“积分 + 异步 AI 任务 + 人工审核”类产品，这个仓库的部分代码可能值得参考。

## 功能

- **账户与安全**：邮箱/用户名注册登录、PBKDF2 密码哈希、HttpOnly 会话、登录与注册限流、同源校验、超管强制改密、邮箱验证与找回密码。
- **积分账本**：赠送积分与购买积分分开记账；提交时原子预留，成功后扣减，明确失败时释放，供应商状态不明时冻结待核；上传请求幂等。
- **异步任务与调度**：任务及每种语言的子结果持久化在 D1，通过租约防止重复处理；提交后借助 `waitUntil` 在后台推进；另有独立的 Cloudflare 定时 Worker（`ops/scheduler/`），每分钟凭服务令牌调用一次 `/api/maintenance`。
- **术语保护与检查**：按语言配置品牌/型号“原样保留”和指定译法（词表），并依据供应商返回的文字图层，自动核对数字、单位、尺寸和品牌大小写。
- **返工与客户验收**：用户在结果上标注问题；管理员上传返工版本；只有素材所属用户能验收或退回；版本历史完整保留。
- **订单、退款与成本核算**：人工核款，凭证号唯一；支持退款登记；供应商费用预留并设每日上限；按任务核算收入、成本和“贡献”，任何一项成本未知时都标记为“待补齐核算”。
- **获客归因**：经用户同意后记录首次访问的 UTM 来源，统计“注册 → 上传 → 付费 → 复购”漏斗，以及各渠道获客成本（CAC）。
- **事务邮件**：通过 [Resend](https://resend.com) 发送，API Key 在服务端加密保存。
- **超级管理后台**：管理用户、积分、订单、供应商配置、收费准入检查、运营线索；支持 CSV 导出，已防公式注入。
- **国际化**：简体中文和英文界面（`app/locales/en.json`，配合 `scripts/check-locales.mjs` 检查漏翻）。
- **演示模式**：只接受本机回环地址访问，D1/R2 与正常数据隔离，结果为带水印的示例图，供应商调用被硬性拦截。不需要任何 Aidge 密钥就能体验完整流程。

## 架构

```mermaid
flowchart LR
  B[浏览器<br/>app/*.tsx] -->|/api/*| W[Worker 入口<br/>build/worker.ts]
  W --> R[app/api/[...path]/route.ts]
  R --> S[lib/outsea/server.ts<br/>handle + processJob]
  S --> M[lib/outsea/*<br/>credits · pilot · business · revisions<br/>workflow · mail · acquisition · runtime]
  S --> D[(D1<br/>db/schema.ts · drizzle/)]
  S --> O[(R2 存储桶)]
  S -->|签名 HTTPS| A[阿里云 Aidge + OSS<br/>lib/outsea/provider.ts]
  C[定时 Worker<br/>ops/scheduler/worker.mjs] -->|Bearer 令牌<br/>POST /api/maintenance| W
```

| 路径 | 作用 |
|---|---|
| `build/worker.ts` | Cloudflare Worker 入口：校验来源域名和演示模式限制，把 `/api/*` 转给 API 处理器，启动后台处理，添加安全响应头 |
| `app/api/[...path]/route.ts` | API 通配路由，统一交给 `handle` 处理 |
| `lib/outsea/server.ts` | 主 API 路由、认证、任务提交，以及 `processJob` / `drain` / `backgroundDrain` |
| `lib/outsea/*.ts` | 领域模块：积分、试运营/订单、经营核算、返工、工作流/术语、检查、邮件、获客、运行健康、演示、供应商、媒体校验、ZIP |
| `db/schema.ts`、`drizzle/` | Drizzle 数据表定义与 SQL 迁移（SQLite / D1） |
| `ops/scheduler/` | 独立的定时 Worker，负责无人值守维护与告警 |
| `app/` | React 前端（工作台、后台、积分、首页、服务条款） |
| `scripts/` | 本地启动、演示、备份、生产配置等脚本 |
| `tests/` | 基于 `node:test` 的测试，使用内存 SQLite 模拟 D1，并模拟翻译供应商 |

## 技术栈

- [Vinext](https://www.npmjs.com/package/vinext)（基于 Vite、兼容 Next.js 的框架，**beta 版**）· React 19 · TypeScript
- Cloudflare Workers、D1、R2（调度器另用 KV）· Wrangler
- Drizzle ORM / drizzle-kit
- Tailwind CSS 4 + shadcn/ui 组件
- Node.js 内置测试（`node:test`、`node:sqlite`）

## 快速开始

### 环境要求

- Node.js **>= 22.13**（见 `package.json` 的 `engines`）
- npm
- 本地演示模式不需要 Cloudflare 账户，也不需要 Aidge 密钥。

### 1. 安装依赖

```sh
npm ci
```

### 2. 生成本地凭据

`scripts/create-accounts.mjs` 会生成本地 `.dev.vars`，其中包含随机的 `SESSION_SECRET`，以及三个已哈希的初始账户（`admin`、`trial01`、`trial02`）。随机密码写入 `outputs/accounts.md`。这两个路径都已被 git 忽略。若 `.dev.vars` 已存在，脚本会拒绝覆盖。

```sh
node scripts/create-accounts.mjs
```

也可以把 `.dev.vars.example` 复制为 `.dev.vars` 后手动填写。

### 环境变量

| 名称 | 位置 | 是否必需 | 说明 |
|---|---|---|---|
| `SESSION_SECRET` | Worker Secret / `.dev.vars` | 是 | 随机密钥（至少 32 字符）。数据库里供应商和邮件配置的 AES-GCM 加密密钥也由它派生，更换后须重新填写这些配置 |
| `BOOTSTRAP_ACCOUNTS` | Worker Secret / `.dev.vars` | 是 | JSON 数组，每项为 `{id, username, name, role, password}`，其中 `password` 格式为 `salt:pbkdf2hex`（参见 `scripts/create-accounts.mjs`）；以 `INSERT OR IGNORE` 写入 |
| `MAINTENANCE_TOKEN_HASH` | Worker Secret | 生产必需 | 调度器令牌的 SHA-256 十六进制值；本地由 `scripts/start-local.mjs` 自动注入 |
| `PUBLIC_ORIGIN` | Worker 变量 | 生产必需 | 正式域名，例如 `https://app.example.com`；其他来源一律返回 403 |
| `DB` | D1 绑定 | 是 | D1 数据库（本地绑定在 `vite.config.ts` 中定义） |
| `BUCKET` | R2 绑定 | 是 | 存放原稿和结果的 R2 存储桶 |
| `LOCAL_DEMO_MODE`、`LOCAL_DEMO_STORAGE` | 由 `npm run demo` 注入 | — | 开启演示模式；不要手动设置，也不要用于生产 |
| `SITE_URL` | 调度器变量 | 调度器必需 | 定时 Worker 要调用的生产 HTTPS 域名 |
| `MAINTENANCE_TOKEN` | 调度器 Secret | 调度器必需 | 令牌明文，其 SHA-256 须与 `MAINTENANCE_TOKEN_HASH` 一致 |
| `STATUS_KV` | 调度器 KV 绑定 | 调度器必需 | 保存告警状态，用于告警去重 |
| `ALERT_WEBHOOK` | 调度器 Secret | 可选 | 接收通用 JSON 告警的 HTTPS 地址 |

Aidge/OSS 凭证和 Resend API Key **不是**环境变量。它们由管理员在后台填写，加密后保存在 D1 中。

### 3. 构建

本地启动脚本基于构建产物运行 Wrangler，所以先构建（修改代码后需重新构建）：

```sh
npm run build
```

### 4. 演示模式（无需供应商密钥）

```sh
npm run demo
```

命令会把 `drizzle/*.sql` 全部迁移应用到隔离的 `.wrangler/demo-state`，然后在 <http://127.0.0.1:5174/> 启动（仅限本机访问），本地维护任务每分钟运行一次。用第 2 步生成的账户登录。所有结果都是带水印的示例图，收款、退款和凭证全部是模拟的（以 `DEMO-` 开头）。

### 5. 正常本地模式

```sh
npm run db:migrate:local   # 把尚未应用的 drizzle/*.sql 应用到 .wrangler/state（需先构建）
npm start -- --port 5174
```

要做真实翻译，需要 Aidge 账户、私有 OSS 存储桶和专用 RAM 密钥，并在后台明确开启测试预算（见[配置与功能开关](#配置与功能开关)）。另有 Vite 开发服务器可用：`npm run dev`。

### 测试与检查

```sh
npm test        # node:test：core、checks、integration、demo、workflow、commercial、mail-runtime
npm run check   # tsc --noEmit + 文案目录检查
npm run lint    # 目前只有警告，见“已知限制”
```

测试会用 `drizzle/*.sql` 构建内存 SQLite 数据库，配合内存对象存储和模拟供应商运行，不需要构建、联网或任何凭据。

## 部署到 Cloudflare

完整步骤见 [docs/deployment.md](docs/deployment.md)（英文）。概要：


1. 在你的 Cloudflare 账户中创建一个 D1 数据库和一个 R2 存储桶。
2. 执行 `npm run build`。
3. 生成可审阅的生产配置（写入已被忽略的 `outputs/production/`）：
   ```sh
   npm run production:prepare -- --origin https://app.example.com --d1-id <D1_UUID> --d1-name <d1-name> --bucket <bucket-name> --name <worker-name>
   ```
4. 生成生产密钥（写入 `outputs/production/credentials-*.json`，权限 0600，不在终端打印）：
   ```sh
   npm run production:secrets
   ```
   然后用 `wrangler secret put` 设置 `SESSION_SECRET`、`BOOTSTRAP_ACCOUNTS`、`MAINTENANCE_TOKEN_HASH`。
5. 按顺序把 `drizzle/*.sql` 应用到远程 D1，再执行 `wrangler deploy --config outputs/production/wrangler.json`。
6. 部署调度器：修改 `ops/scheduler/wrangler.toml` 中的 `SITE_URL` 和 `STATUS_KV` 的 id，以 Secret 方式设置 `MAINTENANCE_TOKEN`（可选 `ALERT_WEBHOOK`），然后部署。详见 `ops/scheduler/README.md`。
7. 以 `admin` 登录并修改密码（改密前所有管理写操作都会被拦截），再配置供应商、邮件和收费准入资料。

## 配置与功能开关

所有涉及费用或客户的功能**默认关闭**（见 `lib/outsea/pilot.ts` 中的 `pilotDefaults`）：

| 配置 | 默认值 | 含义 |
|---|---|---|
| `testingEnabled` | `false` | 是否允许真实调用供应商 |
| `dailyBudgetCents`、`imageReserveCents`、`videoReserveCents` | `0` | 供应商费用预留和每日上限；为 0 时真实调用会被拒绝 |
| `allowTrials` | `false` | 是否允许自助注册的体验账户提交任务 |
| `paidEnabled` | `false` | 是否开放积分购买；另外还要求全部收费准入检查通过 |
| `languages` | `['en']` | 已开放的目标语言 |
| `welcomeCredits` / `imageCredits` | `3` / `1` | 新账户赠送积分 / 每个“图片 × 语言”结果扣除的积分 |
| `creditPackages` | 一个示例套餐，未启用 | 可购买的积分套餐（人民币，以整数分记） |

收费准入检查包括：超管已改密、3 分钟内有调度心跳、已设置预算、经营者与联系方式资料完整、监控、邮件、备份等。

## 目录结构

```text
app/                 React 前端、文案目录、API 通配路由
build/               Cloudflare Worker 入口（build/worker.ts）
components/ui/       shadcn/ui 组件（MIT）
db/                  Drizzle 表定义
docs/                技术文档（架构、演示、部署、检查）
drizzle/             SQL 迁移与快照
lib/outsea/          领域逻辑（见架构）
ops/scheduler/       维护与告警定时 Worker
public/              静态资源
scripts/             本地、演示、备份、生产配置脚本
tests/               node:test 测试与 Cloudflare 模拟
vendor/              第三方 shadcn Tailwind CSS（MIT）
```

## 已知限制与路线图

- **代码风格**：大部分领域代码写成了紧凑的单行函数，需要先用格式化工具（如 Prettier）整理一遍才便于阅读和审查。
- **单体路由**：`lib/outsea/server.ts` 承担了大部分 API 路由和任务处理，应按领域拆分。
- **Beta 框架**：Vinext 仍为 beta 版（`1.0.0-beta.x`）。
- **供应商耦合**：目前只实现了阿里云 Aidge/OSS，还没有可替换的供应商接口。
- **任务处理**：全局供应商锁让任务串行执行；若某次处理中途崩溃，队列可能要等 10 分钟租约过期才恢复。更适合改用 Queues 或 Durable Objects。
- **加密**：数据加密密钥由 `SESSION_SECRET` 派生，且没有密钥版本管理。
- **无在线支付**：订单和退款均为人工记账，没有接入支付网关。
- **未经生产验证**：没有真实的翻译质量、成本和时延数据。
- **界面以中文为主**，另有英文文案目录。
- **Lint 技术债**：`no-explicit-any` 和两条 React 规则已从错误降为警告（约 330 条），以保证 CI 可用；重构时应逐步恢复。
- **Wrangler 输出路径**：本地脚本依赖 `npm run build` 生成的 `dist/server/wrangler.json`。

欢迎围绕以上任何一点提交贡献。

## 文档

- [架构](docs/architecture.md)：请求流程、任务处理、调度器、积分账本
- [演示模式](docs/demo-mode.md)
- [部署](docs/deployment.md)
- [术语保护与质量检查](docs/quality-checks.md)

（以上文档为英文。）

## 参与贡献

详见 [CONTRIBUTING.md](CONTRIBUTING.md)，安全问题见 [SECURITY.md](SECURITY.md)。CI（`.github/workflows/ci.yml`）会在每次推送和 PR 时运行 `check`、`lint`、`test` 和 `build`。

欢迎提交 Issue 和 Pull Request。提交 PR 前请运行：

```sh
npm run check && npm run lint && npm test
```

请勿提交 `.dev.vars`、`outputs/`、真实供应商密钥或客户数据。

## 许可证

[MIT](./LICENSE) © 2026 Hansen (HansenUp)

## 致谢

- [shadcn/ui](https://ui.shadcn.com)（MIT）：`components/ui/` 与 `vendor/` 中的 UI 组件和 Tailwind 样式。
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)、[Drizzle ORM](https://orm.drizzle.team)、[Vinext](https://www.npmjs.com/package/vinext)、[Resend](https://resend.com)、[阿里云 Aidge](https://help.aliyun.com/zh/aidge/)。
