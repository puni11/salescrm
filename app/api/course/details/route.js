
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const VALID_STATUSES = ["active", "inactive"];

async function getCollection() {
  const client = await clientPromise;
  return client.db("sales").collection("courses");
}

function validateCourse(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const categoryId = body.categoryId;
  const hours = Number(body.hours);
  const price = Number(body.price);
  const trainerIds = body.trainerIds ?? [];
  const status = body.status ?? "active";

  if (!name) return { error: "Course name is required" };

  if (!categoryId || !ObjectId.isValid(categoryId)) {
    return { error: "A valid category is required" };
  }

  if (
    body.hours === undefined ||
    body.hours === null ||
    body.hours === "" ||
    !Number.isFinite(hours) ||
    hours <= 0
  ) {
    return { error: "Hours must be greater than zero" };
  }

  if (
    body.price === undefined ||
    body.price === null ||
    body.price === "" ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return { error: "Price must be zero or greater" };
  }

  if (
    !Array.isArray(trainerIds) ||
    !trainerIds.every((id) => typeof id === "string" && ObjectId.isValid(id))
  ) {
    return { error: "Trainer IDs must be valid" };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { error: "Status must be active or inactive" };
  }

  return {
    data: {
      name,
      categoryId,
      hours,
      price,
      trainerIds: [...new Set(trainerIds)],
      status,
    },
  };
}

async function validateReferences(data) {
  const client = await clientPromise;
  const db = client.db("sales");

  const category = await db.collection("categories").findOne({
    _id: new ObjectId(data.categoryId),
  });

  if (!category) return "Selected category does not exist";

  if (category.status !== "active") {
    return "Selected category is inactive";
  }

  const ids = data.trainerIds.map((id) => new ObjectId(id));

  if (ids.length) {
    const trainers = await db.collection("trainers")
      .find({ _id: { $in: ids } })
      .toArray();

    if (trainers.length !== ids.length) {
      return "One or more selected trainers do not exist";
    }

    if (trainers.some((trainer) => trainer.status !== "active")) {
      return "Selected trainers must be active";
    }
  }

  return null;
}

// GET /api/course
// GET /api/course?status=active
// GET /api/course?id=COURSE_ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");
    const collection = await getCollection();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid course ID" },
          { status: 400 }
        );
      }

      const course = await collection.findOne({ _id: new ObjectId(id) });

      if (!course) {
        return NextResponse.json(
          { success: false, message: "Course not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: course });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Status must be active or inactive" },
        { status: 400 }
      );
    }

    const courses = await collection
      .find(status ? { status } : {})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    console.error("Get courses error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// POST /api/course
export async function POST(request) {
  try {
    const body = await request.json();
    const validation = validateCourse(body);

    if (validation.error) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const referenceError = await validateReferences(validation.data);

    if (referenceError) {
      return NextResponse.json(
        { success: false, message: referenceError },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const name = validation.data.name;

    const duplicate = await collection.findOne({
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A course with this name already exists" },
        { status: 409 }
      );
    }

    const now = new Date();
    const course = {
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(course);

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully",
        data: { _id: result.insertedId, ...course },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create course" },
      { status: 500 }
    );
  }
}

// PATCH /api/course?id=COURSE_ID
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid course ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const objectId = new ObjectId(id);
    const existing = await collection.findOne({ _id: objectId });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateCourse({
      ...existing,
      ...body,
      categoryId: body.categoryId ?? existing.categoryId,
      trainerIds: body.trainerIds ?? existing.trainerIds,
      hours: body.hours ?? existing.hours,
      price: body.price ?? existing.price,
      status: body.status ?? existing.status,
    });

    if (validation.error) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const referenceError = await validateReferences(validation.data);

    if (referenceError) {
      return NextResponse.json(
        { success: false, message: referenceError },
        { status: 400 }
      );
    }

    const duplicate = await collection.findOne({
      _id: { $ne: objectId },
      name: {
        $regex: `^${validation.data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "A course with this name already exists" },
        { status: 409 }
      );
    }

    await collection.updateOne(
      { _id: objectId },
      { $set: { ...validation.data, updatedAt: new Date() } }
    );

    const course = await collection.findOne({ _id: objectId });

    return NextResponse.json({
      success: true,
      message: "Course updated successfully",
      data: course,
    });
  } catch (error) {
    console.error("Update course error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update course" },
      { status: 500 }
    );
  }
}

// DELETE /api/course?id=COURSE_ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "A valid course ID is required" },
        { status: 400 }
      );
    }

    const collection = await getCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });

    if (!result.deletedCount) {
      return NextResponse.json(
        { success: false, message: "Course not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("Delete course error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete course" },
      { status: 500 }
    );
  }
}
