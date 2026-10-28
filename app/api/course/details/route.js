
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["active", "inactive"];
const COLLECTION = "offeringCourses";

async function getDatabases() {
  const client = await clientPromise;

  return {
    sales: client.db("sales"),
    internal: client.db("internal"),
  };
}

function validId(value) {
  return typeof value === "string" && ObjectId.isValid(value);
}

function validateCourse(body) {
  const name =
    typeof body.name === "string" ? body.name.trim() : "";
  const categoryId = body.categoryId;
  const hours = Number(body.hours);
  const price = Number(body.price);
  const status = body.status ?? "active";

  const tools = body.tools ?? [];
  const trainerIds = body.trainerIds ?? [];
  const certificationPitchCourseId =
    body.certificationPitchCourseId || "";
  const prerequisite =
    typeof body.prerequisite === "string"
      ? body.prerequisite.trim()
      : "";
  const salesCounsellorId = body.salesCounsellorId || "";

  if (!name) return { error: "Course name is required" };

  if (!validId(categoryId)) {
    return { error: "A valid category is required" };
  }

  if (
    body.hours === "" ||
    body.hours === undefined ||
    body.hours === null ||
    !Number.isFinite(hours) ||
    hours <= 0
  ) {
    return { error: "Hours must be greater than zero" };
  }

  if (
    body.price === "" ||
    body.price === undefined ||
    body.price === null ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return { error: "Price must be zero or greater" };
  }

  if (
    !Array.isArray(tools) ||
    !tools.every(validId)
  ) {
    return { error: "Tools must contain valid tool IDs" };
  }

  if (
    !Array.isArray(trainerIds) ||
    !trainerIds.every(validId)
  ) {
    return { error: "Trainer IDs must be valid" };
  }

  if (
    certificationPitchCourseId &&
    !validId(certificationPitchCourseId)
  ) {
    return { error: "Invalid certification pitch course" };
  }

  if (salesCounsellorId && !validId(salesCounsellorId)) {
    return { error: "Invalid sales counsellor" };
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
      tools: [...new Set(tools)],
      trainerIds: [...new Set(trainerIds)],
      certificationPitchCourseId,
      prerequisite,
      salesCounsellorId,
      status,
    },
  };
}

async function getOptions(sales, internal) {
  const [categories, tools, trainers, allCourses, counsellors] =
    await Promise.all([
      sales.collection("categories")
        .find({ status: "active" })
        .sort({ name: 1 })
        .toArray(),

      sales.collection("tools")
        .find({ status: "active" })
        .sort({ name: 1 })
        .toArray(),

      sales.collection("trainers")
        .find({ status: "active" })
        .sort({ name: 1 })
        .toArray(),

      sales.collection(COLLECTION)
        .find({ status: "active" })
        .sort({ name: 1 })
        .toArray(),

      internal.collection("users")
        .find({
          role: "counsellor",
          isBlocked: { $ne: true },
        })
        .project({
          name: 1,
          email: 1,
          mobile: 1,
          role: 1,
          counsellorStatus: 1,
          specialCourses: 1,
        })
        .sort({ name: 1 })
        .toArray(),
    ]);

  const certificationCategories = categories.filter(
    (category) =>
      String(category.name || "").trim().toLowerCase() ===
      "certification"
  );

  const certificationCategoryIds = new Set(
    certificationCategories.map((category) =>
      String(category._id)
    )
  );

  // Also find inactive certification categories so older records
  // can be identified, but only return active certification courses.
  const certificationCourses = allCourses.filter((course) =>
    certificationCategoryIds.has(String(course.categoryId))
  );

  return {
    categories,
    tools,
    trainers,
    certificationCourses,
    counsellors,
  };
}

