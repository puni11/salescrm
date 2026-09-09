import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { getUserFromToken } from "@/lib/getUserFromToken";

export async function POST(req, { params }) {
  try {
    // ================= AUTH FROM TOKEN =================
    const auth = await getUserFromToken(req);

    if (!auth.success) {
      return Response.json(
        {
          success: false,
          message: auth.message,
        },
        {
          status: auth.status,
        }
      );
    }

    const user = auth.user;

    // ================= PARAMS =================
    const { id } = await params;

    // ================= BODY =================
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

    // ================= COMMENT =================
    const comment = {
      _id: new ObjectId(),

      text,

      createdAt: new Date(),

      createdBy: {
        id: user._id?.toString() || user.id || "",
        name: user.name || "Admin",
        email: user.email || "",
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