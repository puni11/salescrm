
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "tools";
const VALID_STATUSES = ["active", "inactive"];

async function getCollection() {
  const client = await clientPromise;
  const db = client.db("sales");
  return db.collection(COLLECTION);
}

// GET: Fetch all tools or a single tool
// Examples: /api/tools
//           /api/tools?status=active
//           /api/tools?id=TOOL_ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");

    const collection = await getCollection();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid tool ID" },
          { status: 400 }
        );
      }

      const tool = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!tool) {
        return NextResponse.json(
          { success: false, message: "Tool not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: tool,
      });
    }

    const filter = {};

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Status must be active or inactive",
          },
          { status: 400 }
        );
      }

      filter.status = status;
    }

    const tools = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: tools.length,
      data: tools,
    });
  } catch (error) {
    console.error("Get tools error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch tools" },
      { status: 500 }
    );
  }
}

// POST: Create a new tool
// Body: { "name": "WhatsApp", "status": "active" }
export async function POST(request) {
  try {
    const body = await request.json();
    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    const status = body.status ?? "active";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Tool name is required" },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be active or inactive",
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const existingTool = await collection.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existingTool) {
      return NextResponse.json(
        { success: false, message: "A tool with this name already exists" },
        { status: 409 }
      );
    }

    const now = new Date();

    const tool = {
      name,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(tool);

    return NextResponse.json(
      {
        success: true,
        message: "Tool created successfully",
        data: {
          _id: result.insertedId,
          ...tool,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create tool error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create tool" },
      { status: 500 }
    );
  }
}

// PATCH: Update a tool's name or status
// URL: /api/tools?id=TOOL_ID
// Body: { "name": "Updated Name", "status": "inactive" }
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid tool ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { success: false, message: "Tool name cannot be empty" },
          { status: 400 }
        );
      }

      updates.name = body.name.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Status must be active or inactive",
          },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Provide a name or status to update",
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const objectId = new ObjectId(id);

    const existingTool = await collection.findOne({ _id: objectId });

    if (!existingTool) {
      return NextResponse.json(
        { success: false, message: "Tool not found" },
        { status: 404 }
      );
    }

    if (updates.name) {
      const duplicate = await collection.findOne({
        _id: { $ne: objectId },
        name: {
          $regex: `^${updates.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "A tool with this name already exists",
          },
          { status: 409 }
        );
      }
    }

    updates.updatedAt = new Date();

    await collection.updateOne(
      { _id: objectId },
      { $set: updates }
    );

    const updatedTool = await collection.findOne({ _id: objectId });

    return NextResponse.json({
      success: true,
      message: "Tool updated successfully",
      data: updatedTool,
    });
  } catch (error) {
    console.error("Update tool error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update tool" },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete a tool
// URL: /api/tools?id=TOOL_ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid tool ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Tool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tool deleted successfully",
    });
  } catch (error) {
    console.error("Delete tool error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete tool" },
      { status: 500 }
    );
  }
}
