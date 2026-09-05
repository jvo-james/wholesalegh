import "../../images.js";
import admin from "firebase-admin";
import crypto from "node:crypto";

import {
  verificationEmail,
  customerOrderConfirmationEmail,
  adminNewOrderEmail,
  productionStartedEmail,
  qualityControlEmail,
  packagedEmail,
  dispatchedEmail,
  deliveredEmail
} from "./email-templates.mjs";


/* =========================================================
   THE WHOLESALE GHANA
   Main Backend Function
   ========================================================= */

const PROCESSING_RATE = 0.0295;


/* =========================================================
   BASIC HELPERS
   ========================================================= */

const env = (name) => process.env[name] || "";


function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}


function safeText(value, max = 120) {
  return String(value || "")
    .trim()
    .slice(0, max);
}


function friendlyServerError(message) {
  const text = String(message || "");

  if (/Firebase Admin environment variables/i.test(text)) {
    return "Account services are temporarily unavailable. Please try again shortly.";
  }

  if (/Paystack environment variables/i.test(text)) {
    return "Secure payment is temporarily unavailable. Please try again shortly.";
  }

  if (/Admin authentication required/i.test(text)) {
    return "Please sign in to continue.";
  }

  if (/not approved for admin/i.test(text)) {
    return "This account does not have permission to open the dashboard.";
  }

  if (/auth\/id-token-expired/i.test(text)) {
    return "Your session has expired. Please sign in again.";
  }

  if (/auth\/argument-error/i.test(text)) {
    return "Please sign in again and try once more.";
  }

  return text || "We could not complete that request. Please try again.";
}


async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}


function getPath(request) {
  const url = new URL(request.url);
  let path = url.pathname || "/";

  if (path === "/api") {
    return "/";
  }

  if (path.startsWith("/api/")) {
    path = path.slice(4);
  }

  const functionPrefix = "/.netlify/functions/wgh";

  if (path.startsWith(functionPrefix)) {
    path = path.slice(functionPrefix.length);
  }

  if (!path.startsWith("/")) {
    path = `/${path}`;
  }

  return path.replace(/\/+$/, "") || "/";
}


function timestampIso(value) {
  if (!value) return "";

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  return String(value);
}


function addDays(date, numberOfDays) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + Number(numberOfDays));
  return result;
}


function formatDeliveryRange(start, end) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}


function processingFee(subtotal) {
  return (
    Math.round(
      Number(subtotal || 0) *
      PROCESSING_RATE *
      100
    ) / 100
  );
}


/* =========================================================
   FIREBASE ADMIN
   ========================================================= */

function getDb() {
  if (!admin.apps.length) {
    // Accept either the three individual Netlify variables or a complete
    // Firebase service-account JSON variable. This avoids deployment breakage
    // when Netlify stores credentials in a different (but common) format.
    const serviceAccountRaw =
      env("FIREBASE_SERVICE_ACCOUNT") ||
      env("FIREBASE_SERVICE_ACCOUNT_JSON") ||
      env("FIREBASE_ADMIN_CREDENTIALS") ||
      env("GOOGLE_SERVICE_ACCOUNT_JSON");

    let serviceAccount = null;
    if (serviceAccountRaw) {
      try {
        serviceAccount = JSON.parse(serviceAccountRaw);
      } catch {
        throw new Error("Firebase Admin service-account JSON is invalid.");
      }
    }

    const projectId =
      serviceAccount?.project_id ||
      serviceAccount?.projectId ||
      env("FIREBASE_PROJECT_ID") ||
      env("FIREBASE_ADMIN_PROJECT_ID") ||
      env("GCLOUD_PROJECT");

    const clientEmail =
      serviceAccount?.client_email ||
      serviceAccount?.clientEmail ||
      env("FIREBASE_CLIENT_EMAIL") ||
      env("FIREBASE_ADMIN_CLIENT_EMAIL");

    let privateKey =
      serviceAccount?.private_key ||
      serviceAccount?.privateKey ||
      env("FIREBASE_PRIVATE_KEY") ||
      env("FIREBASE_ADMIN_PRIVATE_KEY");

    // Netlify values are commonly pasted with literal \n sequences and,
    // occasionally, wrapping quote characters. Normalize both safely.
    privateKey = String(privateKey || "").trim();
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        "Firebase Admin environment variables are not configured. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (or FIREBASE_SERVICE_ACCOUNT_JSON) in Netlify."
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey })
    });
  }

  return admin.firestore();
}


async function requireUser(request) {
  const authHeader =
    request.headers.get("authorization") || "";

  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) {
    throw new Error("Please sign in to continue.");
  }

  getDb();

  return admin.auth().verifyIdToken(token);
}


async function optionalUser(request) {
  try {
    return await requireUser(request);
  } catch {
    return null;
  }
}


async function requireAdmin(request) {
  const decoded = await requireUser(request);
  const db = getDb();

  const email = String(decoded.email || "")
    .trim()
    .toLowerCase();

  const allowedEmails = env("ADMIN_EMAILS")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  /*
    Three supported admin methods:

    1. Firebase custom claim: admin: true
    2. ADMIN_EMAILS Netlify variable
    3. Firestore admins/{uid} document
  */

  if (decoded.admin === true) {
    return decoded;
  }

  if (allowedEmails.includes(email)) {
    return decoded;
  }

  const adminDoc = await db
    .collection("admins")
    .doc(decoded.uid)
    .get();

  if (
    adminDoc.exists &&
    adminDoc.data()?.active === true
  ) {
    return decoded;
  }

  throw new Error(
    "This account is not approved for admin access."
  );
}


/* =========================================================
   EMAIL
   ========================================================= */

async function sendEmail({
  to,
  subject,
  html,
  text = "",
  replyTo = "",
  headers = {}
}) {
  const apiKey = env("RESEND_API_KEY") || env("RESEND_KEY");
  const from =
    env("EMAIL_FROM") ||
    env("RESEND_FROM_EMAIL") ||
    env("RESEND_FROM") ||
    env("EMAIL_SENDER") ||
    env("MAIL_FROM") ||
    "The Wholesale Ghana <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error(
      "Email service is not configured. Add RESEND_API_KEY in Netlify Environment Variables and redeploy the site."
    );
  }

  if (!to) {
    throw new Error(
      "There is no email address to send this message to."
    );
  }

  const recipients = Array.isArray(to)
    ? to
    : [to];

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "WholesaleGhana/1.0"
      },

      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text: text || String(html || "")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&#039;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, " ")
          .trim(),
        ...(replyTo || env("EMAIL_REPLY_TO") || env("ADMIN_EMAIL")
          ? { reply_to: replyTo || env("EMAIL_REPLY_TO") || env("ADMIN_EMAIL") }
          : {}),
        ...(headers && Object.keys(headers).length ? { headers } : {})
      })
    }
  );

  const result = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    console.error(
      "Resend error:",
      result
    );

    const resendMessage = safeText(result?.message || result?.error || "", 220);
    throw new Error(
      resendMessage
        ? `Resend could not send this email: ${resendMessage}`
        : "We could not send the email right now. Please try again."
    );
  }

  return result;
}


async function sendTemplate(to, template) {
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text || "",
    replyTo: template.replyTo || "",
    headers: template.headers || {}
  });
}


/* =========================================================
   TEMPORARY SERVER CATALOG

   Firestore products take priority.
   These products are only fallbacks while the real
   product database is being populated.
   ========================================================= */

const SERVER_CATALOG = {
  "drapped-halter-mini-dress": {"name":"Drapped Halter Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Dark Brown","Black","Grey","Baby Blue"],"sizes":["XS","S","M","L","XL","2XL"]},
  "ruffle-asymmetric-mini-dress": {"name":"Ruffle Asymmetric Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Pink","White","Black"],"sizes":["XS","S","M","L","XL","2XL"]},
  "ruche-wrap-mini-dress": {"name":"Ruche Wrap Mini Dress","category":"dresses","retailPrice":250,"wholesalePrice":140,"moq":6,"colours":["Black","Curry","White"],"sizes":["XS","S","M","L","XL","2XL"]},
  "nael-mini-dress": {"name":"Naël Mini Dress","category":"dresses","retailPrice":200,"wholesalePrice":130,"moq":6,"colours":["Red","Orange","Black"],"sizes":["XS","S","M","L","XL","2XL"]},
  "dante-capri": {"name":"DANTÉ CAPRI","category":"pants","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Army Green","Grey","Black","Brown"],"sizes":["XS","S","M","L","XL","2XL"]},
  "ruched-waist-pants": {"name":"Ruched Waist Pants","category":"pants","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Black","Red","Brown"],"sizes":["XS","S","M","L","XL","2XL"]},
  "foldover-waist-flare-pants": {"name":"Foldover Waist Flare Pants","category":"pants","retailPrice":250,"wholesalePrice":145,"moq":6,"colours":["Brown","Black","Nude","Pink"],"sizes":["XS","S","M","L","XL","2XL"]},
  "ruffle-button-top": {"name":"Ruffle Button Top","category":"tops","retailPrice":145,"wholesalePrice":80,"moq":6,"colours":["Black","Pink","Brown","Cream"],"sizes":["XS","S","M","L","XL","2XL"]},
  "ribbed-contrast-top": {"name":"Ribbed Contrast Top","category":"tops","retailPrice":90,"wholesalePrice":55,"moq":6,"colours":["Black","White","Flamingo","Chartreuse"],"sizes":["XS","S","M","L","XL","2XL"]},
  "nunu-tie-waist-skirt-set": {"name":"Nunu Tie-waist Skirt Set","category":"two-pieces","retailPrice":300,"wholesalePrice":160,"moq":6,"colours":["Black","Olive"],"sizes":["XS","S","M","L","XL","2XL"]},
  "tube-top-set": {"name":"Tube Top Set","category":"two-pieces","retailPrice":200,"wholesalePrice":140,"moq":6,"colours":["Yellow","Black","Grey"],"sizes":["XS","S","M","L","XL","2XL"]},
  "halter-neck-top": {"name":"Halter Neck Top","category":"tops","retailPrice":100,"wholesalePrice":70,"moq":6,"colours":["White","Blue Black","Nude"],"sizes":["XS","S","M","L","XL","2XL"]}
};
// Keep the default server catalogue in sync with the one image registry.
for (const [productId, product] of Object.entries(SERVER_CATALOG)) {
  const media = globalThis.WGH_IMAGES?.products?.[productId];
  product.images = [...(media?.all || [])];
  product.colourImages = Object.fromEntries(
    Object.entries(media?.colours || {}).map(([colour, urls]) => [colour, [...urls]])
  );
}

