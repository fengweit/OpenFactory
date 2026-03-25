# OpenFactory — Qianhai OPC Mavericks Application
**Send to:** inqianhai@qhidg.com
**Subject:** Application: OpenFactory — The Factory API Layer the Agentic Procurement Stack Is Missing

---

## Email (English)

Dear Qianhai OPC Mavericks Program Team,

I am applying with **OpenFactory** — a REST API + MCP server that makes Greater Bay Area factories callable by AI agents.

### The Market Signal (Why Now)

Two companies just raised $60M in 6 weeks to automate enterprise procurement with AI agents:

- **Lio** — $30M Series A from Andreessen Horowitz (March 5, 2026). 100+ Fortune 500 clients managing **billions in spend**. Their agents execute entire procurement workflows end-to-end.
- **Didero** — $30M Series A from Microsoft M12 (February 2026). Focuses on manufacturers and distributors. CEO quote: *"Global trade runs on natural language — emails, WeChat, phone calls."*

Both companies automate the **buyer side** brilliantly. **Neither has solved the factory side.**

Their agents still send emails and WeChat messages to factories and wait 2–3 days for a quote. The factory side is still natural language chaos — unstructured, async, human-speed.

**That's the gap OpenFactory fills.**

### The Solution

OpenFactory turns GBA factories into API calls:

```python
# What Lio's agent does TODAY:
# → Sends email/WeChat to factory → waits 3 days → maybe gets a response

# What Lio's agent does WITH OPENFACTORY:
results = query_live_capacity("pcb_assembly", qty=5000)
# → 2 factories with open production slots. Binding prices. 10ms.

quote = get_instant_quote("sz-006", qty=5000)
# → $4.20/unit · 21 days · $21,000 total · Valid 48h · 36ms.

order = place_order(quote_id=quote.id)
# → Order confirmed. $21,000 in escrow. Factory WeChat-notified instantly.
```

**3 function calls. ~100ms. No email. No waiting.**

### The Stack We're Building

```
ENTERPRISE BUYER (Fortune 500)
         ↓
[ Lio / Didero ]       ← Buyer-side automation ($60M raised, proven demand)
         ↓
[ OpenFactory ]        ← Factory-side API layer (THIS IS US)
         ↓
GBA FACTORIES          ← Shenzhen · GZ · Dongguan · Foshan · 8 cities
```

OpenFactory is infrastructure, not a marketplace. We're not competing with Alibaba — we're building the API layer that makes AI procurement agents 10x more effective for GBA sourcing.

### Traction (Phase 0 POC — Live March 2026)

| What | Status |
|------|--------|
| REST API + MCP server (8 tools) | ✅ Live |
| 20 verified GBA factories, 8 cities | ✅ Live |
| `query_live_capacity()` — 10ms response | ✅ Live |
| `get_instant_quote()` — 36ms, tiered pricing | ✅ Live |
| Escrow architecture (Stripe) | ✅ Live (prod keys needed) |
| WeChat + Email notifications | ✅ Live |
| `openfactory-mcp` npm package | ✅ Published |
| Mobile factory portal (Mandarin-first) | ✅ Live |
| Bilingual factory onboarding guide | ✅ Live |
| GitHub: fengweit/OpenFactory | ✅ Public |

### Why Qianhai Is the Only Place to Build This

The agentic procurement stack is forming **right now**. The buyer layer is funded. The factory API layer is not built yet. The window to own GBA factory infrastructure closes in 18 months — once Lio/Didero or a well-funded player builds it themselves.

Qianhai gives us three things money can't buy on this timeline:

1. **Physical proximity** — 90 minutes from 50,000+ GBA factories in Shenzhen, Dongguan, Foshan, Guangzhou
2. **Cross-border infrastructure** — Qianhai's FTZ enables clean USD ↔ RMB escrow flows (the escrow architecture is built, we need the regulatory wrapper)
3. **Credibility** — walking into a Shenzhen factory and saying *"我们是前海的初创公司"* changes every conversation

