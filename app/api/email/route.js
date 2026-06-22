import { sendMail } from "@/lib/sendMail";

export async function GET() {
  try {
    await sendMail({
      to: "puni199711@gmail.com",
      subject: "SMTP Test",
      html: "<h1>Email Working</h1>",
    });

    return Response.json({
      success: true,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    });
  }
}