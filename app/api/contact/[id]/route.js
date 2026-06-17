import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
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