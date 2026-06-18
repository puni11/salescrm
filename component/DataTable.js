"use client"

import { motion } from "framer-motion"

export default function DataTable({
  columns = [],
  data = [],
  renderActions,
}) {
  return (
    <div className="bg-white shadow-sm border rounded-md border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          
          {/* Header */}
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              {columns.map((col, index) => (
                <th key={index} className="px-6 py-4 font-medium">
                  {col.label}
                </th>
              ))}
              {renderActions && (
                <th className="px-6 py-4 font-medium text-right">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100">
            {data.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                whileHover={{ backgroundColor: "#f9fafb" }}
                className="transition"
              >
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-6 py-4 text-gray-700">
                    {col.render
                      ? col.render(row[col.accessor], row)
                      : row[col.accessor]}
                  </td>
                ))}

                {renderActions && (
                  <td className="px-6 py-4 text-right">
                    {renderActions(row)}
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}