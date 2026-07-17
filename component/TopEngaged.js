import {
  Trophy,
  Star,
} from "lucide-react";

export default function TopEngaged({
  leads = [],
}) {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">

      <div className="flex justify-between items-center mb-6">

        <div>

          <h3 className="text-lg font-semibold">
            Top Engaged Leads
          </h3>

          <p className="text-gray-500 text-sm">
            Highest engagement score
          </p>

        </div>

        <div className="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center">

          <Trophy
            size={20}
            className="text-yellow-600"
          />

        </div>

      </div>

      <div className="space-y-4">

        {leads.length === 0 && (

          <div className="py-10 text-center text-gray-400">

            No Data

          </div>

        )}

        {leads.slice(0, 6).map((lead, index) => (

          <div
            key={index}
            className="rounded-2xl border border-gray-100 p-4 hover:border-orange-300 transition"
          >

            <div className="flex justify-between items-start">

              <div>

                <h4 className="font-semibold">

                  {lead.name}

                </h4>

                <p className="text-sm text-gray-500 mt-1">

                  {lead.phone}

                </p>

              </div>

              <div className="flex items-center gap-1">

                <Star
                  size={16}
                  className="text-yellow-500 fill-yellow-500"
                />

                <span className="font-bold">

                  {lead.score}

                </span>

              </div>

            </div>

            <div className="mt-4 flex justify-between items-center">

              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs">

                {lead.course || "N/A"}

              </span>

              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-xs">

                {lead.status || "New"}

              </span>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}