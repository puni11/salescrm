
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { hash } from "bcryptjs";
import clientPromise from "@/lib/mongodb";

const VALID_STATUSES = ["active", "inactive"];

async function getCollection() {
  const client = await clientPromise;
  return client.db("sales").collection("trainers");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Never expose password or passwordHash
function safeTrainer(trainer) {
  if (!trainer) return null;

  const {
    password,
    passwordHash,
    ...safeData
  } = trainer;

  return safeData;
}

// Validate trainer profile
function validateTrainer(body) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const experience = Number(body.experience);

  const tools = Array.isArray(body.tools) ? body.tools : null;

  const status = body.status ?? "active";

  if (!name) {
    return { error: "Trainer name is required" };
  }

  if (
    body.experience === undefined ||
    body.experience === null ||
    body.experience === "" ||
    !Number.isFinite(experience) ||
    experience < 0
  ) {
    return {
      error: "Valid years of experience are required",
    };
  }

  if (
    !tools ||
    !tools.every(
      (id) => typeof id === "string" && ObjectId.isValid(id)
    )
  ) {
    return {
      error: "Tools must be an array of valid tool IDs",
    };
  }

  if (!VALID_STATUSES.includes(status)) {
    return {
      error: "Status must be active or inactive",
    };
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

// Validate username
function validateUsername(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      error: "Username is required",
    };
  }

  const username = value.trim().toLowerCase();

  if (username.length < 3 || username.length > 30) {
    return {
      error: "Username must be between 3 and 30 characters",
    };
  }

  if (!/^[a-z0-9._-]+$/.test(username)) {
    return {
      error:
        "Username can only contain letters, numbers, dots, underscores and hyphens",
    };
  }

  return { data: username };
}

// Validate password
function validatePassword(value) {
  if (typeof value !== "string" || !value.trim()) {
    return {
      error: "Password is required",
    };
  }

  if (value.length < 8) {
    return {
      error: "Password must contain at least 8 characters",
    };
  }

  if (value.length > 128) {
    return {
      error: "Password cannot exceed 128 characters",
    };
  }

  return { data: value };
}

// Check selected tools
async function validateTools(toolIds) {
  const client = await clientPromise;

  const toolsCollection = client
    .db("sales")
    .collection("tools");

  const ids = toolIds.map((id) => new ObjectId(id));

  const count = await toolsCollection.countDocuments({
    _id: { $in: ids },
  });

  return count === ids.length;
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
          {
            success: false,
            message: "Invalid trainer ID",
          },
          { status: 400 }
        );
      }

      const trainer = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!trainer) {
        return NextResponse.json(
          {
            success: false,
            message: "Trainer not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: safeTrainer(trainer),
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          message: "Status must be active or inactive",
        },
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
      data: trainers.map(safeTrainer),
    });
  } catch (error) {
    console.error("Get trainers error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch trainers",
      },
      { status: 500 }
    );
  }
}

// POST /api/trainers
// {
//   name,
//   username,
//   password,
//   experience,
//   tools,
//   status
// }
export async function POST(request) {
  try {
    const body = await request.json();

    const validation = validateTrainer(body);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    // Validate username
    const usernameValidation = validateUsername(body.username);

    if (usernameValidation.error) {
      return NextResponse.json(
        {
          success: false,
          message: usernameValidation.error,
        },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(body.password);

    if (passwordValidation.error) {
      return NextResponse.json(
        {
          success: false,
          message: passwordValidation.error,
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const { name } = validation.data;
    const username = usernameValidation.data;

    // Check duplicate name
    const duplicateName = await collection.findOne({
      name: {
        $regex: `^${escapeRegex(name)}$`,
        $options: "i",
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        {
          success: false,
          message: "A trainer with this name already exists",
        },
        { status: 409 }
      );
    }

    // Check duplicate username
    const duplicateUsername = await collection.findOne({
      username,
    });

    if (duplicateUsername) {
      return NextResponse.json(
        {
          success: false,
          message: "This username is already taken",
        },
        { status: 409 }
      );
    }

    // Validate tools
    const toolsValid = await validateTools(
      validation.data.tools
    );

    if (!toolsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected tools do not exist",
        },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await hash(
      passwordValidation.data,
      12
    );

    const now = new Date();

    const trainer = {
      ...validation.data,
      username,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(trainer);

    return NextResponse.json(
      {
        success: true,
        message: "Trainer created successfully",
        data: safeTrainer({
          _id: result.insertedId,
          ...trainer,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create trainer error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create trainer",
      },
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
        {
          success: false,
          message: "A valid trainer ID is required",
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const objectId = new ObjectId(id);

    const existing = await collection.findOne({
      _id: objectId,
    });

    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          message: "Trainer not found",
        },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Merge existing profile with new data
    const merged = {
      name: body.name ?? existing.name,
      experience: body.experience ?? existing.experience,
      tools: body.tools ?? existing.tools ?? [],
      status: body.status ?? existing.status ?? "active",
    };

    const validation = validateTrainer(merged);

    if (validation.error) {
      return NextResponse.json(
        {
          success: false,
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const updates = {
      ...validation.data,
    };

    // Check duplicate name
    const duplicateName = await collection.findOne({
      _id: { $ne: objectId },
      name: {
        $regex: `^${escapeRegex(updates.name)}$`,
        $options: "i",
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        {
          success: false,
          message: "A trainer with this name already exists",
        },
        { status: 409 }
      );
    }

    // Update username only when supplied
    if (body.username !== undefined) {
      const usernameValidation = validateUsername(
        body.username
      );

      if (usernameValidation.error) {
        return NextResponse.json(
          {
            success: false,
            message: usernameValidation.error,
          },
          { status: 400 }
        );
      }

      const username = usernameValidation.data;

      const duplicateUsername = await collection.findOne({
        _id: { $ne: objectId },
        username,
      });

      if (duplicateUsername) {
        return NextResponse.json(
          {
            success: false,
            message: "This username is already taken",
          },
          { status: 409 }
        );
      }

      updates.username = username;
    }

    // Update password only when a new password is supplied
    if (
      body.password !== undefined &&
      body.password !== ""
    ) {
      const passwordValidation = validatePassword(
        body.password
      );

      if (passwordValidation.error) {
        return NextResponse.json(
          {
            success: false,
            message: passwordValidation.error,
          },
          { status: 400 }
        );
      }

      updates.passwordHash = await hash(
        passwordValidation.data,
        12
      );
    }

    // Validate tools
    const toolsValid = await validateTools(
      updates.tools
    );

    if (!toolsValid) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more selected tools do not exist",
        },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    await collection.updateOne(
      { _id: objectId },
      {
        $set: updates,
      }
    );

    const trainer = await collection.findOne({
      _id: objectId,
    });

    return NextResponse.json({
      success: true,
      message: "Trainer updated successfully",
      data: safeTrainer(trainer),
    });
  } catch (error) {
    console.error("Update trainer error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update trainer",
      },
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
        {
          success: false,
          message: "A valid trainer ID is required",
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (!result.deletedCount) {
      return NextResponse.json(
        {
          success: false,
          message: "Trainer not found",
        },
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
      {
        success: false,
        message: "Failed to delete trainer",
      },
      { status: 500 }
    );
  }
}
