"use client";

// Your original logical funnel order
const FUNNEL_ORDER = ["New Lead", "Call Back", "Interested", "Follow Up", "Converted"];

// Base colors extracted from the provided design
const STAGE_COLORS = [
  "#3cc0b0", // Teal
  "#3898db", // Blue
  "#e67e22", // Orange
  "#6c647c", // Dark Gray/Purple
  "#d9536f", // Pink/Red
];

export default function LeadPipeline({ data }) {
  const byStatus = {};
  (data || []).forEach((d) => {
    if (d.status) byStatus[d.status] = d.count;
  });

  const stages = FUNNEL_ORDER.map((status, i) => ({
    status,
    count: byStatus[status] || 0,
    color: STAGE_COLORS[i],
    // Each stage mathematically narrows by 8% on each side to create a perfect stack 
    // without manual width guessing.
    clipPath: `polygon(${i * 8}% 0%, ${100 - i * 8}% 0%, ${100 - (i + 1) * 8}% 100%, ${(i + 1) * 8}% 100%)`
  }));

  const totalInPipeline = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className=" p-6 md:px-4 md:py-4 max-w-lg mx-auto flex flex-col border border-dashed border-gray-200 h-full">
      <div className="mb-4">
        <h3 className="text-md font-semibold text-gray-800">
          Lead Pipeline
        </h3>
        <div className="mt-1 pt-1 border-t border-gray-200 flex justify-between items-center">
        <span className="text-xs font-semibold text-gray-400">Total in Pipeline</span>
        <span className="text-md font-extrabold text-gray-900 tracking-tight">
          {totalInPipeline.toLocaleString("en-IN")}
        </span>
      </div>
      </div>

      {/* 3D Funnel Container */}
      <div className="relative w-full max-w-[380px] mx-auto flex-1 mt-8">
        
        {/* Dark Top Opening (Ellipse) */}
        <div 
          className="absolute w-full h-[20px] rounded-[50%] bg-[#909caa] z-10 top-[-10px] left-0"
          style={{
            boxShadow: "inset 0 -12px 15px rgba(0, 0, 0, 0.45)"
          }}
        />

        {/* Funnel Stages */}
        <div className="flex flex-col gap-[2px]">
          {stages.map((stage, i) => (
            <div
              key={stage.status}
              className="relative flex items-center justify-center w-full h-[50px]"
              style={{
                backgroundColor: stage.color,
                clipPath: stage.clipPath,
                // Linear gradient applied over the background color to fake a 3D cylindrical shadow
                backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.05) 85%, rgba(0,0,0,0.25) 100%)",
                // Push the very first item's text down slightly so the dark opening doesn't cover it
                paddingTop: i === 0 ? "10px" : "0",
              }}
            >
              <span className="text-white text-[10px] font-semibold drop-shadow-md z-20">
                {stage.status} ({stage.count})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}