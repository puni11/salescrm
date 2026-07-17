"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { BarChart3 } from "lucide-react";

const COLORS = [
  "#FF6B35",
  "#FF7B47",
  "#FF8855",
  "#FF6B35",
  "#FF7B47",
  "#FF8855",
  "#FF6B35",
  "#FF7B47",
  "#FF8855",
  "#FF6B35",
  "#FF7B47",
  "#FF8855",
];

export default function MonthlyChart({ data }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-6">

      <div className="flex justify-between items-center mb-6">

        <div>
          <h3 className="text-lg font-semibold">
            Monthly Leads
          </h3>

          <p className="text-sm text-gray-500 mt-1">
            Lead generation trend
          </p>
        </div>

        <div className="w-11 h-11 rounded-md bg-gray-100 flex items-center justify-center">
          <BarChart3
            size={20}
            className="text-gray-600"
          />
        </div>

      </div>

      <div className="h-72">

        <ResponsiveContainer
          width="100%"
          height="100%"
        >

          <BarChart
            data={data}
            barCategoryGap={18}
          >

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#ececec"
            />

            <XAxis
              dataKey="month"
              tick={{
                fontSize: 12,
                fill: "#888",
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{
                fontSize: 12,
                fill: "#888",
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              cursor={{
                fill: "#fafafa",
              }}
            />

            <Bar
              dataKey="leads"
              radius={[8, 8, 0, 0]}
            >
              {data.map((_, index) => (
                <Cell
                  key={index}
                  fill={
                    COLORS[index % COLORS.length]
                  }
                />
              ))}
            </Bar>

          </BarChart>

        </ResponsiveContainer>

      </div>

    </div>
  );
}