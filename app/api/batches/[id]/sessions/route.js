import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const STATUSES = ["pending", "completed"];

const str = (value) => (value == null ? "" : String(value));
const toObjectId = (value) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

// Resolve db, batch and the sessions collection once per request.
async function getContext(params) {
  const { id } = await params;
  const batchId = toObjectId(id);
  if (!batchId) return { error: fail("Invalid batch ID") };

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const batch = await db
    .collection("batches")
    .findOne({ _id: batchId }, { projection: { tools: 1 } });

  if (!batch) return { error: fail("Batch not found", 404) };

  return { db, batch, batchId, sessions: db.collection("sessions") };
}

// Validates only the fields that were sent. `partial` = true for updates.
function parseFields(body, batch, partial) {
  const out = {};

  if (!partial || body.title !== undefined) {
    const title = str(body.title).trim();
    if (!title) return { error: "Session title is required" };
    out.title = title;
  }

  if (!partial || body.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str(body.date))) {
      return { error: "Invalid session date" };
    }
    out.date = body.date;
  }

  if (!partial || body.time !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(str(body.time))) {
      return { error: "Invalid session time" };
    }
    out.time = body.time;
  }

  if (body.toolId !== undefined) {
    const toolId = str(body.toolId);
    if (!toolId) {
      out.toolId = null; // applies to the whole batch
    } else if (!(batch.tools || []).map(str).includes(toolId)) {
      return { error: "Tool is not part of this batch" };
    } else {
      out.toolId = toolId;
    }
  }

  if (body.notes !== undefined) {
    out.notes = str(body.notes).trim().slice(0, 1000);
  }

  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return { error: "Status must be pending or completed" };
    }
    out.status = body.status;
  }

  return { fields: out };
}

// GET: all sessions of a batch.
export async function GET(request, { params }) {
  try {
    const ctx = await getContext(params);
    if (ctx.error) return ctx.error;

    const list = await ctx.sessions
      .find({ batchId: ctx.batchId })
      .sort({ date: 1, time: 1 })
      .toArray();

    const data = list.map((item) => ({
      id: str(item._id),
      batchId: str(item.batchId),
      title: item.title || "",
      date: item.date || "",
      time: item.time || "",
      toolId: item.toolId || "",
      notes: item.notes || "",
      status: item.status || "pending",
      completedAt: item.completedAt || null,
      createdAt: item.createdAt || null,
    }));

    const completed = data.filter((s) => s.status === "completed").length;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total: data.length,
        completed,
        pending: data.length - completed,
      },
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return fail(error.message || "Failed to fetch sessions", 500);
  }
}

// POST: add a session. Body: { title, date, time, toolId?, notes?, status? }
export async function POST(request, { params }) {
  try {
    const ctx = await getContext(params);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const { fields, error } = parseFields(body, ctx.batch, false);
    if (error) return fail(error);

    const now = new Date();
    const status = fields.status || "pending";

    const doc = {
      batchId: ctx.batchId,
      title: fields.title,
      date: fields.date,
      time: fields.time,
      toolId: fields.toolId ?? null,
      notes: fields.notes || "",
      status,
      completedAt: status === "completed" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    const result = await ctx.sessions.insertOne(doc);

    return NextResponse.json(
      {
        success: true,
        message: "Session added",
        data: { id: str(result.insertedId) },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create session error:", error);
    return fail(error.message || "Failed to add session", 500);
  }
}

// PATCH: edit a session or change its status. Body: { sessionId, ...fields }
export async function PATCH(request, { params }) {
  try {
    const ctx = await getContext(params);
    if (ctx.error) return ctx.error;

    const body = await request.json();
    const sessionId = toObjectId(body.sessionId);
    if (!sessionId) return fail("Invalid session ID");

    const { fields, error } = parseFields(body, ctx.batch, true);
    if (error) return fail(error);

    const now = new Date();
    const update = { ...fields, updatedAt: now };

    if (fields.status) {
      update.completedAt = fields.status === "completed" ? now : null;
    }

    const result = await ctx.sessions.updateOne(
      { _id: sessionId, batchId: ctx.batchId },
      { $set: update }
    );

    if (!result.matchedCount) return fail("Session not found", 404);

    return NextResponse.json({ success: true, message: "Session updated" });
  } catch (error) {
    console.error("Update session error:", error);
    return fail(error.message || "Failed to update session", 500);
  }
}

// DELETE: /api/batches/:id/sessions?sessionId=...
export async function DELETE(request, { params }) {
  try {
    const ctx = await getContext(params);
    if (ctx.error) return ctx.error;

    const sessionId = toObjectId(
      new URL(request.url).searchParams.get("sessionId")
    );
    if (!sessionId) return fail("Invalid session ID");

    const result = await ctx.sessions.deleteOne({
      _id: sessionId,
      batchId: ctx.batchId,
    });

    if (!result.deletedCount) return fail("Session not found", 404);

    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("Delete session error:", error);
    return fail(error.message || "Failed to delete session", 500);
  }
}