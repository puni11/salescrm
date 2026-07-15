import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
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
    // =====================================
    // Validate Origin
    // =====================================
    const originValidation = validateOrigin(req);

    if (!originValidation.valid) {
      return originValidation.response;
    }

    // =====================================
    // Parse Body
    // =====================================
    const body = await req.json();

    /**
     * Supports BOTH forms
     *
     * Form 1
     * name_c1
     * email_c1
     * mobile_c1
     * myself/company
     * message_c1
     *
     * Form 2
     * name_c2
     * email_c2
     * mobile_c2
     * myself1/company1
     * message_c2
     */

    const isForm2 =
      body.name_c2 ||
      body.email_c2 ||
      body.mobile_c2;

    // =====================================
    // Read Values
    // =====================================

    const name = sanitize(
      isForm2 ? body.name_c2 : body.name_c1
    );

    const email = sanitize(
      isForm2 ? body.email_c2 : body.email_c1
    );

    const phone = sanitize(
      isForm2 ? body.mobile_c2 : body.mobile_c1
    );

    const enquiryFor = sanitize(
      isForm2
        ? body.myself1 || body.company1
        : body.myself || body.company
    );

    const message = sanitize(
      isForm2
        ? body.message_c2
        : body.message_c1
    );

    // Django Course ID
    const course = sanitize(body.anquira_course);

    // =====================================
    // Validation
    // =====================================

    const nameValidation = validateName(name);

    if (!nameValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: nameValidation.message,
        },
        { status: 400 }
      );
    }

    const phoneValidation = validatePhone(phone);

    if (!phoneValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: phoneValidation.message,
        },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);

    if (!emailValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: emailValidation.message,
        },
        { status: 400 }
      );
    }

    // =====================================
    // MongoDB
    // =====================================

    const client = await clientPromise;
    const db = client.db("sales");

    // =====================================
    // Duplicate Check (5 Minutes)
    // =====================================

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
        { status: 409 }
      );
    }

    // =====================================
    // Save
    // =====================================

    await saveEnquiry(db, {
      formType: "course",

      form: isForm2 ? "course_form_2" : "course_form_1",

      name,

      phone: phoneValidation.phone,

      email,

      enquiryFor,

      message,

      course,

      from: "ap2v",

      ip: getClientIP(req),

      userAgent: getUserAgent(req),

      origin: originValidation.origin,

      assignedTo: {
        _id: new ObjectId(
          "6a50991f338a623acd94650a"
        ),
        name: "Neelanshu",
      },

      referer: req.headers.get("referer") || "",
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Course enquiry submitted successfully.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(error);

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