async function validateReferences(sales, internal, data) {
  const category = await sales.collection("categories").findOne({
    _id: new ObjectId(data.categoryId),
  });

  if (!category) return "Selected category does not exist";

  if (category.status !== "active") {
    return "Selected category is inactive";
  }

  if (data.tools.length) {
    const foundTools = await sales.collection("tools").countDocuments({
      _id: { $in: data.tools.map((id) => new ObjectId(id)) },
      status: "active",
    });

    if (foundTools !== data.tools.length) {
      return "One or more selected tools are missing or inactive";
    }
  }

  if (data.trainerIds.length) {
    const trainerIds = data.trainerIds.map(
      (id) => new ObjectId(id)
    );

    const trainers = await sales.collection("trainers")
      .find({ _id: { $in: trainerIds } })
      .toArray();

    if (trainers.length !== trainerIds.length) {
      return "One or more selected trainers do not exist";
    }

    if (trainers.some((trainer) => trainer.status !== "active")) {
      return "Selected trainers must be active";
    }
  }

  if (data.certificationPitchCourseId) {
    const certificationCourse =
      await sales.collection(COLLECTION).findOne({
        _id: new ObjectId(data.certificationPitchCourseId),
        status: "active",
      });

    if (!certificationCourse) {
      return "Selected certification course does not exist or is inactive";
    }

    const certificationCategory =
      await sales.collection("categories").findOne({
        _id: new ObjectId(certificationCourse.categoryId),
      });

    if (
      String(certificationCategory?.name || "")
        .trim()
        .toLowerCase() !== "certification"
    ) {
      return "Certification pitch must reference a course in the Certification category";
    }
  }

  if (data.salesCounsellorId) {
    const counsellor = await internal.collection("users").findOne({
      _id: new ObjectId(data.salesCounsellorId),
      role: "counsellor",
      isBlocked: { $ne: true },
    });

    if (!counsellor) {
      return "Selected sales counsellor does not exist or is blocked";
    }
  }

  return null;
}

// GET /api/course/details
// GET /api/course/details?id=COURSE_ID
// GET /api/course/details?status=active

export async function GET(request) {
  try {
    const { sales, internal } = await getDatabases();
    const { searchParams } = new URL(request.url);

    const id = searchParams.get("id");
    const status = searchParams.get("status");

    const collection = sales.collection(COLLECTION);

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid course ID" },
          { status: 400 }
        );
      }

      const course = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!course) {
        return NextResponse.json(
          { success: false, message: "Course not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: course,
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

    const filter = status ? { status } : {};

    const [courses, options] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).toArray(),
      getOptions(sales, internal),
    ]);

    return NextResponse.json({
      success: true,
      count: courses.length,
      data: courses,
      options: {
        categories: options.categories.map((item) => ({
          _id: String(item._id),
          name: item.name,
        })),
        tools: options.tools.map((item) => ({
          _id: String(item._id),
          name: item.name,
        })),
        trainers: options.trainers.map((item) => ({
          _id: String(item._id),
          name: item.name,
          experience: item.experience ?? null,
        })),
        certificationCourses: options.certificationCourses.map(
          (item) => ({
            _id: String(item._id),
            name: item.name,
          })
        ),
        counsellors: options.counsellors.map((item) => ({
          _id: String(item._id),
          name: item.name,
          email: item.email || "",
          mobile: item.mobile || "",
          counsellorStatus: item.counsellorStatus || "",
        })),
      },
    });
  } catch (error) {
    console.error("Get courses error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// POST /api/course/details

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

    const { sales, internal } = await getDatabases();
    const data = validation.data;

    const referenceError = await validateReferences(
      sales,
      internal,
      data
    );

    if (referenceError) {
      return NextResponse.json(
        { success: false, message: referenceError },
        { status: 400 }
      );
    }

    const collection = sales.collection(COLLECTION);

    const duplicate = await collection.findOne({
      name: {
        $regex: `^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "A course with this name already exists",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const course = {
      ...data,
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

// PATCH /api/course/details?id=COURSE_ID

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

    const { sales, internal } = await getDatabases();
    const collection = sales.collection(COLLECTION);
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
      hours: body.hours ?? existing.hours,
      price: body.price ?? existing.price,
      tools: body.tools ?? existing.tools ?? [],
      trainerIds: body.trainerIds ?? existing.trainerIds ?? [],
      certificationPitchCourseId:
        body.certificationPitchCourseId ??
        existing.certificationPitchCourseId ??
        "",
      prerequisite: body.prerequisite ?? existing.prerequisite ?? "",
      salesCounsellorId:
        body.salesCounsellorId ??
        existing.salesCounsellorId ??
        "",
      status: body.status ?? existing.status,
    });

    if (validation.error) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    const data = validation.data;

    const referenceError = await validateReferences(
      sales,
      internal,
      data
    );

    if (referenceError) {
      return NextResponse.json(
        { success: false, message: referenceError },
        { status: 400 }
      );
    }

    const duplicate = await collection.findOne({
      _id: { $ne: objectId },
      name: {
        $regex: `^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message: "A course with this name already exists",
        },
        { status: 409 }
      );
    }

    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      }
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

// DELETE /api/course/details?id=COURSE_ID

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

    const { sales } = await getDatabases();
    const result = await sales.collection(COLLECTION).deleteOne({
      _id: new ObjectId(id),
    });

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
