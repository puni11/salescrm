import clientPromise from "@/lib/mongodb";

export async function searchLead({ query, context }) {
  const client = await clientPromise;
  const db = client.db("sales");
context.session.lastSearch = leads;
 context.session.lastTool = "searchLead";

  const search = query.trim();

  const leads = await db
    .collection("dm")
    .find({
      $or: [
        {
          fullName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          phone: {
            $regex: search,
            $options: "i",
          },
        },
        {
          leadId: {
            $regex: search,
            $options: "i",
          },
        },
      ],
    })
    .limit(5)
    .toArray();

  return {
    success: true,
    total: leads.length,
    leads: leads.map((lead) => ({
      id: lead._id.toString(),
      name: lead.fullName,
      phone: lead.phone,
      email: lead.email,
      course: lead.course,
      status: lead.status,
    })),
  };
}