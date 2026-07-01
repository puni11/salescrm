import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: "Please upload an Excel file.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const workbook = XLSX.read(buffer, {
      type: "buffer",
    });

    const sheetName = workbook.SheetNames[0];

    const worksheet = workbook.Sheets[sheetName];

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
    });

    if (!rows.length) {
      return NextResponse.json({
        success: false,
        message: "Excel file is empty.",
      });
    }

    const client = await clientPromise;

    const db = client.db("sales");

    const bulkOperations = [];

    let skipped = 0;

    for (const row of rows) {
      const phone = String(row["Contact No."] || row["Contact No"] || "")
        .replace(/\D/g, "")
        .slice(-10);

      const email = String(row["Email"] || "").trim().toLowerCase();

      const name = String(row["Name"] || "").trim();

      if (!phone && !email) {
        skipped++;
        continue;
      }

      const lead = {
        name,
        email,
        phone,

        profile: "student",

        course: row["Course"] || "",

        consent: false,

        source: row["Source"] || "Excel",

        medium: "",

        campaign: "",

        term: "",

        content: "",

        gclid: "",

        status: row["Status"] || "New Lead",

        company: row["Company Name"] || "",

        assignedTo: {
          _id: new ObjectId("6a4507369c0b2c7d69a99ab9"),
          name: "Deepanshu Sharma",
        },

        updatedAt: new Date(),
      };

      let filter = null;

      if (phone) {
        filter = {
          phone,
        };
      } else {
        filter = {
          email,
        };
      }

      bulkOperations.push({
        updateOne: {
          filter,
          update: {
            $set: lead,
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOperations.length) {
      await db.collection("dm").bulkWrite(bulkOperations);
    }

    return NextResponse.json({
      success: true,
      totalRows: rows.length,
      processed: bulkOperations.length,
      skipped,
      message: "Leads imported successfully.",
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}