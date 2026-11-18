import { getLeadAssignment } from "@/lib/leadAssignment";
import clientPromise from "@/lib/mongodb";

export async function saveGoogleAdsLead(payload) {
  const client = await clientPromise;

  const db = client.db("internal");
  const db2 = client.db("sales");

  const formId = String(payload.form_id);

  // Find saved mapping for this Google Ads form
  const config = await db
    .collection("google_ads_form_mappings")
    .findOne({
      formId: formId,
      enabled: true,
    });

  if (!config) {
    throw new Error(
      `No enabled mapping found for Google Ads form ${formId}`
    );
  }

  const crmLead = {};
  const unmappedFields = {};

  // Map incoming Google Ads fields
  for (const field of payload.user_column_data || []) {
    const columnId = field.column_id || "";
    const columnName = field.column_name || "";
    const value = field.string_value ?? "";

    // Match by Google's standard column ID first,
    // then by human-readable custom question name.
    const crmField =
      config.mapping?.[columnId] ||
      config.mapping?.[columnName] ||
      config.mapping?.[columnName.trim()];

    if (crmField) {
      crmLead[crmField] = value;
    } else {
      unmappedFields[columnName || columnId] = value;
    }
  }

  // Apply configured defaults
  Object.assign(crmLead, config.defaults || {});

  crmLead.otherFields = unmappedFields;

  // Course-based lead assignment
  const assignedTo = await getLeadAssignment(
    db2,
    db,
    crmLead.course
  );

  crmLead.assignedTo = assignedTo;

  // CRM system fields
  crmLead.consent = true;
  crmLead.medium = "cpc";
  crmLead.campaign = payload.campaign_id
    ? String(payload.campaign_id)
    : "";
  crmLead.term = "";
  crmLead.content = "";
  crmLead.gclid = payload.gcl_id || "";
  crmLead.fbclid = "";
  crmLead.landing_page = "";
  crmLead.page_path = "";
  crmLead.referrer = "Google Ads";
  crmLead.ip = null;
  crmLead.userAgent = null;
  crmLead.level = "";
  crmLead.submissionCount = 1;
  crmLead.reminderLevel = 0;
  crmLead.lastReminderSentAt = null;

  crmLead.createdAt = new Date();
  crmLead.updatedAt = new Date();

  // Google Ads metadata
  crmLead.googleAds = {
    leadId: payload.lead_id,
    formId: String(payload.form_id),
    campaignId: payload.campaign_id
      ? String(payload.campaign_id)
      : null,
    adGroupId: payload.adgroup_id
      ? String(payload.adgroup_id)
      : null,
    creativeId: payload.creative_id
      ? String(payload.creative_id)
      : null,
    assetGroupId: payload.asset_group_id
      ? String(payload.asset_group_id)
      : null,
    gclid: payload.gcl_id || null,
    leadStage: payload.lead_stage || null,
    leadSource: payload.lead_source || "LEAD_FORM",
    submittedAt: payload.lead_submit_time || null,
  };

  // Prevent duplicate Google lead ID
  const existingGoogleLead = await db2.collection("dm").findOne({
    "googleAds.leadId": payload.lead_id,
  });

  if (existingGoogleLead) {
    return {
      success: true,
      duplicate: true,
      reason: "Google Ads lead ID already exists",
      lead: existingGoogleLead,
    };
  }

  // Duplicate phone check
  let existingLead = null;

  if (crmLead.phone) {
    const phone = String(crmLead.phone).trim();

    existingLead = await db2.collection("dm").findOne({
      phone,
    });
  }

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
      reason: "Phone number already exists",
      lead: existingLead,
    };
  }

  // Insert new CRM lead
  const result = await db2.collection("dm").insertOne(crmLead);

  return {
    success: true,
    duplicate: false,
    insertedId: result.insertedId,
    lead: crmLead,
  };
}