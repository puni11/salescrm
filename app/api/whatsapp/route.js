import { NextResponse, after } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const BASE = "https://aigreentick.com/api/v1";
const OPT_BASE = "https://api.aigreentick.com/api/v1";

const TOKEN = process.env.GREEN_TICK_API_TOKEN;
const COUNTRY_ID = Number(process.env.WA_COUNTRY_ID || 98);
const COUNTRY_CODE = process.env.WA_COUNTRY_CODE || "91";
const DEFAULT_REPLY_FROM = process.env.WA_REPLY_FROM || null;
const CREATE_CONTACT_PATH =
  process.env.GREEN_TICK_CREATE_CONTACT_PATH || "/contacts";

const DAY = 24 * 60 * 60 * 1000;

const json = (data, status = 200) =>
  NextResponse.json(data, { status });

const digits = (v) => String(v || "").replace(/\D/g, "");
const last10 = (v) => digits(v).slice(-10);

/* ---------------- OUTGOING WHATSAPP LOGS ---------------- */

function extractMessageId(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 5) return null;

  for (const key of ["message_id", "messageId", "wamid"]) {
    if (value[key]) return String(value[key]);
  }

  for (const child of Object.values(value)) {
    const found = extractMessageId(child, depth + 1);
    if (found) return found;
  }

  return null;
}

