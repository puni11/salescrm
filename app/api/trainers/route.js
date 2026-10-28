
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const VALID_STATUSES = ["active", "inactive"];

async function getCollection() {
  const client = await clientPromise;
  return client.db("sales").collection("trainers");
}

function validateTrainer(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const experience = Number(body.experience);
  const tools = Array.isArray(body.tools) ? body.tools : null;
  const status = body.status ?? "active";

  if (!name) return { error: "Trainer name is required" };

  if (
    body.experience === undefined ||
    body.experience === null ||
    body.experience === "" ||
    !Number.isFinite(experience) ||
    experience < 0
  ) {
    return { error: "Valid years of experience are required" };
  }

  if (!tools || !tools.every(
    (id) => typeof id === "string" && ObjectId.isValid(id)
  )) {
    return { error: "Tools must be an array of valid tool IDs" };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Status must be active or inactive" };
  }

  return {
    data: {
      name,
      experience,
      tools: [...new Set(tools)],
      status,
    },
  };
}

// GET /api/trainers
// GET /api/trainers?status=active
// GET /api/trainers?id=TRAINER_ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const collection = await getCollection();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid trainer ID" },
          { status: 400 }
        );
      }

      const trainer = await collection.findOne({ _id: new ObjectId(id) });

      if (!trainer) {
        return NextResponse.json(
          { success: false, message: "Trainer not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: trainer });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be active or inactive" },
        { status: 400 }
      );
    }

    const trainers = await collection
      .find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: trainers.length,
      data: trainers,
    });
  } catch (error) {
    console.error("Get trainers error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch trainers" },
      { status: 500 }
    );
  }
}

// POST /api/trainers
// { name, experience, tools: ["TOOL_ID"], status }
export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateTrainer(body);

    if (validation.error) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const { name } = validation.data;

    const duplicate = await collection.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A trainer with this name already exists" },
        { status: 409 }
      );
    }

    // Confirm that every selected tool exists.
    const client = await clientPromise;
    const toolsCollection = client.db("sales").collection("tools");
    const toolIds = validation.data.tools.map((id) => new ObjectId(id));
    const foundTools = await toolsCollection.countDocuments({
      _id: { $in: toolIds },
    });

    if (foundTools !== toolIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more selected tools do not exist" },
        { status: 400 }
      );
    }

    const now = new Date();
    const trainer = {
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(trainer);

    return NextResponse.json(
      {
        success: true,
        message: "Trainer created successfully",
        data: { _id: result.insertedId, ...trainer },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create trainer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create trainer" },
      { status: 500 }
    );
  }
}

// PATCH /api/trainers?id=TRAINER_ID
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid trainer ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const existing = await collection.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Trainer not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const merged = {
      name: body.name ?? existing.name,
      experience: body.experience ?? existing.experience,
      tools: body.tools ?? existing.tools,
      status: body.status ?? existing.status,
    };

    const validation = validateTrainer(merged);

    if (validation.error) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const updates = validation.data;

    const duplicate = await collection.findOne({
      _id: { $ne: new ObjectId(id) },
      name: {
        $regex: `^${updates.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A trainer with this name already exists" },
        { status: 409 }
      );
    }

    const client = await clientPromise;
    const toolsCollection = client.db("sales").collection("tools");
    const toolIds = updates.tools.map((toolId) => new ObjectId(toolId));
    const foundTools = await toolsCollection.countDocuments({
      _id: { $in: toolIds },
    });

    if (foundTools !== toolIds.length) {
      return NextResponse.json(
        { success: false, message: "One or more selected tools do not exist" },
        { status: 400 }
      );
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    const trainer = await collection.findOne({ _id: new ObjectId(id) });

    return NextResponse.json({
      success: true,
      message: "Trainer updated successfully",
      data: trainer,
    });
  } catch (error) {
    console.error("Update trainer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update trainer" },
      { status: 500 }
    );
  }
}

// DELETE /api/trainers?id=TRAINER_ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid trainer ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json(
        { success: false, message: "Trainer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trainer deleted successfully",
    });
  } catch (error) {
    console.error("Delete trainer error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete trainer" },
      { status: 500 }
    );
  }
}
