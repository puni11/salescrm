
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "categories";
const VALID_STATUSES = ["active", "inactive"];

async function getCollection() {
  const client = await clientPromise;
  const db = client.db("sales");
  return db.collection(COLLECTION);
}

// GET: Fetch all categories or a single category
// Examples:
// /api/categories
// /api/categories?status=active
// /api/categories?id=CATEGORY_ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const status = searchParams.get("status");

    const collection = await getCollection();

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json(
          { success: false, message: "Invalid category ID" },
          { status: 400 }
        );
      }

      const category = await collection.findOne({
        _id: new ObjectId(id),
      });

      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: category,
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

    const categories = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST: Create a new category
// Body: { "name": "Marketing", "status": "active" }
export async function POST(request) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const status = body.status ?? "active";

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
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

    const escapedName = name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const existingCategory = await collection.findOne({
      name: {
        $regex: `^${escapedName}$`,
        $options: "i",
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        {
          success: false,
          message: "A category with this name already exists",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    const category = {
      name,
      status,
      createdAt: now,
      updatedAt: now,
    };

    const result = await collection.insertOne(category);

    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully",
        data: {
          _id: result.insertedId,
          ...category,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create category error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to create category" },
      { status: 500 }
    );
  }
}

// PATCH: Update a category's name or status
// URL: /api/categories?id=CATEGORY_ID
// Body: { "name": "Sales", "status": "inactive" }
export async function PATCH(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid category ID is required",
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Category name cannot be empty",
          },
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

    const existingCategory = await collection.findOne({
      _id: objectId,
    });

    if (!existingCategory) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    if (updates.name) {
      const escapedName = updates.name.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const duplicate = await collection.findOne({
        _id: { $ne: objectId },
        name: {
          $regex: `^${escapedName}$`,
          $options: "i",
        },
      });

      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            message: "A category with this name already exists",
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

    const updatedCategory = await collection.findOne({
      _id: objectId,
    });

    return NextResponse.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    console.error("Update category error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE: Permanently delete a category
// URL: /api/categories?id=CATEGORY_ID
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid category ID is required",
        },
        { status: 400 }
      );
    }

    const collection = await getCollection();

    const result = await collection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete category" },
      { status: 500 }
    );
  }
}
