# Qianhai OPC Mavericks Program — Application

**Send to:** inqianhai@qhidg.com  
**Subject:** Application: OpenFactory — AI-Native Manufacturing OS for the Greater Bay Area

---

## Email Draft (English)

---

Dear Qianhai OPC Mavericks Program Team,

I am writing to apply for the Qianhai OPC Mavericks Program with **OpenFactory** — an AI-native manufacturing marketplace that turns verified GBA factories into callable tools for AI agents.

**One-line pitch:** Lio and Didero raised $60M to automate enterprise procurement. Their agents still email GBA factories and wait. We're building the factory API they plug into.

### The Market Signal

Two companies just raised $60M to automate enterprise procurement with AI agents:
- **Lio** — $30M from a16z (March 2026). 100+ Fortune 500 clients. Agents that "execute the entire procurement workflow."
- **Didero** — $30M Series A (Feb 2026). "Global trade runs on natural language — emails, WeChat, phone calls."

Both companies automate the buyer side brilliantly. **Neither has solved the factory side.** Their agents still send emails to GBA factories and wait days for quotes.

OpenFactory is the missing piece: a factory-side API that makes GBA manufacturing callable. When Lio's agent needs a PCB quote, it calls `get_quote()` instead of sending a WeChat message and waiting 3 days.

### The Problem

Foreign buyers and AI procurement agents sourcing from the Greater Bay Area face three friction points that kill deals:

1. **Discovery** — no verified, structured directory of factory capabilities. Buyers rely on Alibaba, cold WeChat messages, and trade shows.
2. **Quoting** — getting comparable quotes from multiple factories takes 2–4 weeks and spreadsheets.
3. **Trust & Payment** — no escrow protection. Buyers lose deposits to ghost factories; factories lose time to non-buyers.

### The Solution

OpenFactory is a **REST API + MCP server** that makes manufacturing callable:

```python
# Any AI agent can now source a factory in 3 function calls:
factories = search_factories(category="pcb_assembly", verified_only=True)
quote     = get_quote(factory_id="sz-006", product="IoT sensor PCB", qty=5000)
order     = place_order(quote_id=quote.id, buyer_id="my-company")
# → Order placed. $15,824 in escrow. Factory notified via WeChat.
```

### Why Qianhai

Qianhai is uniquely positioned for OpenFactory:

- **Factory access** — within 90 minutes of 50,000+ GBA factories in Shenzhen, Dongguan, Foshan, Guangzhou
- **Cross-border infrastructure** — Qianhai's special tax/FX regime makes USD ↔ RMB escrow clean
- **Talent** — HK/mainland technical talent at competitive cost
- **The OPC Mavericks Program** — compute + office + visa support = exactly the runway needed to onboard 100 factories in Year 1

### Traction (Phase 0 POC — live as of March 2026)

- ✅ 20 GBA factories onboarded (8 cities) (Shenzhen/Guangzhou/Dongguan/Foshan)
- ✅ Full API stack live: search → quote → order → track → analytics
- ✅ MCP server — works with Claude, GPT-4o, any LLM supporting MCP
- ✅ WeChat notifications on every quote/order event
- ✅ Escrow architecture designed (Stripe integration in Phase 2)
- 🔗 GitHub: https://github.com/fengweit/OpenFactory
- 🌐 Demo: http://[server]:3000/agent.html

### Roadmap

| Phase | Timeline | Goal |
|-------|----------|------|
| 0 — POC | Now | 20 factories, 8 cities, full API, MCP server, email+WeChat+Stripe |
| 1 — Seed | Q2 2026 | 100 factories, Stripe escrow, WeChat miniprogram |
| 2 — Scale | Q4 2026 | 1,000 factories, $1M GMV, npm package |
| 3 — Platform | 2027 | 10,000 factories, $10M GMV, Series A |

### The Ask

Under the OPC Mavericks Program, I am requesting:
- **Office space** (200㎡) — needed to run factory verification team
- **Compute** (50P) — MCP server + LLM inference for quote matching
- **Talent award** (¥600K/yr) — to hire 2 Shenzhen-based factory relationship managers
- **Collateral-free loan** — bridge to Stripe escrow launch

### Founder Background

**Fengwei "Yuqi" Tian**
- Senior Software Engineer @ Rippling (current, San Francisco) — AI triage systems, RAG pipelines
- Amazon SDE (Seattle + London, 2016–2021) — distributed systems at scale
- SUNY Buffalo CS (2012–2014)
- Deep personal connections to GBA manufacturing ecosystem
- Committing 100% to OpenFactory upon program acceptance

---

*I am available for a call at your earliest convenience. The live demo is at https://github.com/fengweit/OpenFactory — `npm install && npm run api` spins up the full stack in 30 seconds.*

Best regards,  
Fengwei (Yuqi) Tian  
fengweit@gmail.com  
WeChat: [TBD]  
GitHub: github.com/fengweit

---

## Chinese Version (中文)

---

尊敬的前海OPC先行者计划团队，

我代表**OpenFactory**申请前海OPC先行者计划。

**一句话概括：** OpenFactory 是制造业的 Stripe——用一行 API 调用，连接整个大湾区的工厂。

### 痛点

海外买家在大湾区采购时，面临三大摩擦点：
1. **发现** — 没有可信赖的、结构化的工厂能力数据库
2. **询价** — 多厂对比报价需要2–4周和大量电子表格
3. **信任与支付** — 没有托管保护，买家丢押金，工厂浪费时间

### 解决方案

任何AI智能体都能通过三个函数调用完成采购：

```python
factories = search_factories(category="pcb_assembly", verified_only=True)
quote     = get_quote(factory_id="sz-006", product="IoT传感器PCB", qty=5000)
order     = place_order(quote_id=quote.id)
# → 订单确认，¥112,000 托管，工厂微信通知
```

### 为什么选择前海

- 覆盖粤港澳大湾区50,000+工厂，90分钟车程
- 前海跨境金融基础设施，支持美元/人民币托管
- 前海先行先试政策 + 人才优惠

### 进展（2026年3月，Phase 0 POC上线）

- ✅ 10家大湾区工厂（深圳/广州/东莞/佛山）
- ✅ 完整API栈：搜索→报价→下单→追踪→分析
- ✅ MCP服务器：兼容Claude、GPT-4o等主流AI
- ✅ 微信通知：每次询价和订单事件自动推送
- 🔗 GitHub: https://github.com/fengweit/OpenFactory

### 申请支持

- 办公场地（200㎡）— 工厂验证团队运营
- 算力（50P） — MCP推理与报价匹配
- 人才激励（60万/年）— 招募2名深圳工厂关系经理
- 免抵押贷款 — 支撑Stripe托管功能上线前的资金周转

---

期待与您进一步沟通。演示地址：https://github.com/fengweit/OpenFactory

字节  
田丰炜（于琦）  
fengweit@gmail.com
