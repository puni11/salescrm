// app/api/enquiry/generic/route.js

import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

import {
  sanitize,
  validateName,
  validatePhone,
  validateEmail,
} from "@/lib/validation";

import {
  validateOrigin,
  getClientIP,
  getUserAgent,
  checkDuplicate,
  saveEnquiry,
} from "@/lib/security";

export async function POST(req) {
  try {
    // ===============================
    // Validate Origin
    // ===============================
    const originValidation = validateOrigin(req);

    if (!originValidation.valid) {
      return originValidation.response;
    }

    // ===============================
    // Parse Body
    // ===============================
    const body = await req.json();

    // ===============================
    // Sanitize Inputs
    // ===============================
    const name = sanitize(body.name2);
    const phone = sanitize(body.mobile2);
    const email = sanitize(body.email2);

    // ===============================
    // Validate Name
    // ===============================
    const nameValidation = validateName(name);

    if (!nameValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: nameValidation.message,
        },
        {
          status: 400,
        }
      );
    }

    // ===============================
    // Validate Phone
    // ===============================
    const phoneValidation = validatePhone(phone);

    if (!phoneValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: phoneValidation.message,
        },
        {
          status: 400,
        }
      );
    }

    // ===============================
    // Validate Email
    // ===============================
    const emailValidation = validateEmail(email);

    if (!emailValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: emailValidation.message,
        },
        {
          status: 400,
        }
      );
    }

    // ===============================
    // MongoDB
    // ===============================
    const client = await clientPromise;
    const db = client.db("crm"); // Change database name if needed

    // ===============================
    // Duplicate Check
    // ===============================
    const duplicate = await checkDuplicate(
      db,
      phoneValidation.phone,
      5
    );

    if (duplicate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You have already submitted an enquiry recently.",
        },
        {
          status: 409,
        }
      );
    }

    // ===============================
    // Save Data
    // ===============================
    await saveEnquiry(db, {
      formType: "generic",

      name,

      phone: phoneValidation.phone,

      email,
from: "ap2v",
      ip: getClientIP(req),

      userAgent: getUserAgent(req),
      origin: originValidation.origin,
      assignedTo: {
                    _id: new ObjectId("6a50991f338a623acd94650a"),
                    name: "Neelanshu",
                  },

      referer: req.headers.get("referer") || "",
    });

    // ===============================
    // Success
    // ===============================
    return NextResponse.json(
      {
        success: true,
        message: "Enquiry submitted successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Generic Enquiry Error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong.",
      },
      {
        status: 500,
      }
    );
  }
}

// Optional: Reject unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      message: "Method Not Allowed",
    },
    {
      status: 405,
    }
  );
}