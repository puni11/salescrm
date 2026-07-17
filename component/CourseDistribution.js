import { BookOpen } from "lucide-react";

export default function CourseDistribution({
  courses,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">

      <div className="flex justify-between items-center mb-6">

        <h3 className="text-lg font-semibold">
          Popular Courses
        </h3>

        <BookOpen
          size={20}
          className="text-[#05335c]"
        />

      </div>

      <div className="space-y-4">

        {courses.slice(0, 6).map((course, index) => (
          <div
            key={index}
            className="flex justify-between items-center"
          >
            <div>

              <p className="font-medium">
                {course.course || "Unknown"}
              </p>

              <div className="w-48 h-2 rounded-full bg-gray-200 mt-2">

                <div
                  className="h-2 rounded-full bg-[#05335c]"
                  style={{
                    width: `${Math.min(
                      course.count * 4,
                      100
                    )}%`,
                  }}
                />

              </div>

            </div>

            <span className="font-bold">
              {course.count}
            </span>

          </div>
        ))}

      </div>

    </div>
  );
}