const LEGACY_PRODUCT_IDS = new Set(['sculpt-column-dress','contour-button-top','signature-two-piece','second-skin-tee','tailored-flow-pants','soft-drape-mini','clean-line-vest','soft-knit-set']);


/* =========================================================
   PRODUCTION WEEK CALCULATION
   Monday to Sunday
   Ghana uses UTC
   ========================================================= */

function mondaySundayFor(date) {
  const current = new Date(date);

  const day = current.getUTCDay();

  const differenceToMonday =
    (day + 6) % 7;

  const start = new Date(
    Date.UTC(
      current.getUTCFullYear(),
      current.getUTCMonth(),
      current.getUTCDate() -
        differenceToMonday
    )
  );

  const close = new Date(start);

  close.setUTCDate(
    start.getUTCDate() + 6
  );

  close.setUTCHours(
    23,
    59,
    59,
    999
  );

  return {
    start,
    close
  };
}


/* =========================================================
   SERIALIZERS
   ========================================================= */

function serializeBatch(doc) {
  const batch = doc.data();

  return {
    id: doc.id,

    batchName:
      batch.batchName ||
      doc.id,

    batchNumber:
      Number(batch.batchNumber || 0),

    capacity:
      Number(batch.capacity || 0),

    usedCapacity:
      Number(batch.usedCapacity || 0),

    status:
      batch.status || "OPEN",

    startDate:
      timestampIso(batch.startDate),

    closeDate:
      timestampIso(batch.closeDate),

    locked: Boolean(batch.locked),
    lockedBy: batch.lockedBy || "",
    lockedAt: timestampIso(batch.lockedAt)
  };
}


function serializeOrder(doc) {
  const order = doc.data();

  return {
    orderNumber:
      order.orderNumber ||
      doc.id,

    batchId:
      order.batchId || "",

    batchName:
      order.batchName || "",

    status:
      order.status ||
      "order_confirmed",

    pieces:
      Number(order.pieces || 0),

    estimatedDelivery:
      order.estimatedDelivery || "",

    customerName:
      `${order.customer?.firstName || ""} ${order.customer?.lastName || ""}`.trim(),

    customerEmail:
      order.customer?.email || "",

    customerPhone:
      order.customer?.phone || "",

    items:
      order.items || [],

    subtotal:
      Number(order.subtotal || 0),

    processingFee:
      Number(
        order.processingFee || 0
      ),

    deliveryFee:
      Number(
        order.deliveryFee || 0
      ),

    total:
      Number(order.total || 0),

    createdAt:
      timestampIso(order.createdAt),

    statusHistory: Array.isArray(order.statusHistory) ? order.statusHistory : [],
    adminNotes: Array.isArray(order.adminNotes) ? order.adminNotes : [],
    delivery: order.delivery || order.customer || {},
    paymentReference: order.paymentReference || "",
    paymentStatus: order.paymentStatus || "",
    userId: order.userId || null
  };
}


/*
  Converts our Firestore order into the field names
  expected by email-templates.mjs.
*/
function emailReadyOrder(order) {
  return {
    ...order,

    pieceCount:
      Number(
        order.pieceCount ||
        order.pieces ||
        0
      ),

    deliveryFee:
      Number(
        order.deliveryFee || 0
      ),

    items:
      Array.isArray(order.items)
        ? order.items.map((item) => ({
            ...item,

            price:
              Number(
                item.price ||
                item.unitPrice ||
                0
              ),

            totalQuantity:
              Number(
                item.totalQuantity ||
                item.quantity ||
                0
              )
          }))
        : []
  };
}


/* =========================================================
   CART VALIDATION
   ========================================================= */

async function serverCart(
  db,
  clientItems
) {
  if (
    !Array.isArray(clientItems) ||
    !clientItems.length
  ) {
    throw new Error(
      "Your bag is empty."
    );
  }

  const result = [];

  for (const raw of clientItems) {
    const productId = safeText(
      raw.productId,
      80
    );

    const [productSnap, overrideSnap] = await Promise.all([
      db.collection("products").doc(productId).get(),
      db.collection("productOverrides").doc(productId).get()
    ]);

    const product = productSnap.exists
      ? productSnap.data()
      : overrideSnap.exists
        ? { ...(SERVER_CATALOG[productId] || {}), ...overrideSnap.data() }
        : SERVER_CATALOG[productId];

    if (!product) {
      throw new Error(
        "One of the items in your bag is no longer available."
      );
    }

    const mode =
      raw.orderType === "wholesale"
        ? "wholesale"
        : "retail";

    const variants =
      Array.isArray(raw.variants)
        ? raw.variants
        : [];

    const totalQuantity =
      variants.reduce(
        (sum, variant) =>
          sum +
          Math.max(
            0,
            Number(
              variant.quantity
            ) || 0
          ),
        0
      );

    if (!totalQuantity) {
      throw new Error(
        "Choose a quantity before checkout."
      );
    }

    const moq =
      Number(product.moq || 6);

    if (
      mode === "wholesale" &&
      totalQuantity < moq
    ) {
      throw new Error(
        `${product.name} requires at least ${moq} wholesale pieces.`
      );
    }

    const allowedColours =
      new Set(
        product.colours || []
      );

    const allowedSizes =
      new Set(
        product.sizes || []
      );

    for (const variant of variants) {
      if (
        !allowedColours.has(
          variant.colour
        ) ||
        !allowedSizes.has(
          variant.size
        )
      ) {
        throw new Error(
          `A selected ${product.name} option is no longer available.`
        );
      }

      if (
        !Number.isInteger(
          Number(variant.quantity)
        ) ||
        Number(variant.quantity) < 1
      ) {
        throw new Error(
          `Choose a valid quantity for ${product.name}.`
        );
      }
    }

    const unitPrice = Number(
      mode === "wholesale"
        ? product.wholesalePrice
        : product.retailPrice
    );

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      throw new Error(
        "One of the product prices needs to be updated."
      );
    }

    result.push({
      productId,

      name:
        product.name,

      orderType:
        mode,

      unitPrice,

      /*
        Kept as price too because the email template
        uses item.price.
      */
      price:
        unitPrice,

      totalQuantity,

      variants:
        variants.map(
          (variant) => ({
            colour:
              safeText(
                variant.colour,
                40
              ),

            size:
              safeText(
                variant.size,
                20
              ),

            quantity:
              Number(
                variant.quantity
              )
          })
        ),

      image: (() => { const src=product.images?.[0]||""; if(!src||/^https?:\/\//i.test(src))return src; const base=(env("SITE_URL")||"https://wholesalegh.netlify.app").replace(/\/$/,""); return `${base}/${String(src).replace(/^\//,"")}`; })()
    });
  }

  return result;
}


/* =========================================================
   PRODUCTION CAPACITY
   ========================================================= */

async function defaultCapacity(db) {
  const snapshot = await db
    .collection("settings")
    .doc("store")
    .get();

  if (snapshot.exists) {
    const value = Number(
      snapshot.data()
        .batchCapacity
    );

    if (
      Number.isFinite(value) &&
      value > 0
    ) {
      return value;
    }
  }

  return (
    Number(
      env(
        "DEFAULT_BATCH_CAPACITY"
      )
    ) || 150
  );
}


async function findAvailableBatch(
  db,
  pieces
) {
  const capacityDefault =
    await defaultCapacity(db);

  const currentCycle =
    mondaySundayFor(
      new Date()
    );

  for (
    let offset = 0;
    offset < 54;
    offset++
  ) {
    const start =
      new Date(
        currentCycle.start
      );

    start.setUTCDate(
      start.getUTCDate() +
        offset * 7
    );

    const close =
      new Date(
        currentCycle.close
      );

    close.setUTCDate(
      close.getUTCDate() +
        offset * 7
    );

    const id =
      start
        .toISOString()
        .slice(0, 10);

    const ref = db
      .collection(
        "productionBatches"
      )
      .doc(id);

    const snapshot =
      await ref.get();

    const data =
      snapshot.exists
        ? snapshot.data()
        : {};

    const capacity =
      Number(
        data.capacity ||
        capacityDefault
      );

    const usedCapacity =
      Number(
        data.usedCapacity ||
        0
      );

    if (data.locked === true) {
      continue;
    }

    if (
      usedCapacity +
        pieces <=
      capacity
    ) {
      return {
        ref,
        id,
        start,
        close,
        capacity,
        usedCapacity,
        batchNumber:
          Number(
            data.batchNumber ||
            0
          )
      };
    }
  }

  throw new Error(
    "Our upcoming production cycles are currently full. Please contact us for help with your order."
  );
}


/* =========================================================
   PAYSTACK
   ========================================================= */

async function verifyPaystackTransaction(
  reference
) {
  const secret =
    env(
      "PAYSTACK_SECRET_KEY"
    );

  if (!secret) {
    throw new Error(
      "Paystack environment variables are not configured."
    );
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization:
          `Bearer ${secret}`
      }
    }
  );

  const result =
    await response.json();

  if (
    !response.ok ||
    !result.status ||
    result.data?.status !==
      "success"
  ) {
    throw new Error(
      "Payment has not been confirmed yet."
    );
  }

  return result.data;
}


/* =========================================================
   COMPLETE PAID ORDER
   ========================================================= */