async function saveOutgoingWhatsAppLog({
  mobile,
  message,
  messageId = null,
  contactId = null,
  extra = {},
}) {
  try {
    const phone = last10(mobile);

    if (phone.length !== 10) {
      console.warn("[WhatsApp log] Invalid phone; skipped");
      return;
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const lead = await db.collection("dm").findOne(
      {
        $or: [
          { phone10: phone },
          { phone: phone },
          { phone: `91${phone}` },
          { phone: `+91${phone}` },
        ],
      },
      { projection: { _id: 1 } }
    );

    const now = new Date();

    await db.collection("whatsapp_logs").insertOne({
      leadId: lead?._id?.toString() || null,
      phone,
      message: String(message || "").trim(),
      type: "outgoing",
      sentAt: now,
      createdAt: now,
      ...(messageId ? { message_id: String(messageId) } : {}),
      ...(contactId ? { contact_id: contactId } : {}),
      ...extra,
    });
  } catch (error) {
    console.error("[WhatsApp log] Failed to save outgoing log:", error);
  }
}

/* ---------------- GREEN TICK REQUEST ---------------- */

async function greenTick(
  path,
  { method = "GET", body, form, timeout = 25000 } = {}
) {
  if (!TOKEN) {
    throw new Error("GREEN_TICK_API_TOKEN is not configured");
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/json",
  };

  let requestBody;

  if (form) {
    requestBody = form;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const response = await fetch(
    path.startsWith("http") ? path : `${BASE}${path}`,
    {
      method,
      headers,
      body: requestBody,
      cache: "no-store",
      signal: AbortSignal.timeout(timeout),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data?.message || `Green Tick request failed (${response.status})`
    );

    error.status = response.status;
    error.details = data;

    throw error;
  }

  return data;
}

/* ---------------- CONTACT HELPERS ---------------- */

const extractUsers = (r) =>
  r?.users?.data || r?.data?.users?.data || [];

const extractChannel = (r) =>
  r?.channel?.[0] || r?.data?.channel?.[0] || null;

function findContact(result, phone) {
  return (
    extractUsers(result).find(
      (u) => last10(u.mobile || u.phone_number) === phone
    ) || null
  );
}

async function searchInbox(phone) {
  return greenTick(
    `/inbox-fast?page=1&per_page=150&search=${encodeURIComponent(phone)}`
  );
}

async function findInContacts(phone) {
  const result = await greenTick(
    `/contacts?page=1&per_page=10&search=${encodeURIComponent(phone)}`
  );

  const rows =
    result?.contacts?.data ||
    result?.data?.contacts?.data ||
    result?.data ||
    [];

  return (
    (Array.isArray(rows) ? rows : []).find(
      (c) => last10(c.mobile || c.phone_number) === phone
    ) || null
  );
}

async function lookupContact(phone) {
  const inbox = await searchInbox(phone);
  const inboxContact = findContact(inbox, phone);

  if (inboxContact?.id) {
    return {
      inbox,
      contact: inboxContact,
      source: "inbox",
    };
  }

  let contact = null;

  try {
    contact = await findInContacts(phone);
  } catch (error) {
    console.warn(
      "[lookupContact] /contacts search failed:",
      error.status || "",
      error.message
    );
  }

  return {
    inbox,
    contact,
    source: contact ? "contacts" : null,
  };
}

async function ensureContact(phone, name) {
  console.log("[ensureContact] called:", {
    phone,
    name,
    path: CREATE_CONTACT_PATH,
  });

  const attempts = [
    {
      name: name || phone,
      phone_number: phone,
      mobile: phone,
      country_id: COUNTRY_ID,
    },
    {
      name: name || phone,
      phone_number: `${COUNTRY_CODE}${phone}`,
      country_id: COUNTRY_ID,
    },
  ];

  let lastError = null;

  for (const body of attempts) {
    try {
      console.log("[ensureContact] trying:", body);

      const res = await greenTick(CREATE_CONTACT_PATH, {
        method: "POST",
        body,
      });

      console.log(
        "[ensureContact] success:",
        JSON.stringify(res).slice(0, 300)
      );

      return {
        ok: true,
        response: res,
      };
    } catch (error) {
      lastError = {
        status: error.status || null,
        message: error.message,
        details: error.details || null,
      };

      console.warn("[ensureContact] failed:", lastError);
    }
  }

  return {
    ok: false,
    error: lastError,
  };
}

/* ---------------- TEMPLATE HELPERS ---------------- */

let templateCache = {
  at: 0,
  list: [],
};

async function getApprovedTemplates() {
  if (
    templateCache.list.length &&
    Date.now() - templateCache.at < 5 * 60 * 1000
  ) {
    return templateCache.list;
  }

  const result = await greenTick(
    "/wa-templates?type=fetch_approved"
  );

  const list = (
    result?.data ||
    result?.templates ||
    []
  ).filter((t) => t.status === "APPROVED");

  templateCache = {
    at: Date.now(),
    list,
  };

  return list;
}

function templateParts(template) {
  const components = template?.components || [];

  const find = (type) =>
    components.find(
      (c) => String(c.type).toUpperCase() === type
    );

  return {
    header: find("HEADER"),
    body: find("BODY"),
    footer: find("FOOTER"),
    buttons: find("BUTTONS")?.buttons || [],
  };
}

const interpolate = (text = "", vars = {}) =>
  String(text).replace(
    /\{\{(\d+)\}\}/g,
    (_, k) => vars[k] ?? `{{${k}}}`
  );

function renderTemplate(payload, definitions) {
  const tpl = payload?.template;

  if (!tpl) return null;

  const comps = tpl.components || [];

  const params = (type) =>
    comps.find(
      (c) => String(c.type).toLowerCase() === type
    )?.parameters || [];

  const toVars = (list) => {
    const vars = {};

    list.forEach((p, i) => {
      vars[i + 1] = p?.text ?? "";
    });

    return vars;
  };

  const def = definitions.find((d) => d.name === tpl.name);
  const parts = def ? templateParts(def) : {};
  const bodyParams = params("body");

  const body = parts.body?.text
    ? interpolate(parts.body.text, toVars(bodyParams))
    : bodyParams
        .map((p) => p?.text)
        .filter(Boolean)
        .join("\n");

  const headerText =
    String(parts.header?.format || "").toUpperCase() === "TEXT"
      ? interpolate(parts.header.text, toVars(params("header")))
      : "";

  return {
    name: tpl.name,
    body,
    headerText,
    footer: parts.footer?.text || "",
    buttons: (parts.buttons || []).map((b) => ({
      text: b.text,
    })),
  };
}

/* ---------------- MESSAGE HELPERS ---------------- */

const RECEIVED = ["recieve", "received", "in"];

const isInbound = (row) =>
  RECEIVED.includes(String(row?.type).toLowerCase());

function parseJson(value) {
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const payloadOf = (row) => parseJson(row?.payload) || null;

const responseOf = (row) =>
  parseJson(row?.response) || row?.response || null;

const nestedValue = (row) =>
  responseOf(row)?.entry?.[0]?.changes?.[0]?.value || null;

const nestedMessage = (row) =>
  nestedValue(row)?.messages?.[0] || null;

function parseTimestamp(row) {
  const nested = nestedValue(row);

  const ts = Number(nested?.messages?.[0]?.timestamp);

  if (Number.isFinite(ts) && ts > 0) {
    return ts * 1000;
  }

  const st = Number(nested?.statuses?.[0]?.timestamp);

  if (Number.isFinite(st) && st > 0) {
    return st * 1000;
  }

  const value = row?.created_at || row?.time;

  if (!value) return null;

  const s = String(value);

  const ms = /^\d+$/.test(s)
    ? Number(s) * 1000
    : Date.parse(
        s.replace(" ", "T") +
          (/[zZ]|[+-]\d\d:\d\d$/.test(s) ? "" : "+05:30")
      );

  return Number.isFinite(ms) ? ms : null;
}

function locationFor(row) {
  const loc =
    payloadOf(row)?.location ||
    row?.location ||
    nestedMessage(row)?.location;

  const latitude = Number(loc?.latitude);
  const longitude = Number(loc?.longitude);

  if (
    !loc ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    name: loc.name || "",
    address: loc.address || "",
  };
}

function mediaFor(row) {
  const payload = payloadOf(row);
  const nested = nestedMessage(row);
  const kind = payload?.type || nested?.type;
  const node = payload?.[kind] || nested?.[kind];

  const link =
    node?.link ||
    node?.url ||
    row?.media_url ||
    row?.file_url ||
    row?.image_url ||
    null;

  if (
    ["image", "video", "audio", "document", "sticker"].includes(kind)
  ) {
    return {
      type: kind === "sticker" ? "image" : kind,
      url: link,
      filename: node?.filename || row?.filename || null,
    };
  }

  if (link) {
    return {
      type: row?.media_type || "document",
      url: link,
      filename: row?.filename || null,
    };
  }

  return null;
}

function templateHeaderMedia(payload) {
  const header = payload?.template?.components?.find(
    (c) => String(c.type).toLowerCase() === "header"
  );

  const param = header?.parameters?.[0];
  const type = param?.type;
  const link = param?.[type]?.link;

  if (!link || !["image", "video", "document"].includes(type)) {
    return null;
  }

  return {
    type,
    url: link,
    filename: param?.[type]?.filename || null,
  };
}

const STATUS_RANK = {
  failed: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

const statusRank = (s) =>
  STATUS_RANK[String(s || "").toLowerCase()] ?? -1;

function signature(m) {
  return [
    m.direction,
    m.templateName || "",
    m.text || "",
    m.media?.url || "",
    m.location
      ? `${m.location.latitude},${m.location.longitude}`
      : "",
  ].join("|");
}

function mergeInto(target, extra) {
  for (const key of [
    "text",
    "caption",
    "footer",
    "headerText",
    "media",
    "location",
    "templateName",
    "messageId",
    "createdAt",
    "error",
  ]) {
    if (!target[key] && extra[key]) {
      target[key] = extra[key];
    }
  }

  if (!target.buttons?.length && extra.buttons?.length) {
    target.buttons = extra.buttons;
  }

  if (statusRank(extra.status) > statusRank(target.status)) {
    target.status = extra.status;
  }
}

function dedupe(items) {
  const byId = new Map();

  for (const item of items) {
    const key = item.messageId
      ? `m:${item.messageId}`
      : `i:${item.id}`;

    const existing = byId.get(key);

    if (existing) {
      mergeInto(existing, item);
    } else {
      byId.set(key, { ...item });
    }
  }

  const sorted = [...byId.values()].sort(
    (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
  );

  const result = [];

  for (const item of sorted) {
    const twin = result
      .slice(-6)
      .find(
        (prev) =>
          signature(prev) === signature(item) &&
          Math.abs(
            (prev.createdAt || 0) - (item.createdAt || 0)
          ) <= 5000
      );

    if (twin) {
      mergeInto(twin, item);
    } else {
      result.push(item);
    }
  }

  return result.map((item, index) => ({
    ...item,
    key: `${item.id}-${index}`,
  }));
}

function normalizeMessages(rows = [], definitions = []) {
  const items = rows.map((row, index) => {
    const payload = payloadOf(row);
    const nested = nestedMessage(row);
    const rendered = renderTemplate(payload, definitions);
    const location = locationFor(row);

    const plainText =
      row.message ||
      nested?.text?.body ||
      nested?.button?.text ||
      "";

    const text =
      rendered?.body ||
      plainText ||
      row.caption ||
      "";

    const caption =
      row.caption &&
      row.caption !== text &&
      row.caption !== rendered?.footer
        ? row.caption
        : "";

    const footer =
      rendered?.footer && rendered.footer !== text
        ? rendered.footer
        : "";

    return {
      id: row.id ?? row.message_id ?? `message-${index}`,
      messageId: row.message_id || nested?.id || null,
      direction: isInbound(row) ? "in" : "out",
      text,
      caption,
      footer,
      headerText: rendered?.headerText || "",
      media: mediaFor(row) || templateHeaderMedia(payload),
      location,
      status: row.status || null,
      createdAt: parseTimestamp(row),
      sender: row.send_from_id || row.agent_name || null,
      templateName:
        rendered?.name || payload?.template?.name || null,
      buttons:
        rendered?.buttons?.length
          ? rendered.buttons
          : row.buttons || row.chat_buttons || [],
      error:
        nestedValue(row)?.statuses?.[0]?.errors?.[0]?.message ||
        null,
      rawType: nested?.type || null,
    };
  });

  return dedupe(
    items.filter(
      (m) => m.text || m.media || m.location || m.templateName
    )
  );
}

function latestInboundAt(rows = []) {
  return (
    rows.reduce(
      (latest, row) =>
        isInbound(row)
          ? Math.max(latest, parseTimestamp(row) || 0)
          : latest,
      0
    ) || null
  );
}

/* ---------------- CHAT HISTORY ---------------- */

async function getChatHistory(
  contactId,
  mobile,
  fromDate,
  toDate,
  page = 1
) {
  if (fromDate || toDate) {
    if (!fromDate || !toDate) {
      throw Object.assign(
        new Error("Both from_date and to_date are required"),
        { status: 400 }
      );
    }

    if (fromDate > toDate) {
      throw Object.assign(
        new Error("from_date cannot be after to_date"),
        { status: 400 }
      );
    }

    const result = await greenTick(
      `/get-chat?contact_id=${contactId}&from_date=${encodeURIComponent(
        fromDate
      )}&to_date=${encodeURIComponent(toDate)}`
    );

    const box = result?.messages ?? result?.data ?? result;

    return {
      rows: Array.isArray(box) ? box : box?.data || [],
      pagination: null,
      filtered: true,
    };
  }

  const result = await greenTick(
    `/get-chat-with-pagination?contact_id=${contactId}&chat=${encodeURIComponent(
      mobile
    )}&page=${page}&per_page=100`
  );

  const box =
    result?.messages ||
    result?.data?.messages ||
    {};

  return {
    rows: Array.isArray(box) ? box : box?.data || [],
    pagination: {
      currentPage: box?.current_page || page,
      lastPage: box?.last_page || 1,
      total: box?.total || 0,
    },
    filtered: false,
  };
}

/* ---------------- BOOTSTRAP ---------------- */

async function bootstrap(url) {
  const params = url.searchParams;
  const phone = last10(params.get("mobile"));

  if (phone.length !== 10) {
    return json(
      {
        success: false,
        message: "A valid 10-digit mobile number is required",
      },
      400
    );
  }

  const { inbox, contact, source } = await lookupContact(phone);
  const channel = extractChannel(inbox);
  const replyFrom = channel?.whatsapp_no || DEFAULT_REPLY_FROM;

  if (!contact?.id) {
    return json({
      success: true,
      contactFound: false,
      contact: {
        id: null,
        isNew: true,
        name: params.get("name") || phone,
        mobile: phone,
        email: null,
        unreadCount: 0,
        lastChat: null,
      },
      channel: { replyFrom },
      block: {
        isBlocked: false,
        allowedSms: true,
        allowedBroadcast: true,
      },
      tags: [],
      groups: [],
      messages: [],
      pagination: null,
      filtered: false,
      lastInboundAt: null,
      sessionExpiresAt: null,
      sessionOpen: false,
    });
  }

  const contactId = Number(contact.id);
  const fromDate = params.get("from_date") || "";
  const toDate = params.get("to_date") || "";
  const page = Math.max(1, Number(params.get("page") || 1));

  const [
    historyResult,
    blockResult,
    tagsResult,
    groupsResult,
    templatesResult,
  ] = await Promise.allSettled([
    getChatHistory(
      contactId,
      contact.mobile || phone,
      fromDate,
      toDate,
      page
    ),
    greenTick(
      `${OPT_BASE}/opt-rules/contacts/${contactId}/block-status`
    ),
    greenTick(`/tags/tags_by?contact_id=${contactId}`),
    greenTick(`/groups/groups_by?contact_id=${contactId}`),
    getApprovedTemplates(),
  ]);

  let history;

  if (historyResult.status === "rejected") {
    if (source !== "contacts") throw historyResult.reason;

    history = {
      rows: [],
      pagination: null,
      filtered: false,
    };
  } else {
    history = historyResult.value;
  }

  const hasNoChat =
    !history.filtered && history.rows.length === 0;

  const definitions =
    templatesResult.status === "fulfilled"
      ? templatesResult.value
      : [];

  const lastInbound = latestInboundAt(history.rows);
  const sessionExpiresAt = lastInbound
    ? lastInbound + DAY
    : null;

  const block =
    blockResult.status === "fulfilled"
      ? blockResult.value?.data || blockResult.value
      : null;

  return json({
    success: true,
    contactFound: true,
    contact: {
      id: contactId,
      isNew: hasNoChat,
      inContacts: true,
      name: contact.name || params.get("name") || phone,
      mobile: contact.mobile || phone,
      email: contact.email || null,
      unreadCount: Number(
        contact.unread_count || contact.unreadCount || 0
      ),
      lastChat: contact.last_chat || null,
    },
    channel: { replyFrom },
    block: {
      isBlocked: Boolean(
        block?.is_blocked ?? contact.is_blocked
      ),
      allowedSms: block?.allowed_sms !== false,
      allowedBroadcast: block?.allowed_broadcast !== false,
    },
    tags:
      (tagsResult.status === "fulfilled"
        ? tagsResult.value?.tags ||
          tagsResult.value?.data?.tags
        : null) ||
      contact.tags ||
      [],
    groups:
      (groupsResult.status === "fulfilled"
        ? groupsResult.value?.groups ||
          groupsResult.value?.data?.groups
        : null) ||
      contact.groups ||
      [],
    messages: normalizeMessages(history.rows, definitions),
    pagination: history.pagination,
    filtered: history.filtered,
    lastInboundAt: lastInbound,
    sessionExpiresAt,
    sessionOpen:
      !!sessionExpiresAt && sessionExpiresAt > Date.now(),
  });
}

/* ---------------- GET ---------------- */

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (action === "templates") {
      return json({
        success: true,
        templates: await getApprovedTemplates(),
      });
    }

    if (action === "chat" || !action) {
      return await bootstrap(url);
    }

    return json(
      {
        success: false,
        message: "Unknown action",
      },
      400
    );
  } catch (error) {
    console.error("WhatsApp API GET:", error.details || error);

    return json(
      {
        success: false,
        message:
          error.message || "Unable to load WhatsApp data",
      },
      error.status || 500
    );
  }
}

/* ---------------- POST ---------------- */

function cleanLocation(loc) {
  const latitude = Number(loc?.latitude);
  const longitude = Number(loc?.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  if (
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    name: String(loc?.name || "").slice(0, 100),
    address: String(loc?.address || "").slice(0, 300),
  };
}

function pickUrl(o, depth = 0) {
  if (!o || typeof o !== "object" || depth > 4) {
    return "";
  }

  for (const k of [
    "public_url",
    "url",
    "link",
    "media_url",
    "file_url",
    "path",
  ]) {
    if (
      typeof o[k] === "string" &&
      /^https?:\/\//.test(o[k])
    ) {
      return o[k];
    }
  }

  for (const v of Object.values(o)) {
    const found = pickUrl(v, depth + 1);
    if (found) return found;
  }

  return "";
}

export async function POST(request) {
  try {
    const contentType =
      request.headers.get("content-type") || "";

    /* MEDIA UPLOAD */

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();

      const file =
        form.get("image") ||
        form.get("file");

      if (!file || typeof file === "string") {
        return json(
          {
            success: false,
            message: "file is required",
          },
          400
        );
      }

      if (file.size > 16 * 1024 * 1024) {
        return json(
          {
            success: false,
            message: "Maximum file size is 16 MB",
          },
          413
        );
      }

      const uploadForm = new FormData();
      uploadForm.append("image", file, file.name);

      const uploaded = await greenTick(
        "/wa-template/media",
        {
          method: "POST",
          form: uploadForm,
          timeout: 60000,
        }
      );

      const url = pickUrl(uploaded);

      if (!url) {
        console.error("Upload returned no URL:", uploaded);

        return json(
          {
            success: false,
            message:
              "Upload finished but no file link was returned",
          },
          502
        );
      }

      return json({
        success: true,
        url,
        fileName:
          uploaded.file_name ||
          uploaded.data?.file_name ||
          file.name,
        mimeType:
          uploaded.mime_type ||
          uploaded.data?.mime_type ||
          file.type,
      });
    }

    const body = await request.json();
    const action = body.action;

    /* MARK AS READ */

    if (action === "read") {
      if (!Number(body.contactId)) {
        return json({ success: true });
      }

      await greenTick("/chats/mark-as-read", {
        method: "POST",
        body: {
          contact_id: Number(body.contactId),
        },
      });

      return json({ success: true });
    }

    /* CREATE CONTACT */

    if (action === "create-contact") {
      const phone = last10(body.mobile);

      if (phone.length !== 10) {
        return json(
          {
            success: false,
            message:
              "A valid 10-digit mobile number is required",
          },
          400
        );
      }

      const result = await ensureContact(
        phone,
        body.name
      );

      return json(
        {
          success: result.ok,
          contact: result,
          message: result.ok
            ? undefined
            : result.error?.message ||
              "Could not create contact",
        },
        result.ok ? 200 : 422
      );
    }

    /* SEND FREE-FORM MESSAGE */

    if (action === "send-message") {
      const phone = last10(body.mobile);
      const message = String(body.message || "").trim();

      const location = body.location
        ? cleanLocation(body.location)
        : null;

      if (body.location && !location) {
        return json(
          {
            success: false,
            message: "Invalid location coordinates",
          },
          400
        );
      }

      if (
        phone.length !== 10 ||
        (!message && !location && !body.mediaUrl)
      ) {
        return json(
          {
            success: false,
            message:
              "Mobile number and a message, media or location are required",
          },
          400
        );
      }

      if (!body.replyFrom) {
        return json(
          {
            success: false,
            message:
              "WhatsApp sending channel is missing",
          },
          400
        );
      }

      const { contact: matched } =
        await lookupContact(phone);

      if (!matched?.id) {
        return json(
          {
            success: false,
            code: "SESSION_EXPIRED",
            message:
              "No conversation exists yet. Send an approved template first.",
          },
          409
        );
      }

      const recent = await getChatHistory(
        matched.id,
        matched.mobile || phone,
        "",
        "",
        1
      );

      const inboundAt = latestInboundAt(recent.rows);

      if (!inboundAt || inboundAt + DAY <= Date.now()) {
        return json(
          {
            success: false,
            code: "SESSION_EXPIRED",
            message:
              "The 24-hour WhatsApp session has expired. Send an approved template instead.",
          },
          409
        );
      }

      const payload = {
        reply_from: body.replyFrom,
        message: location ? "" : message,
        recipient_mobile: phone,
        recipient_name: body.name || "",
        template_id: null,
        reaction: "",
        isReply: Boolean(body.replyMessageId),
        reply_message_id:
          body.replyMessageId || null,
        media_type: location
          ? "location"
          : body.mediaType || "",
        media_url: location
          ? ""
          : body.mediaUrl || "",
        filename: body.filename || "",
        caption: body.caption || "",
        channel: body.replyFrom,
      };

      if (location) {
        payload.location = location;
      }

      const sendResult = await greenTick(
        "/sendMessage",
        {
          method: "POST",
          body: payload,
        }
      );

      after(async () => {
        const logMessage = location
          ? `Location: ${
              location.name ||
              location.address ||
              `${location.latitude}, ${location.longitude}`
            }`
          : message ||
            body.caption ||
            `[${body.mediaType || "media"}]`;

        await saveOutgoingWhatsAppLog({
          mobile: phone,
          message: logMessage,
          messageId: extractMessageId(sendResult),
          contactId: matched?.id || null,
          extra: {
            ...(body.mediaUrl
              ? {
                  media_url: body.mediaUrl,
                  media_type:
                    body.mediaType || "media",
                }
              : {}),
            ...(location ? { location } : {}),
            ...(body.replyMessageId
              ? {
                  reply_message_id: String(
                    body.replyMessageId
                  ),
                }
              : {}),
          },
        });
      });

      return json({
        success: true,
        data: sendResult,
      });
    }

    /* SEND APPROVED TEMPLATE */

    if (action === "send-template") {
      const phone = last10(body.mobile);

      if (
        phone.length !== 10 ||
        !Number(body.templateId)
      ) {
        return json(
          {
            success: false,
            message:
              "Valid mobile and template are required",
          },
          400
        );
      }

      console.log("[send-template] start:", {
        phone,
        templateId: body.templateId,
        name: body.name,
      });

      const {
        contact: existing,
        source,
      } = await lookupContact(phone);

      console.log(
        "[send-template] lookup:",
        existing
          ? `found in ${source} (id ${existing.id})`
          : "not found"
      );

      let contactResult = {
        skipped: true,
        id: existing?.id ?? null,
        source,
      };

      if (!existing) {
        contactResult = await ensureContact(
          phone,
          body.name
        );

        try {
          const created = await findInContacts(phone);

          contactResult.id = created?.id ?? null;
          contactResult.verified = Boolean(created);
        } catch {}

        console.log(
          "[send-template] create result:",
          contactResult
        );
      }

      const templateResult = await greenTick(
        "/broadcast",
        {
          method: "POST",
          body: {
            template_id: Number(body.templateId),
            country_id: COUNTRY_ID,
            camp_name: String(
              body.campName ||
                `Template to ${body.name || phone}`
            ).slice(0, 100),
            mobile_numbers: [phone],
            is_media: Boolean(body.mediaUrl),
            media_type: body.mediaType || "",
            media_url: body.mediaUrl || "",
            schedule_date: "",
            variables: body.variables || {},
          },
        }
      );

      after(async () => {
        await saveOutgoingWhatsAppLog({
          mobile: phone,
          message: [
            `Template ID: ${body.templateId}`,
            body.variables &&
            Object.keys(body.variables).length
              ? `Variables: ${JSON.stringify(
                  body.variables
                )}`
              : "",
            body.caption || "",
          ]
            .filter(Boolean)
            .join("\n"),
          messageId: extractMessageId(templateResult),
          contactId:
            contactResult.id ||
            existing?.id ||
            null,
          extra: {
            template_id: Number(body.templateId),
            ...(body.templateName
              ? {
                  template_name: String(
                    body.templateName
                  ),
                }
              : {}),
            ...(body.mediaUrl
              ? {
                  media_url: body.mediaUrl,
                  media_type:
                    body.mediaType || "media",
                }
              : {}),
          },
        });
      });

      return json({
        success: true,
        contact: contactResult,
      });
    }

    return json(
      {
        success: false,
        message: "Unknown action",
      },
      400
    );
  } catch (error) {
    console.error(
      "WhatsApp API POST:",
      error.details || error
    );

    return json(
      {
        success: false,
        message:
          error.message || "WhatsApp action failed",
      },
      error.status || 500
    );
  }
}