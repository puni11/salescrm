import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  const accountId = '108480373426422962419';
  const locationId = '8772644335176110443';

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: 'Missing API credentials' }, { status: 500 });
  }

  try {
    // 1. Refresh the access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 });
    }

    // 2. Fetch ALL reviews using a pagination loop
    let allReviews = [];
    let pageToken = '';

    do {
      // Set pageSize to the maximum allowed limit of 50
      let url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews?pageSize=50`;
      
      // Append the pageToken if it exists to fetch the next batch
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }

      const reviewsResponse = await fetch(url, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      const data = await reviewsResponse.json();

      // Add the current batch of reviews to our master array
      if (data.reviews) {
        allReviews = allReviews.concat(data.reviews);
      }

      // Set the token for the next iteration. If undefined, the loop breaks.
      pageToken = data.nextPageToken;
    } while (pageToken);

    // 3. Return the complete list of reviews to your frontend component
    return NextResponse.json({ reviews: allReviews });
  } catch (error) {
    console.error('Error fetching Google Reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}