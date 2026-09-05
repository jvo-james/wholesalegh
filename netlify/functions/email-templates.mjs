const BRAND = {
  name: "The Wholesale Ghana",
  tagline: "Made to order. Tracked every step.",
  text: "#171412",
  muted: "#6F6862",
  accent: "#725545",
  border: "#DED7D0",
  soft: "#F7F4F0",
  instagram: "https://instagram.com/the.wholesalegh",
  phone: "0533357961",
  pickup: "Joy City & The Clock Bar"
};

function siteUrl() {
  return String(process.env.SITE_URL || "https://thewholesalegh.shop")
    .trim()
    .replace(/\/+$/, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value = 0) {
  return `GH₵${Number(value || 0).toFixed(2)}`;
}

function clean(value = "") {
  return String(value ?? "").trim();
}

function textLines(...parts) {
  return parts
    .flat(Infinity)
    .map(v => clean(v))
    .filter(Boolean)
    .join("\n");
}

function layout({
  preview = "",
  eyebrow = "",
  title = "",
  intro = "",
  content = "",
  buttonText = "",
  buttonUrl = "",
  footerNote = ""
}) {
  const website = siteUrl();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F4F0EA;color:${BRAND.text};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preview)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#F4F0EA;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border:1px solid ${BRAND.border};">
          <tr>
            <td style="padding:28px 30px 22px;border-bottom:1px solid ${BRAND.border};text-align:left;">
              <div style="font-size:16px;line-height:1.15;font-weight:700;letter-spacing:.13em;text-transform:uppercase;">THE WHOLESALE GHANA</div>
              <div style="margin-top:7px;font-size:10px;line-height:1.4;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">${BRAND.tagline}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 30px 36px;">
              ${eyebrow ? `<div style="font-size:10px;line-height:1.4;letter-spacing:.14em;text-transform:uppercase;color:${BRAND.accent};margin-bottom:12px;">${escapeHtml(eyebrow)}</div>` : ""}
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.16;font-weight:400;color:${BRAND.text};">${escapeHtml(title)}</h1>
              ${intro ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.65;color:${BRAND.muted};">${intro}</p>` : ""}
              ${content}
              ${buttonText && buttonUrl ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;"><tr><td bgcolor="#171412"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:14px 20px;color:#FFFFFF;text-decoration:none;font-size:12px;line-height:1.2;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">${escapeHtml(buttonText)}</a></td></tr></table>` : ""}
              ${footerNote ? `<p style="margin:26px 0 0;padding-top:20px;border-top:1px solid ${BRAND.border};font-size:12px;line-height:1.65;color:${BRAND.muted};">${footerNote}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px;background:${BRAND.soft};border-top:1px solid ${BRAND.border};font-size:11px;line-height:1.65;color:${BRAND.muted};">
              <strong style="color:${BRAND.text};font-weight:600;">${BRAND.name}</strong><br>
              ${BRAND.pickup} · ${BRAND.phone} · @the.wholesalegh<br>
              <a href="${website}" style="color:${BRAND.text};text-decoration:underline;">${website.replace(/^https?:\/\//, "")}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function infoRow(label, value) {
  if (value === undefined || value === null || clean(value) === "") return "";
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-size:12px;line-height:1.5;color:${BRAND.muted};">${escapeHtml(label)}</td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid ${BRAND.border};font-size:12px;line-height:1.5;color:${BRAND.text};">${escapeHtml(value)}</td>
  </tr>`;
}

function itemVariantText(item = {}) {
  const variants = Array.isArray(item.variants) ? item.variants : [];
  if (!variants.length) {
    const details = [item.colour || item.color, item.size, item.quantity ? `Qty ${Number(item.quantity)}` : ""].filter(Boolean);
    return details.join(" · ");
  }
  return variants.map(v => [v.colour || v.color, v.size, v.quantity ? `Qty ${Number(v.quantity)}` : ""].filter(Boolean).join(" · ")).join("; ");
}

function orderItems(items = []) {
  return (items || []).map(item => {
    const variant = itemVariantText(item);
    const qty = Number(item.totalQuantity || item.quantity || 1);
    return `<tr>
      <td style="padding:13px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;">
        <div style="font-size:13px;line-height:1.45;font-weight:600;color:${BRAND.text};">${escapeHtml(item.name || "Item")}</div>
        ${variant ? `<div style="margin-top:4px;font-size:11px;line-height:1.55;color:${BRAND.muted};">${escapeHtml(variant)}</div>` : ""}
      </td>
      <td align="right" style="padding:13px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;white-space:nowrap;font-size:12px;line-height:1.45;">${money(Number(item.price || 0) * qty)}</td>
    </tr>`;
  }).join("");
}

function orderItemsText(items = []) {
  return (items || []).map(item => {
    const qty = Number(item.totalQuantity || item.quantity || 1);
    const variant = itemVariantText(item);
    return `- ${clean(item.name || "Item")}${variant ? ` — ${variant}` : ""} — ${money(Number(item.price || 0) * qty)}`;
  }).join("\n");
}

function trackingUrl(orderNumber = "") {
  return `${siteUrl()}/tracking.html?order=${encodeURIComponent(orderNumber)}`;
}

export function verificationEmail({ firstName = "", code }) {
  const name = clean(firstName);
  const title = name ? `Welcome, ${name}` : "Verify your email";
  return {
    subject: `${code} — The Wholesale Ghana verification code`,
    text: textLines(
      title,
      "",
      `Your verification code is: ${code}`,
      "",
      "Enter this code on The Wholesale Ghana website to finish creating your account.",
      "The code expires shortly. If you did not request this, you can ignore this email.",
      "",
      `Website: ${siteUrl()}`,
      `${BRAND.name} · ${BRAND.phone}`
    ),
    html: layout({
      preview: `Your verification code is ${code}`,
      eyebrow: "Email verification",
      title,
      intro: "Enter this code on the website to finish creating your account.",
      content: `<div style="margin-top:26px;padding:22px 18px;background:${BRAND.soft};border-left:3px solid ${BRAND.accent};">
        <div style="font-size:10px;line-height:1.4;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">Verification code</div>
        <div style="margin-top:9px;font-size:34px;line-height:1;font-weight:700;letter-spacing:.16em;color:${BRAND.text};">${escapeHtml(code)}</div>
      </div>`,
      footerNote: "This code expires shortly. If you did not request this account, you can safely ignore this email."
    })
  };
}

export function customerOrderConfirmationEmail(order = {}) {
  const name = order.customer?.firstName || order.customer?.name || "";
  const orderNumber = clean(order.orderNumber);
  const batchName = clean(order.batchName || order.productionBatch);
  const delivery = clean(order.estimatedDelivery);
  const fulfilment = clean(order.fulfilmentType || order.deliveryMethod || "Delivery");
  const deliveryNote = /pickup/i.test(fulfilment)
    ? `Pickup: ${BRAND.pickup}`
    : "Delivery fee: communicated after your order is confirmed";

  return {
    subject: `${orderNumber} confirmed — The Wholesale Ghana`,
    text: textLines(
      name ? `Thank you, ${name}.` : "Thank you for your order.",
      `Order: ${orderNumber}`,
      batchName && `Production batch: ${batchName}`,
      delivery && `Estimated delivery: ${delivery}`,
      `Subtotal: ${money(order.subtotal)}`,
      Number(order.processingFee || 0) > 0 && `Processing fee: ${money(order.processingFee)}`,
      `Total paid: ${money(order.total)}`,
      deliveryNote,
      "",
      "Your pieces:",
      orderItemsText(order.items),
      "",
      `Track your order: ${trackingUrl(orderNumber)}`,
      "",
      `${BRAND.name} · ${BRAND.phone} · @the.wholesalegh`
    ),
    html: layout({
      preview: `Order ${orderNumber} is confirmed.`,
      eyebrow: "Order confirmed",
      title: name ? `Thank you, ${name}` : "Thank you for your order",
      intro: "Your payment has been received. Your made-to-order pieces will now move through the production cycle.",
      content: `<div style="margin-top:26px;padding:18px 0;border-top:1px solid ${BRAND.border};border-bottom:1px solid ${BRAND.border};">
          <div style="font-size:10px;line-height:1.4;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">Order number</div>
          <div style="margin-top:5px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;">${escapeHtml(orderNumber)}</div>
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:18px;">
          ${infoRow("Production batch", batchName)}
          ${infoRow("Estimated delivery", delivery)}
          ${infoRow("Subtotal", money(order.subtotal))}
          ${Number(order.processingFee || 0) > 0 ? infoRow("Processing fee", money(order.processingFee)) : ""}
          ${infoRow("Total paid", money(order.total))}
        </table>
        <p style="margin:16px 0 0;font-size:12px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(deliveryNote)}.</p>
        <div style="margin-top:26px;font-size:10px;line-height:1.4;letter-spacing:.13em;text-transform:uppercase;color:${BRAND.accent};">Your pieces</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${orderItems(order.items)}</table>`,
      buttonText: "Track order",
      buttonUrl: trackingUrl(orderNumber),
      footerNote: "Made-to-order pieces are produced after purchase. We’ll email you as your order moves through production and dispatch."
    })
  };
}

export function adminNewOrderEmail(order = {}) {
  const customer = order.customer || {};
  const orderNumber = clean(order.orderNumber);
  return {
    subject: `New paid order ${orderNumber} — ${money(order.total)}`,
    text: textLines(
      `New paid order: ${orderNumber}`,
      `Customer: ${customer.name || customer.firstName || ""}`,
      customer.email && `Email: ${customer.email}`,
      customer.phone && `Phone: ${customer.phone}`,
      order.batchName && `Production batch: ${order.batchName}`,
      `Total pieces: ${Number(order.pieceCount || 0)}`,
      `Total paid: ${money(order.total)}`,
      "",
      "Items:",
      orderItemsText(order.items),
      "",
      `Admin: ${siteUrl()}/admin.html`
    ),
    html: layout({
      preview: `New paid order ${orderNumber}`,
      eyebrow: "New paid order",
      title: orderNumber || "New order",
      intro: "A paid order has been added to the production queue.",
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
          ${infoRow("Customer", customer.name || customer.firstName || "")}
          ${infoRow("Email", customer.email || "")}
          ${infoRow("Phone", customer.phone || "")}
          ${infoRow("Production batch", order.batchName || "")}
          ${infoRow("Total pieces", String(order.pieceCount || 0))}
          ${infoRow("Total paid", money(order.total))}
        </table>
        <div style="margin-top:26px;font-size:10px;line-height:1.4;letter-spacing:.13em;text-transform:uppercase;color:${BRAND.accent};">Order pieces</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${orderItems(order.items)}</table>`,
      buttonText: "Open admin",
      buttonUrl: `${siteUrl()}/admin.html`
    })
  };
}

export function productionStartedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Production update",
    title: "Your order is in production",
    message: "Your pieces have entered production. We’ll let you know when they move to quality control."
  });
}

export function qualityControlEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Quality control",
    title: "Your pieces are being checked",
    message: "Production is complete and your order is now going through quality checks before packaging."
  });
}

export function packagedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Order update",
    title: "Your order has been packaged",
    message: "Your pieces have completed production and quality checks. Your order is now being prepared for dispatch."
  });
}

export function dispatchedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Dispatched",
    title: "Your order is on the way",
    message: "Your order has been dispatched. You can continue following its progress from the tracking page."
  });
}

export function deliveredEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Delivered",
    title: "Your order has been delivered",
    message: "Thank you for shopping with The Wholesale Ghana. We hope you love your pieces."
  });
}

function statusEmail({ order = {}, eyebrow, title, message }) {
  const orderNumber = clean(order.orderNumber);
  return {
    subject: `${orderNumber} — ${title}`,
    text: textLines(
      title,
      message,
      "",
      `Order: ${orderNumber}`,
      order.batchName && `Production batch: ${order.batchName}`,
      order.estimatedDelivery && `Estimated delivery: ${order.estimatedDelivery}`,
      "",
      `Track your order: ${trackingUrl(orderNumber)}`,
      "",
      `${BRAND.name} · ${BRAND.phone}`
    ),
    html: layout({
      preview: `${orderNumber}: ${title}`,
      eyebrow,
      title,
      intro: escapeHtml(message),
      content: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px;">
          ${infoRow("Order", orderNumber)}
          ${infoRow("Production batch", order.batchName || "")}
          ${infoRow("Estimated delivery", order.estimatedDelivery || "")}
        </table>`,
      buttonText: "Track order",
      buttonUrl: trackingUrl(orderNumber)
    })
  };
}
