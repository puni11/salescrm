import { useEffect } from "react";
import {
  X,
  Mail,
  Phone,
  BookOpen,
  User2,
  UserRound,
  ShieldCheck,
  Globe,
  Activity,
  TargetIcon,
  Search,
} from "lucide-react";

const hoverBg = "hover:bg-[rgba(55,53,47,0.06)]";

const fieldClass =
  "w-full rounded-[4px] bg-transparent px-2 py-1.5 text-sm text-[#37352F] outline-none transition-colors placeholder:text-[#C7C6C3] hover:bg-[rgba(55,53,47,0.06)] focus:bg-white focus:ring-2 focus:ring-[#2383E2]/40";

function Property({ icon: Icon, label, children }) {
  return (
    <div className="flex flex-col gap-1 py-0.5 sm:flex-row sm:items-start sm:gap-2">
      <div className="flex w-40 shrink-0 items-center gap-2 px-1 py-1.5 text-sm text-[#787774]">
        <Icon size={15} className="text-[#9B9A97]" />
        {label}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export default function LeadAdd({
  setIsAddLeadOpen,
  handleAddLead,
  PROFILES,
  counsellors,
  course,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setIsAddLeadOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setIsAddLeadOpen]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-[rgba(15,15,15,0.6)] p-4 sm:py-12"
      
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsAddLeadOpen(false);
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[720px] flex-col overflow-hidden rounded-[6px] bg-white text-[#37352F]"
        style={{
          boxShadow:
            "rgba(15,15,15,0.05) 0 0 0 1px, rgba(15,15,15,0.1) 0 5px 10px, rgba(15,15,15,0.2) 0 15px 40px",
        }}
      >
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-xs text-[#9B9A97]">New lead</span>
          <button
            type="button"
            onClick={() => setIsAddLeadOpen(false)}
            aria-label="Close"
            className={`rounded-[4px] p-1.5 text-[#787774] ${hoverBg}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 sm:px-10">
          <form
            id="addLeadForm"
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const data = Object.fromEntries(formData.entries());
              handleAddLead(data);
            }}
          >
            <input
              required
              autoFocus
              name="name"
              type="text"
              placeholder="Untitled"
              className="w-full bg-transparent text-[32px] font-bold leading-tight tracking-[-0.01em] text-[#37352F] outline-none placeholder:text-[#D3D1CB]"
            />
            <p className="mt-1 px-0.5 text-xs text-[#9B9A97]">
              Full name (required)
            </p>

            <div className="mt-4 space-y-0.5 border-b border-[#E9E9E7] pb-4">
              <Property icon={Mail} label="Email">
                <input
                  name="email"
                  type="email"
                  placeholder="Empty"
                  className={fieldClass}
                />
              </Property>

              <Property icon={Phone} label="Phone number">
                <input
                  required
                  name="phone"
                  type="tel"
                  placeholder="Required"
                  className={fieldClass}
                />
              </Property>

              <Property icon={BookOpen} label="Course">
                <select required name="course" className={fieldClass}>
                  <option value="">Select course...</option>
                  {course.map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Property>

              <Property icon={User2} label="Profile type">
                <select required name="profile" className={fieldClass}>
                  <option value="">Select...</option>
                  {PROFILES.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </Property>

              <Property icon={UserRound} label="Counsellor">
                <select required name="counsellor" className={fieldClass}>
                  <option value="">Select...</option>
                  {counsellors.map((counsellor) => (
                    <option key={counsellor.id} value={counsellor.id}>
                      {counsellor.name}
                    </option>
                  ))}
                </select>
              </Property>

              <Property icon={ShieldCheck} label="Consent">
                <label
                  htmlFor="consent"
                  className="flex cursor-pointer items-start gap-2 px-2 py-1.5 text-sm"
                >
                  <input
                    type="checkbox"
                    id="consent"
                    name="consent"
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#2383E2]"
                  />
                  User has provided explicit consent to be contacted.
                </label>
              </Property>
            </div>

            <div className="pt-4">
              <p className="mb-2 px-1 text-xs text-[#9B9A97]">
                Optional tracking parameters
              </p>
              <div className="space-y-0.5">
                <Property icon={Globe} label="Source">
                  <input
                    name="source"
                    type="text"
                    placeholder="e.g. Google"
                    className={fieldClass}
                  />
                </Property>
                <Property icon={Activity} label="Medium">
                  <input
                    name="medium"
                    type="text"
                    placeholder="e.g. CPC"
                    className={fieldClass}
                  />
                </Property>
                <Property icon={TargetIcon} label="Campaign">
                  <input
                    name="campaign"
                    type="text"
                    placeholder="Campaign name"
                    className={fieldClass}
                  />
                </Property>
                <Property icon={Search} label="Search term">
                  <input
                    name="term"
                    type="text"
                    placeholder="Search term / keyword"
                    className={fieldClass}
                  />
                </Property>
              </div>
            </div>
          </form>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#E9E9E7] px-4 py-3">
          <button
            type="button"
            onClick={() => setIsAddLeadOpen(false)}
            className="h-8 rounded-[4px] border border-[#E3E2E0] bg-white px-3 text-sm transition-colors hover:bg-[rgba(55,53,47,0.06)]"
          >
            Cancel
          </button>
          <button
            form="addLeadForm"
            type="submit"
            className="h-8 rounded-[4px] bg-[#2383E2] px-3.5 text-sm font-medium text-white transition-colors hover:bg-[#0077D4]"
          >
            Save lead
          </button>
        </div>
      </div>
    </div>
  );
}