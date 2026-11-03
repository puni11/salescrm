
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const client = await clientPromise;
    const db = client.db("sales");
    const leadsCollection = db.collection("dm");

    const updateFields = {
      updatedAt: new Date(),
    };

    // Update primary status
    if (typeof body.status === "string" && body.status.trim()) {
      updateFields.status = body.status.trim();
    }

    // Allow only one tag
    if (Array.isArray(body.tags)) {
      const validTags = body.tags.filter(
        (tag) => typeof tag === "string" && tag.trim()
      );

      updateFields.tags = validTags.length
        ? [validTags[validTags.length - 1].trim()]
        : [];
    }

    if (Object.keys(updateFields).length === 1) {
      return Response.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      );
    }

    const result = await leadsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return Response.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    const updatedLead = await leadsCollection.findOne({
      _id: new ObjectId(id),
    });

    return Response.json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead,
    });

  } catch (error) {
    console.error("UPDATE_LEAD_ERROR:", error);

    return Response.json(
      { success: false, message: "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return Response.json(
        { success: false, message: "Unauthorised" },
        { status: 401 }
      );
    }

    if (session.user.role !== "admin") {
      return Response.json(
        { success: false, message: "You are not authorised" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return Response.json(
        { success: false, message: "Invalid lead ID" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const result = await db.collection("dm").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return Response.json(
        { success: false, message: "Lead not found" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("DELETE_LEAD_ERROR:", error);

    return Response.json(
      { success: false, message: "Failed to delete lead" },
      { status: 500 }
    );
  }
}