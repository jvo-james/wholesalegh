const BRAND = {
  name: "THE WHOLESALE GHANA",
  tagline: "MADE TO ORDER. TRACKED EVERY STEP.",
  background: "#F4F0EA",
  card: "#FFFFFF",
  text: "#171412",
  muted: "#756D67",
  brown: "#6E5141",
  border: "#DDD5CC",
  website: "https://wholesalegh.netlify.app",
  instagram: "https://instagram.com/the.wholesalegh"
};

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
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:${BRAND.background};
  font-family:Arial,Helvetica,sans-serif;
  color:${BRAND.text};
">

  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
  ">
    ${escapeHtml(preview)}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:${BRAND.background};">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
          style="
            max-width:640px;
            background:${BRAND.card};
            border:1px solid ${BRAND.border};
          ">

          <tr>
            <td style="padding:34px 34px 22px;text-align:center;border-bottom:1px solid ${BRAND.border};">
              <div style="
                font-size:20px;
                line-height:1.1;
                font-weight:700;
                letter-spacing:.16em;
              ">
                THE WHOLESALE<br>GHANA
              </div>

              <div style="
                margin-top:10px;
                font-size:10px;
                color:${BRAND.muted};
                letter-spacing:.18em;
              ">
                ${BRAND.tagline}
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:42px 34px;">

              ${eyebrow ? `
              <div style="
                font-size:11px;
                letter-spacing:.16em;
                color:${BRAND.brown};
                margin-bottom:14px;
                text-transform:uppercase;
              ">
                ${escapeHtml(eyebrow)}
              </div>
              ` : ""}

              <h1 style="
                margin:0;
                font-size:32px;
                line-height:1.15;
                font-weight:500;
                letter-spacing:-.02em;
              ">
                ${escapeHtml(title)}
              </h1>

              ${intro ? `
              <p style="
                margin:18px 0 0;
                color:${BRAND.muted};
                font-size:15px;
                line-height:1.7;
              ">
                ${intro}
              </p>
              ` : ""}

              ${content}

              ${buttonText && buttonUrl ? `
              <div style="margin-top:32px;">
                <a
                  href="${buttonUrl}"
                  style="
                    display:inline-block;
                    background:${BRAND.text};
                    color:#fff;
                    text-decoration:none;
                    padding:15px 24px;
                    font-size:12px;
                    letter-spacing:.12em;
                    text-transform:uppercase;
                  "
                >
                  ${escapeHtml(buttonText)}
                </a>
              </div>
              ` : ""}

              ${footerNote ? `
              <p style="
                margin:30px 0 0;
                color:${BRAND.muted};
                font-size:12px;
                line-height:1.7;
              ">
                ${footerNote}
              </p>
              ` : ""}

            </td>
          </tr>

          <tr>
            <td style="
              padding:24px 34px;
              background:#F8F5F1;
              border-top:1px solid ${BRAND.border};
              font-size:11px;
              line-height:1.7;
              color:${BRAND.muted};
            ">
              <div style="margin-bottom:8px;">
                ${BRAND.name}
              </div>

              <div>
                You order. We make. You track every step.
              </div>

              <div style="margin-top:12px;">
                <a href="${BRAND.website}" style="color:${BRAND.text};text-decoration:none;">
                  Visit website
                </a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="${BRAND.instagram}" style="color:${BRAND.text};text-decoration:none;">
                  Instagram
                </a>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

function infoRow(label, value) {
  return `
  <tr>
    <td style="
      padding:10px 0;
      color:${BRAND.muted};
      font-size:13px;
      border-bottom:1px solid ${BRAND.border};
    ">
      ${escapeHtml(label)}
    </td>

    <td align="right" style="
      padding:10px 0;
      font-size:13px;
      border-bottom:1px solid ${BRAND.border};
    ">
      ${escapeHtml(value)}
    </td>
  </tr>
  `;
}

function orderItems(items = []) {
  return items.map(item => {
    const variants = (item.variants || []).map(v => `
      <div style="
        color:${BRAND.muted};
        font-size:12px;
        line-height:1.6;
      ">
        ${escapeHtml(v.colour || v.color || "")}
        ${v.size ? ` · ${escapeHtml(v.size)}` : ""}
        ${v.quantity ? ` · Qty ${Number(v.quantity)}` : ""}
      </div>
    `).join("");

    return `
      <tr>
        <td style="
          padding:16px 0;
          border-bottom:1px solid ${BRAND.border};
          vertical-align:top;
        ">
          <div style="
            font-size:14px;
            font-weight:600;
            margin-bottom:5px;
          ">
            ${escapeHtml(item.name || "Item")}
          </div>

          ${variants}
        </td>

        <td align="right" style="
          padding:16px 0;
          border-bottom:1px solid ${BRAND.border};
          vertical-align:top;
          white-space:nowrap;
          font-size:13px;
        ">
          ${money((item.price || 0) * (item.totalQuantity || item.quantity || 1))}
        </td>
      </tr>
    `;
  }).join("");
}

export function verificationEmail({
  firstName = "",
  code
}) {
  return {
    subject: `${code} is your verification code`,
    html: layout({
      preview: `Your verification code is ${code}`,
      eyebrow: "Email verification",
      title: firstName ? `Welcome, ${firstName}` : "Welcome",
      intro:
        "Use the verification code below to complete your account setup.",

      content: `
        <div style="
          margin-top:30px;
          background:#F8F5F1;
          border:1px solid ${BRAND.border};
          padding:28px;
          text-align:center;
        ">
          <div style="
            font-size:11px;
            letter-spacing:.16em;
            color:${BRAND.muted};
            text-transform:uppercase;
          ">
            Your verification code
          </div>

          <div style="
            margin-top:12px;
            font-size:38px;
            letter-spacing:.20em;
            font-weight:600;
          ">
            ${escapeHtml(code)}
          </div>
        </div>
      `,

      footerNote:
        "This code expires shortly. If you did not create this account, you can ignore this email."
    })
  };
}

