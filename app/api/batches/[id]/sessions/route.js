import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const DB_NAME = "sales";
const STATUSES = ["upcoming", "ongoing", "completed"];

const str = (value) => (value == null ? "" : String(value));

const toObjectId = (value) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;

const fail = (message, status = 400) =>
  NextResponse.json({ success: false, message }, { status });

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str(value))) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

// Resolve DB, batch and sessions collection once per request.
async function getContext(params) {
  const { id } = await params;

  const batchId = toObjectId(id);

  if (!batchId) {
    return { error: fail("Invalid batch ID") };
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const batch = await db.collection("batches").findOne(
    { _id: batchId },
    { projection: { tools: 1 } }
  );

  if (!batch) {
    return { error: fail("Batch not found", 404) };
  }

  return {
    db,
    batch,
    batchId,
    sessions: db.collection("sessions"),
  };
}

// Validate fields.
// partial=true for PATCH requests.
function parseFields(body, batch, partial) {
  const out = {};

  // Starting date
  if (!partial || body.date !== undefined) {
    if (!isValidDate(body.date)) {
      return { error: "Invalid starting date" };
    }

    out.date = str(body.date);
  }

  // Ending date
  if (!partial || body.endDate !== undefined) {
    if (!isValidDate(body.endDate)) {
      return { error: "Invalid ending date" };
    }

    out.endDate = str(body.endDate);
  }

  // Time
  if (!partial || body.time !== undefined) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(str(body.time))) {
      return { error: "Invalid session time" };
    }

    out.time = str(body.time);
  }

  // Tool
  if (body.toolId !== undefined) {
    const toolId = str(body.toolId);

    if (!toolId) {
      out.toolId = null;
    } else if (!(batch.tools || []).map(str).includes(toolId)) {
      return { error: "Tool is not part of this batch" };
    } else {
      out.toolId = toolId;
    }
  }

  // Notes
  if (body.notes !== undefined) {
    out.notes = str(body.notes).trim().slice(0, 1000);
  }

  // Status
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      return {
        error: "Status must be pending or completed",
      };
    }

    out.status = body.status;
  }

  // Validate date range when both dates are available.
  if (
    out.date &&
    out.endDate &&
    out.endDate < out.date
  ) {
    return {
      error: "Ending date cannot be before starting date",
    };
  }

  return { fields: out };
}

// GET: Fetch all sessions for a batch.
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

      date: item.date || "",
      endDate: item.endDate || item.date || "",

      time: item.time || "",
      toolId: item.toolId || "",
      notes: item.notes || "",
      status: item.status || "pending",

      completedAt: item.completedAt || null,
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
    }));

    const completed = data.filter(
      (session) => session.status === "completed"
    ).length;

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

    return fail(
      error.message || "Failed to fetch sessions",
      500
    );
  }
}

// POST: Create a new session.
// Body: { date, endDate, time, toolId?, notes?, status? }
export async function POST(request, { params }) {
  try {
    const ctx = await getContext(params);

    if (ctx.error) return ctx.error;

    const body = await request.json();

    const { fields, error } = parseFields(
      body,
      ctx.batch,
      false
    );

    if (error) return fail(error);

    const now = new Date();

    const status = fields.status || "pending";

    const doc = {
      batchId: ctx.batchId,

      date: fields.date,
      endDate: fields.endDate,

      time: fields.time,
      toolId: fields.toolId ?? null,
      notes: fields.notes || "",

      status,

      completedAt:
        status === "completed" ? now : null,

      createdAt: now,
      updatedAt: now,
    };

    const result = await ctx.sessions.insertOne(doc);

    return NextResponse.json(
      {
        success: true,
        message: "Session added successfully",
        data: {
          id: str(result.insertedId),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create session error:", error);

    return fail(
      error.message || "Failed to add session",
      500
    );
  }
}

// PATCH: Update session or change status.
// Body: { sessionId, date?, endDate?, time?, toolId?, notes?, status? }
export async function PATCH(request, { params }) {
  try {
    const ctx = await getContext(params);

    if (ctx.error) return ctx.error;

    const body = await request.json();

    const sessionId = toObjectId(body.sessionId);

    if (!sessionId) {
      return fail("Invalid session ID");
    }

    // Find existing session for partial date validation.
    const existingSession = await ctx.sessions.findOne({
      _id: sessionId,
      batchId: ctx.batchId,
    });

    if (!existingSession) {
      return fail("Session not found", 404);
    }

    const { fields, error } = parseFields(
      body,
      ctx.batch,
      true
    );

    if (error) return fail(error);

    // Validate the final date range using existing values.
    const finalStartDate =
      fields.date ?? existingSession.date;

    const finalEndDate =
      fields.endDate ??
      existingSession.endDate ??
      existingSession.date;

    if (
      finalStartDate &&
      finalEndDate &&
      finalEndDate < finalStartDate
    ) {
      return fail(
        "Ending date cannot be before starting date"
      );
    }

    const now = new Date();

    const update = {
      ...fields,
      updatedAt: now,
    };

    // Keep older sessions compatible when editing them.
    if (
      fields.date !== undefined &&
      fields.endDate === undefined &&
      !existingSession.endDate
    ) {
      update.endDate = fields.date;
    }

    // Handle completion timestamp.
    if (fields.status !== undefined) {
      update.completedAt =
        fields.status === "completed"
          ? existingSession.status === "completed"
            ? existingSession.completedAt || now
            : now
          : null;
    }

    const result = await ctx.sessions.updateOne(
      {
        _id: sessionId,
        batchId: ctx.batchId,
      },
      {
        $set: update,
      }
    );

    if (!result.matchedCount) {
      return fail("Session not found", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Update session error:", error);

    return fail(
      error.message || "Failed to update session",
      500
    );
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

    if (!sessionId) {
      return fail("Invalid session ID");
    }

    const result = await ctx.sessions.deleteOne({
      _id: sessionId,
      batchId: ctx.batchId,
    });

    if (!result.deletedCount) {
      return fail("Session not found", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Delete session error:", error);

    return fail(
      error.message || "Failed to delete session",
      500
    );
  }
}