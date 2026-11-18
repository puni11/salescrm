export async function findDuplicateLead(db, lead) {
  const leadsCollection = db.collection("leads");

  // 1. Exact Google Ads submission ID
  if (lead.googleLeadId) {
    const existingByGoogleId = await leadsCollection.findOne({
      googleLeadId: lead.googleLeadId,
    });

    if (existingByGoogleId) {
      return {
        duplicate: true,
        reason: "googleLeadId",
        existingLead: existingByGoogleId,
      };
    }
  }

  // 2. Phone number match
  if (lead.phone) {
    const normalizedPhone = String(lead.phone).replace(/\D/g, "");

    const existingLeads = await leadsCollection.find({
      phone: { $exists: true, $ne: "" },
    }).toArray();

    const existingByPhone = existingLeads.find((existing) => {
      const existingPhone = String(existing.phone || "")
        .replace(/\D/g, "");

      return existingPhone === normalizedPhone;
    });

    if (existingByPhone) {
      return {
        duplicate: true,
        reason: "phone",
        existingLead: existingByPhone,
      };
    }
  }

  // 3. Email match
  if (lead.email) {
    const existingByEmail = await leadsCollection.findOne({
      email: {
        $regex: `^${lead.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });

    if (existingByEmail) {
      return {
        duplicate: true,
        reason: "email",
        existingLead: existingByEmail,
      };
    }
  }

  return {
    duplicate: false,
    reason: null,
    existingLead: null,
  };
}