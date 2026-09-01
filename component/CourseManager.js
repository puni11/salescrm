"use client";

import { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
export default function CourseManager() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/course");
      const data = await res.json();

      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreateCourse = async (e) => {
    e.preventDefault();

    const name = courseName.trim();

    if (!name) return;

    try {
      setCreating(true);

      const res = await fetch("/api/course", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to create course");
        return;
      }

      setCourses((prev) => [data.course, ...prev]);

      setCourseName("");
      toast.success("Course created successfully");
      setShowModal(false);
    } catch (error) {
      console.error("Create course error:", error);
      toast.error(data.message || "Failed to create course");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Manage Courses
          </h2>

          <p className="text-sm text-gray-500">
            Manage your course list
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-sm bg-black text-white text-sm font-medium hover:bg-gray-800 transition"
        >
          <Plus size={16} />
          Add Course
        </button>
      </div>

      {/* Course List */}
      <div className="bg-white border border-gray-200 rounded-md overflow-hidden">

        {/* Table Header */}
        <div className="grid grid-cols-[1fr_180px] px-5 py-3 bg-gray-50 border-b border-gray-200">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Course Name
          </div>

          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Status
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2
              size={20}
              className="animate-spin text-gray-400"
            />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              No courses found
            </p>
          </div>
        ) : (
          courses.map((course) => (
            <div
              key={course._id}
              className="grid grid-cols-[1fr_180px] px-5 py-4 border-b border-gray-100 last:border-0 items-center"
            >
              <div className="text-sm font-medium text-gray-800">
                {course.name}
              </div>

              <div>
                <span
                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                    course.status === "Active"
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {course.status || "Active"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Add Course
                </h3>

                <p className="text-xs text-gray-500 mt-1">
                  Create a new course
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCourse}>
              <div className="p-6">

                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Course Name
                </label>

                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Enter course name"
                  autoFocus
                  className="w-full px-3.5 py-3 rounded-lg border border-gray-200 outline-none text-sm text-gray-800 placeholder:text-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !courseName.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating && (
                    <Loader2 size={15} className="animate-spin" />
                  )}

                  {creating ? "Creating..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}