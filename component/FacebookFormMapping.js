"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

const courses = [
  "Digital Marketing",
  "Azure + Azure DevOps",
];

export default function FacebookFormMapping({ formId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(null);
  const [crmFields, setCrmFields] = useState([]);
  const [mapping, setMapping] = useState({});
  const [defaults, setDefaults] = useState({
    course: "",
    status: "New Lead",
    source: "Facebook Lead Ads",
    profile: "student"
  });

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);

    try {
      const [formRes, crmRes] = await Promise.all([
        fetch(`/api/facebook/forms/${formId}`),
        fetch("/api/crm/fields"),
      ]);

      const formData = await formRes.json();
      const crmData = await crmRes.json();

      setForm(formData);
      setCrmFields(crmData);

      autoMap(formData.questions || [], crmData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function autoMap(questions, fields) {
    const map = {};

    questions.forEach((question) => {
      const normalized = question.key
        .replace(/_/g, "")
        .toLowerCase();

      const found = fields.find((field) => {
        return (
          field.value.toLowerCase() === normalized ||
          field.label.replace(/\s/g, "").toLowerCase() === normalized
        );
      });

      if (found) {
        map[question.key] = found.value;
      }
    });

    setMapping(map);
  }

  function updateMapping(key, value) {
    setMapping((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveMapping() {
    setSaving(true);

    try {
      const res = await fetch("/api/facebook/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formId,
          formName: form?.name,
          pageId: form?.pageId,
          mapping,
          defaults
        })
      });

      const data = await res.json();
      alert(data.message || "Mapping Saved successfully");
    } catch (err) {
      console.error(err);
      alert("Unable to save mapping");
    }

    setSaving(false);
  }

  const mappedCount = useMemo(() => {
    return Object.keys(mapping).filter((x) => mapping[x]).length;
  }, [mapping]);

  return (
    <div className=" p-8">
      
      {/* Page Header - Always Visible */}
      <div className="mb-8">
        <Link
          href="/settings/integrations/facebook/forms"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Forms
        </Link>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Field Mapping
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              {loading ? "Loading form data..." : (form?.name || "Unnamed Form")}
            </p>
          </div>

          <button
            onClick={initialize}
            disabled={loading}
            className={`px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium flex items-center gap-2 transition-colors shadow-sm ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {loading ? (
        /* SKELETON LOADING UI */
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
            
            {/* Left Column Skeleton */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
                <div className="h-5 bg-gray-200 rounded w-48 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-72"></div>
              </div>
              <div className="hidden md:grid grid-cols-12 gap-4 border-b border-gray-200 px-6 py-3">
                <div className="col-span-5 h-4 bg-gray-200 rounded w-24"></div>
                <div className="col-span-3 h-4 bg-gray-200 rounded w-16"></div>
                <div className="col-span-4 h-4 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="divide-y divide-gray-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center">
                    <div className="col-span-1 md:col-span-5">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                    </div>
                    <div className="col-span-1 md:col-span-3">
                      <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                    </div>
                    <div className="col-span-1 md:col-span-4">
                      <div className="h-9 bg-gray-200 rounded-lg w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-5">
                <div className="h-5 bg-gray-200 rounded w-40 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-64"></div>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Skeleton */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-md border border-gray-200 shadow-sm p-6">
            <div className="h-5 bg-gray-200 rounded w-48 mb-4 sm:mb-0"></div>
            <div className="h-10 bg-gray-200 rounded-lg w-full sm:w-40"></div>
          </div>
        </div>
      ) : (
        /* ACTUAL DATA UI */
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
            
            {/* Left Column: Field Mapping Section */}
            <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Facebook Fields to CRM</h2>
                <p className="text-sm text-gray-500 mt-1">Match incoming questions from your Lead Ad to your internal CRM fields.</p>
              </div>

              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 border-b border-gray-200 bg-gray-50/50 px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-5">Facebook Field</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-4">CRM Field</div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {(form?.questions || []).map((question) => {
                  const mapped = mapping[question.key];

                  return (
                    <div
                      key={question.key}
                      className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="col-span-1 md:col-span-5">
                        <p className="font-medium text-gray-900 line-clamp-1">
                          {question.label}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 inline-block px-2 py-0.5 rounded">
                          {question.key}
                        </p>
                      </div>

                      <div className="col-span-1 md:col-span-3">
                        {mapped ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-green-50 text-green-700 border border-green-200 text-xs font-medium">
                            <CheckCircle2 size={14} /> Mapped
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-medium">
                            <AlertCircle size={14} /> Unmapped
                          </span>
                        )}
                      </div>

                      <div className="col-span-1 md:col-span-4">
                        <select
                          value={mapped || ""}
                          onChange={(e) => updateMapping(question.key, e.target.value)}
                          className="block w-full rounded-sm border-gray-300 border bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 transition-shadow"
                        >
                          <option value="" className="text-gray-500">
                            -- Ignore --
                          </option>
                          {crmFields.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Default Values Section */}
            <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-900">Default Lead Values</h2>
                <p className="text-sm text-gray-500 mt-1">Automatically assigned to every lead imported from this form.</p>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Course
                  </label>
                  <select
                    className="block w-full rounded-sm border-gray-300 border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 transition-shadow"
                    value={defaults.course}
                    onChange={(e) =>
                      setDefaults((prev) => ({ ...prev, course: e.target.value }))
                    }
                  >
                    <option value="">Select Course</option>
                    {courses.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Status
                  </label>
                  <select
                    className="block w-full rounded-sm border-gray-300 border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 transition-shadow"
                    value={defaults.status}
                    onChange={(e) =>
                      setDefaults((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option>New Lead</option>
                    <option>Contacted</option>
                    <option>Qualified</option>
                    <option>Won</option>
                    <option>Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Source
                  </label>
                  <input
                    type="text"
                    className="block w-full rounded-sm border-gray-300 border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 transition-shadow"
                    value={defaults.source}
                    onChange={(e) =>
                      setDefaults((prev) => ({ ...prev, source: e.target.value }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile
                  </label>
                  <select
                    className="block w-full rounded-sm border-gray-300 border bg-white px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none focus:ring-1 transition-shadow"
                    value={defaults.profile}
                    onChange={(e) =>
                      setDefaults((prev) => ({ ...prev, profile: e.target.value }))
                    }
                  >
                    <option value="student">Student</option>
                    <option value="working professional">Working Professional</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Save Action Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-md border border-gray-200 shadow-sm p-6">
            <div className="text-sm font-medium text-gray-600 mb-4 sm:mb-0">
              <span className="text-gray-900 font-bold">{mappedCount}</span> of {form?.questions?.length || 0} fields mapped
            </div>

            <button
              onClick={saveMapping}
              disabled={saving}
              className="w-full sm:w-auto bg-[#05335c] hover:bg-[#05335c]/80 cursor-pointer text-white font-medium rounded-lg px-6 py-2.5 flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {saving ? "Saving Changes..." : "Save Mapping"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}