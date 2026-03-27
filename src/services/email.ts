/**
 * Email Notification Service
 *
 * Dev mode (no SENDGRID_API_KEY): logs to console.
 * Production: SendGrid API.
 *
 * Events:
 *   - Buyer: order confirmation + escrow details
 *   - Buyer: order shipped (with tracking number)
 *   - Buyer: escrow released confirmation
 *   - Factory: new quote request (backup to WeChat)
 */

const SENDGRID_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL   = process.env.FROM_EMAIL || "noreply@openfactory.com";
const FROM_NAME    = "OpenFactory";
const DEV_MODE     = !SENDGRID_KEY;

interface EmailPayload {
  to:      string;
  subject: string;
  text:    string;
  html:    string;
}

async function send(payload: EmailPayload): Promise<void> {
  if (DEV_MODE) {
    console.log(`[Email DEV] To: ${payload.to} | Subject: ${payload.subject}`);
    console.log(`[Email DEV] ${payload.text.slice(0, 120)}...`);
    return;
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SENDGRID_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: payload.subject,
      content: [
        { type: "text/plain", value: payload.text },
        { type: "text/html",  value: payload.html  },
      ],
    }),
  });

  if (!res.ok) console.warn(`[Email] SendGrid error ${res.status}: ${await res.text()}`);
}

