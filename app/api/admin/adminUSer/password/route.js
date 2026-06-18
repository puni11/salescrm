import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import bcrypt from "bcryptjs"

export async function PUT(req) {
  try {
    const { id, password } = await req.json()

    const hash = await bcrypt.hash(password, 10)

    const client = await clientPromise
    const db = client.db("internal")

    await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          password: hash,
          lastPasswordChange: new Date()
        }
      }
    )

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: error.message })
  }
}