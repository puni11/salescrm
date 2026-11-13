
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LEADS_DB = "sales";
const LEADS_COLLECTION = "dm";

const TOKEN_DB = "internal";
const FACEBOOK_PAGES_COLLECTION = "facebook_pages";
const AD_STATUS_CACHE_COLLECTION = "facebook_ad_status_cache";

const GRAPH_API_VERSION =
  process.env.FB_GRAPH_API_VERSION || "v25.0";

const LEAD_DETAILS_LIMIT = 500;
const MAX_META_LOOKUPS_PER_REQUEST = 50;
const META_TIMEOUT_MS = 15000;

const TIME_ZONE = "Asia/Kolkata";

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

function getTodayDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = {};

  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
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

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
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

function isActiveStatus(status) {
  return String(status || "").toUpperCase() === "ACTIVE";
}

function getEffectiveStatus(object) {
  return (
    object?.effective_status ||
    object?.status ||
    null
  );
}

/* =========================================================
   DATABASE COLLECTIONS
========================================================= */

async function getCollections() {
  const client = await clientPromise;

  const leadsCollection = client
    .db(LEADS_DB)
    .collection(LEADS_COLLECTION);

  const statusCollection = client
    .db(TOKEN_DB)
    .collection(AD_STATUS_CACHE_COLLECTION);

  return {
    client,
    leadsCollection,
    statusCollection,
  };
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
   STORED METADATA FROM LEADS
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
  };
}