async function completePaidOrder(
  reference
) {
  const db = getDb();

  const pendingRef = db
    .collection(
      "pendingPayments"
    )
    .doc(reference);

  const pendingSnap =
    await pendingRef.get();

  if (!pendingSnap.exists) {
    throw new Error(
      "We could not find this checkout session. Please return to your bag."
    );
  }

  const initialPending =
    pendingSnap.data();

  /*
    If already processed, return existing order.
    This makes browser verification and Paystack
    webhook safe to run together.
  */
  if (
    initialPending.status ===
      "completed" &&
    initialPending.completedOrder
  ) {
    return {
      order:
        initialPending.completedOrder,

      newlyCreated:
        false
    };
  }

  const payment =
    await verifyPaystackTransaction(
      reference
    );

  const expectedAmount =
    Math.round(
      Number(
        initialPending.total
      ) * 100
    );

  if (
    Number(payment.amount) !==
    expectedAmount
  ) {
    throw new Error(
      "The payment total does not match this order. Please contact us."
    );
  }

  if (
    payment.currency &&
    payment.currency !== "GHS"
  ) {
    throw new Error(
      "The payment currency does not match this order."
    );
  }

  let completedOrder = null;
  let fullOrderForEmail = null;
  let newlyCreated = false;

  /*
    We may need to try a later production batch if
    another customer fills the first batch while
    this transaction is being processed.
  */

  for (
    let attempt = 0;
    attempt < 12;
    attempt++
  ) {
    const latestPendingSnap =
      await pendingRef.get();

    const latestPending =
      latestPendingSnap.data();

    if (
      latestPending.status ===
        "completed" &&
      latestPending.completedOrder
    ) {
      return {
        order:
          latestPending.completedOrder,

        newlyCreated:
          false
      };
    }

    const batch =
      await findAvailableBatch(
        db,
        latestPending.pieces
      );

    try {
      await db.runTransaction(
        async (transaction) => {
          const currentPendingSnap =
            await transaction.get(
              pendingRef
            );

          const pending =
            currentPendingSnap.data();

          if (
            pending.status ===
              "completed"
          ) {
            completedOrder =
              pending.completedOrder;

            return;
          }

          const batchSnap =
            await transaction.get(
              batch.ref
            );

          const batchData =
            batchSnap.exists
              ? batchSnap.data()
              : {};

          const capacity =
            Number(
              batchData.capacity ||
              batch.capacity
            );

          const usedCapacity =
            Number(
              batchData.usedCapacity ||
              0
            );

          if (
            usedCapacity +
              pending.pieces >
            capacity
          ) {
            throw new Error(
              "BATCH_FULL_RETRY"
            );
          }

          const counterRef =
            db
              .collection(
                "counters"
              )
              .doc("orders");

          const counterSnap =
            await transaction.get(
              counterRef
            );

          const counter =
            counterSnap.exists
              ? counterSnap.data()
              : {};

          const orderSequence =
            Number(
              counter.orderSeq ||
              0
            ) + 1;

          let batchSequence =
            Number(
              batchData.batchNumber ||
              0
            );

          if (!batchSequence) {
            batchSequence =
              Number(
                counter.batchCounter ||
                0
              ) + 1;
          }

          const orderNumber =
            `WGH-${String(
              orderSequence
            ).padStart(
              3,
              "0"
            )}`;

          const batchName =
            `Batch ${String(
              batchSequence
            ).padStart(
              2,
              "0"
            )}`;

          const minDays =
            Number(
              env(
                "DELIVERY_MIN_DAYS"
              ) || 14
            );

          const maxDays =
            Number(
              env(
                "DELIVERY_MAX_DAYS"
              ) || 21
            );

          const earliest =
            addDays(
              batch.close,
              minDays
            );

          const latest =
            addDays(
              batch.close,
              maxDays
            );

          const estimatedDelivery =
            formatDeliveryRange(
              earliest,
              latest
            );

          const orderRef =
            db
              .collection(
                "orders"
              )
              .doc(
                orderNumber
              );

          const nowIso =
            new Date()
              .toISOString();

          const order = {
            orderNumber,

            userId:
              pending.userId ||
              null,

            batchId:
              batch.id,

            batchName,

            batchCloseDate:
              admin.firestore.Timestamp
                .fromDate(
                  batch.close
                ),

            estimatedDelivery,

            estimatedDeliveryStart:
              admin.firestore.Timestamp
                .fromDate(
                  earliest
                ),

            estimatedDeliveryEnd:
              admin.firestore.Timestamp
                .fromDate(
                  latest
                ),

            customer:
              pending.customer,

            delivery: pending.customer,

            items:
              pending.items,

            pieces:
              pending.pieces,

            pieceCount:
              pending.pieces,

            subtotal:
              pending.subtotal,

            processingFee:
              pending.processingFee,

            deliveryFee:
              pending.deliveryFee ||
              0,

            total:
              pending.total,

            paymentReference:
              reference,

            paymentStatus:
              "paid",

            status:
              "cycle_assigned",

            createdAt:
              admin.firestore.FieldValue
                .serverTimestamp(),

            statusHistory: [
              {
                status:
                  "order_confirmed",
                at:
                  nowIso
              },

              {
                status:
                  "payment_received",
                at:
                  nowIso
              },

              {
                status:
                  "cycle_assigned",
                at:
                  nowIso
              }
            ]
          };

          transaction.set(
            orderRef,
            order
          );

          transaction.set(
            batch.ref,
            {
              batchNumber:
                batchSequence,

              batchName,

              startDate:
                admin.firestore.Timestamp
                  .fromDate(
                    batch.start
                  ),

              closeDate:
                admin.firestore.Timestamp
                  .fromDate(
                    batch.close
                  ),

              capacity,

              usedCapacity:
                usedCapacity +
                pending.pieces,

              status:
                "OPEN",

              updatedAt:
                admin.firestore.FieldValue
                  .serverTimestamp()
            },
            {
              merge: true
            }
          );

          transaction.set(
            counterRef,
            {
              orderSeq:
                orderSequence,

              batchCounter:
                Math.max(
                  Number(
                    counter.batchCounter ||
                    0
                  ),
                  batchSequence
                )
            },
            {
              merge: true
            }
          );

          completedOrder = {
            orderNumber,
            batchName,
            estimatedDelivery,
            status:
              "cycle_assigned",
            total:
              pending.total
          };

          fullOrderForEmail = {
            ...order,
            createdAt:
              new Date()
                .toISOString()
          };

          newlyCreated = true;

          transaction.update(
            pendingRef,
            {
              status:
                "completed",

              orderNumber,

              completedOrder,

              completedAt:
                admin.firestore.FieldValue
                  .serverTimestamp()
            }
          );
        }
      );

      break;

    } catch (error) {
      if (
        error.message ===
        "BATCH_FULL_RETRY"
      ) {
        continue;
      }

      throw error;
    }
  }

  if (!completedOrder) {
    throw new Error(
      "We could not assign this order to a production cycle. Please contact us so we can assist you."
    );
  }


  /*
    SEND CUSTOMER + ADMIN EMAILS
    only when a new order was created.
  */

  if (
    newlyCreated &&
    fullOrderForEmail
  ) {
    const formattedOrder =
      emailReadyOrder(
        fullOrderForEmail
      );

    const customerEmail =
      customerOrderConfirmationEmail(
        formattedOrder
      );

    sendTemplate(
      fullOrderForEmail
        .customer
        ?.email,
      customerEmail
    ).catch((error) => {
      console.error(
        "Customer order email failed:",
        error
      );
    });


    const notificationEmail =
      env(
        "ORDER_NOTIFICATION_EMAIL"
      );

    if (notificationEmail) {
      const adminEmail =
        adminNewOrderEmail(
          formattedOrder
        );

      sendTemplate(
        notificationEmail,
        adminEmail
      ).catch((error) => {
        console.error(
          "Admin order email failed:",
          error
        );
      });
    }
  }

  return {
    order:
      completedOrder,

    newlyCreated
  };
}


/* =========================================================
   PAYSTACK WEBHOOK
   ========================================================= */

async function handlePaystackWebhook(
  request
) {
  const secret =
    env(
      "PAYSTACK_SECRET_KEY"
    );

  if (!secret) {
    return json(
      500,
      {
        error:
          "Secure payment is temporarily unavailable."
      }
    );
  }

  /*
    IMPORTANT:
    Use raw request text for signature verification.
  */

  const rawBody =
    await request.text();

  const signature =
    request.headers.get(
      "x-paystack-signature"
    ) || "";

  const expectedSignature =
    crypto
      .createHmac(
        "sha512",
        secret
      )
      .update(rawBody)
      .digest("hex");

  const valid =
    signature.length ===
      expectedSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(
        expectedSignature
      )
    );

  if (!valid) {
    return json(
      401,
      {
        error:
          "Invalid payment notification."
      }
    );
  }

  let event;

  try {
    event =
      JSON.parse(rawBody);
  } catch {
    return json(
      400,
      {
        error:
          "Invalid payment notification."
      }
    );
  }

  /*
    Only process successful payments.
  */

  if (
    event.event ===
    "charge.success"
  ) {
    const reference =
      event.data?.reference;

    if (reference) {
      try {
        await completePaidOrder(
          reference
        );
      } catch (error) {
        console.error(
          "Webhook order processing failed:",
          error
        );

        /*
          Return 500 so Paystack can retry delivery.
        */
        return json(
          500,
          {
            error:
              "Order processing is still in progress."
          }
        );
      }
    }
  }

  return json(
    200,
    {
      received: true
    }
  );
}


/* =========================================================
   STATUS EMAILS
   ========================================================= */

function emailForStatus(
  status,
  order
) {
  const formatted =
    emailReadyOrder(order);

  switch (status) {
    case "production":
      return productionStartedEmail(
        formatted
      );

    case "quality_control":
      return qualityControlEmail(
        formatted
      );

    case "packaging":
      return packagedEmail(
        formatted
      );

    case "dispatched":
      return dispatchedEmail(
        formatted
      );

    case "delivered":
      return deliveredEmail(
        formatted
      );

    default:
      return null;
  }
}


/* =========================================================
   MAIN HANDLER
   ========================================================= */

