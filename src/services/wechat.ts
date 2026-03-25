/**
 * WeChat Work webhook notifications
 * 
 * In production: use the factory's wecom webhook URL stored in factories table.
 * In Phase 0 POC: logs to console + sends to configured webhook if WECHAT_WEBHOOK_URL is set.
 * 
 * WeChat Work webhook docs: https://developer.work.weixin.qq.com/document/path/91770
 */

const WEBHOOK_URL = process.env.WECHAT_WEBHOOK_URL;
const BASE_URL    = process.env.PUBLIC_URL || "http://localhost:3000";

export interface QuoteNotification {
  factory_id:       string;
  factory_name:     string;
  factory_name_zh:  string;
  buyer_id:         string;
  product_description: string;
  quantity:         number;
  target_price?:    number;
  quote_id:         string;
  webhook_url?:     string;
}

export interface OrderNotification {
  factory_name: string;
  order_id: string;
  quantity: number;
  total_price_usd: number;
  estimated_ship_date: string;
  webhook_url?: string;
}

/** Notify factory of a new quote request via WeChat Work webhook */
export async function notifyNewQuoteRequest(data: QuoteNotification): Promise<void> {
  const text = [
    `🔔 新询价通知 · New Quote Request`,
    `━━━━━━━━━━━━━━━━━━`,
    `工厂 · Factory: ${data.factory_name_zh} (${data.factory_name})`,
    `买家 · Buyer: ${data.buyer_id}`,
    `产品 · Product: ${data.product_description}`,
    `数量 · Quantity: ${data.quantity.toLocaleString()} pcs`,
    data.target_price ? `目标价 · Target: $${data.target_price}/pc` : `目标价 · Target: Open`,
    `询价ID · Quote ID: ${data.quote_id}`,
    `━━━━━━━━━━━━━━━━━━`,
    `请在4小时内回复 · Please respond within 4 hours`,
    ``,
    `👆 点击一键报价 (无需登录):`,
    `${BASE_URL}/factory/quick-reply?f=${data.factory_id}&a=quote&t=${data.quote_id}`,
  ].join("\n");

  await sendWebhook({ msgtype: "text", text: { content: text } }, data.webhook_url);
  console.log(`📲 WeChat notification sent for quote ${data.quote_id} → ${data.factory_name}`);
}

/** Notify factory of a confirmed order */
export async function notifyOrderConfirmed(data: OrderNotification): Promise<void> {
  const text = [
    `✅ 订单确认 · Order Confirmed`,
    `━━━━━━━━━━━━━━━━━━`,
    `工厂 · Factory: ${data.factory_name}`,
    `订单ID · Order ID: ${data.order_id}`,
    `数量 · Quantity: ${data.quantity.toLocaleString()} pcs`,
    `金额 · Total: $${data.total_price_usd.toLocaleString()} (🔒 escrow held)`,
    `预计交货 · Est. ship: ${new Date(data.estimated_ship_date).toLocaleDateString("zh-CN")}`,
    `━━━━━━━━━━━━━━━━━━`,
    `款项已托管，确认收货后释放`,
    `Payment in escrow — released after buyer confirms receipt`,
  ].join("\n");

  await sendWebhook({ msgtype: "text", text: { content: text } }, data.webhook_url);
  console.log(`📲 WeChat order notification sent for order ${data.order_id}`);
}

async function sendWebhook(payload: Record<string, unknown>, factoryWebhookUrl?: string): Promise<void> {
  const url = factoryWebhookUrl || WEBHOOK_URL;
  if (!url) {
    // Dev mode: just log
    console.log("[WeChat webhook - dev mode]", JSON.stringify(payload, null, 2));
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`WeChat webhook returned ${res.status}`);
    }
  } catch (e) {
    console.error("WeChat webhook failed:", e);
    // Non-fatal — don't throw
  }
}
