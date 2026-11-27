
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req, { params }) {
  try {
    // ================= AUTH =================
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    // ================= PARAMS =================
    const { id } = await params;
    const body = await req.json();

    const name = body?.name?.trim();

    // ================= VALIDATION =================
    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        {
          success: false,
          message: "Invalid student ID",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return Response.json(
        {
          success: false,
          message: "Student name is required",
        },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return Response.json(
        {
          success: false,
          message: "Student name cannot exceed 100 characters",
        },
        { status: 400 }
      );
    }

    // ================= DATABASE =================
    const client = await clientPromise;
    const db = client.db("sales");

    // ================= UPDATE =================
    const result = await db.collection("dm").findOneAndUpdate(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          name,
          updatedAt: new Date(),
        },
      },
      {
        returnDocument: "after",
        projection: {
          name: 1,
          email: 1,
          phone: 1,
          course: 1,
          updatedAt: 1,
        },
      }
    );

    const student = result?.value ?? result;

    // ================= NOT FOUND =================
    if (!student) {
      return Response.json(
        {
          success: false,
          message: "Student not found",
        },
        { status: 404 }
      );
    }

    // ================= RESPONSE =================
    return Response.json({
      success: true,
      message: "Student name updated successfully",
      student,
    });

  } catch (error) {
    console.error("CHANGE STUDENT NAME ERROR:", error);

    return Response.json(
      {
        success: false,
        error: true,
        message: "Something went wrong",
      },
      { status: 500 }
    );
  }
}