function firstStoredMetadata(leads, adId) {
  const records = leads.map((lead) =>
    getStoredAdMetadata(lead, adId)
  );

  function firstNonEmpty(key) {
    return (
      records.find((record) => record[key])?.[key] ??
      null
    );
  }

  return {
    adId,
    adName: firstNonEmpty("adName"),
    adSetId: firstNonEmpty("adSetId"),
    adSetName: firstNonEmpty("adSetName"),
    campaignId: firstNonEmpty("campaignId"),
    campaignName: firstNonEmpty("campaignName"),
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
   SAVE METADATA TO SALES.DM
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
    setFields["facebook.campaignName"] =
      metadata.campaignName;
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
   META API: AD + AD SET + CAMPAIGN + BUDGET
========================================================= */

async function fetchAdFromMeta(adId, accessToken) {
  const url = new URL(
    `${getFacebookGraphUrl()}/${encodeURIComponent(adId)}`
  );

  const fields = [
    "id",
    "name",
    "effective_status",
    "adset{id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining}",
    "campaign{id,name,status,effective_status,daily_budget,lifetime_budget,budget_remaining}",
  ].join(",");

  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(META_TIMEOUT_MS),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    throw new Error(
      result?.error?.message ||
        `Meta API returned status ${response.status}.`
    );
  }

  const adStatus = getEffectiveStatus(result);
  const adSetStatus = getEffectiveStatus(result.adset);
  const campaignStatus = getEffectiveStatus(
    result.campaign
  );

  return {
    adId: normalizeId(result.id) || adId,

    adName: result.name || null,

    adStatus,
    adIsActive: adStatus
      ? isActiveStatus(adStatus)
      : null,

    adSetId: normalizeId(result.adset?.id),
    adSetName: result.adset?.name || null,

    adSetStatus,
    adSetIsActive: adSetStatus
      ? isActiveStatus(adSetStatus)
      : null,

    campaignId: normalizeId(result.campaign?.id),
    campaignName: result.campaign?.name || null,

    campaignStatus,
    campaignIsActive: campaignStatus
      ? isActiveStatus(campaignStatus)
      : null,

    // Meta budget values are returned in the ad account's
    // smallest currency unit. Keep the original values.
    adSetDailyBudget:
      result.adset?.daily_budget ?? null,

    adSetLifetimeBudget:
      result.adset?.lifetime_budget ?? null,

    adSetBudgetRemaining:
      result.adset?.budget_remaining ?? null,

    campaignDailyBudget:
      result.campaign?.daily_budget ?? null,

    campaignLifetimeBudget:
      result.campaign?.lifetime_budget ?? null,

    campaignBudgetRemaining:
      result.campaign?.budget_remaining ?? null,

    metadataError: null,
    statusError: null,
  };
}

/* =========================================================
   DAILY MONGODB CACHE
========================================================= */

async function getTodayAdCache(
  statusCollection,
  adId
) {
  const cacheDate = getTodayDateKey();

  return statusCollection.findOne({
    adId,
    cacheDate,
  });
}

async function saveDailyAdCache(
  statusCollection,
  data
) {
  const now = new Date();
  const cacheDate = getTodayDateKey();

  await statusCollection.updateOne(
    {
      adId: data.adId,
    },
    {
      $set: {
        ...data,
        cacheDate,
        fetchedAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    {
      upsert: true,
    }
  );
}

/* =========================================================
   MERGE STORED LEAD METADATA + DAILY CACHE
========================================================= */

function mergeAdData(stored, cached) {
  if (!cached) {
    return {
      ...stored,
      adStatus: null,
      adIsActive: null,
      adSetStatus: null,
      adSetIsActive: null,
      campaignStatus: null,
      campaignIsActive: null,

      adSetDailyBudget: null,
      adSetLifetimeBudget: null,
      adSetBudgetRemaining: null,

      campaignDailyBudget: null,
      campaignLifetimeBudget: null,
      campaignBudgetRemaining: null,

      statusError: null,
      metadataError: null,
      statusFetchedAt: null,
      cacheDate: null,
    };
  }

  return {
    adId: stored.adId || cached.adId,

    adName: stored.adName || cached.adName || null,

    adSetId: stored.adSetId || cached.adSetId || null,

    adSetName:
      stored.adSetName || cached.adSetName || null,

    campaignId:
      stored.campaignId || cached.campaignId || null,

    campaignName:
      stored.campaignName || cached.campaignName || null,

    adStatus: cached.adStatus ?? null,
    adIsActive: cached.adIsActive ?? null,

    adSetStatus: cached.adSetStatus ?? null,
    adSetIsActive: cached.adSetIsActive ?? null,

    campaignStatus: cached.campaignStatus ?? null,
    campaignIsActive:
      cached.campaignIsActive ?? null,

    adSetDailyBudget:
      cached.adSetDailyBudget ?? null,

    adSetLifetimeBudget:
      cached.adSetLifetimeBudget ?? null,

    adSetBudgetRemaining:
      cached.adSetBudgetRemaining ?? null,

    campaignDailyBudget:
      cached.campaignDailyBudget ?? null,

    campaignLifetimeBudget:
      cached.campaignLifetimeBudget ?? null,

    campaignBudgetRemaining:
      cached.campaignBudgetRemaining ?? null,

    metadataError: cached.metadataError || null,
    statusError: cached.statusError || null,

    statusFetchedAt: cached.fetchedAt || null,
    cacheDate: cached.cacheDate || null,
  };
}

/* =========================================================
   RESOLVE ONE AD
   1. Check today's MongoDB cache.
   2. If missing, call Meta.
   3. Save status + budget in MongoDB.
   4. Save names in sales.dm.
========================================================= */

async function resolveAdData({
  adId,
  leads,
  leadsCollection,
  statusCollection,
  accessToken,
  allowMetaLookup,
}) {
  const stored = firstStoredMetadata(leads, adId);

  // First check today's MongoDB cache.
  const cached = await getTodayAdCache(
    statusCollection,
    adId
  );

  if (cached) {
    const merged = mergeAdData(stored, cached);

    // Restore names into lead records if missing.
    if (
      leads.length > 0 &&
      hasAllMetadataNames(merged)
    ) {
      try {
        await saveMetadataToLeads(
          leadsCollection,
          leads,
          merged
        );
      } catch (error) {
        console.error(
          "[Facebook Ads] Lead metadata save failed:",
          error
        );
      }
    }

    return merged;
  }

  // No cache for today.
  if (!allowMetaLookup || !accessToken) {
    return {
      ...mergeAdData(stored, null),
      metadataError: "Meta lookup is not available.",
      statusError: "Today's Meta status has not been fetched.",
    };
  }

  try {
    const fetched = await fetchAdFromMeta(
      adId,
      accessToken
    );

    // Save successful Meta response in MongoDB.
    await saveDailyAdCache(statusCollection, fetched);

    // Save names in sales.dm.
    if (leads.length > 0) {
      try {
        await saveMetadataToLeads(
          leadsCollection,
          leads,
          fetched
        );
      } catch (error) {
        console.error(
          "[Facebook Ads] Lead metadata save failed:",
          error
        );
      }
    }

    const saved = await getTodayAdCache(
      statusCollection,
      adId
    );

    return mergeAdData(stored, saved || fetched);
  } catch (error) {
    const message =
      error?.message || "Meta API lookup failed.";

    console.error(
      `[Facebook Ads] Meta lookup failed for ${adId}:`,
      message
    );

    // Cache failures too, so repeated requests do not
    // continuously call Meta during an outage.
    const failedData = {
      ...stored,

      adStatus: null,
      adIsActive: null,

      adSetStatus: null,
      adSetIsActive: null,

      campaignStatus: null,
      campaignIsActive: null,

      adSetDailyBudget: null,
      adSetLifetimeBudget: null,
      adSetBudgetRemaining: null,

      campaignDailyBudget: null,
      campaignLifetimeBudget: null,
      campaignBudgetRemaining: null,

      metadataError: message,
      statusError: message,
    };

    try {
      await saveDailyAdCache(
        statusCollection,
        failedData
      );
    } catch (cacheError) {
      console.error(
        "[Facebook Ads] Failed to save error cache:",
        cacheError
      );
    }

    return {
      ...failedData,
      statusFetchedAt: null,
      cacheDate: getTodayDateKey(),
    };
  }
}

/* =========================================================
   GROUP LEADS BY AD ID
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

/* =========================================================
   SEARCH
========================================================= */

function matchesSearch(ad, search) {
  if (!search) return true;

  const term = search.toLowerCase();

  return [
    ad.adId,
    ad.adName,
    ad.adSetName,
    ad.campaignName,
    ad.campaignId,
    ad.adSetId,
  ].some((value) =>
    String(value || "").toLowerCase().includes(term)
  );
}

/* =========================================================
   SUMMARY
========================================================= */

function buildSummary(ads) {
  const statusCounts = {};

  let totalLeads = 0;
  let namedAds = 0;

  let activeAds = 0;
  let inactiveAds = 0;
  let unknownAds = 0;

  const campaigns = new Map();

  for (const ad of ads) {
    totalLeads += ad.totalLeads;

    if (ad.adName) {
      namedAds += 1;
    }

    if (ad.adIsActive === true) {
      activeAds += 1;
    } else if (ad.adIsActive === false) {
      inactiveAds += 1;
    } else {
      unknownAds += 1;
    }

    if (ad.campaignId) {
      campaigns.set(ad.campaignId, ad.campaignIsActive);
    }

    for (const [status, count] of Object.entries(
      ad.statuses || {}
    )) {
      statusCounts[status] =
        (statusCounts[status] || 0) + count;
    }
  }

  let activeCampaigns = 0;
  let inactiveCampaigns = 0;
  let unknownCampaigns = 0;

  for (const status of campaigns.values()) {
    if (status === true) {
      activeCampaigns += 1;
    } else if (status === false) {
      inactiveCampaigns += 1;
    } else {
      unknownCampaigns += 1;
    }
  }

  return {
    totalAds: ads.length,
    totalLeads,
    namedAds,
    unnamedAds: ads.length - namedAds,

    activeAds,
    inactiveAds,
    unknownAds,

    totalCampaigns: campaigns.size,
    activeCampaigns,
    inactiveCampaigns,
    unknownCampaigns,

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

    const {
      leadsCollection,
      statusCollection,
    } = await getCollections();

    // Fetch leads.
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

    let accessToken = null;
    let tokenError = null;

    /* ================================================
       SELECTED AD DETAILS
    ================================================ */

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

      // Check today's cache before fetching the token.
      const existingCache = await getTodayAdCache(
        statusCollection,
        requestedAdId
      );

      if (!existingCache) {
        try {
          accessToken = await getFacebookAccessToken();
        } catch (error) {
          tokenError =
            error?.message || "Token lookup failed.";
        }
      }

      const resolved = await resolveAdData({
        adId: requestedAdId,
        leads: matchingLeads,
        leadsCollection,
        statusCollection,
        accessToken,
        allowMetaLookup: Boolean(accessToken),
      });

      if (tokenError && !resolved.statusError) {
        resolved.statusError = tokenError;
      }

      return json({
        success: true,

        ...resolved,

        adId: requestedAdId,

        totalLeads: matchingLeads.length,

        leadDetailsLimit: LEAD_DETAILS_LIMIT,

        leads: matchingLeads
          .slice(0, LEAD_DETAILS_LIMIT)
          .map(toLeadResponse),
      });
    }

    /* ================================================
       DASHBOARD
    ================================================ */

    const groups = buildAdGroups(leads);

    const today = getTodayDateKey();

    const adIds = groups.map((group) => group.adId);

    // Fetch all today's cached records in one query.
    const cachedRecords =
      adIds.length > 0
        ? await statusCollection
            .find({
              adId: {
                $in: adIds,
              },
              cacheDate: today,
            })
            .toArray()
        : [];

    const cacheByAdId = new Map(
      cachedRecords.map((record) => [
        record.adId,
        record,
      ])
    );

    // Only ads without today's cache need a Meta request.
    const groupsToLookup = groups
      .filter(
        (group) => !cacheByAdId.has(group.adId)
      )
      .slice(0, MAX_META_LOOKUPS_PER_REQUEST);

    // Fetch token only if today's cache is missing.
    if (groupsToLookup.length > 0) {
      try {
        accessToken = await getFacebookAccessToken();
      } catch (error) {
        tokenError =
          error?.message || "Token lookup failed.";
      }
    }

    const metadataById = new Map();

    // Reuse today's cache.
    for (const group of groups) {
      const cached = cacheByAdId.get(group.adId);

      if (cached) {
        const stored = firstStoredMetadata(
          group.leads,
          group.adId
        );

        metadataById.set(
          group.adId,
          mergeAdData(stored, cached)
        );
      }
    }

    // Fetch only missing records, sequentially.
    if (accessToken) {
      for (const group of groupsToLookup) {
        const resolved = await resolveAdData({
          adId: group.adId,
          leads: group.leads,
          leadsCollection,
          statusCollection,
          accessToken,
          allowMetaLookup: true,
        });

        metadataById.set(group.adId, resolved);
      }
    }

    // Keep unresolved ads in the response.
    for (const group of groups) {
      if (!metadataById.has(group.adId)) {
        const stored = firstStoredMetadata(
          group.leads,
          group.adId
        );

        metadataById.set(
          group.adId,
          {
            ...mergeAdData(stored, null),
            statusError: tokenError ||
              "Meta lookup deferred to reduce API usage.",
          }
        );
      }
    }

    // Build dashboard response.
    const allAds = groups.map((group) => {
      const metadata = metadataById.get(group.adId);

      const latestLead = getLatestLead(group.leads);

      return {
        adId: group.adId,

        adName: metadata.adName || null,

        adSetId: metadata.adSetId || null,
        adSetName: metadata.adSetName || null,

        campaignId: metadata.campaignId || null,
        campaignName: metadata.campaignName || null,

        // Ad status
        adStatus: metadata.adStatus ?? null,
        adIsActive: metadata.adIsActive ?? null,

        // Ad set status
        adSetStatus: metadata.adSetStatus ?? null,
        adSetIsActive:
          metadata.adSetIsActive ?? null,

        // Campaign status
        campaignStatus:
          metadata.campaignStatus ?? null,

        campaignIsActive:
          metadata.campaignIsActive ?? null,

        // Ad set budgets
        adSetDailyBudget:
          metadata.adSetDailyBudget ?? null,

        adSetLifetimeBudget:
          metadata.adSetLifetimeBudget ?? null,

        adSetBudgetRemaining:
          metadata.adSetBudgetRemaining ?? null,

        // Campaign budgets
        campaignDailyBudget:
          metadata.campaignDailyBudget ?? null,

        campaignLifetimeBudget:
          metadata.campaignLifetimeBudget ?? null,

        campaignBudgetRemaining:
          metadata.campaignBudgetRemaining ?? null,

        metadataError:
          metadata.metadataError || null,

        statusError:
          metadata.statusError || null,

        statusFetchedAt:
          metadata.statusFetchedAt || null,

        cacheDate:
          metadata.cacheDate || today,

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

      cacheDate: today,

      metaLookupsThisRequest: accessToken
        ? groupsToLookup.length
        : 0,

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