export default async function handler(
  request,
  context
) {
  const method =
    request.method
      .toUpperCase();

  const path =
    getPath(request);

  try {

    /* ===============================================
       OPTIONS
       =============================================== */

    if (method === "OPTIONS") {
      return json(
        204,
        {}
      );
    }


    /* ===============================================
       PUBLIC FIREBASE CONFIG
       =============================================== */

    if (
      path === "/config" &&
      method === "GET"
    ) {
      return json(
        200,
        {
          firebase: {
            apiKey:
              env(
                "FIREBASE_API_KEY"
              ),

            authDomain:
              env(
                "FIREBASE_AUTH_DOMAIN"
              ),

            projectId:
              env(
                "FIREBASE_PROJECT_ID"
              ),

            storageBucket:
              env(
                "FIREBASE_STORAGE_BUCKET"
              ),

            messagingSenderId:
              env(
                "FIREBASE_MESSAGING_SENDER_ID"
              ),

            appId:
              env(
                "FIREBASE_APP_ID"
              )
          }
        }
      );
    }


    if (path === "/service-status" && method === "GET") {
      const firebaseAdminConfigured = Boolean(
        (env("FIREBASE_SERVICE_ACCOUNT") || env("FIREBASE_SERVICE_ACCOUNT_JSON") || env("FIREBASE_ADMIN_CREDENTIALS") || env("GOOGLE_SERVICE_ACCOUNT_JSON")) ||
        ((env("FIREBASE_PROJECT_ID") || env("FIREBASE_ADMIN_PROJECT_ID")) &&
         (env("FIREBASE_CLIENT_EMAIL") || env("FIREBASE_ADMIN_CLIENT_EMAIL")) &&
         (env("FIREBASE_PRIVATE_KEY") || env("FIREBASE_ADMIN_PRIVATE_KEY")))
      );
      const emailConfigured = Boolean(env("RESEND_API_KEY") || env("RESEND_KEY"));
      const configuredSender =
        env("EMAIL_FROM") ||
        env("RESEND_FROM_EMAIL") ||
        env("RESEND_FROM") ||
        env("EMAIL_SENDER") ||
        env("MAIL_FROM") ||
        "The Wholesale Ghana <onboarding@resend.dev>";
      const emailMode = /@resend\.dev[>\s]*$/i.test(configuredSender) ? "development" : "custom-domain";
      return json(200, { ok: true, firebaseAdminConfigured, emailConfigured, emailMode, sender: configuredSender });
    }


    /* ===============================================
       PENDING SIGNUP
       A Firebase account is not created until the
       six-digit code has been verified successfully.
       =============================================== */

    if (path === "/capacity-preview" && method === "POST") {
      const input=await readBody(request);const pieces=Math.max(1,Number(input.pieces||1));const db=getDb();const batch=await findAvailableBatch(db,pieces);const remaining=Math.max(0,Number(batch.capacity||0)-Number(batch.usedCapacity||0)-pieces);const ratio=(Number(batch.usedCapacity||0)+pieces)/Math.max(1,Number(batch.capacity||1));return json(200,{ok:true,remaining,capacity:batch.capacity,usedCapacity:batch.usedCapacity,limited:ratio>=.75,veryLimited:ratio>=.9});
    }

    if (path === "/account/begin-signup" && method === "POST") {
      const input = await readBody(request);
      const email = safeText(input.email, 160).toLowerCase();
      const firstName = safeText(input.firstName, 80);
      const lastName = safeText(input.lastName, 80);
      const phone = safeText(input.phone, 40);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Enter a valid email address.");
      }

      const db = getDb();

      // Clean up accounts created by the old pre-verification flow.
      try {
        const existing = await admin.auth().getUserByEmail(email);
        if (existing.emailVerified) {
          throw new Error("An account already exists with this email. Please sign in instead.");
        }
        await admin.auth().deleteUser(existing.uid);
        await db.collection("users").doc(existing.uid).delete().catch(() => {});
        await db.collection("verificationCodes").doc(existing.uid).delete().catch(() => {});
      } catch (error) {
        if (error?.code !== "auth/user-not-found") throw error;
      }

      const signupId = crypto.createHash("sha256").update(email).digest("hex");
      const ref = db.collection("pendingSignups").doc(signupId);
      const previous = await ref.get();

      if (previous.exists && previous.data()?.createdAt?.toMillis?.() > Date.now() - 60000) {
        throw new Error("A code was sent recently. Please wait a moment before requesting another one.");
      }

      const code = String(crypto.randomInt(100000, 1000000));
      const salt = crypto.randomBytes(16).toString("hex");
      const hash = crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await ref.set({
        email, firstName, lastName, phone, hash, salt, attempts: 0,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      try {
        await sendTemplate(email, verificationEmail({ firstName, code }));
      } catch (error) {
        await ref.delete().catch(() => {});
        throw error;
      }

      return json(200, { ok: true, email, expiresInSeconds: 600 });
    }

    if (path === "/account/complete-signup" && method === "POST") {
      const input = await readBody(request);
      const email = safeText(input.email, 160).toLowerCase();
      const code = safeText(input.code, 6);
      const password = String(input.password || "");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (!/^\d{6}$/.test(code)) throw new Error("Enter the six-digit code from your email.");
      if (password.length < 6) throw new Error("Please choose a stronger password with at least 6 characters.");

      const db = getDb();
      const signupId = crypto.createHash("sha256").update(email).digest("hex");
      const ref = db.collection("pendingSignups").doc(signupId);
      const snapshot = await ref.get();
      if (!snapshot.exists) throw new Error("That code has expired. Please start signup again.");
      const data = snapshot.data();

      if (data.expiresAt?.toMillis?.() < Date.now()) {
        await ref.delete().catch(() => {});
        throw new Error("That code has expired. Please request a new one.");
      }
      if (Number(data.attempts || 0) >= 5) {
        await ref.delete().catch(() => {});
        throw new Error("Too many attempts. Please request a new code.");
      }

      const submittedHash = crypto.createHash("sha256").update(`${data.salt}:${code}`).digest("hex");
      const saved = Buffer.from(data.hash, "hex");
      const submitted = Buffer.from(submittedHash, "hex");
      const matches = saved.length === submitted.length && crypto.timingSafeEqual(saved, submitted);
      if (!matches) {
        await ref.update({ attempts: admin.firestore.FieldValue.increment(1) });
        throw new Error("That code is not correct. Please check it and try again.");
      }

      let created;
      try {
        created = await admin.auth().createUser({
          email,
          password,
          emailVerified: true,
          displayName: `${safeText(data.firstName,80)} ${safeText(data.lastName,80)}`.trim()
        });
      } catch (error) {
        if (error?.code === "auth/email-already-exists") {
          const existing = await admin.auth().getUserByEmail(email);
          if (!existing.emailVerified) {
            await admin.auth().deleteUser(existing.uid);
            created = await admin.auth().createUser({
              email, password, emailVerified: true,
              displayName: `${safeText(data.firstName,80)} ${safeText(data.lastName,80)}`.trim()
            });
          } else {
            throw new Error("An account already exists with this email. Please sign in instead.");
          }
        } else throw error;
      }

      await db.collection("users").doc(created.uid).set({
        firstName: safeText(data.firstName, 80),
        lastName: safeText(data.lastName, 80),
        phone: safeText(data.phone, 40),
        email,
        emailVerified: true,
        emailVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      await db.collection("mailingList").doc(crypto.createHash("sha256").update(email).digest("hex")).set({email,firstName:safeText(data.firstName,80),lastName:safeText(data.lastName,80),name:`${safeText(data.firstName,80)} ${safeText(data.lastName,80)}`.trim(),source:"account-signup", subscribed:true, createdAt:admin.firestore.FieldValue.serverTimestamp(), updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      await ref.delete();
      const customToken = await admin.auth().createCustomToken(created.uid);
      return json(200, { ok: true, customToken });
    }

    /* ===============================================
       ACCOUNT PROFILE
       =============================================== */

    if (
      path ===
        "/account/profile" &&
      method === "GET"
    ) {
      const user =
        await requireUser(
          request
        );

      const db =
        getDb();

      const snapshot =
        await db
          .collection(
            "users"
          )
          .doc(
            user.uid
          )
          .get();

      return json(
        200,
        snapshot.exists
          ? snapshot.data()
          : {
              email:
                user.email ||
                ""
            }
      );
    }


    if (
      path ===
        "/account/profile" &&
      method === "POST"
    ) {
      const user =
        await requireUser(
          request
        );

      const input =
        await readBody(
          request
        );

      const db =
        getDb();

      const existingSnap = await db.collection("users").doc(user.uid).get();
      const existing = existingSnap.exists ? existingSnap.data() : {};
      const profile = {
        firstName: input.firstName !== undefined ? safeText(input.firstName, 80) : (existing.firstName || ""),
        lastName: input.lastName !== undefined ? safeText(input.lastName, 80) : (existing.lastName || ""),
        phone: input.phone !== undefined ? safeText(input.phone, 40) : (existing.phone || ""),
        email: String(user.email || "").toLowerCase(),
        address: input.address !== undefined ? safeText(input.address, 220) : (existing.address || ""),
        address2: input.address2 !== undefined ? safeText(input.address2, 220) : (existing.address2 || ""),
        city: input.city !== undefined ? safeText(input.city, 100) : (existing.city || ""),
        region: input.region !== undefined ? safeText(input.region, 100) : (existing.region || ""),
        country: input.country !== undefined ? safeText(input.country, 100) : (existing.country || "Ghana"),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await db
        .collection(
          "users"
        )
        .doc(
          user.uid
        )
        .set(
          profile,
          {
            merge: true
          }
        );

      return json(
        200,
        {
          ok: true,

          firstName:
            profile.firstName,

          lastName:
            profile.lastName,

          phone:
            profile.phone,

          email:
            profile.email
        }
      );
    }


    /* ===============================================
       SEND VERIFICATION CODE
       =============================================== */

    if (
      path ===
        "/account/send-code" &&
      method === "POST"
    ) {
      const user =
        await requireUser(
          request
        );

      if (!user.email) {
        throw new Error(
          "Please add an email address to your account."
        );
      }

      if (
        user.email_verified
      ) {
        return json(
          200,
          {
            ok: true,
            verified: true
          }
        );
      }

      const db =
        getDb();

      const verificationRef =
        db
          .collection(
            "verificationCodes"
          )
          .doc(
            user.uid
          );

      const previous =
        await verificationRef.get();

      /*
        60-second resend cooldown.
      */

      if (
        previous.exists &&
        previous.data()
          .createdAt
          ?.toMillis?.() >
          Date.now() -
            60000
      ) {
        throw new Error(
          "A code was sent recently. Please wait a moment before requesting another one."
        );
      }

      const code =
        String(
          crypto.randomInt(
            100000,
            1000000
          )
        );

      const salt =
        crypto
          .randomBytes(16)
          .toString("hex");

      const hash =
        crypto
          .createHash(
            "sha256"
          )
          .update(
            `${salt}:${code}`
          )
          .digest("hex");

      const expiresAt =
        new Date(
          Date.now() +
            10 *
              60 *
              1000
        );

      await verificationRef.set({
        hash,

        salt,

        email:
          String(
            user.email
          ).toLowerCase(),

        expiresAt:
          admin.firestore.Timestamp
            .fromDate(
              expiresAt
            ),

        attempts: 0,

        createdAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      });


      /*
        Get customer's first name for branded email.
      */

      let firstName = "";

      try {
        const profile =
          await db
            .collection(
              "users"
            )
            .doc(
              user.uid
            )
            .get();

        if (profile.exists) {
          firstName =
            safeText(
              profile.data()
                .firstName,
              80
            );
        }
      } catch {
        // Email can still be sent without first name.
      }


      const email =
        verificationEmail({
          firstName,
          code
        });


      try {
        await sendTemplate(
          user.email,
          email
        );
      } catch (error) {
        /*
          Delete code if email sending fails so
          user can immediately try again.
        */

        await verificationRef
          .delete()
          .catch(
            () => {}
          );

        throw error;
      }


      return json(
        200,
        {
          ok: true
        }
      );
    }


    /* ===============================================
       VERIFY CODE
       =============================================== */

    if (
      path ===
        "/account/verify-code" &&
      method === "POST"
    ) {
      const user =
        await requireUser(
          request
        );

      const input =
        await readBody(
          request
        );

      const code =
        safeText(
          input.code,
          6
        );

      if (
        !/^\d{6}$/.test(
          code
        )
      ) {
        throw new Error(
          "Enter the six-digit code from your email."
        );
      }

      const db =
        getDb();

      const verificationRef =
        db
          .collection(
            "verificationCodes"
          )
          .doc(
            user.uid
          );

      const snapshot =
        await verificationRef.get();

      if (!snapshot.exists) {
        throw new Error(
          "That code has expired. Please request a new one."
        );
      }

      const data =
        snapshot.data();


      if (
        data.email &&
        String(
          data.email
        ).toLowerCase() !==
          String(
            user.email ||
            ""
          ).toLowerCase()
      ) {
        await verificationRef
          .delete()
          .catch(
            () => {}
          );

        throw new Error(
          "Please request a new verification code."
        );
      }


      if (
        data.expiresAt
          ?.toMillis?.() <
        Date.now()
      ) {
        await verificationRef
          .delete()
          .catch(
            () => {}
          );

        throw new Error(
          "That code has expired. Please request a new one."
        );
      }


      if (
        Number(
          data.attempts ||
          0
        ) >= 5
      ) {
        await verificationRef
          .delete()
          .catch(
            () => {}
          );

        throw new Error(
          "Too many attempts. Please request a new code."
        );
      }


      const submittedHash =
        crypto
          .createHash(
            "sha256"
          )
          .update(
            `${data.salt}:${code}`
          )
          .digest("hex");


      const savedBuffer =
        Buffer.from(
          data.hash,
          "hex"
        );

      const submittedBuffer =
        Buffer.from(
          submittedHash,
          "hex"
        );

      const matches =
        savedBuffer.length ===
          submittedBuffer.length &&
        crypto.timingSafeEqual(
          savedBuffer,
          submittedBuffer
        );


      if (!matches) {
        await verificationRef
          .update({
            attempts:
              admin.firestore.FieldValue
                .increment(1)
          });

        throw new Error(
          "That code is not correct. Please check it and try again."
        );
      }


      /*
        Mark Firebase Auth email as verified.
      */

      await admin.auth()
        .updateUser(
          user.uid,
          {
            emailVerified: true
          }
        );


      /*
        Also keep verification state in profile
        for easy dashboard display.
      */

      await db
        .collection(
          "users"
        )
        .doc(
          user.uid
        )
        .set(
          {
            emailVerified:
              true,

            emailVerifiedAt:
              admin.firestore.FieldValue
                .serverTimestamp()
          },
          {
            merge: true
          }
        );


      await verificationRef
        .delete();


      return json(
        200,
        {
          ok: true,
          verified: true
        }
      );
    }



    /* ===============================================
       VERIFIED EMAIL CHANGE
       =============================================== */
    if (path === "/account/begin-email-change" && method === "POST") {
      const user = await requireUser(request);
      const input = await readBody(request);
      const email = safeText(input.email,160).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (email === String(user.email||"").toLowerCase()) throw new Error("That is already your account email.");
      try { await admin.auth().getUserByEmail(email); throw new Error("That email is already connected to another account."); } catch (e) { if (e?.code !== "auth/user-not-found") throw e; }
      const code=String(crypto.randomInt(100000,1000000)); const salt=crypto.randomBytes(16).toString("hex");
      const hash=crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
      const expiresAt=new Date(Date.now()+10*60*1000);
      await getDb().collection("emailChangeRequests").doc(user.uid).set({email,salt,hash,attempts:0,expiresAt:admin.firestore.Timestamp.fromDate(expiresAt),createdAt:admin.firestore.FieldValue.serverTimestamp()});
      await sendTemplate(email,verificationEmail({firstName:"there",code}));
      return json(200,{ok:true});
    }
    if (path === "/account/complete-email-change" && method === "POST") {
      const user=await requireUser(request); const input=await readBody(request); const email=safeText(input.email,160).toLowerCase(); const code=safeText(input.code,6);
      const ref=getDb().collection("emailChangeRequests").doc(user.uid); const snap=await ref.get(); if(!snap.exists) throw new Error("Request a new verification code first."); const data=snap.data();
      if(data.expiresAt?.toMillis?.()<Date.now()) {await ref.delete(); throw new Error("That verification code has expired.");}
      if(Number(data.attempts||0)>=5){await ref.delete();throw new Error("Too many attempts. Request a new code.");}
      if(email!==data.email) throw new Error("Use the email address that received the verification code.");
      const submitted=crypto.createHash("sha256").update(`${data.salt}:${code}`).digest("hex");
      const a=Buffer.from(data.hash,"hex"),b=Buffer.from(submitted,"hex"); const ok=a.length===b.length&&crypto.timingSafeEqual(a,b);
      if(!ok){await ref.update({attempts:admin.firestore.FieldValue.increment(1)});throw new Error("That code is not correct.");}
      await admin.auth().updateUser(user.uid,{email,emailVerified:true});
      await getDb().collection("users").doc(user.uid).set({email,emailVerified:true,emailVerifiedAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      await ref.delete(); return json(200,{ok:true,email});
    }

    /* ===============================================
       CUSTOMER ORDERS
       =============================================== */

    if (
      path ===
        "/account/orders" &&
      method === "GET"
    ) {
      const user =
        await requireUser(
          request
        );

      const db =
        getDb();

      const queries = [
        db
          .collection(
            "orders"
          )
          .where(
            "userId",
            "==",
            user.uid
          )
          .get()
      ];

      if (user.email) {
        queries.push(
          db
            .collection(
              "orders"
            )
            .where(
              "customer.email",
              "==",
              String(
                user.email
              ).toLowerCase()
            )
            .get()
        );
      }


      const results =
        await Promise.all(
          queries
        );


      const merged =
        new Map();


      for (
        const snapshot of results
      ) {
        for (
          const doc of snapshot.docs
        ) {
          merged.set(
            doc.id,
            serializeOrder(
              doc
            )
          );
        }
      }


      const orders =
        [...merged.values()]
          .sort(
            (a, b) =>
              String(
                b.createdAt
              ).localeCompare(
                String(
                  a.createdAt
                )
              )
          );


      return json(
        200,
        orders
      );
    }


    /* ===============================================
       INITIALIZE PAYSTACK
       =============================================== */

    if (
      path ===
        "/initialize-payment" &&
      method === "POST"
    ) {
      const input =
        await readBody(
          request
        );


      if (
        !input.madeToOrderAccepted
      ) {
        throw new Error(
          "Please confirm that you understand the made-to-order delivery timeframe."
        );
      }


      const email =
        safeText(
          input.customer
            ?.email,
          180
        ).toLowerCase();


      if (
        !/^\S+@\S+\.\S+$/.test(
          email
        )
      ) {
        throw new Error(
          "Enter a valid email address."
        );
      }


      const db =
        getDb();


      const items =
        await serverCart(
          db,
          input.items
        );


      const subtotal =
        Math.round(
          items.reduce(
            (
              sum,
              item
            ) =>
              sum +
              item.unitPrice *
                item.totalQuantity,
            0
          ) * 100
        ) / 100;


      const fee =
        processingFee(
          subtotal
        );


      /*
        Delivery is quoted after the order. It is intentionally
        excluded from the Paystack charge and customer receipt.
      */
      const deliveryFee = null;

      const total =
        Math.round(
          (
            subtotal +
            fee
          ) * 100
        ) / 100;


      const reference =
        `WGH-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;


      const user =
        await optionalUser(
          request
        );


      const customer = {
        firstName:
          safeText(
            input.customer
              ?.firstName,
            80
          ),

        lastName:
          safeText(
            input.customer
              ?.lastName,
            80
          ),

        email,

        phone:
          safeText(
            input.customer
              ?.phone,
            40
          ),

        address:
          safeText(
            input.customer
              ?.address,
            180
          ),

        city:
          safeText(
            input.customer
              ?.city,
            80
          ),

        region: safeText(input.customer?.region,80),
        country: safeText(input.customer?.country || input.country,80) || "Ghana",
        fulfilment: safeText(input.customer?.fulfilment || input.fulfilment,30) || "delivery",
        address2: safeText(input.customer?.address2,180)
      };


      const pieces =
        items.reduce(
          (
            sum,
            item
          ) =>
            sum +
            item.totalQuantity,
          0
        );


      const pending = {
        reference,

        customer,

        items,

        subtotal,

        processingFee:
          fee,

        deliveryFee,

        total,

        userId:
          user?.uid ||
          null,

        pieces,

        status:
          "pending_payment",

        createdAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      };


      await db
        .collection(
          "pendingPayments"
        )
        .doc(
          reference
        )
        .set(
          pending
        );


      const secret =
        env(
          "PAYSTACK_SECRET_KEY"
        );

      const publicKey =
        env(
          "PAYSTACK_PUBLIC_KEY"
        );


      if (
        !secret ||
        !publicKey
      ) {
        throw new Error(
          "Paystack environment variables are not configured."
        );
      }


      const response =
        await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",

            headers: {
              Authorization:
                `Bearer ${secret}`,

              "Content-Type":
                "application/json"
            },

            body:
              JSON.stringify({
                email,

                amount:
                  Math.round(
                    total * 100
                  ),

                currency:
                  "GHS",

                reference,

                metadata: {
                  brand:
                    "The Wholesale Ghana",

                  pieces,

                  customerName:
                    `${customer.firstName} ${customer.lastName}`.trim()
                }
              })
          }
        );


      const payment =
        await response
          .json();


      if (
        !response.ok ||
        !payment.status
      ) {
        console.error(
          "Paystack initialization error:",
          payment
        );

        throw new Error(
          "We could not start secure payment. Please try again."
        );
      }


      return json(
        200,
        {
          reference,

          publicKey,

          authorizationUrl:
            payment.data
              ?.authorization_url ||
            "",

          accessCode:
            payment.data
              ?.access_code ||
            "",

          amountKobo:
            Math.round(
              total * 100
            ),

          subtotal,

          processingFee:
            fee,

          deliveryFee,

          total
        }
      );
    }


    /* ===============================================
       VERIFY PAYSTACK PAYMENT
       =============================================== */

    if (
      path ===
        "/verify-payment" &&
      method === "POST"
    ) {
      const input =
        await readBody(
          request
        );

      const reference =
        safeText(
          input.reference,
          120
        );


      if (!reference) {
        throw new Error(
          "We could not find this payment. Please return to checkout and try again."
        );
      }


      const result =
        await completePaidOrder(
          reference
        );


      return json(
        200,
        result.order
      );
    }


    /* ===============================================
       PAYSTACK WEBHOOK
       =============================================== */

    if (
      path ===
        "/paystack-webhook" &&
      method === "POST"
    ) {
      return handlePaystackWebhook(
        request
      );
    }


    /* ===============================================
       PUBLIC ORDER TRACKING
       =============================================== */

    if (
      path === "/track" &&
      method === "POST"
    ) {
      const input =
        await readBody(
          request
        );


      const orderNumber =
        safeText(
          input.orderNumber,
          40
        ).toUpperCase();


      const email =
        safeText(
          input.email,
          180
        ).toLowerCase();


      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "orders"
          )
          .doc(
            orderNumber
          )
          .get();


      if (!snapshot.exists) {
        return json(
          404,
          {
            error:
              "We could not find an order with those details."
          }
        );
      }


      const order =
        snapshot.data();


      if (
        String(
          order.customer
            ?.email ||
          ""
        ).toLowerCase() !==
        email
      ) {
        return json(
          404,
          {
            error:
              "We could not find an order with those details."
          }
        );
      }


      return json(
        200,
        {
          orderNumber:
            order.orderNumber,

          batchName:
            order.batchName,

          estimatedDelivery:
            order.estimatedDelivery,

          status:
            order.status,

          statusHistory:
            order.statusHistory ||
            []
        }
      );
    }


    /* ===============================================
       ADMIN OVERVIEW
       =============================================== */

    if (
      path ===
        "/admin/overview" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );

      const db =
        getDb();


      const [
        ordersSnapshot,
        batchesSnapshot
      ] =
        await Promise.all([
          db
            .collection(
              "orders"
            )
            .limit(500)
            .get(),

          db
            .collection(
              "productionBatches"
            )
            .limit(100)
            .get()
        ]);


      const orders =
        ordersSnapshot.docs.map(
          serializeOrder
        );


      const batches =
        batchesSnapshot.docs.map(
          serializeBatch
        );


      const revenue =
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            order.total,
          0
        );


      const pieces =
        orders.reduce(
          (
            sum,
            order
          ) =>
            sum +
            order.pieces,
          0
        );


      const activeOrders =
        orders.filter(
          (order) =>
            order.status !==
            "delivered"
        ).length;


      const customers =
        new Set(
          orders
            .map(
              (order) =>
                order.customerEmail
            )
            .filter(
              Boolean
            )
        ).size;


      return json(
        200,
        {
          orders:
            orders.length,

          activeOrders,

          revenue,

          pieces,

          customers,

          batches:
            batches.length
        }
      );
    }


    /* ===============================================
       ADMIN BATCHES
       =============================================== */

    if (
      path ===
        "/admin/batches" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );

      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "productionBatches"
          )
          .orderBy(
            "startDate",
            "desc"
          )
          .limit(52)
          .get();


      return json(
        200,
        snapshot.docs.map(
          serializeBatch
        )
      );
    }


    /* ===============================================
       ADMIN ORDERS BY BATCH
       =============================================== */

    if (
      path ===
        "/admin/orders" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );


      const url =
        new URL(
          request.url
        );


      const batchId =
        safeText(
          url.searchParams.get(
            "batchId"
          ),
          80
        );


      if (!batchId) {
        throw new Error(
          "Choose a production batch first."
        );
      }


      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "orders"
          )
          .where(
            "batchId",
            "==",
            batchId
          )
          .get();


      return json(
        200,
        snapshot.docs.map(
          serializeOrder
        )
      );
    }


    /* ===============================================
       ADMIN ALL ORDERS
       =============================================== */

    if (
      path ===
        "/admin/orders-all" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );


      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "orders"
          )
          .limit(500)
          .get();


      const orders =
        snapshot.docs
          .map(
            serializeOrder
          )
          .sort(
            (a, b) =>
              String(
                b.createdAt
              ).localeCompare(
                String(
                  a.createdAt
                )
              )
          );


      return json(
        200,
        orders
      );
    }


    /* ===============================================
       ADMIN CUSTOMERS
       =============================================== */

    if (
      path ===
        "/admin/customers" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );


      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "orders"
          )
          .limit(500)
          .get();


      const customers =
        new Map();


      snapshot.docs
        .map(
          serializeOrder
        )
        .forEach(
          (order) => {
            const key =
              order.customerEmail ||
              order.customerPhone ||
              order.customerName;

            if (!key) {
              return;
            }

            const customer =
              customers.get(
                key
              ) || {
                name:
                  order.customerName,

                email:
                  order.customerEmail,

                phone:
                  order.customerPhone,

                orders: 0,

                pieces: 0,

                spent: 0,

                lastOrder: ""
              };


            customer.orders += 1;

            customer.pieces +=
              order.pieces;

            customer.spent +=
              order.total;


            if (
              String(
                order.createdAt
              ) >
              String(
                customer.lastOrder
              )
            ) {
              customer.lastOrder =
                order.createdAt;
            }


            customers.set(
              key,
              customer
            );
          }
        );


      return json(
        200,
        [...customers.values()]
          .sort(
            (a, b) =>
              b.spent -
              a.spent
          )
      );
    }


    /* ===============================================
       ADMIN SETTINGS
       =============================================== */

    if (
      path ===
        "/admin/settings" &&
      method === "GET"
    ) {
      await requireAdmin(
        request
      );


      const db =
        getDb();


      const snapshot =
        await db
          .collection(
            "settings"
          )
          .doc(
            "store"
          )
          .get();


      const stored = snapshot.exists ? snapshot.data() : {};
      const defaults = { businessName:"The Wholesale Ghana", whatsapp:"0533357961", instagram:"the.wholesalegh", pickupAddress:"Joy City & The Clock Bar", defaultMoq:6, batchCapacity:Number(env("DEFAULT_BATCH_CAPACITY")||150) };
      const settings = { ...defaults, ...stored };
      if (!stored.whatsapp || /000000/.test(String(stored.whatsapp))) settings.whatsapp = defaults.whatsapp;
      if (!stored.instagram || String(stored.instagram).trim()==="https://instagram.com/") settings.instagram = defaults.instagram;
      if (!stored.pickupAddress) settings.pickupAddress = defaults.pickupAddress;
      return json(200, settings);
    }


    /* ===============================================
       ADMIN UPDATE CAPACITY
       =============================================== */

    if (
      path ===
        "/admin/capacity" &&
      method === "POST"
    ) {
      await requireAdmin(
        request
      );


      const input =
        await readBody(
          request
        );


      const batchId =
        safeText(
          input.batchId,
          80
        );


      const capacity =
        Number(
          input.capacity
        );


      if (
        !batchId ||
        !Number.isFinite(
          capacity
        ) ||
        capacity < 1
      ) {
        throw new Error(
          "Enter a valid production capacity."
        );
      }


      const db =
        getDb();


      const ref =
        db
          .collection(
            "productionBatches"
          )
          .doc(
            batchId
          );


      const snapshot =
        await ref.get();


      if (!snapshot.exists) {
        throw new Error(
          "We could not find that production batch."
        );
      }


      if (snapshot.data()?.locked === true) {
        throw new Error("This batch is locked. Unlock it before changing production capacity.");
      }

      const usedCapacity =
        Number(
          snapshot.data()
            .usedCapacity ||
          0
        );


      if (
        capacity <
        usedCapacity
      ) {
        throw new Error(
          "Capacity cannot be lower than the pieces already assigned to this batch."
        );
      }


      await ref.update({
        capacity,

        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      });


      return json(
        200,
        {
          ok: true,
          capacity
        }
      );
    }


    /* ===============================================
       ADMIN UPDATE ORDER STATUS
       =============================================== */

    if (
      path ===
        "/admin/status" &&
      method === "POST"
    ) {
      const adminUser = await requireAdmin(
        request
      );


      const input =
        await readBody(
          request
        );


      const orderNumber =
        safeText(
          input.orderNumber,
          40
        ).toUpperCase();


      const status =
        safeText(
          input.status,
          50
        );


      const allowed = [
        "order_confirmed",
        "payment_received",
        "cycle_assigned",
        "cycle_closed",
        "production",
        "quality_control",
        "packaging",
        "ready_dispatch",
        "dispatched",
        "delivered"
      ];


      if (
        !allowed.includes(
          status
        )
      ) {
        throw new Error(
          "Choose a valid order stage."
        );
      }


      const db =
        getDb();


      const ref =
        db
          .collection(
            "orders"
          )
          .doc(
            orderNumber
          );


      const snapshot =
        await ref.get();


      if (!snapshot.exists) {
        throw new Error(
          "We could not find that order."
        );
      }


      const order =
        snapshot.data();


      /*
        Do not send duplicate status emails if admin
        clicks the same status repeatedly.
      */

      if (
        order.status === status
      ) {
        return json(
          200,
          {
            ok: true,
            status,
            unchanged: true
          }
        );
      }


      await ref.update({
        status,

        statusHistory:
          admin.firestore.FieldValue
            .arrayUnion({
              status,
              at:
                new Date()
                  .toISOString(),
              by: adminUser.email || adminUser.uid
            }),

        updatedAt:
          admin.firestore.FieldValue
            .serverTimestamp()
      });


      /*
        Send designed customer notification
        for the main production stages.
      */

      const updatedOrder = {
        ...order,
        status
      };


      const email =
        emailForStatus(
          status,
          updatedOrder
        );


      let emailSent = false;
      let emailError = "";
      if (email && order.customer?.email) {
        try {
          await sendTemplate(order.customer.email, email);
          emailSent = true;
        } catch (error) {
          emailError = friendlyServerError(error.message);
          console.error("Status email failed:", error);
        }
      }


      return json(
        200,
        {
          ok: true,
          status,
          emailSent,
          emailError
        }
      );
    }


    if (path === "/admin/email-test" && method === "POST") {
      const adminUser = await requireAdmin(request);
      const input = await readBody(request);
      const to = safeText(input.email || adminUser.email, 160);
      const test = verificationEmail({ firstName: "Admin", code: "246810" });
      const result = await sendTemplate(to, {
        subject: "The Wholesale Ghana email delivery test",
        html: test.html.replace("246810", "EMAIL OK")
      });
      return json(200, { ok: true, id: result?.id || "", to });
    }


    /* ===============================================
       CATALOG OVERRIDES + MAILING LIST
       =============================================== */
    if (path === "/session-role" && method === "GET") {
      await requireUser(request);
      try {
        await requireAdmin(request);
        return json(200, { role: "admin" });
      } catch {
        return json(200, { role: "customer" });
      }
    }

    if (path === "/catalog" && method === "GET") {
      const db = getDb();
      const snap = await db.collection("productOverrides").get();
      return json(200, snap.docs.filter(doc => !LEGACY_PRODUCT_IDS.has(doc.id)).map(doc => ({ id: doc.id, ...doc.data() })));
    }

    if (path === "/abandoned-cart" && method === "POST") {
      const input=await readBody(request),email=safeText(input.email,160).toLowerCase(),phone=safeText(input.phone,50); if(!email&&!phone)return json(200,{ok:true,ignored:true});
      const id=crypto.createHash("sha256").update(email||phone).digest("hex"),items=Array.isArray(input.items)?input.items.slice(0,30):[]; const pieces=items.reduce((n,i)=>n+Math.max(0,Number(i.totalQuantity||0)),0),value=items.reduce((n,i)=>n+Math.max(0,Number(i.unitPrice||0))*Math.max(0,Number(i.totalQuantity||0)),0);
      await getDb().collection("abandonedCarts").doc(id).set({email,phone,name:safeText(input.name,160),items,pieces,value,status:"active",dismissed:false,recovered:false,updatedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true}); return json(200,{ok:true,id});
    }
    if (path === "/abandoned-recovered" && method === "POST") {const input=await readBody(request),email=safeText(input.email,160).toLowerCase();if(email){const id=crypto.createHash("sha256").update(email).digest("hex");await getDb().collection("abandonedCarts").doc(id).set({recovered:true,status:"recovered",orderNumber:safeText(input.orderNumber,50),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true})}return json(200,{ok:true});}

    if (path === "/notify" && method === "POST") {
      const input=await readBody(request),email=safeText(input.email,160).toLowerCase(),productId=safeText(input.productId,80);
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("Enter a valid email address."); if(!productId)throw new Error("Choose a product.");
      const id=crypto.createHash("sha256").update(`${email}:${productId}`).digest("hex"); await getDb().collection("productNotifications").doc(id).set({email,productId,active:true,source:"notify-me",createdAt:admin.firestore.FieldValue.serverTimestamp(),updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});return json(200,{ok:true});
    }

    if (path === "/newsletter" && method === "POST") {
      const input = await readBody(request);
      const email = safeText(input.email,160).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      const db=getDb();
      const id=crypto.createHash("sha256").update(email).digest("hex");
      await db.collection("mailingList").doc(id).set({email,subscribed:true,source:"storefront",updatedAt:admin.firestore.FieldValue.serverTimestamp(),createdAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
      return json(200,{ok:true});
    }

    if (path === "/admin/products" && method === "GET") {
      await requireAdmin(request); const db=getDb(); const snap=await db.collection("productOverrides").get();
      return json(200,snap.docs.filter(doc=>!LEGACY_PRODUCT_IDS.has(doc.id)).map(doc=>({id:doc.id,...doc.data()})));
    }
    if (path === "/admin/product-save" && method === "POST") {
      const adminUser=await requireAdmin(request); const input=await readBody(request); const id=safeText(input.id,80);
      if(!id) throw new Error("Choose a product."); const db=getDb();
      const payload={name:safeText(input.name,120),category:safeText(input.category,50),retailPrice:Number(input.retailPrice||0),wholesalePrice:Number(input.wholesalePrice||0),moq:Math.max(1,Number(input.moq||6)),description:safeText(input.description,800),details:safeText(input.details,1000),colours:Array.isArray(input.colours)?input.colours.map(x=>safeText(x,40)).filter(Boolean):[],sizes:Array.isArray(input.sizes)?input.sizes.map(x=>safeText(x,20)).filter(Boolean):[],images:Array.isArray(input.images)?input.images.map(x=>safeText(x,500)).filter(Boolean):[],colourImages:input.colourImages&&typeof input.colourImages==='object'?input.colourImages:{},colourHexes:input.colourHexes&&typeof input.colourHexes==='object'?input.colourHexes:{},inventory:input.inventory&&typeof input.inventory==='object'?input.inventory:{},isNew:Boolean(input.isNew),available:input.available!==false,active:input.active!==false,updatedBy:adminUser.email||adminUser.uid,updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      await db.collection("productOverrides").doc(id).set(payload,{merge:true}); return json(200,{ok:true,id});
    }
    if (path === "/admin/product-delete" && method === "POST") {
      await requireAdmin(request); const input=await readBody(request); const id=safeText(input.id,80); if(!id) throw new Error("Choose a product.");
      await getDb().collection("productOverrides").doc(id).set({active:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true}); return json(200,{ok:true});
    }



    if (path === "/admin/manual-order" && method === "POST") {
      const adminUser=await requireAdmin(request); const input=await readBody(request); const db=getDb();
      const productId=safeText(input.productId,80),quantity=Math.max(1,Number(input.quantity||1)),mode=input.mode==="wholesale"?"wholesale":"retail";
      const overrideSnap=await db.collection("productOverrides").get(); const catalogMap=new Map(Object.entries(SERVER_CATALOG).map(([id,p])=>[id,{id,...p,active:true}])); overrideSnap.docs.forEach(doc=>catalogMap.set(doc.id,{...(catalogMap.get(doc.id)||{id:doc.id}),...doc.data()})); const product=[...catalogMap.values()].find(p=>p.id===productId&&p.active!==false); if(!product)throw new Error("Choose a valid product.");
      const pieces=quantity,price=Number(mode==="wholesale"?product.wholesalePrice:product.retailPrice),subtotal=price*quantity,deliveryFee=Math.max(0,Number(input.deliveryFee||0)),total=subtotal+deliveryFee;
      const batch=await findAvailableBatch(db,pieces); const counterRef=db.collection("counters").doc("orders"); const orderRefHolder={};
      await db.runTransaction(async tx=>{const [counterSnap,batchSnap]=await Promise.all([tx.get(counterRef),tx.get(batch.ref)]);const counter=counterSnap.exists?counterSnap.data():{},batchData=batchSnap.exists?batchSnap.data():{};const orderSequence=Number(counter.orderSeq||0)+1;let batchSequence=Number(batchData.batchNumber||0);if(!batchSequence)batchSequence=Number(counter.batchCounter||0)+1;const orderNumber=`WGH-${String(orderSequence).padStart(3,"0")}`,batchName=`Batch ${String(batchSequence).padStart(2,"0")}`;const earliest=addDays(batch.close,Number(env("DELIVERY_MIN_DAYS")||14)),latest=addDays(batch.close,Number(env("DELIVERY_MAX_DAYS")||21)),estimatedDelivery=formatDeliveryRange(earliest,latest),nowIso=new Date().toISOString();const orderRef=db.collection("orders").doc(orderNumber);orderRefHolder.number=orderNumber;
        tx.set(orderRef,{orderNumber,userId:null,batchId:batch.id,batchName,batchCloseDate:admin.firestore.Timestamp.fromDate(batch.close),estimatedDelivery,estimatedDeliveryStart:admin.firestore.Timestamp.fromDate(earliest),estimatedDeliveryEnd:admin.firestore.Timestamp.fromDate(latest),customer:{firstName:safeText(input.firstName,80),lastName:safeText(input.lastName,80),email:safeText(input.email,160).toLowerCase(),phone:safeText(input.phone,40)},items:[{id:product.id,name:product.name,image:product.images?.[0]||"",mode,totalQuantity:quantity,unitPrice:price,variants:[{colour:safeText(input.colour,40),size:safeText(input.size,20),quantity}]}],pieces,pieceCount:pieces,subtotal,processingFee:0,deliveryFee,total,paymentReference:"MANUAL",paymentStatus:"manual",status:"cycle_assigned",adminNotes:input.note?[{note:safeText(input.note,800),by:adminUser.email||adminUser.uid,at:nowIso}]:[],createdAt:admin.firestore.FieldValue.serverTimestamp(),statusHistory:[{status:"order_confirmed",at:nowIso},{status:"payment_received",at:nowIso},{status:"cycle_assigned",at:nowIso}]});
        tx.set(batch.ref,{batchNumber:batchSequence,batchName,startDate:admin.firestore.Timestamp.fromDate(batch.start),closeDate:admin.firestore.Timestamp.fromDate(batch.close),capacity:batch.capacity,usedCapacity:Number(batchData.usedCapacity||0)+pieces,status:"OPEN",updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});tx.set(counterRef,{orderSeq:orderSequence,batchCounter:Math.max(Number(counter.batchCounter||0),batchSequence)},{merge:true});});
      return json(200,{ok:true,orderNumber:orderRefHolder.number});
    }

    if (path === "/admin/cloudinary-signature" && method === "POST") {
      await requireAdmin(request); const cloudName=env("CLOUDINARY_CLOUD_NAME"),apiKey=env("CLOUDINARY_API_KEY"),apiSecret=env("CLOUDINARY_API_SECRET");
      if(!cloudName||!apiKey||!apiSecret) throw new Error("Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in Netlify.");
      const timestamp=Math.floor(Date.now()/1000),folder="wholesaleghana/products";
      const signature=crypto.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
      return json(200,{ok:true,cloudName,apiKey,timestamp,folder,signature});
    }
    if (path === "/admin/order-note" && method === "POST") {
      const adminUser=await requireAdmin(request); const input=await readBody(request); const orderNumber=safeText(input.orderNumber,40).toUpperCase(),note=safeText(input.note,800); if(!orderNumber||!note)throw new Error("Add an internal note first.");
      const ref=getDb().collection("orders").doc(orderNumber); const snap=await ref.get(); if(!snap.exists)throw new Error("Order not found.");
      await ref.update({adminNotes:admin.firestore.FieldValue.arrayUnion({note,by:adminUser.email||adminUser.uid,at:new Date().toISOString()}),updatedAt:admin.firestore.FieldValue.serverTimestamp()}); return json(200,{ok:true});
    }
    if (path === "/admin/batch-lock" && method === "POST") {
      const adminUser=await requireAdmin(request); const input=await readBody(request); const batchId=safeText(input.batchId,80); if(!batchId)throw new Error("Choose a batch."); const locked=Boolean(input.locked);
      await getDb().collection("productionBatches").doc(batchId).set({locked,lockedBy:adminUser.email||adminUser.uid,lockedAt:locked?admin.firestore.FieldValue.serverTimestamp():null,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true}); return json(200,{ok:true,locked});
    }
    if (path === "/admin/settings-save" && method === "POST") {
      await requireAdmin(request); const input=await readBody(request); const payload={businessName:safeText(input.businessName,120),businessEmail:safeText(input.businessEmail,160),whatsapp:safeText(input.whatsapp,50),instagram:safeText(input.instagram,120),currency:safeText(input.currency,10)||"GHS",batchCapacity:Math.max(1,Number(input.batchCapacity||150)),defaultMoq:Math.max(1,Number(input.defaultMoq||6)),pickupAddress:safeText(input.pickupAddress,220),updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      await getDb().collection("settings").doc("store").set(payload,{merge:true}); return json(200,{ok:true});
    }

    if (path === "/admin/subscribers" && method === "GET") {
      await requireAdmin(request); const db=getDb(); const [mailSnap,userSnap]=await Promise.all([db.collection("mailingList").limit(1500).get(),db.collection("users").limit(1500).get()]);
      const merged=new Map();
      mailSnap.docs.forEach(d=>{const x=d.data(),email=String(x.email||'').trim().toLowerCase();if(email)merged.set(email,{id:d.id,...x,email,createdAt:timestampIso(x.createdAt),updatedAt:timestampIso(x.updatedAt),source:x.source||'newsletter'})});
      userSnap.docs.forEach(d=>{const x=d.data(),email=String(x.email||'').trim().toLowerCase();if(!email)return;const prev=merged.get(email)||{};merged.set(email,{...prev,id:prev.id||d.id,email,name:prev.name||[x.firstName,x.lastName].filter(Boolean).join(' '),firstName:x.firstName||prev.firstName||'',lastName:x.lastName||prev.lastName||'',subscribed:prev.subscribed!==false,source:prev.source||'account',createdAt:prev.createdAt||timestampIso(x.createdAt),updatedAt:prev.updatedAt||timestampIso(x.updatedAt)})});
      return json(200,[...merged.values()].sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))));
    }
    if (path === "/admin/reviews" && method === "GET") { await requireAdmin(request); const snap=await getDb().collection("reviews").limit(500).get(); return json(200,snap.docs.map(d=>({id:d.id,...d.data(),createdAt:timestampIso(d.data().createdAt)}))); }
    if (path === "/admin/abandoned" && method === "GET") { await requireAdmin(request); const snap=await getDb().collection("abandonedCarts").limit(500).get(); return json(200,snap.docs.map(d=>({id:d.id,...d.data(),createdAt:timestampIso(d.data().createdAt),updatedAt:timestampIso(d.data().updatedAt)}))); }
    if (path === "/admin/messages" && method === "GET") { await requireAdmin(request); const snap=await getDb().collection("messages").limit(500).get(); return json(200,snap.docs.map(d=>({id:d.id,...d.data(),createdAt:timestampIso(d.data().createdAt)}))); }

    if (path === "/admin/abandoned-action" && method === "POST") {await requireAdmin(request);const input=await readBody(request),id=safeText(input.id,100),action=safeText(input.action,30);if(!id)throw new Error("Choose a cart.");const patch={updatedAt:admin.firestore.FieldValue.serverTimestamp()};if(action==="dismiss")Object.assign(patch,{dismissed:true,status:"dismissed"});if(action==="restore")Object.assign(patch,{dismissed:false,status:"active"});await getDb().collection("abandonedCarts").doc(id).set(patch,{merge:true});return json(200,{ok:true});}

    if (path === "/admin/accounts" && method === "GET") {
      await requireAdmin(request); const db=getDb(); const [usersSnap,ordersSnap]=await Promise.all([db.collection("users").limit(1500).get(),db.collection("orders").limit(1000).get()]);
      const counts=new Map();ordersSnap.docs.map(serializeOrder).forEach(o=>{const k=String(o.customerEmail||'').toLowerCase();if(k)counts.set(k,(counts.get(k)||0)+1)});
      return json(200,usersSnap.docs.map(d=>{const x=d.data();return {id:d.id,firstName:x.firstName||'',lastName:x.lastName||'',email:x.email||'',phone:x.phone||'',createdAt:timestampIso(x.createdAt),updatedAt:timestampIso(x.updatedAt),orderCount:counts.get(String(x.email||'').toLowerCase())||0}}).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))));
    }

    if (path === "/admin/broadcast" && method === "POST") {
      await requireAdmin(request); const input=await readBody(request),subject=safeText(input.subject,140),message=safeText(input.message,5000); if(!subject||!message)throw new Error("Add an email subject and message first.");
      const db=getDb(),[mailSnap,userSnap]=await Promise.all([db.collection("mailingList").limit(1500).get(),db.collection("users").limit(1500).get()]); const optedOut=new Set(mailSnap.docs.map(d=>d.data()).filter(x=>x.subscribed===false).map(x=>String(x.email||'').trim().toLowerCase()).filter(Boolean)); const emails=[...new Set([...mailSnap.docs.map(d=>d.data()).filter(x=>x.subscribed!==false).map(x=>String(x.email||'').trim().toLowerCase()),...userSnap.docs.map(d=>String(d.data().email||'').trim().toLowerCase())].filter(email=>email&&!optedOut.has(email)))]; let sent=0,failed=0;
      const escapedSubject=subject.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const escapedMessage=message.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      const site=(env("SITE_URL")||"https://thewholesalegh.shop").replace(/\/+$/,""), html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f4f0ea;font-family:Arial,Helvetica,sans-serif;color:#171412"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border:1px solid #ded7d0"><tr><td style="padding:26px 30px;border-bottom:1px solid #ded7d0;font-size:16px;font-weight:700;letter-spacing:.13em">THE WHOLESALE GHANA</td></tr><tr><td style="padding:34px 30px"><div style="font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#725545">Subscriber update</div><h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1.15;margin:12px 0 18px">${escapedSubject}</h1><div style="font-size:15px;line-height:1.7;white-space:pre-line;color:#514b47">${escapedMessage}</div><p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #ded7d0;font-size:11px;line-height:1.65;color:#6f6862">The Wholesale Ghana · Joy City & The Clock Bar · 0533357961 · @the.wholesalegh<br><a href="${site}" style="color:#171412">${site.replace(/^https?:\/\//,"")}</a></p></td></tr></table></td></tr></table></body></html>`;
      const broadcastText=`${subject}\n\n${message}\n\nThe Wholesale Ghana\nJoy City & The Clock Bar · 0533357961 · @the.wholesalegh\n${site}`;
      for(const email of emails){try{await sendEmail({to:email,subject,html,text:broadcastText});sent++}catch(err){failed++;console.error("Broadcast failed",email,err)}} return json(200,{ok:true,total:emails.length,sent,failed});
    }

    /* ===============================================
       NOT FOUND
       =============================================== */

    return json(
      404,
      {
        error:
          "We could not find that page."
      }
    );

  } catch (error) {
    console.error(
      "WGH backend error:",
      error
    );

    return json(
      400,
      {
        error:
          friendlyServerError(
            error.message
          )
      }
    );
  }
}
