import { CheckCircle, Filter, X } from "lucide-react";

export default function MobileFilter({
  isMobileFiltersOpen,
  setIsMobileFiltersOpen,
  renderFilters,
}){
    return(
        <div
        className={`fixed inset-0 z-[70] md:hidden transition-opacity duration-300 ${
          isMobileFiltersOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={() => setIsMobileFiltersOpen(false)}
        />

        {/* Sliding Panel */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-300 transform p-5 pb-8 ${
            isMobileFiltersOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Filter size={20} className="text-blue-600"/>
              Filters & Sorting
            </h2>
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto px-1">
            {renderFilters(true)}
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setIsMobileFiltersOpen(false)}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    )
}