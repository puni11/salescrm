import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function POST(req, { params }) {
  try {
    // ================= AUTH =================
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin") {
      return Response.json(
        {
          success: false,
          unauthorized: true,
        },
        { status: 401 }
      );
    }

    // ================= PARAMS =================
    const { id } = await params;

    const body = await req.json();

    const text = body?.text?.trim();

    // ================= VALIDATION =================
    if (!id) {
      return Response.json(
        {
          success: false,
          message: "Lead ID is required",
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(id)) {
      return Response.json(
        {
          success: false,
          message: "Invalid Lead ID",
        },
        { status: 400 }
      );
    }

    if (!text) {
      return Response.json(
        {
          success: false,
          message: "Comment is required",
        },
        { status: 400 }
      );
    }

    // ================= DATABASE =================
    const client = await clientPromise;

    const db = client.db("sales");

    // ================= COMMENT OBJECT =================
    const comment = {
      _id: new ObjectId(),

      text,

      createdAt: new Date(),

      createdBy: {
        name: session.user.name || "Admin",
        email: session.user.email || "",
      },
    };

    // ================= UPDATE =================
    const result = await db.collection("dm").updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $push: {
          comments: comment,
        },

        $set: {
          updatedAt: new Date(),
        },
      }
    );

    // ================= NOT FOUND =================
    if (result.matchedCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Lead not found",
        },
        { status: 404 }
      );
    }

    // ================= RESPONSE =================
    return Response.json({
      success: true,
      message: "Comment added successfully",
      comment,
    });

  } catch (error) {
    console.error("ADD COMMENT ERROR:", error);

    return Response.json(
      {
        success: false,
        error: true,
        message: "Something went wrong",
      },
      {
        status: 500,
      }
    );
  }
}