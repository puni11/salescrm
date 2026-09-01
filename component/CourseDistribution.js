"use client";

const BAR_COLORS = ["bg-blue-600", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"];

export default function CourseDistribution({ courses }) {
  const clean = (courses || [])
    .filter((c) => c.course && c.course.length < 40) // drop blanks, ids, and long one-off titles
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const max = Math.max(...clean.map((c) => c.count), 1);

  return (
    <div className="bg-white border border-dashed border-gray-200 p-5 h-full">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Course Distribution</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {clean.map((c, i) => (
          <div key={c.course}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-600 truncate pr-2">{c.course}</span>
              <span className="text-xs font-semibold text-gray-900 shrink-0">{c.count}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 overflow-hidden">
              <div
                className={`h-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                style={{ width: `${(c.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}