/** Buyer order confirmation */
export async function sendOrderConfirmation(params: {
  buyer_email: string;
  order_id:    string;
  factory:     string;
  product:     string;
  quantity:    number;
  total_usd:   number;
  ship_date:   string;
}): Promise<void> {
  const ship = new Date(params.ship_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  await send({
    to:      params.buyer_email,
    subject: `Order confirmed — ${params.order_id} | OpenFactory`,
    text: [
      `Your order has been confirmed and payment is held in escrow.`,
      ``,
      `Order ID:  ${params.order_id}`,
      `Factory:   ${params.factory}`,
      `Product:   ${params.product}`,
      `Quantity:  ${params.quantity.toLocaleString()} units`,
      `Total:     $${params.total_usd.toLocaleString()} (in escrow)`,
      `Est. ship: ${ship}`,
      ``,
      `Your payment is protected. It will only be released to the factory after you confirm receipt.`,
      `Track your order: http://localhost:3000/buyer.html`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0a;color:#e2e2e2;">
        <div style="font-size:20px;font-weight:800;color:white;margin-bottom:20px;">🏭 Order Confirmed</div>
        <div style="background:#141414;border:1px solid #272727;border-radius:10px;padding:20px;margin-bottom:16px;">
          <table style="width:100%;font-size:14px;">
            <tr><td style="color:#888;padding:6px 0;">Order ID</td><td style="font-weight:600;color:white;">${params.order_id}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Factory</td><td style="color:white;">${params.factory}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Product</td><td style="color:white;">${params.product}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Quantity</td><td style="color:white;">${params.quantity.toLocaleString()} units</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Total</td><td style="font-weight:800;color:#4ade80;font-size:18px;">$${params.total_usd.toLocaleString()}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Est. ship</td><td style="color:white;">${ship}</td></tr>
          </table>
        </div>
        <div style="background:#052e16;border:1px solid #166534;border-radius:10px;padding:16px;font-size:13px;color:#86efac;">
          🔒 <strong>Escrow protection:</strong> Your payment is held by OpenFactory. Released only after you confirm receipt.
        </div>
        <div style="margin-top:24px;text-align:center;">
          <a href="http://localhost:3000/buyer.html" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Track your order →</a>
        </div>
      </div>
    `,
  });
}

/** Buyer: milestone update notification */
export async function notifyBuyerMilestoneUpdate(params: {
  buyer_email:   string;
  order_id:      string;
  milestone:     string;
  timestamp:     string;
  photo_urls:    string[];
  escrow_status: string;
  factory_name:  string;
  note?:         string;
}): Promise<void> {
  const ts = new Date(params.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const milestoneName = params.milestone.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const escrowLabel = params.escrow_status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const photoList = params.photo_urls.length > 0
    ? params.photo_urls.map((u, i) => `  Photo ${i + 1}: ${u}`).join("\n")
    : "  (no photos attached)";
  const trackUrl = `${process.env.PUBLIC_URL || "http://localhost:3000"}/order-track.html?id=${params.order_id}`;

  await send({
    to:      params.buyer_email,
    subject: `Milestone update: ${milestoneName} — ${params.order_id} | OpenFactory`,
    text: [
      `Your order has a new milestone update from ${params.factory_name}.`,
      ``,
      `Order ID:   ${params.order_id}`,
      `Milestone:  ${milestoneName}`,
      `Time:       ${ts}`,
      `Escrow:     ${escrowLabel}`,
      params.note ? `Note:       ${params.note}` : null,
      ``,
      `Photos:`,
      photoList,
      ``,
      `Track your order: ${trackUrl}`,
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0a;color:#e2e2e2;">
        <div style="font-size:20px;font-weight:800;color:white;margin-bottom:20px;">📦 Milestone Update</div>
        <div style="background:#141414;border:1px solid #272727;border-radius:10px;padding:20px;margin-bottom:16px;">
          <table style="width:100%;font-size:14px;">
            <tr><td style="color:#888;padding:6px 0;">Order ID</td><td style="font-weight:600;color:white;">${params.order_id}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Factory</td><td style="color:white;">${params.factory_name}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Milestone</td><td style="font-weight:700;color:#60a5fa;">${milestoneName}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Time</td><td style="color:white;">${ts}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Escrow</td><td style="color:#4ade80;">${escrowLabel}</td></tr>
            ${params.note ? `<tr><td style="color:#888;padding:6px 0;">Note</td><td style="color:white;">${params.note}</td></tr>` : ""}
          </table>
        </div>
        ${params.photo_urls.length > 0 ? `
        <div style="margin-bottom:16px;">
          <div style="color:#888;font-size:12px;margin-bottom:8px;">PROOF PHOTOS</div>
          ${params.photo_urls.map(u => `<img src="${u}" style="max-width:100%;border-radius:8px;margin-bottom:8px;" />`).join("")}
        </div>` : ""}
        <div style="margin-top:24px;text-align:center;">
          <a href="${trackUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Track your order →</a>
        </div>
      </div>
    `,
  });
}

/** Buyer: stale order alert — no production updates */
export async function notifyBuyerStaleOrder(params: {
  buyer_email:             string;
  order_id:                string;
  factory_name:            string;
  days_since_last_update:  number;
  expected_milestone:      string;
  status:                  string;
}): Promise<void> {
  const expectedLabel = params.expected_milestone.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const trackUrl = `${process.env.PUBLIC_URL || "http://localhost:3000"}/order-track.html?id=${params.order_id}`;

  await send({
    to:      params.buyer_email,
    subject: `⚠ No production update in ${params.days_since_last_update} days — ${params.order_id} | OpenFactory`,
    text: [
      `Your order has had no production updates for ${params.days_since_last_update} days.`,
      ``,
      `Order ID:     ${params.order_id}`,
      `Factory:      ${params.factory_name}`,
      `Status:       ${params.status}`,
      `Expected:     ${expectedLabel}`,
      `Days silent:  ${params.days_since_last_update}`,
      ``,
      `We recommend contacting the factory or raising a dispute if this continues.`,
      `Track your order: ${trackUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0a0a0a;color:#e2e2e2;">
        <div style="font-size:20px;font-weight:800;color:#fbbf24;margin-bottom:20px;">⚠ Production Update Stalled</div>
        <div style="background:#141414;border:1px solid #272727;border-radius:10px;padding:20px;margin-bottom:16px;">
          <table style="width:100%;font-size:14px;">
            <tr><td style="color:#888;padding:6px 0;">Order ID</td><td style="font-weight:600;color:white;">${params.order_id}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Factory</td><td style="color:white;">${params.factory_name}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Status</td><td style="color:white;">${params.status}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Expected</td><td style="color:#60a5fa;">${expectedLabel}</td></tr>
            <tr><td style="color:#888;padding:6px 0;">Days silent</td><td style="font-weight:800;color:#f87171;font-size:18px;">${params.days_since_last_update}</td></tr>
          </table>
        </div>
        <div style="background:#451a03;border:1px solid #92400e;border-radius:10px;padding:16px;font-size:13px;color:#fde68a;">
          ⚠ <strong>No updates detected.</strong> Contact the factory or raise a dispute if production has stalled.
        </div>
        <div style="margin-top:24px;text-align:center;">
          <a href="${trackUrl}" style="background:#7c3aed;color:white;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none;">Track your order →</a>
        </div>
      </div>
    `,
  });
}

/** Buyer: order shipped */
export async function sendShippingNotification(params: {
  buyer_email:     string;
  order_id:        string;
  tracking_number: string;
  factory:         string;
}): Promise<void> {
  await send({
    to:      params.buyer_email,
    subject: `Your order is shipped — ${params.order_id} | OpenFactory`,
    text: `Your order ${params.order_id} from ${params.factory} has shipped.\nTracking: ${params.tracking_number}\n\nConfirm receipt to release payment to the factory.`,
    html: `<p>Order <strong>${params.order_id}</strong> shipped. Tracking: <strong>${params.tracking_number}</strong>. Confirm receipt to release escrow.</p>`,
  });
}
