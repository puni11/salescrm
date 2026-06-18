import clientPromise from "@/lib/mongodb"

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)

    const page = parseInt(searchParams.get("page") || "1")
    const search = searchParams.get("search") || ""

    const limit = 10
    const skip = (page - 1) * limit

    const client = await clientPromise
    const db = client.db("internal")

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { mobile: { $regex: search, $options: "i" } }
          ]
        }
      : {}

    const users = await db
      .collection("users")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    const total = await db.collection("users").countDocuments(query)

    return Response.json({
      users,
      total,
      pages: Math.ceil(total / limit)
    })
  } catch (error) {
    return Response.json({ error: error.message })
  }
}