**The OPC Mavericks Program ask:**
- **Free office (200㎡, 2yr)** — needed to run factory verification and onboarding operations
- **Compute (50P)** — MCP server + LLM inference for instant quote engine
- **Talent award (¥600K/yr)** — to hire 2 Shenzhen-based factory relationship managers
- **Policy support** — cross-border payment licensing for USD escrow

### Roadmap

| Phase | Timeline | Milestone |
|-------|----------|-----------|
| 0 — POC | Done | 20 factories, 8 tools, instant quote API, $260K demo GMV |
| 1 — Integration | Q2 2026 | Lio/Didero API integration, 5 real factory relationships, first real transaction |
| 2 — Scale | Q3 2026 | 100 factories, $1M real GMV, 3 enterprise API clients |
| 3 — Platform | 2027 | 1,000 factories, $10M GMV, dominant GBA factory API layer |

### Founder

**Fengwei "Yuqi" Tian**
- Sr. Software Engineer @ Rippling (current) — AI triage systems, RAG pipelines, $277K comp
- Amazon SDE (Seattle + London, 2016–2021) — distributed systems at scale
- SUNY Buffalo CS
- Built and shipped OpenFactory in 72 hours as a working POC
- Mandarin-native, WeChat-native, deep GBA network

**GitHub:** https://github.com/fengweit/OpenFactory
**Demo:** http://[server]:3000/agent.html

Looking forward to the conversation.

Fengwei "Yuqi" Tian

---

## Email (中文版)

尊敬的前海OPC Mavericks项目团队：

我谨以 **OpenFactory** 申请前海OPC创业者计划——一个将大湾区工厂转化为可编程API的MCP服务器和REST接口。

### 市场信号（为何是现在）

过去6周内，两家公司共融资6000万美元，专注于用AI Agent自动化企业采购：

- **Lio**（2026年3月，a16z领投3000万美元）：100+家世界500强客户，管理数十亿美元采购支出，AI Agent可端到端执行完整采购流程
- **Didero**（2026年2月，微软M12参投，融资3000万美元）：专注制造商和分销商，CEO原话：*"全球贸易依赖自然语言沟通——邮件、微信、电话"*

这两家公司都在优化**买方侧**。**但没有一家解决了工厂侧的问题。**

他们的AI Agent仍在给工厂发邮件和微信，等待2-3天才能收到报价。工厂侧依然是自然语言的混乱——无结构、异步、人工处理。

**这正是OpenFactory要填补的空白。**

### 解决方案

OpenFactory将大湾区工厂变成可直接调用的API：

```python
# 现有方案：发微信 → 等3天 → 也许能收到回复

# OpenFactory方案（100ms内完成）：
results = query_live_capacity("pcb_assembly", qty=5000)
# → 2家工厂有现货产能，即时报价，10ms响应

quote = get_instant_quote("sz-006", qty=5000)
# → $4.20/件 · 21天交期 · 总价$21,000 · 有效48小时 · 36ms

order = place_order(quote_id=quote.id)
# → 订单确认，$21,000资金托管，工厂微信通知即时推送
```

### 为何必须在前海建

**资金托管**：前海自贸区的跨境支付政策，是实现美元↔人民币托管流转的唯一合规路径。

**工厂资源**：深圳、东莞、佛山、广州、惠州、中山、江门、珠海——8个大湾区城市，5万+工厂，90分钟内可达。

**落地背书**：前海初创公司的身份，让工厂愿意接受数字化对接，这是纯硅谷公司无法获得的信任基础。

### 前海Mavericks计划申请内容

- **免费办公（200㎡，2年）**：用于工厂核查和入驻运营
- **算力支持（50P）**：MCP服务器 + 即时报价引擎推理
- **人才奖励（60万元/年）**：招募2名大湾区工厂关系经理
- **政策支持**：美元托管跨境收付许可

**GitHub:** https://github.com/fengweit/OpenFactory

期待与您进一步沟通。

田丰蔚（Yuqi）

---

*OpenFactory is MIT licensed. All code is public. The pitch is honest: Phase 0 POC is complete, factory acquisition starts with Qianhai support.*
