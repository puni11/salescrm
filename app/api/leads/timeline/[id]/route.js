
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const normalizePhone = (value = "") =>
  String(value).replace(/\D/g, "").slice(-10);

const safeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const serialize = (doc, leadId) => ({
  ...doc,
  _id: String(doc._id || doc.id || ""),
  id: String(doc._id || doc.id || ""),
  leadId: String(leadId),
});

const serializeComment = (comment, leadId) => ({
  ...comment,
  _id: String(comment._id || comment.id || ""),
  id: String(comment._id || comment.id || ""),
  leadId: String(leadId),
  title: "Comment",
  content: comment.text || comment.content || "",
  text: comment.text || comment.content || "",
  createdAt: comment.createdAt || null,
  createdBy: comment.createdBy || null,
});

const serializeDemoRequest = (demo, leadId) => ({
  ...demo,
  _id: String(demo._id || ""),
  leadId: String(leadId),
  batchId: String(demo.batchId || ""),
});

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const salesDB = client.db("sales");
    const internalDB = client.db("internal");
    const leadObjectId = new ObjectId(id);

    const dm = salesDB.collection("dm");
    const lead = await dm.findOne({ _id: leadObjectId });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const phone10 = lead.phone10 || normalizePhone(lead.phone);

    const phoneVariants = [
      ...new Set(
        [
          phone10,
          lead.phone,
          `+91${phone10}`,
          `91${phone10}`,
          `0${phone10}`,
        ]
          .filter(Boolean)
          .map(String)
      ),
    ];

    const tasksCollection = salesDB.collection("tasks");
    const followUpCollection = salesDB.collection("followUp");
    const batchesCollection = salesDB.collection("batches");
    const demoRequestsCollection =
      salesDB.collection("demoRequests");

    // Fetch all lead-related data.
    const [
      calls,
      whatsapp,
      engagements,
      tasks,
      followUps,
      matchingBatches,
      demoRequests,
    ] = await Promise.all([
      // Call logs
      salesDB
        .collection("call_logs")
        .find({
          $or: [
            { phone10 },
            { phone: { $in: phoneVariants } },
          ],
        })
        .sort({ call_time: -1, createdAt: -1 })
        .limit(500)
        .toArray(),

      // WhatsApp logs
      salesDB
        .collection("whatsapp_logs")
        .find({
          $or: [
            { phone10 },
            { phone: { $in: phoneVariants } },
          ],
        })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),

      // Engagements
      salesDB
        .collection("engagements")
        .find({ leadId: leadObjectId })
        .sort({ createdAt: -1 })
        .limit(500)
        .toArray(),

      // Tasks
      tasksCollection
        .find({ leadId: leadObjectId })
        .sort({ createdAt: -1 })
        .toArray(),

      // Follow-ups
      followUpCollection
        .find({ leadId: leadObjectId })
        .sort({ followUpDate: 1, createdAt: -1 })
        .toArray(),

      // Batches
      batchesCollection
        .find({
          $or: [
            { studentIds: id },
            { studentIds: leadObjectId },
            ...(lead.batchId &&
            ObjectId.isValid(String(lead.batchId))
              ? [
                  {
                    _id: new ObjectId(String(lead.batchId)),
                  },
                ]
              : []),
          ],
        })
        .toArray(),

      // Demo requests
      demoRequestsCollection
        .find({
          leadId: leadObjectId,
        })
        .sort({ requestedAt: -1, createdAt: -1 })
        .toArray(),
    ]);

    // Notes from embedded comments array.
    const notes = (
      Array.isArray(lead.comments) ? lead.comments : []
    )
      .map((comment) => serializeComment(comment, id))
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

    // Get counsellor IDs.
    const userIds = [
      ...new Set(
        [...calls, ...whatsapp]
          .map((x) => String(x.userId || ""))
          .filter(ObjectId.isValid)
      ),
    ];

    const users = userIds.length
      ? await internalDB
          .collection("users")
          .find({
            _id: {
              $in: userIds.map((x) => new ObjectId(x)),
            },
          })
          .toArray()
      : [];

    const userMap = Object.fromEntries(
      users.map((u) => [
        String(u._id),
        u.name || u.fullName || "Unknown",
      ])
    );

    // Build timeline.
    const timeline = [
      // Lead created
      {
        id: String(lead._id),
        type: "LEAD_CREATED",
        title: "Lead Created",
        description: `Lead created from ${
          lead.source || "unknown source"
        }`,
        timestamp: lead.createdAt,
      },

      // Calls
      ...calls.map((call) => ({
        id: String(call._id),
        type: "CALL",
        title: `${call.call_type || "Phone"} Call`,
        description:
          Number(call.duration_seconds) > 0
            ? `Duration: ${call.duration_seconds} sec`
            : "No conversation",
        counsellor:
          userMap[String(call.userId)] || "Unknown",
        status: call.status,
        timestamp: call.call_time || call.createdAt,
      })),

      // WhatsApp
      ...whatsapp.map((msg) => ({
        id: String(msg._id),
        type: "WHATSAPP",
        title: "WhatsApp",
        description:
          msg.templateName ||
          msg.message ||
          "WhatsApp interaction",
        counsellor:
          userMap[String(msg.userId)] || "Unknown",
        status: msg.status,
        timestamp: msg.createdAt,
      })),

      // Engagements
      ...engagements.map((eng) => ({
        id: String(eng._id),
        type: eng.type || "ACTIVITY",
        title: String(eng.type || "Activity").replace(
          /_/g,
          " "
        ),
        description:
          eng.description ||
          (eng.score != null
            ? `Lead Score +${eng.score}`
            : ""),
        score: eng.score,
        timestamp: eng.createdAt,
      })),

      // Tasks
      ...tasks.map((task) => ({
        id: String(task._id),
        type: "TASK",
        title: task.title,
        description: task.description || "",
        status: task.status,
        timestamp: task.updatedAt || task.createdAt,
      })),

      // Comments
      ...notes.map((note) => ({
        id: note.id,
        type: "NOTE",
        title: "Comment",
        description: note.text || "",
        createdBy: note.createdBy,
        timestamp: note.updatedAt || note.createdAt,
      })),

      // Follow-ups
      ...followUps.map((f) => ({
        id: String(f._id),
        type: "FOLLOW_UP",
        title: "Follow-up",
        description:
          f.comment || `Follow-up ${f.status || "scheduled"}`,
        status: f.status,
        timestamp: f.followUpDate || f.createdAt,
      })),

      // Demo request and completion events
      ...demoRequests.flatMap((demo) => {
        const events = [];

        const demoDetails = [
          demo.batchName,
          demo.demoMode,
          demo.courseName,
        ]
          .filter(Boolean)
          .join(" • ");

        const requestedAt =
          safeDate(demo.requestedAt) ||
          safeDate(demo.createdAt);

        const completedAt = safeDate(demo.completedAt);

        // Demo Requested
        if (requestedAt) {
          events.push({
            id: `${String(demo._id)}-requested`,
            type: "DEMO_REQUESTED",
            title: "Demo Requested",
            description: demoDetails || "Demo request created",
            status: demo.status || "pending",
            batchId: String(demo.batchId || ""),
            batchName: demo.batchName || "",
            demoMode: demo.demoMode || "",
            courseName: demo.courseName || "",
            timestamp: requestedAt,
          });
        }

        // Demo Done
        if (
          demo.status === "completed" &&
          completedAt
        ) {
          events.push({
            id: `${String(demo._id)}-completed`,
            type: "DEMO_DONE",
            title: "Demo Done",
            description: demoDetails || "Demo completed",
            status: "completed",
            batchId: String(demo.batchId || ""),
            batchName: demo.batchName || "",
            demoMode: demo.demoMode || "",
            courseName: demo.courseName || "",
            timestamp: completedAt,
          });
        }

        return events;
      }),
    ]
      .filter((item) => item.timestamp)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      );

    // Serialize batches.
    const batchIds = new Set(
      matchingBatches.map((b) => String(b._id))
    );

    const batches = matchingBatches.map((batch) => ({
      ...batch,
      _id: String(batch._id),
      courseId: String(batch.courseId || ""),
      tools: (batch.tools || []).map(String),
      trainers: (batch.trainers || []).map(String),
      studentIds: (batch.studentIds || []).map(String),
    }));

    if (
      lead.batchId &&
      ObjectId.isValid(String(lead.batchId)) &&
      !batchIds.has(String(lead.batchId))
    ) {
      const b = await batchesCollection.findOne({
        _id: new ObjectId(String(lead.batchId)),
      });

      if (b) {
        batches.push({
          ...b,
          _id: String(b._id),
          courseId: String(b.courseId || ""),
          tools: (b.tools || []).map(String),
          trainers: (b.trainers || []).map(String),
          studentIds: (b.studentIds || []).map(String),
        });
      }
    }

    // Final response.
    return NextResponse.json({
      success: true,

      lead: {
        id: String(lead._id),
        name: lead.name || "",
        phone: lead.phone || "",
        email: lead.email || "",
        status: lead.status || "",
        course: lead.course || "",
        source: lead.source || "",
        assignedTo: lead.assignedTo || null,
        createdAt: lead.createdAt || null,
        createdBy: lead.createdBy || null,
        profile: lead.profile || "",
        city: lead.city || "",
        location: lead.location || "",
        address: lead.address || "",
        from: lead.from || lead.landing_page || "",
        tags: lead.tags || [],
        otherCourses: lead.otherCourses || [],
        batchId: lead.batchId || null,
        comments: notes,
      },

      totalInteractions: timeline.length,
      timeline,

      tasks: tasks.map((task) => serialize(task, id)),
      notes,
      followUps: followUps.map((item) => serialize(item, id)),

      // Demo request history
      demoRequests: demoRequests.map((demo) =>
        serializeDemoRequest(demo, id)
      ),

      batch: batches,
    });
  } catch (err) {
    console.error("Lead timeline GET error:", err);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load lead timeline",
        detail: err.message,
      },
      { status: 500 }
    );
  }
}

// Update lead location fields.
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const allowed = ["city", "location", "address"];
    const updates = {};

    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, field)) {
        updates[field] = String(body[field] ?? "").trim();
      }
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        {
          success: false,
          message: "No location fields provided",
        },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    const client = await clientPromise;

    const result = await client
      .db("sales")
      .collection("dm")
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

    if (!result.matchedCount) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Location updated",
      updates,
    });
  } catch (err) {
    console.error("Lead timeline PATCH error:", err);

    return NextResponse.json(
      { success: false, message: err.message || "Update failed" },
      { status: 500 }
    );
  }
}
