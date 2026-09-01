
import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"

export async function PUT(request) {
  try {
    const body = await request.json()

    const {
      id,
      counsellorStatus,
      courses = [],
    } = body

    // =========================
    // VALIDATION
    // =========================

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid counsellor ID",
        },
        { status: 400 }
      )
    }

    if (
      !["regular", "special"].includes(
        counsellorStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Counsellor status must be regular or special",
        },
        { status: 400 }
      )
    }

    // =========================
    // CONNECT MONGODB
    // =========================

    const client = await clientPromise

    /*
     * CHANGE THESE DATABASE NAMES
     */

    const counsellorDB =
      client.db("internal")

    const courseDB =
      client.db("sales")

    const counsellorsCollection =
      counsellorDB.collection("users")

    const coursesCollection =
      courseDB.collection("courses")

    const counsellorId =
      new ObjectId(id)

    // =========================
    // CHECK COUNSELLOR
    // =========================

    const counsellor =
      await counsellorsCollection.findOne({
        _id: counsellorId,
      })

    if (!counsellor) {
      return NextResponse.json(
        {
          success: false,
          message: "Counsellor not found",
        },
        { status: 404 }
      )
    }

    if (counsellor.role !== "counsellor") {
      return NextResponse.json(
        {
          success: false,
          message:
            "This user is not a counsellor",
        },
        { status: 400 }
      )
    }

    // =========================
    // REGULAR
    // =========================
    //
    // Remove every assigned course
    //

    if (counsellorStatus === "regular") {
      await counsellorsCollection.updateOne(
  {
    _id: counsellorId,
  },
  {
    $set: {
      counsellorStatus: "regular",
      updatedAt: new Date(),
    },

    $unset: {
      specialCourses: "",
    },
  }
)

      return NextResponse.json(
        {
          success: true,
          message:
            "Counsellor changed to regular and all courses were removed",
        },
        { status: 200 }
      )
    }

    // =========================
    // SPECIAL VALIDATION
    // =========================

    if (!Array.isArray(courses)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Courses must be an array",
        },
        { status: 400 }
      )
    }

    if (courses.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select at least one course",
        },
        { status: 400 }
      )
    }

    // =========================
    // VALIDATE COURSE IDS
    // =========================

    const invalidCourse = courses.find(
      (courseId) =>
        !ObjectId.isValid(courseId)
    )

    if (invalidCourse) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more course IDs are invalid",
        },
        { status: 400 }
      )
    }

    // Remove duplicates
    const uniqueCourseIds = [
      ...new Set(courses),
    ]

    const courseObjectIds =
      uniqueCourseIds.map(
        (courseId) =>
          new ObjectId(courseId)
      )

    // =========================
    // VERIFY COURSES EXIST
    // =========================

    const existingCourses =
      await coursesCollection
        .find({
          _id: {
            $in: courseObjectIds,
          },
        })
        .project({
          _id: 1,
          name: 1,
        })
        .toArray()

    if (
      existingCourses.length !==
      courseObjectIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more selected courses do not exist",
        },
        { status: 400 }
      )
    }

    // =========================
    // CHECK COURSE ASSIGNMENT
    // =========================
    //
    // Search ONLY in counsellor DB.
    // Exclude current counsellor so
    // they can keep their existing courses.
    //

    const otherCounsellors =
      await counsellorsCollection
        .find({
          _id: {
            $ne: counsellorId,
          },

          role: "counsellor",

          counsellorStatus: "special",

          specialCourses: {
            $in: courseObjectIds,
          },
        })
        .project({
          name: 1,
          specialCourses: 1,
        })
        .toArray()

    // =========================
    // FIND EXACT CONFLICTS
    // =========================

    if (otherCounsellors.length > 0) {
      const assignedCourseIds =
        otherCounsellors.flatMap(
          (item) =>
            item.specialCourses || []
        )

      const conflictingCourseIds =
        assignedCourseIds.map(
          (courseId) =>
            courseId.toString()
        )

      const conflictingCourses =
        existingCourses
          .filter((course) =>
            conflictingCourseIds.includes(
              course._id.toString()
            )
          )
          .map((course) => ({
            _id: course._id,
            name: course.name,
          }))

      return NextResponse.json(
        {
          success: false,
          message:
            "Some courses are already assigned to another counsellor",

          conflictingCourses,
        },
        { status: 409 }
      )
    }

    // =========================
    // UPDATE SPECIAL COUNSELLOR
    // =========================

    await counsellorsCollection.updateOne(
      {
        _id: counsellorId,
      },
      {
        $set: {
          counsellorStatus: "special",
          specialCourses:
            courseObjectIds,
          updatedAt: new Date(),
        },
      }
    )

    return NextResponse.json(
      {
        success: true,
        message:
          "Special counsellor courses updated successfully",
      },
      { status: 200 }
    )

  } catch (error) {
    console.error(
      "Update counsellor status error:",
      error
    )

    return NextResponse.json(
      {
        success: false,
        message:
          "Internal server error",
      },
      { status: 500 }
    )
  }
}
