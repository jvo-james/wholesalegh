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
  html
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
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text: String(html||'').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(),
        ...(env('EMAIL_REPLY_TO') ? { reply_to: env('EMAIL_REPLY_TO') } : {})
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
    html: template.html
  });
}


/* =========================================================
   TEMPORARY SERVER CATALOG

   Firestore products take priority.
   These products are only fallbacks while the real
   product database is being populated.
   ========================================================= */

const SERVER_CATALOG = {
  "sculpt-column-dress": {
    name: "Sculpt Column Dress",
    retailPrice: 420,
    wholesalePrice: 285,
    moq: 6,
    colours: [
      "Black",
      "Cocoa",
      "Cream",
      "Nude"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "contour-button-top": {
    name: "Contour Button Top",
    retailPrice: 230,
    wholesalePrice: 155,
    moq: 6,
    colours: [
      "Black",
      "Brown",
      "Cream",
      "Nude"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "signature-two-piece": {
    name: "Signature Two-Piece Set",
    retailPrice: 510,
    wholesalePrice: 345,
    moq: 6,
    colours: [
      "Espresso",
      "Sand",
      "Black",
      "Bone"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "second-skin-tee": {
    name: "Second Skin Tee",
    retailPrice: 165,
    wholesalePrice: 110,
    moq: 6,
    colours: [
      "White",
      "Black",
      "Cocoa",
      "Taupe"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "tailored-flow-pants": {
    name: "Tailored Flow Pants",
    retailPrice: 290,
    wholesalePrice: 195,
    moq: 6,
    colours: [
      "Black",
      "Espresso",
      "Stone",
      "Cream"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "soft-drape-mini": {
    name: "Soft Drape Mini Dress",
    retailPrice: 350,
    wholesalePrice: 235,
    moq: 6,
    colours: [
      "Black",
      "Mocha",
      "Ivory",
      "Dust"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "clean-line-vest": {
    name: "Clean Line Vest",
    retailPrice: 195,
    wholesalePrice: 130,
    moq: 6,
    colours: [
      "Black",
      "Cream",
      "Camel",
      "White"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=86"
    ]
  },

  "soft-knit-set": {
    name: "Soft Knit Set",
    retailPrice: 460,
    wholesalePrice: 310,
    moq: 6,
    colours: [
      "Oat",
      "Cocoa",
      "Black",
      "Mushroom"
    ],
    sizes: [
      "XS",
      "S",
      "M",
      "L",
      "XL"
    ],
    images: [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=86"
    ]
  }
};


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
      timestampIso(batch.closeDate)
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
      timestampIso(order.createdAt)
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

    const productSnap = await db
      .collection("products")
      .doc(productId)
      .get();

    const product =
      productSnap.exists
        ? productSnap.data()
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

      image:
        product.images?.[0] ||
        ""
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

      await db.collection("mailingList").doc(crypto.createHash("sha256").update(email).digest("hex")).set({email, source:"account-signup", subscribed:true, createdAt:admin.firestore.FieldValue.serverTimestamp(), updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true});
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
        firstName: existing.firstName || safeText(input.firstName, 80),
        lastName: existing.lastName || safeText(input.lastName, 80),
        phone: existing.phone || safeText(input.phone, 40),
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
        Delivery remains zero until client's
        delivery fees are supplied.
      */

      const deliveryFee = 0;


      const total =
        Math.round(
          (
            subtotal +
            fee +
            deliveryFee
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

        region:
          safeText(
            input.customer
              ?.region,
            80
          )
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


      return json(
        200,
        snapshot.exists
          ? snapshot.data()
          : {
              batchCapacity:
                Number(
                  env(
                    "DEFAULT_BATCH_CAPACITY"
                  ) || 150
                )
            }
      );
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
      await requireAdmin(
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
                  .toISOString()
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
    if (path === "/catalog" && method === "GET") {
      const db = getDb();
      const snap = await db.collection("productOverrides").get();
      return json(200, snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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
      return json(200,snap.docs.map(doc=>({id:doc.id,...doc.data()})));
    }
    if (path === "/admin/product-save" && method === "POST") {
      const adminUser=await requireAdmin(request); const input=await readBody(request); const id=safeText(input.id,80);
      if(!id) throw new Error("Choose a product."); const db=getDb();
      const payload={name:safeText(input.name,120),category:safeText(input.category,50),retailPrice:Number(input.retailPrice||0),wholesalePrice:Number(input.wholesalePrice||0),moq:Math.max(1,Number(input.moq||6)),description:safeText(input.description,800),details:safeText(input.details,1000),colours:Array.isArray(input.colours)?input.colours.map(x=>safeText(x,40)).filter(Boolean):[],sizes:Array.isArray(input.sizes)?input.sizes.map(x=>safeText(x,20)).filter(Boolean):[],images:Array.isArray(input.images)?input.images.map(x=>safeText(x,500)).filter(Boolean):[],colourImages:input.colourImages&&typeof input.colourImages==='object'?input.colourImages:{},isNew:Boolean(input.isNew),active:input.active!==false,updatedBy:adminUser.email||adminUser.uid,updatedAt:admin.firestore.FieldValue.serverTimestamp()};
      await db.collection("productOverrides").doc(id).set(payload,{merge:true}); return json(200,{ok:true,id});
    }
    if (path === "/admin/product-delete" && method === "POST") {
      await requireAdmin(request); const input=await readBody(request); const id=safeText(input.id,80); if(!id) throw new Error("Choose a product.");
      await getDb().collection("productOverrides").doc(id).set({active:false,updatedAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true}); return json(200,{ok:true});
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
