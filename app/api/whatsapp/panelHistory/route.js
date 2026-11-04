import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";

import { authOptions } from "@/lib/authOptions";
import { getUserFromToken } from "@/lib/getUserFromToken";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const BASE_URL = "https://aigreentick.com/api/v1";
const HISTORY_ENDPOINT = "get-messages-history";
const INBOX_FAST_ENDPOINT = "inbox-fast";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isValidDate = (value) =>
  DATE_RE.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

// ----------------------------------
// Helpers
// ----------------------------------

const normalizePhone = (value = "") =>
  String(value).replace(/\D/g, "").slice(-10);

const extractList = (result) => {
  const candidates = [
    result?.users,
    result?.data?.users,
    result?.data,
    result?.inbox,
    result?.contacts,
    result?.conversations,
    result,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return {
        list: candidate,
        meta: result?.meta || result?.pagination || {},
      };
    }

    if (candidate && Array.isArray(candidate.data)) {
      return {
        list: candidate.data,
        meta: {
          ...candidate,
          ...(result?.meta || result?.pagination || {}),
        },
      };
    }
  }

  return { list: [], meta: {} };
};

const formatUser = (item) => {
  const contact = item.contact || {};

  return {
    id: item.id || item.contact_id,

    contactId: contact.id || item.contact_id || null,

    name: contact.name || item.name || "Unknown",

    mobile:
      contact.mobile ||
      contact.phone ||
      item.mobile ||
      item.phone ||
      "",

    email: contact.email || item.email || null,

    message:
      item.chat?.text ||
      item.last_message ||
      item.message ||
      null,

    messageType:
      item.chat?.type ||
      item.message_type ||
      null,

    messageTime: item.chat?.time || null,

    messageStatus:
      item.chat?.status ||
      item.report?.status ||
      item.message_status ||
      null,

    unreadCount: Number(
      item.unread_count || item.unreadCount || 0
    ),

    lastChatTime: item.last_chat_time || null,

    createdAt: item.created_at || null,
  };
};

// ----------------------------------
// GET /api/whatsapp/panelHistory
// ----------------------------------

export async function GET(request) {
  try {
    // 1. Authenticate: web session (cookie) or mobile app Bearer token
    let userId;
    let role;

    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      userId = String(session.user.id);
      role = String(session.user.role || "").toLowerCase();
    } else if (request.headers.get("authorization")) {
      const auth = await getUserFromToken(request);

      if (!auth.success) {
        return NextResponse.json(
          { success: false, message: auth.message },
          { status: auth.status }
        );
      }

      userId = String(auth.user._id);
      role = String(auth.user.role || "").toLowerCase();
    } else {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const isAdmin = role === "admin";
    const isCounsellor = role === "counsellor";

    if (!isAdmin && !isCounsellor) {
      return NextResponse.json(
        { success: false, message: "Access denied" },
        { status: 403 }
      );
    }

    // 2. Validate counsellor ID
    if (isCounsellor && !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { success: false, message: "Invalid counsellor ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Number(searchParams.get("page") || 1);
    const perPage = Number(searchParams.get("per_page") || 50);

    const search = (searchParams.get("search") || "")
      .trim()
      .slice(0, 100);

    let fromDate = (searchParams.get("from_date") || "").trim();
    let toDate = (searchParams.get("to_date") || "").trim();

    const useFastInbox = Boolean(
      search || fromDate || toDate
    );

    const maxPerPage = useFastInbox ? 150 : 100;

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(perPage) ||
      perPage < 1 ||
      perPage > maxPerPage
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid pagination parameters",
        },
        { status: 400 }
      );
    }

    if (
      (fromDate && !isValidDate(fromDate)) ||
      (toDate && !isValidDate(toDate))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Dates must be in YYYY-MM-DD format",
        },
        { status: 400 }
      );
    }

    if (fromDate && toDate && fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }

    // 3. Get CRM database
    const client = await clientPromise;
    const db = client.db("sales");

    // 4. Get assigned leads for counsellor
    let assignedPhoneNumbers = null;

    if (isCounsellor) {
      const counsellorObjectId = new ObjectId(userId);

      const assignedLeads = await db
        .collection("dm")
        .find(
          {
            "assignedTo._id": counsellorObjectId,
          },
          {
            projection: {
              phone: 1,
              phone10: 1,
            },
          }
        )
        .toArray();

      assignedPhoneNumbers = new Set();

      for (const lead of assignedLeads) {
        const phone = normalizePhone(
          lead.phone10 || lead.phone
        );

        if (phone) {
          assignedPhoneNumbers.add(phone);
        }
      }

      // No assigned leads
      if (assignedPhoneNumbers.size === 0) {
        return NextResponse.json({
          success: true,
          source: "crm-filtered",
          users: [],
          pagination: {
            currentPage: page,
            lastPage: 1,
            perPage,
            total: 0,
            nextPage: null,
          },
        });
      }
    }

    // 5. Green Tick API token
    const token = process.env.GREEN_TICK_API_TOKEN;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "Green Tick API token missing",
        },
        { status: 500 }
      );
    }

    // 6. Fetch upstream conversations
    const endpoint = useFastInbox
      ? INBOX_FAST_ENDPOINT
      : HISTORY_ENDPOINT;

    const url = new URL(`${BASE_URL}/${endpoint}`);

    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    if (useFastInbox) {
      if (search) url.searchParams.set("search", search);
      if (fromDate) url.searchParams.set("from_date", fromDate);
      if (toDate) url.searchParams.set("to_date", toDate);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        `Green Tick API failed (${endpoint}):`,
        response.status
      );

      return NextResponse.json(
        {
          success: false,
          message:
            result?.message ||
            "Unable to fetch WhatsApp contacts",
        },
        { status: response.status }
      );
    }

    // 7. Extract and format conversations
    const { list, meta } = extractList(result);

    let users = list.map(formatUser);

    // 8. Filter conversations for counsellor
    if (isCounsellor) {
      users = users.filter((contact) => {
        const phone = normalizePhone(contact.mobile);

        return (
          phone &&
          assignedPhoneNumbers.has(phone)
        );
      });
    }

    // 9. Pagination metadata
    const currentPage = Number(
      meta.current_page ?? meta.currentPage ?? page
    );

    const lastPage = Number(
      meta.last_page ?? meta.lastPage ?? 1
    );

    return NextResponse.json({
      success: true,

      source: useFastInbox
        ? INBOX_FAST_ENDPOINT
        : "history",

      users,

      pagination: {
        currentPage,
        lastPage,
        perPage: Number(
          meta.per_page ?? meta.perPage ?? perPage
        ),
        total: isCounsellor
          ? users.length
          : Number(meta.total ?? users.length),
        nextPage:
          currentPage < lastPage
            ? currentPage + 1
            : null,
      },
    });
  } catch (error) {
    console.error("Green Tick Messages Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.name === "TimeoutError"
            ? "Green Tick API request timed out"
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}