import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token === process.env.FACEBOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, {
      status: 200,
    });
  }

  return new Response("Forbidden", {
    status: 403,
  });
}

export async function POST(req) {
  const body = await req.json();

  console.log("Facebook Webhook");
  console.log(JSON.stringify(body, null, 2));

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;

      const leadId = change.value.leadgen_id;

      try {
        const response = await fetch(
           `https://graph.facebook.com/v25.0/${leadId}` +
  `?fields=id,created_time,field_data,form_id,ad_id` +
  `&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`
        );

        const lead = await response.json();

        console.log("Lead Details");
        console.log(JSON.stringify(lead, null, 2));

        if (lead.error) {
          console.log("Facebook Error");
          console.log(lead.error);
          continue;
        }

        const mapped = {};

        for (const field of lead.field_data || []) {
          mapped[field.name] = field.values?.[0] ?? "";
        }

        console.log(mapped);

        // TODO
        // Save mapped to MongoDB
      } catch (err) {
        console.error(err);
      }
    }
  }

  return NextResponse.json({
    success: true,
  });
}