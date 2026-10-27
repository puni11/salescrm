
"use client";

const FUNNEL_ORDER = [
  "New Lead",
  "Call Back",
  "Interested",
  "Follow Up",
  "Demo Requested",
  "Converted",
];

const STAGE_COLORS = [
  "#3cc0b0", // Teal
  "#3898db", // Blue
  "#e67e22", // Orange
  "#6c647c", // Dark Gray/Purple
  "#9b59b6", // Purple
  "#d9536f", // Pink/Red
];

const STATUS_GROUPS = {
  Interested: ["Interested", "Course Interested"],
  Converted: ["Converted", "Registered"],
};

export default function LeadPipeline({ data }) {
  const byStatus = {};

  // Aggregate duplicate statuses safely
  (data || []).forEach((item) => {
    if (!item.status) return;

    byStatus[item.status] =
      (byStatus[item.status] || 0) + (Number(item.count) || 0);
  });

  const stages = FUNNEL_ORDER.map((status, i) => {
    const groupedStatuses = STATUS_GROUPS[status] || [status];

    const count = groupedStatuses.reduce(
      (sum, groupedStatus) => sum + (byStatus[groupedStatus] || 0),
      0
    );

    // Narrow the funnel at each stage
    const inset = i * 7;

    return {
      status,
      count,
      color: STAGE_COLORS[i],
      clipPath: `polygon(
        ${inset}% 0%,
        ${100 - inset}% 0%,
        ${100 - inset - 7}% 100%,
        ${inset + 7}% 100%
      )`,
    };
  });

  const totalInPipeline = stages.reduce(
    (sum, stage) => sum + stage.count,
    0
  );

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col border border-dashed border-gray-200 p-6 md:px-4 md:py-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-md font-semibold text-gray-800">
          Lead Pipeline
        </h3>

        <div className="mt-1 flex items-center justify-between border-t border-gray-200 pt-2">
          <span className="text-xs font-semibold text-gray-400">
            Total in Pipeline
          </span>

          <span className="text-md font-extrabold tracking-tight text-gray-900">
            {totalInPipeline.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* 3D Funnel */}
      <div className="relative mx-auto mt-8 w-full max-w-[380px] flex-1">
        {/* Top opening */}
        <div
          className="absolute left-0 top-[-10px] z-10 h-[20px] w-full rounded-[50%] bg-[#909caa]"
          style={{
            boxShadow: "inset 0 -12px 15px rgba(0, 0, 0, 0.45)",
          }}
        />

        {/* Funnel stages */}
        <div className="flex flex-col gap-[2px]">
          {stages.map((stage, i) => (
            <div
              key={stage.status}
              className="relative flex h-[50px] w-full items-center justify-center"
              style={{
                backgroundColor: stage.color,
                backgroundImage:
                  "linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.05) 85%, rgba(0,0,0,0.25) 100%)",
                clipPath: stage.clipPath,
                paddingTop: i === 0 ? "10px" : "0",
              }}
              title={`${stage.status}: ${stage.count.toLocaleString("en-IN")} leads`}
            >
              <span className="z-20 px-2 text-center text-[10px] font-semibold text-white drop-shadow-md">
                {stage.status} ({stage.count.toLocaleString("en-IN")})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
