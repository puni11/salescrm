export async function GET() {
  return Response.json({
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  });
}