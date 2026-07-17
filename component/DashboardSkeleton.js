export default function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 w-full mx-auto bg-gray-50/50 min-h-screen">
      
      {/* Top Row: 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
            <div className="flex justify-between items-start mb-4">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              {/* Icon placeholder */}
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
            </div>
            {/* Main number placeholder */}
            <div className="h-8 bg-gray-200 rounded w-16 mb-4 mt-2"></div>
            {/* Trend/Subtitle placeholder */}
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Main Content Area: Left (2/3) and Right (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Secondary 2x2 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-2 mt-4"></div>
              </div>
            ))}
          </div>

          {/* Monthly Conversion Progress Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
            <div className="flex justify-between items-start mb-8">
              <div>
                <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
            </div>
            
            {/* Progress Bar Area */}
            <div className="flex justify-between mb-3">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-8"></div>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full w-full mb-4"></div>
            <div className="flex justify-between">
              <div className="h-3 bg-gray-200 rounded w-12"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          </div>

          {/* Recent Activities Header */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full">
                <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-56"></div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div className="h-10 bg-gray-200 rounded-xl w-full sm:w-64"></div>
                <div className="h-10 bg-gray-200 rounded-xl w-24"></div>
              </div>
            </div>
          </div>

        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="space-y-6">
          
          {/* Chart Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse h-[400px] flex flex-col">
             <div className="flex justify-between items-start mb-8">
              <div>
                <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                <div className="h-3 bg-gray-200 rounded w-40"></div>
              </div>
              <div className="h-10 w-10 bg-gray-200 rounded-xl"></div>
            </div>
            
            {/* Grid Lines & Axis Skeleton */}
            <div className="flex-1 flex flex-col justify-between border-l border-b border-gray-100 relative mt-4 pb-2">
               {[...Array(4)].map((_, i) => (
                 <div key={i} className="w-full border-t border-gray-100 border-dashed relative">
                   <div className="absolute -left-10 -top-2 h-3 bg-gray-200 w-6 rounded"></div>
                 </div>
               ))}
               
               {/* Dummy Bar */}
               <div className="absolute bottom-0 right-12 w-1.5 h-[80%] bg-gray-200 rounded-t-sm"></div>
            </div>
          </div>

          {/* Popular Courses List Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
            <div className="flex justify-between items-start mb-8">
              <div className="h-5 bg-gray-200 rounded w-32"></div>
              <div className="h-6 w-6 bg-gray-200 rounded"></div>
            </div>
            
            {/* List Items */}
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-3">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-4 bg-gray-200 rounded w-10"></div>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full w-full"></div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}