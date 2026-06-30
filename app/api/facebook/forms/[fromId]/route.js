import { NextResponse } from "next/server";

export async function GET(req, { params }) {
  try {
    const { fromId } = await params;
console.log(fromId)
    // Get Form Information
    const formResponse = await fetch(
      `https://graph.facebook.com/v25.0/${fromId}?fields=id,name,status,locale,page_id,questions&access_token=${process.env.FACEBOOK_PAGE_ACCESS_TOKEN}`,
      {
        cache: "no-store",
      }
    );

    const form = await formResponse.json();

    if (form.error) {
      return NextResponse.json(form, {
        status: 400,
      });
    }

    const questions =
      (form.questions || []).map((question) => ({
        key: question.key,
        label: question.label || question.key,
        type: question.type,
      })) || [];

    return NextResponse.json({
      id: form.id,
      pageId: form.page_id,
      name: form.name,
      status: form.status,
      locale: form.locale,
      questions,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      }
    );
  }
}