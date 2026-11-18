import { NextResponse } from "next/server";
import { googleAdsRequest } from "@/lib/googleAdsApi";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await googleAdsRequest({
      endpoint: "customers:listAccessibleCustomers",
    });

    const customerIds = (data.resourceNames || []).map((resourceName) =>
      resourceName.replace("customers/", "")
    );

    return NextResponse.json({
      success: true,
      accounts: customerIds,
      count: customerIds.length,
    });
  } catch (error) {
    console.error("Google Ads accounts error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}