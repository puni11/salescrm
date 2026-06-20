export async function POST(req) {
try {
const { phone, name } = await req.json();

const response = await fetch(
  "https://aigreentick.com/api/v1/sendMessage",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: process.env.WHATSAPP_API,
      mobile: phone,
      message: `Hi ${name},

Thank you for your enquiry.

Our team will contact you shortly.`,
}),
}
);

const data = await response.json();
console.log(data)
return Response.json({
  success: true,
  data,
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
