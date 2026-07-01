import clientPromise from "@/lib/mongodb";

export async function getPageAccessToken(pageId) {
  const client = await clientPromise;
  const db = client.db("internal");

  const page = await db.collection("facebook_pages").findOne({
    pageId,
    connected: true,
  });

  if (!page) {
    throw new Error(`Facebook page ${pageId} not connected.`);
  }

  return page.pageAccessToken;
}