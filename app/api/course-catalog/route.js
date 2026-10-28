
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const idOf = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const getIds = (value) => {
  if (!Array.isArray(value)) return value ? [idOf(value)] : [];
  return value.map(idOf).filter(Boolean);
};

const isActive = (item) =>
  item?.status === "active" ||
  item?.isActive === true ||
  (item?.status == null && item?.isActive == null);

export async function GET() {
  try {
    const client = await clientPromise;
    const salesDb = client.db("sales");
    const internalDb = client.db("internal");

    const [
      courses,
      categories,
      trainers,
      tools,
      users,
    ] = await Promise.all([
      salesDb.collection("offeringCourses")
        .find({
          $or: [
            { status: "active" },
            { isActive: true },
          ],
        })
        .sort({ name: 1 })
        .toArray(),

      salesDb.collection("categories").find({}).toArray(),
      salesDb.collection("trainers").find({}).toArray(),
      salesDb.collection("tools").find({}).toArray(),

      internalDb.collection("users")
        .find({
          role: "counsellor",
          isBlocked: { $ne: true },
        })
        .project({ name: 1, email: 1, role: 1 })
        .toArray(),
    ]);

    const categoryMap = new Map(
      categories.map((item) => [String(item._id), item])
    );

    const trainerMap = new Map(
      trainers.map((item) => [String(item._id), item])
    );

    const toolMap = new Map(
      tools.map((item) => [String(item._id), item])
    );

    const userMap = new Map(
      users.map((item) => [String(item._id), item])
    );

    const certificationCourses = courses.filter((course) => {
      const categoryId = idOf(course.categoryId ?? course.category);
      const category = categoryMap.get(categoryId);

      return (
        category?.name?.trim().toLowerCase() === "certification" &&
        isActive(course)
      );
    });

    const courseMap = new Map(
      courses.map((course) => [String(course._id), course])
    );

    const data = courses.map((course) => {
      const categoryId = idOf(course.categoryId ?? course.category);
      const category = categoryMap.get(categoryId);

      const trainerIds = getIds(
        course.trainerIds ?? course.trainers
      );

      const assignedTrainers = trainerIds
        .map((id) => trainerMap.get(id))
        .filter(Boolean)
        .map((trainer) => ({
          id: String(trainer._id),
          name: trainer.name || "Unnamed trainer",
        }));

      const toolIds = getIds(course.tools ?? course.toolIds);

      const assignedTools = toolIds
        .map((id) => toolMap.get(id))
        .filter(Boolean)
        .map((tool) => ({
          id: String(tool._id),
          name: tool.name || "Unnamed tool",
        }));

      const certificationId = idOf(
        course.certificationPitchCourseId ??
        course.certificationPitch
      );

      const certificationCourse = courseMap.get(certificationId);

      const counsellorId = idOf(
        course.salesCounsellorId ??
        course.salesCounsellor
      );

      const counsellor = userMap.get(counsellorId);

      const actualPrice = Number(
        course.actualPrice ?? course.price
      ) || 0;

      const originalPrice = Number(course.price) || 0;

      return {
        id: String(course._id),
        name: course.name || "Untitled course",

        categoryId,
        category: category?.name || course.categoryName || "Uncategorized",

        hours: Number(course.hours) || 0,
        price: actualPrice,
        originalPrice,
        discount: course.discount ?? null,
        level: course.level || "",

        tools: assignedTools,
        trainers: assignedTrainers,

        certificationPitchCourseId: certificationId,
        certificationPitch: certificationCourse?.name || "",

        prerequisite: course.prerequisite || course.preRequisite || "",

        salesCounsellorId: counsellorId,
        salesCounsellor: counsellor
          ? {
              id: String(counsellor._id),
              name: counsellor.name || "Unnamed counsellor",
              email: counsellor.email || "",
            }
          : null,

        status: course.status || (course.isActive ? "active" : "inactive"),
      };
    });

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Course catalog error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch courses",
      },
      { status: 500 }
    );
  }
}
