import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("sales");

    const courses = await db
      .collection("courses")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch courses",
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          message: "Course name is required",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("sales");

    const existingCourse = await db.collection("courses").findOne({
      name: {
        $regex: `^${name}$`,
        $options: "i",
      },
    });

    if (existingCourse) {
      return NextResponse.json(
        {
          success: false,
          message: "Course already exists",
        },
        { status: 409 }
      );
    }

    const course = {
      name,
      status: "Active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(course);

    const createdCourse = {
      _id: result.insertedId,
      ...course,
    };

    return NextResponse.json({
      success: true,
      course: createdCourse,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create course",
      },
      { status: 500 }
    );
  }
}