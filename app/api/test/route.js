export async function GET() {
  try {
    const pageId = 1039043886110312;
    const accessToken = process.env.FACEBOOK_KEY;

// Added 'recommendation_type' and 'limit=100'
const url = `https://graph.facebook.com/v19.0/${pageId}/ratings?fields=rating,recommendation_type,review_text,created_time,reviewer&limit=2000&access_token=${accessToken}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          success: false,
          error: data.error || "Facebook API Error",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      reviews: data.data || [],
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}