import { X } from "lucide-react";

export default function LeadAdd({setIsAddLeadOpen,
  handleAddLead,
  PROFILES,
course
}){
    return(
         <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                      <h2 className="text-xl font-bold text-gray-900">Add New Lead</h2>
                      <button onClick={() => setIsAddLeadOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                      </button>
                    </div>
                    
                    <div className="p-6 overflow-y-auto flex-1">
                      <form 
                        id="addLeadForm"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const data = Object.fromEntries(formData.entries());
                          handleAddLead(data);
                        }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6"
                      >
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Full Name *</label>
                          <input required name="name" type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Email *</label>
                          <input name="email" type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                          <input required name="phone" type="tel" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Course *
          </label>
          <select
            required
            name="course"
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
          >
            <option value="">Select Course...</option>
            {course.map((item) => (
    <option key={item._id} value={item.name}>
      {item.name}
    </option>
  ))}
          </select>
        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Profile Type *</label>
                          <select required name="profile" className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                            <option value="">Select...</option>
                            {PROFILES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                          </select>
                        </div>
        
                        <div className="space-y-1 md:col-span-2 flex items-center gap-3">
                          <input type="checkbox" id="consent" name="consent" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                          <label htmlFor="consent" className="text-sm font-medium text-gray-700">User has provided explicit consent to be contacted.</label>
                        </div>
        
                        <div className="space-y-1 md:col-span-2 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Optional Tracking Parameters</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input name="source" type="text" placeholder="Source (e.g. Google)" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <input name="medium" type="text" placeholder="Medium (e.g. CPC)" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <input name="campaign" type="text" placeholder="Campaign Name" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            <input name="term" type="text" placeholder="Search Term / Keyword" className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                          </div>
                        </div>
        
                      </form>
                    </div>
                    
                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                      <button onClick={() => setIsAddLeadOpen(false)} className="px-5 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors">
                        Cancel
                      </button>
                      <button form="addLeadForm" type="submit" className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                        Save Lead
                      </button>
                    </div>
                  </div>
                </div>
    )
}