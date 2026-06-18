import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(req) {
  try {
    const { id, field, value } = await req.json()

    const client = await clientPromise
    const db = client.db("internal")

    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: { [field]: value } }
    )

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message })
  }
}