import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEADS_DB = "sales";
const LEADS_COLLECTION = "dm";

const TOKEN_DB = "internal";
const FACEBOOK_PAGES_COLLECTION = "facebook_pages";

const GRAPH_API_VERSION =
  process.env.FB_GRAPH_API_VERSION || "v25.0";

const LEAD_DETAILS_LIMIT = 500;
const METADATA_CACHE_MS = 30 * 60 * 1000;

// Limit Meta calls per API request to reduce rate limiting.
const MAX_META_LOOKUPS_PER_REQUEST = 50;

const metadataCache = new Map();

/* =========================================================
   COMMON HELPERS
========================================================= */

function json(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function normalizeId(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const result = String(value).trim();
  return result || null;
}

function getAdId(lead) {
  return normalizeId(
    lead?.facebook?.adId ??
      lead?.facebook?.ad_id ??
      lead?.adId ??
      lead?.ad_id
  );
}

function getLeadStatus(lead) {
  const raw =
    lead?.status ??
    lead?.leadStatus ??
    lead?.lead_status ??
    lead?.pipelineStatus ??
    "Unknown";

  return String(raw).trim() || "Unknown";
}

function getCreatedAt(lead) {
  return (
    lead?.createdAt ??
    lead?.created_at ??
    lead?.created ??
    lead?.dateCreated ??
    lead?.timestamp ??
    null
  );
}

function getTimestamp(value) {
  if (!value) return 0;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getLatestLead(leads) {
  return leads.reduce((latest, lead) => {
    if (!latest) return lead;

    return getTimestamp(getCreatedAt(lead)) >
      getTimestamp(getCreatedAt(latest))
      ? lead
      : latest;
  }, null);
}

function toLeadResponse(lead) {
  return {
    _id: String(lead?._id ?? ""),
    name:
      lead?.name ??
      lead?.fullName ??
      lead?.full_name ??
      lead?.facebook?.name ??
      "",
    phone:
      lead?.phone ??
      lead?.mobile ??
      lead?.phoneNumber ??
      lead?.facebook?.phone ??
      "",
    email:
      lead?.email ??
      lead?.facebook?.email ??
      "",
    course:
      lead?.course ??
      lead?.courseName ??
      lead?.program ??
      "",
    status: getLeadStatus(lead),
    assignedTo:
      lead?.assignedTo ??
      lead?.assigned_to ??
      lead?.assignedUser ??
      "",
    createdAt: getCreatedAt(lead),
    adId: getAdId(lead),
  };
}

function getFacebookGraphUrl() {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}`;
}

/* =========================================================
   FACEBOOK ACCESS TOKEN
   Source: internal.facebook_pages
========================================================= */

async function getFacebookAccessToken() {
  const client = await clientPromise;

  const page = await client
    .db(TOKEN_DB)
    .collection(FACEBOOK_PAGES_COLLECTION)
    .findOne(
      {
        userAccessToken: {
          $exists: true,
          $type: "string",
          $ne: "",
        },
      },
      {
        projection: {
          userAccessToken: 1,
        },
      }
    );

  const token = page?.userAccessToken?.trim();

  if (!token) {
    throw new Error(
      "No userAccessToken found in internal.facebook_pages."
    );
  }

  return token;
}

/* =========================================================
   READ METADATA ALREADY SAVED IN LEADS
========================================================= */

function getStoredAdMetadata(lead, adId) {
  const facebook =
    lead?.facebook && typeof lead.facebook === "object"
      ? lead.facebook
      : {};

  return {
    adId,

    adName:
      facebook.adName ??
      facebook.ad_name ??
      lead?.adName ??
      lead?.ad_name ??
      null,

    adSetId: normalizeId(
      facebook.adSetId ??
        facebook.adsetId ??
        facebook.adset_id ??
        lead?.adSetId ??
        lead?.adsetId ??
        null
    ),

    adSetName:
      facebook.adSetName ??
      facebook.adsetName ??
      facebook.ad_set_name ??
      lead?.adSetName ??
      lead?.adsetName ??
      lead?.ad_set_name ??
      null,

    campaignId: normalizeId(
      facebook.campaignId ??
        facebook.campaign_id ??
        lead?.campaignId ??
        null
    ),

    campaignName:
      facebook.campaignName ??
      facebook.campaign_name ??
      lead?.campaignName ??
      lead?.campaign_name ??
      null,

    metadataError: null,
  };
}

function firstStoredMetadata(leads, adId) {
  const records = leads.map((lead) =>
    getStoredAdMetadata(lead, adId)
  );

  function firstNonEmpty(key) {
    return records.find((record) => record[key])?.[key] ?? null;
  }

  return {
    adId,
    adName: firstNonEmpty("adName"),
    adSetId: firstNonEmpty("adSetId"),
    adSetName: firstNonEmpty("adSetName"),
    campaignId: firstNonEmpty("campaignId"),
    campaignName: firstNonEmpty("campaignName"),
    metadataError: null,
  };
}

function hasAllMetadataNames(metadata) {
  return Boolean(
    metadata?.adName &&
      metadata?.adSetName &&
      metadata?.campaignName
  );
}

/* =========================================================
   SAVE META NAMES TO SALES.DM
========================================================= */

async function saveMetadataToLeads(
  leadsCollection,
  leads,
  metadata
) {
  const setFields = {};

  if (metadata.adName) {
    setFields["facebook.adName"] = metadata.adName;
  }

  if (metadata.adSetId) {
    setFields["facebook.adSetId"] = metadata.adSetId;
  }

  if (metadata.adSetName) {
    setFields["facebook.adSetName"] = metadata.adSetName;
  }

  if (metadata.campaignId) {
    setFields["facebook.campaignId"] = metadata.campaignId;
  }

  if (metadata.campaignName) {
    setFields["facebook.campaignName"] = metadata.campaignName;
  }

  if (Object.keys(setFields).length === 0) {
    return;
  }

  const operations = leads
    .filter((lead) => lead?._id != null)
    .map((lead) => ({
      updateOne: {
        filter: {
          _id: lead._id,
        },
        update: {
          $set: setFields,
        },
      },
    }));

  if (operations.length > 0) {
    await leadsCollection.bulkWrite(operations, {
      ordered: false,
    });
  }
}

/* =========================================================
   META API LOOKUP
========================================================= */

async function fetchAdMetadata(adId, accessToken) {
  const cached = metadataCache.get(adId);

  if (
    cached &&
    Date.now() - cached.time < METADATA_CACHE_MS
  ) {
    return cached.data;
  }

  const url = new URL(
    `${getFacebookGraphUrl()}/${encodeURIComponent(adId)}`
  );

  url.searchParams.set(
    "fields",
    "id,name,adset{id,name},campaign{id,name}"
  );

  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    const message =
      result?.error?.message ||
      "Unable to fetch Facebook ad metadata.";

    return {
      adId,
      adName: null,
      adSetId: null,
      adSetName: null,
      campaignId: null,
      campaignName: null,
      metadataError: message,
    };
  }

  const data = {
    adId: normalizeId(result.id) || adId,
    adName: result.name || null,
    adSetId: normalizeId(result.adset?.id),
    adSetName: result.adset?.name || null,
    campaignId: normalizeId(result.campaign?.id),
    campaignName: result.campaign?.name || null,
    metadataError: null,
  };

  // Cache only successful responses.
  metadataCache.set(adId, {
    time: Date.now(),
    data,
  });

  return data;
}

/* =========================================================
   RESOLVE METADATA
   1. MongoDB first
   2. Meta only if names are missing and lookup is allowed
   3. Save the resolved names to MongoDB
========================================================= */

async function resolveAdMetadata({
  adId,
  leads,
  leadsCollection,
  accessToken,
  allowMetaLookup,
}) {
  const stored = firstStoredMetadata(leads, adId);

  // All names already exist in MongoDB.
  if (hasAllMetadataNames(stored)) {
    return stored;
  }

  // Reuse successful in-memory cache before calling Meta.
  const cached = metadataCache.get(adId);

  if (
    cached &&
    Date.now() - cached.time < METADATA_CACHE_MS
  ) {
    const resolved = mergeMetadata(stored, cached.data);

    try {
      await saveMetadataToLeads(
        leadsCollection,
        leads,
        resolved
      );
    } catch (error) {
      console.error(
        "[Facebook Ads API] Metadata cache save failed:",
        error
      );
    }

    return resolved;
  }

  // Do not call Meta if this request has reached its lookup limit.
  if (!allowMetaLookup || !accessToken) {
    return {
      ...stored,
      metadataError: accessToken
        ? "Meta lookup deferred to reduce API rate limiting."
        : "Facebook access token unavailable.",
    };
  }

  let fromMeta;

  try {
    fromMeta = await fetchAdMetadata(adId, accessToken);
  } catch (error) {
    fromMeta = {
      adId,
      adName: null,
      adSetId: null,
      adSetName: null,
      campaignId: null,
      campaignName: null,
      metadataError:
        error?.message || "Meta metadata lookup failed.",
    };
  }

  const resolved = mergeMetadata(stored, fromMeta);

  // Save whatever names we have successfully resolved.
  try {
    await saveMetadataToLeads(
      leadsCollection,
      leads,
      resolved
    );
  } catch (error) {
    console.error(
      "[Facebook Ads API] Could not save metadata:",
      error
    );
  }

  return resolved;
}

function mergeMetadata(stored, fetched) {
  const result = {
    adId: stored.adId || fetched.adId,
    adName: stored.adName || fetched.adName || null,
    adSetId: stored.adSetId || fetched.adSetId || null,
    adSetName: stored.adSetName || fetched.adSetName || null,
    campaignId:
      stored.campaignId || fetched.campaignId || null,
    campaignName:
      stored.campaignName || fetched.campaignName || null,
    metadataError: fetched.metadataError || null,
  };

  if (hasAllMetadataNames(result)) {
    result.metadataError = null;
  }

  return result;
}

/* =========================================================
   AGGREGATE LEADS BY AD ID
========================================================= */

function buildAdGroups(leads) {
  const groups = new Map();

  for (const lead of leads) {
    const adId = getAdId(lead);

    if (!adId) continue;

    if (!groups.has(adId)) {
      groups.set(adId, {
        adId,
        totalLeads: 0,
        statuses: {},
        leads: [],
      });
    }

    const group = groups.get(adId);
    const status = getLeadStatus(lead);

    group.totalLeads += 1;

    group.statuses[status] =
      (group.statuses[status] || 0) + 1;

    group.leads.push(lead);
  }

  return [...groups.values()];
}

function matchesSearch(ad, search) {
  if (!search) return true;

  const term = search.toLowerCase();

  return [
    ad.adId,
    ad.adName,
    ad.adSetName,
    ad.campaignName,
  ].some((value) =>
    String(value || "").toLowerCase().includes(term)
  );
}

function buildSummary(ads) {
  const statusCounts = {};

  let totalLeads = 0;
  let namedAds = 0;

  for (const ad of ads) {
    totalLeads += ad.totalLeads;

    if (ad.adName) {
      namedAds += 1;
    }

    for (const [status, count] of Object.entries(
      ad.statuses || {}
    )) {
      statusCounts[status] =
        (statusCounts[status] || 0) + count;
    }
  }

  return {
    totalAds: ads.length,
    totalLeads,
    namedAds,
    unnamedAds: ads.length - namedAds,
    statusCounts,
  };
}

/* =========================================================
   GET /api/facebook-ads
   GET /api/facebook-ads?search=...
   GET /api/facebook-ads?adId=...
========================================================= */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = (
      searchParams.get("search") || ""
    ).trim();

    const requestedAdId = normalizeId(
      searchParams.get("adId")
    );

    const client = await clientPromise;

    const salesDb = client.db(LEADS_DB);
    const leadsCollection =
      salesDb.collection(LEADS_COLLECTION);

    // Fetch leads from the sales database.
    const leads = await leadsCollection
      .find(
        {},
        {
          projection: {
            facebook: 1,
            adId: 1,
            ad_id: 1,

            adName: 1,
            ad_name: 1,

            adSetId: 1,
            adsetId: 1,
            adSetName: 1,
            adsetName: 1,
            ad_set_name: 1,

            campaignId: 1,
            campaignName: 1,
            campaign_name: 1,

            name: 1,
            fullName: 1,
            full_name: 1,
            phone: 1,
            mobile: 1,
            phoneNumber: 1,
            email: 1,
            course: 1,
            courseName: 1,
            program: 1,
            status: 1,
            leadStatus: 1,
            lead_status: 1,
            pipelineStatus: 1,
            assignedTo: 1,
            assigned_to: 1,
            assignedUser: 1,
            createdAt: 1,
            created_at: 1,
            created: 1,
            dateCreated: 1,
            timestamp: 1,
          },
        }
      )
      .toArray();

    // Get the token once per request, only if Meta lookups are needed.
    let accessToken = null;
    let tokenError = null;

    /*
     * Selected ad details
     */
    if (requestedAdId) {
      const matchingLeads = leads
        .filter(
          (lead) => getAdId(lead) === requestedAdId
        )
        .sort(
          (a, b) =>
            getTimestamp(getCreatedAt(b)) -
            getTimestamp(getCreatedAt(a))
        );

      const stored = firstStoredMetadata(
        matchingLeads,
        requestedAdId
      );

      if (!hasAllMetadataNames(stored)) {
        try {
          accessToken = await getFacebookAccessToken();
        } catch (error) {
          tokenError =
            error?.message || "Token lookup failed.";
        }
      }

      const metadata = await resolveAdMetadata({
        adId: requestedAdId,
        leads: matchingLeads,
        leadsCollection,
        accessToken,
        allowMetaLookup: Boolean(accessToken),
      });

      if (tokenError && !metadata.metadataError) {
        metadata.metadataError = tokenError;
      }

      return json({
        success: true,
        ...metadata,
        adId: requestedAdId,
        totalLeads: matchingLeads.length,
        leadDetailsLimit: LEAD_DETAILS_LIMIT,
        leads: matchingLeads
          .slice(0, LEAD_DETAILS_LIMIT)
          .map(toLeadResponse),
      });
    }

    /*
     * Dashboard request
     */
    const groups = buildAdGroups(leads);

    // Determine which ads need a Meta lookup.
    const needsLookup = [];
    const metadataById = new Map();

    for (const group of groups) {
      const stored = firstStoredMetadata(
        group.leads,
        group.adId
      );

      const cached = metadataCache.get(group.adId);

      if (hasAllMetadataNames(stored)) {
        metadataById.set(group.adId, stored);
      } else if (
        cached &&
        Date.now() - cached.time < METADATA_CACHE_MS
      ) {
        const resolved = mergeMetadata(stored, cached.data);

        metadataById.set(group.adId, resolved);

        // Persist cached values that are missing from lead records.
        saveMetadataToLeads(
          leadsCollection,
          group.leads,
          resolved
        ).catch((error) => {
          console.error(
            "[Facebook Ads API] Cache persistence failed:",
            error
          );
        });
      } else {
        needsLookup.push(group);
        metadataById.set(group.adId, stored);
      }
    }

    // Fetch the token only if at least one ad needs Meta metadata.
    if (needsLookup.length > 0) {
      try {
        accessToken = await getFacebookAccessToken();
      } catch (error) {
        tokenError =
          error?.message || "Token lookup failed.";
      }
    }

    // Only a small number of new lookups per request.
    const groupsToLookup = accessToken
      ? needsLookup.slice(0, MAX_META_LOOKUPS_PER_REQUEST)
      : [];

    for (const group of groupsToLookup) {
      const metadata = await resolveAdMetadata({
        adId: group.adId,
        leads: group.leads,
        leadsCollection,
        accessToken,
        allowMetaLookup: true,
      });

      metadataById.set(group.adId, metadata);
    }

    // For unresolved ads, retain names already saved in MongoDB.
    for (const group of needsLookup) {
      if (metadataById.has(group.adId)) {
        const existing = metadataById.get(group.adId);

        if (
          !groupsToLookup.some(
            (item) => item.adId === group.adId
          ) &&
          !hasAllMetadataNames(existing)
        ) {
          metadataById.set(group.adId, {
            ...existing,
            metadataError: accessToken
              ? "Meta lookup deferred to reduce API rate limiting."
              : tokenError ||
                "Facebook access token unavailable.",
          });
        }
      }
    }

    const allAds = groups.map((group) => {
      const metadata =
        metadataById.get(group.adId) ||
        firstStoredMetadata(group.leads, group.adId);

      const latestLead = getLatestLead(group.leads);

      return {
        adId: group.adId,
        adName: metadata.adName || null,
        adSetId: metadata.adSetId || null,
        adSetName: metadata.adSetName || null,
        campaignId: metadata.campaignId || null,
        campaignName: metadata.campaignName || null,
        metadataError: metadata.metadataError || null,
        totalLeads: group.totalLeads,
        statuses: group.statuses,
        latestLead: latestLead
          ? {
              name:
                latestLead.name ??
                latestLead.fullName ??
                latestLead.full_name ??
                "",
              createdAt: getCreatedAt(latestLead),
              status: getLeadStatus(latestLead),
            }
          : null,
      };
    });

    const filteredAds = allAds
      .filter((ad) => matchesSearch(ad, search))
      .sort(
        (a, b) => b.totalLeads - a.totalLeads
      );

    return json({
      success: true,
      summary: buildSummary(filteredAds),
      ads: filteredAds,
      totalMatchingLeadDocuments: filteredAds.reduce(
        (total, ad) => total + ad.totalLeads,
        0
      ),
      totalLeadDocumentsWithAdId: leads.filter(
        (lead) => getAdId(lead) !== null
      ).length,
      search,
      metaLookupsThisRequest: groupsToLookup.length,
      metaLookupsLimit: MAX_META_LOOKUPS_PER_REQUEST,
    });
  } catch (error) {
    console.error("[Facebook Ads API]", error);

    return json(
      {
        success: false,
        error:
          error?.message ||
          "Failed to load Facebook ads data.",
      },
      500
    );
  }
}