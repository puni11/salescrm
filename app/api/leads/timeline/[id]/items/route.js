
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const COLLECTIONS = {
  task: "tasks",
  followUp: "followUp",
};

function parseId(value) {
  return ObjectId.isValid(String(value || ""))
    ? new ObjectId(String(value))
    : null;
}

function cleanBody(body, kind, isUpdate = false) {
  const now = new Date();

  if (kind === "task") {
    const out = {};

    if (!isUpdate || "title" in body)
      out.title = String(body.title || "").trim();

    if (!isUpdate || "description" in body)
      out.description = String(body.description || "").trim();

    if (!isUpdate || "status" in body)
      out.status = String(body.status || "Pending").trim();

    if (!isUpdate || "priority" in body)
      out.priority = String(body.priority || "Normal").trim();

    if (!isUpdate || "dueDate" in body) {
      out.dueDate = body.dueDate
        ? new Date(body.dueDate)
        : null;
    }

    return { ...out, updatedAt: now };
  }

  if (kind === "followUp") {
    const out = {};

    if (!isUpdate || "status" in body)
      out.status = String(body.status || "Pending").trim();

    if (!isUpdate || "followUpDate" in body) {
      out.followUpDate = body.followUpDate
        ? new Date(body.followUpDate)
        : null;
    }

    if (!isUpdate || "followUpTime" in body)
      out.followUpTime = String(body.followUpTime || "").trim();

    if (!isUpdate || "comment" in body)
      out.comment = String(body.comment || "").trim();

    return { ...out, updatedAt: now };
  }

  return null;
}

function serializeComment(comment, leadId) {
  const commentId = String(comment._id || comment.id || "");

  return {
    ...comment,
    _id: commentId,
    id: commentId,
    leadId: String(leadId),
    text: comment.text || "",
    content: comment.text || "",
  };
}

function getCreatedBy(body) {
  const author = body.createdBy || {};

  return {
    id: String(author.id || author._id || ""),
    name: String(author.name || author.fullName || ""),
    email: String(author.email || ""),
  };
}

// CREATE task, follow-up, or embedded lead comment
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const leadId = parseId(id);

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const kind = body.kind;

    if (!["task", "note", "followUp"].includes(kind)) {
      return NextResponse.json(
        {
          success: false,
          message: "kind must be task, note, or followUp",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");
    const leads = db.collection("dm");

    const lead = await leads.findOne(
      { _id: leadId },
      { projection: { _id: 1 } }
    );

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    // COMMENTS: save directly in sales.dm.comments.
    if (kind === "note") {
      const text = String(body.content || body.text || "").trim();

      if (!text) {
        return NextResponse.json(
          { success: false, message: "Comment text is required" },
          { status: 400 }
        );
      }

      const createdBy = getCreatedBy(body);

      if (!createdBy.id || !createdBy.name) {
        return NextResponse.json(
          {
            success: false,
            message: "Counsellor ID and name are required",
          },
          { status: 400 }
        );
      }

      const comment = {
        _id: new ObjectId(),
        text,
        createdAt: new Date(),
        createdBy,
      };

      const result = await leads.updateOne(
        { _id: leadId },
        { $push: { comments: comment } }
      );

      if (!result.matchedCount) {
        return NextResponse.json(
          { success: false, message: "Lead not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Comment added successfully",
          item: serializeComment(comment, id),
        },
        { status: 201 }
      );
    }

    // TASKS AND FOLLOW-UPS: preserve existing collection storage.
    const fields = cleanBody(body, kind);

    if (kind === "task" && !fields.title) {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      );
    }

    if (kind === "followUp" && !fields.followUpDate) {
      return NextResponse.json(
        { success: false, message: "Follow-up date is required" },
        { status: 400 }
      );
    }

    const doc = {
      ...fields,
      leadId,
      createdAt: new Date(),
    };

    const result = await db
      .collection(COLLECTIONS[kind])
      .insertOne(doc);

    return NextResponse.json(
      {
        success: true,
        item: {
          ...doc,
          _id: String(result.insertedId),
          id: String(result.insertedId),
          leadId: String(leadId),
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Lead timeline item POST error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Create failed",
      },
      { status: 500 }
    );
  }
}

// UPDATE task, follow-up, or embedded comment
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const leadId = parseId(id);

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const kind = body.kind;

    const client = await clientPromise;
    const db = client.db("sales");

    if (kind === "note") {
      const itemId = parseId(body.itemId);
      const text = String(body.content || body.text || "").trim();

      if (!itemId) {
        return NextResponse.json(
          { success: false, message: "Valid comment ID is required" },
          { status: 400 }
        );
      }

      if (!text) {
        return NextResponse.json(
          { success: false, message: "Comment text is required" },
          { status: 400 }
        );
      }

      const result = await db.collection("dm").updateOne(
        {
          _id: leadId,
          "comments._id": itemId,
        },
        {
          $set: {
            "comments.$.text": text,
            "comments.$.updatedAt": new Date(),
          },
        }
      );

      if (!result.matchedCount) {
        return NextResponse.json(
          {
            success: false,
            message: "Comment not found for this lead",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Comment updated successfully",
      });
    }

    if (!COLLECTIONS[kind]) {
      return NextResponse.json(
        { success: false, message: "Invalid kind" },
        { status: 400 }
      );
    }

    const itemId = parseId(body.itemId);

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: "Valid itemId is required" },
        { status: 400 }
      );
    }

    const fields = cleanBody(body, kind, true);

    if (kind === "task" && "title" in fields && !fields.title) {
      return NextResponse.json(
        { success: false, message: "Task title is required" },
        { status: 400 }
      );
    }

    const result = await db
      .collection(COLLECTIONS[kind])
      .updateOne(
        { _id: itemId, leadId },
        { $set: fields }
      );

    if (!result.matchedCount) {
      return NextResponse.json(
        { success: false, message: "Item not found for this lead" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err) {
    console.error("Lead timeline item PATCH error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Update failed",
      },
      { status: 500 }
    );
  }
}

// DELETE task, follow-up, or embedded comment
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const leadId = parseId(id);

    if (!leadId) {
      return NextResponse.json(
        { success: false, message: "Invalid Lead ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const kind = searchParams.get("kind");
    const rawItemId = searchParams.get("itemId");

    const client = await clientPromise;
    const db = client.db("sales");

    if (kind === "note") {
      const itemId = parseId(rawItemId);

      if (!itemId) {
        return NextResponse.json(
          { success: false, message: "Valid comment ID is required" },
          { status: 400 }
        );
      }

      const result = await db.collection("dm").updateOne(
        {
          _id: leadId,
          "comments._id": itemId,
        },
        {
          $pull: {
            comments: { _id: itemId },
          },
        }
      );

      if (!result.matchedCount) {
        return NextResponse.json(
          {
            success: false,
            message: "Comment not found for this lead",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Comment deleted successfully",
      });
    }

    if (!COLLECTIONS[kind]) {
      return NextResponse.json(
        { success: false, message: "Invalid kind" },
        { status: 400 }
      );
    }

    const itemId = parseId(rawItemId);

    if (!itemId) {
      return NextResponse.json(
        { success: false, message: "Valid itemId is required" },
        { status: 400 }
      );
    }

    const result = await db
      .collection(COLLECTIONS[kind])
      .deleteOne({ _id: itemId, leadId });

    if (!result.deletedCount) {
      return NextResponse.json(
        { success: false, message: "Item not found for this lead" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("Lead timeline item DELETE error:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Delete failed",
      },
      { status: 500 }
    );
  }
}
