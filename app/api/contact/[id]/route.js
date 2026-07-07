import { authOptions } from "@/lib/authOptions"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getServerSession } from "next-auth"
export async function PUT(req, { params }) {
  try {
    const { id } = await params
    const body = await req.json()

    const client = await clientPromise
    const db = client.db("sales")

    await db.collection("dm").updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: body.status } }
    )

    return Response.json({ success: true })

  } catch (error) {
    console.error(error)
    return Response.json({ error: true })
  }
}

export async function DELETE(req, { params }) {
  try {
     const session = await getServerSession(authOptions);
    console.log(session);
    
    if (!session.user.role !== "admin") {
      return Response.json({ success: false, message: "You are Not Authorised" }, { status: 401 });
    }
    const { id } = await params;

    const client = await clientPromise;
    const db = client.db("sales");

    const result = await db.collection("dm").deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return Response.json(
        {
          success: false,
          message: "Lead not found",
        },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        success: false,
        message: "Failed to delete lead",
      },
      { status: 500 }
    );
  }
}