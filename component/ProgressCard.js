import { Target } from "lucide-react";

export default function ProgressCard({
  conversionRate,
}) {
  return (
    <div className="bg-white rounded-md border border-gray-100 shadow-sm p-6">

      <div className="flex justify-between items-center">

        <div>
          <h3 className="font-semibold text-lg">
            Monthly Conversion
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Lead to admission conversion
          </p>
        </div>

        <div className="bg-[#05335c]/10 rounded-md p-3">
          <Target
            className="text-[#05335c]"
            size={20}
          />
        </div>

      </div>

      <div className="mt-8">

        <div className="flex justify-between mb-2">

          <span className="text-sm text-gray-500">
            Progress
          </span>

          <span className="font-semibold">
            {conversionRate}%
          </span>

        </div>

        <div className="w-full h-3 rounded-full bg-gray-200">

          <div
            style={{
              width: `${conversionRate}%`,
            }}
            className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-400"
          />

        </div>

      </div>

      <div className="mt-6 flex justify-between text-sm">

        <div>
          <p className="text-gray-500">
            Target
          </p>

          <p className="font-semibold">
            100%
          </p>
        </div>

        <div className="text-right">
          <p className="text-gray-500">
            Current
          </p>

          <p className="font-semibold">
            {conversionRate}%
          </p>
        </div>

      </div>

    </div>
  );
}