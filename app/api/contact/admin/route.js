import clientPromise from "@/lib/mongodb"

export async function POST(req) {
  try {
    const body = await req.json()

    const {
      name,
      email,
      phone,
      profile,
      consent,
      source,
      medium,
      campaign,
      term,
      content,
      gclid
    } = body

    // 1. Core Field Validation
    if (!name || !phone) {
      return Response.json({ error: "Missing required contact fields" }, { status: 400 })
    }

    // 2. Extract Server-Side Metadata from Headers (with fallbacks)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || req.ip || "::1"
    const userAgent = req.headers.get("user-agent") || ""

    const client = await clientPromise
    const db = client.db("sales")

    // 3. Build New Lead Document following the updated model
    const now = new Date()
    const newLead = {
      name,
      email: email || "",
      phone,
      profile: profile || "other",
      consent: Boolean(consent),
      source: source || "",
      medium: medium || "",
      campaign: campaign || "",
      term: term || "",
      content: content || "",
      gclid: gclid || "",
      ip,
      userAgent,
      status: "New Lead",
      comments: [],
      createdAt: now,
      updatedAt: now
    }

    await db.collection("dm").insertOne(newLead)

    return Response.json({ success: true })

  } catch (error) {
    console.error("Database Insert Error:", error)
    return Response.json({ error: true, message: error.message }, { status: 500 })
  }
}