export function customerOrderConfirmationEmail(order) {
  const name = order.customer?.firstName || order.customer?.name || "";
  const orderNumber = order.orderNumber || "";
  const batchName = order.batchName || order.productionBatch || "";
  const delivery = order.estimatedDelivery || "";

  return {
    subject: `Order ${orderNumber} confirmed`,
    html: layout({
      preview: `Your order ${orderNumber} has been confirmed.`,
      eyebrow: "Order confirmed",
      title: name ? `Thank you, ${name}` : "Thank you for your order",
      intro:
        "Your payment has been received and your made-to-order pieces are now scheduled for production.",

      content: `
        <div style="
          margin-top:30px;
          padding:22px;
          background:#F8F5F1;
          border:1px solid ${BRAND.border};
        ">
          <div style="
            font-size:11px;
            letter-spacing:.14em;
            color:${BRAND.muted};
            text-transform:uppercase;
          ">
            Order number
          </div>

          <div style="
            font-size:27px;
            margin-top:6px;
          ">
            ${escapeHtml(orderNumber)}
          </div>
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="margin-top:28px;">
          ${infoRow("Production batch", batchName)}
          ${infoRow("Estimated delivery", delivery)}
          ${infoRow("Subtotal", money(order.subtotal))}
          ${infoRow("Delivery", money(order.deliveryFee))}
          ${infoRow("Processing fee", money(order.processingFee))}
          ${infoRow("Total paid", money(order.total))}
        </table>

        <div style="
          margin-top:32px;
          font-size:11px;
          letter-spacing:.15em;
          text-transform:uppercase;
        ">
          Your pieces
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${orderItems(order.items)}
        </table>

        <div style="
          margin-top:28px;
          padding:18px 20px;
          border-left:3px solid ${BRAND.brown};
          background:#F8F5F1;
          font-size:13px;
          line-height:1.7;
        ">
          Every order is produced after purchase and grouped into weekly production cycles.
          Your estimated delivery window begins after your assigned cycle closes.
        </div>
      `,

      buttonText: "Track my order",
      buttonUrl: `${BRAND.website}/tracking.html?order=${encodeURIComponent(orderNumber)}`
    })
  };
}

export function adminNewOrderEmail(order) {
  const customer = order.customer || {};

  return {
    subject: `New order ${order.orderNumber} · ${money(order.total)}`,
    html: layout({
      preview: `New paid order ${order.orderNumber}`,
      eyebrow: "New paid order",
      title: order.orderNumber || "New order",
      intro:
        "A new order has been paid and added to production.",

      content: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
          style="margin-top:28px;">
          ${infoRow("Customer", customer.name || customer.firstName || "")}
          ${infoRow("Email", customer.email || "")}
          ${infoRow("Phone", customer.phone || "")}
          ${infoRow("Production batch", order.batchName || "")}
          ${infoRow("Total pieces", String(order.pieceCount || 0))}
          ${infoRow("Total paid", money(order.total))}
        </table>

        <div style="
          margin-top:32px;
          font-size:11px;
          letter-spacing:.15em;
          text-transform:uppercase;
        ">
          Production breakdown
        </div>

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          ${orderItems(order.items)}
        </table>
      `,

      buttonText: "Open admin dashboard",
      buttonUrl: `${BRAND.website}/admin.html`
    })
  };
}

export function productionStartedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Production update",
    title: "Your order is now in production",
    message:
      "Your pieces have entered production. We’ll let you know when they move to quality control."
  });
}

export function qualityControlEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Quality control",
    title: "Your pieces are being checked",
    message:
      "Production is complete and your order is now going through our quality checks before packaging."
  });
}

export function packagedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Order update",
    title: "Your order has been packaged",
    message:
      "Your pieces have completed production and quality checks. Your order is now packaged and being prepared for dispatch."
  });
}

export function dispatchedEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Dispatched",
    title: "Your order is on the way",
    message:
      "Your order has been dispatched. You can continue following its progress from your order tracking page."
  });
}

export function deliveredEmail(order) {
  return statusEmail({
    order,
    eyebrow: "Delivered",
    title: "Your order has been delivered",
    message:
      "Thank you for shopping with The Wholesale Ghana. We hope you love your pieces."
  });
}

function statusEmail({
  order,
  eyebrow,
  title,
  message
}) {
  return {
    subject: `${order.orderNumber} · ${title}`,
    html: layout({
      preview: `${order.orderNumber}: ${title}`,
      eyebrow,
      title,
      intro: message,

      content: `
        <div style="
          margin-top:30px;
          background:#F8F5F1;
          border:1px solid ${BRAND.border};
          padding:24px;
        ">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${infoRow("Order", order.orderNumber || "")}
            ${infoRow("Production batch", order.batchName || "")}
            ${infoRow("Estimated delivery", order.estimatedDelivery || "")}
          </table>
        </div>
      `,

      buttonText: "Track my order",
      buttonUrl: `${BRAND.website}/tracking.html?order=${encodeURIComponent(order.orderNumber || "")}`
    })
  };
}
