import { Award, Users } from "lucide-react";

export default function TopCounsellors({
  counsellors = [],
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">

      <div className="flex justify-between items-center mb-6">

        <div>

          <h3 className="text-lg font-semibold">
            Top Counsellors
          </h3>

          <p className="text-gray-500 text-sm">
            Based on assigned leads
          </p>

        </div>

        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">

          <Award
            size={20}
            className="text-blue-600"
          />

        </div>

      </div>

      <div className="space-y-4">

        {counsellors.length === 0 && (

          <div className="text-center py-10 text-gray-400">

            No Counsellors Found

          </div>

        )}

        {counsellors.slice(0, 6).map((user, index) => (

          <div
            key={index}
            className="flex justify-between items-center p-4 rounded-2xl bg-gray-50 hover:bg-orange-50 transition"
          >

            <div className="flex items-center gap-4">

              <div className="w-12 h-12 rounded-full bg-[#05335c] text-white flex items-center justify-center font-bold">

                {(user.name || "U")
                  .charAt(0)
                  .toUpperCase()}

              </div>

              <div>

                <p className="font-semibold">

                  {user.name || "Unknown"}

                </p>

                <p className="text-sm text-gray-500">

                  Counsellor

                </p>

              </div>

            </div>

            <div className="text-right">

              <p className="font-bold text-xl">

                {user.assignedLeads}

              </p>

              <p className="text-xs text-gray-500">

                Leads

              </p>

            </div>

          </div>

        ))}

      </div>

    </div>
  );
}