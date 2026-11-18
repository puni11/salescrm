import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import clientPromise from "@/lib/mongodb";

const COLLECTION = "google_ads_selected_forms";
const CONFIG_ID = "google_ads_main";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db();

    const config = await db.collection(COLLECTION).findOne({
      _id: CONFIG_ID,
    });

    return Response.json({
      success: true,
      selectedForms: config?.selectedForms || [],
    });
  } catch (error) {
    console.error("Google Ads selected forms GET error:", error);

    return Response.json(
      { success: false, message: "Failed to fetch selected forms" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "admin") {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const selectedForms = body.selectedForms;

    if (!Array.isArray(selectedForms)) {
      return Response.json(
        {
          success: false,
          message: "selectedForms must be an array",
        },
        { status: 400 }
      );
    }

    const cleanedForms = selectedForms
      .filter((form) => form?.resourceName)
      .map((form) => ({
        resourceName: form.resourceName,
        assetId: form.assetId || "",
        name: form.name || "",
        enabled: true,
      }));

    const client = await clientPromise;
    const db = client.db();

    await db.collection(COLLECTION).updateOne(
      { _id: CONFIG_ID },
      {
        $set: {
          selectedForms: cleanedForms,
          updatedAt: new Date(),
          updatedBy: session.user.id || session.user.email || "",
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    return Response.json({
      success: true,
      message: "Selected Google Ads forms saved successfully",
      count: cleanedForms.length,
      selectedForms: cleanedForms,
    });
  } catch (error) {
    console.error("Google Ads selected forms POST error:", error);

    return Response.json(
      { success: false, message: "Failed to save selected forms" },
      { status: 500 }
    );
  }
}