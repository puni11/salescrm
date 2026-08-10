import webpush from "web-push";
import clientPromise from "@/lib/mongodb";

webpush.setVapidDetails(
  "mailto:admin@yourdomain.com", // replace with your email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function sendPushNotification({
  userId,
  title,
  body,
  url = "/"
}) {
  const client = await clientPromise;
  const db = client.db("sales");

  const subscriptions = await db
    .collection("push_subscriptions")
    .find({
      userId,
    })
    .toArray();

  if (!subscriptions.length) {
    console.log("No subscriptions found");
    return;
  }

  const payload = JSON.stringify({
    title,
    body,
    url
  });
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        sub.subscription,
        payload
      );

      console.log("Sent to", sub.endpoint);
    } catch (err) {
      console.error(err);

      // Remove expired subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.collection("push_subscriptions").deleteOne({
          _id: sub._id,
        });
      }
    }
  }
}