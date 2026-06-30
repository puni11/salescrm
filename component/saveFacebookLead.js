import clientPromise from "@/lib/mongodb";

export async function saveFacebookLead(lead, webhookData) {
  const client = await clientPromise;
  const db = client.db("internal");
   const db2 = client.db("sales");

  // Get mapping for the Facebook form
  const config = await db.collection("facebook_field_mappings").findOne({
    formId: webhookData.form_id,
  });

  if (!config) {
    throw new Error(
      `No field mapping found for form ${webhookData.form_id}`
    );
  }

  const crmLead = {};

  // Map Facebook fields
  for (const field of lead.field_data || []) {
    const crmField = config.mapping[field.name];

    if (!crmField) continue;

    crmLead[crmField] = field.values?.[0] ?? "";
  }

  // Apply default values
  Object.assign(crmLead, config.defaults);

  // System values
  crmLead.consent = true;
  crmLead.medium = "facebook";
  crmLead.campaign = "";
  crmLead.term = "";
  crmLead.content = "";
  crmLead.gclid = "";
  crmLead.fbclid = "";
  crmLead.landing_page = "";
  crmLead.page_path = "";
  crmLead.referrer = "Facebook";
  crmLead.ip = null;
  crmLead.userAgent = null;
  crmLead.level = "";
  crmLead.submissionCount = 1;
  crmLead.reminderLevel = 0;
  crmLead.lastReminderSentAt = null;
  crmLead.createdAt = new Date();
  crmLead.updatedAt = new Date();

  // Store Facebook metadata
  crmLead.facebook = {
    pageId: webhookData.page_id,
    formId: webhookData.form_id,
    leadId: lead.id,
    adId: lead.ad_id || null,
    createdTime: lead.created_time,
  };

  // Check duplicate
  const existingLead = await db2.collection("dm").findOne({
    $or: [
      { email: crmLead.email },
      { phone: crmLead.phone },
    ],
  });

  if (existingLead) {
    await db2.collection("dm").updateOne(
      { _id: existingLead._id },
      {
        $set: {
          updatedAt: new Date(),
        },
        $inc: {
          submissionCount: 1,
        },
      }
    );

    return {
      success: true,
      duplicate: true,
      lead: existingLead,
    };
  }

  const result = await db2.collection("dm").insertOne(crmLead);

  return {
    success: true,
    duplicate: false,
    insertedId: result.insertedId,
    lead: crmLead,
  };
}