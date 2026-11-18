export function mapGoogleAdsSubmission(submission) {
  const fields = submission.leadFormSubmissionFields || [];
  const customFields =
    submission.customLeadFormSubmissionFields || [];

  const mapped = {};

  for (const field of fields) {
    const type = String(field.fieldType || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    const value = field.fieldValue || "";

    if (!value) continue;

    if (type.includes("FULLNAME")) {
      mapped.name = value;
    } else if (type.includes("FIRSTNAME")) {
      mapped.firstName = value;
    } else if (type.includes("LASTNAME")) {
      mapped.lastName = value;
    } else if (type.includes("EMAIL")) {
      mapped.email = value;
    } else if (type.includes("PHONE")) {
      mapped.phone = value;
    } else if (type.includes("CITY")) {
      mapped.city = value;
    }
  }

  // Build name if Google gives first and last name separately
  if (!mapped.name) {
    mapped.name = [mapped.firstName, mapped.lastName]
      .filter(Boolean)
      .join(" ");
  }

  // Store custom questions and answers
  const customAnswers = customFields.map((field) => ({
    question: field.customQuestion || "",
    answer: field.fieldValue || "",
  }));

  const customContent = customAnswers
    .map(({ question, answer }) => `${question}: ${answer}`)
    .join("\n");

  return {
    name: mapped.name || "",
    phone: mapped.phone || "",
    email: mapped.email || "",
    city: mapped.city || "",

    source: "Google Ads",
    medium: "cpc",

    status: "New Lead",

    gclid: submission.gclid || "",

    content: customContent,

    // Keep Google IDs for tracking/deduplication
    googleLeadId: submission.id || "",
    googleLeadResourceName: submission.resourceName || "",

    googleCampaignResource: submission.campaign || "",
    googleAdGroupResource: submission.adGroup || "",
    googleAdResource: submission.adGroupAd || "",
    googleFormResource: submission.asset || "",

    customAnswers,

    leadSubmissionDate:
      submission.submissionDateTime || null,

    googleAdsRaw: submission,
  };
}