"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wand2,
} from "lucide-react";
import { fetchCourse } from "@/lib/helper/helper";

const DEFAULTS = {
  course: "",
  status: "New Lead",
  source: "Google Ads",
  profile: "student",
};

/* ---------- logic helpers (unchanged) ---------- */

function normalize(value = "") {
  return String(value)
    .replace(/[_\s-]/g, "")
    .toLowerCase();
}

function getGoogleFields(form) {
  const FIELD_LABELS = {
    FULL_NAME: "Full Name",
    FIRST_NAME: "First Name",
    LAST_NAME: "Last Name",
    EMAIL: "Email Address",
    PHONE_NUMBER: "Phone Number",
    CITY: "City",
    POSTAL_CODE: "Postal Code",
    STREET_ADDRESS: "Street Address",
    COUNTRY: "Country",
    COMPANY_NAME: "Company Name",
    JOB_TITLE: "Job Title",
    WORK_EMAIL: "Work Email",
    WORK_PHONE: "Work Phone",
    VEHICLE_MODEL: "Vehicle Model",
    VEHICLE_TYPE: "Vehicle Type",
    PREFERRED_DEALER: "Preferred Dealer",
    PRODUCT: "Product",
    SERVICE: "Service",
  };

  // Ensure fields is treated as an array even if the API returns something unexpected
  const rawFields = Array.isArray(form?.fields) ? form.fields : [];

  const standardFields = rawFields.map((field, index) => {
    // Look for 'inputType' which is the standard Google Ads API property
    const fieldType =
      typeof field === "string"
        ? field
        : field.inputType || field.fieldType || field.type || field.name || `UNKNOWN_${index}`;

    return {
      key: fieldType,
      label:
        FIELD_LABELS[fieldType] ||
        String(fieldType)
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase()),
      raw: field,
      isCustom: false,
    };
  });

  const rawCustomQuestions = Array.isArray(form?.customQuestions) ? form.customQuestions : [];

  const customFields = rawCustomQuestions.map((question, index) => {
    // Look for 'customQuestionText' which is the standard Google Ads API property
    const questionText =
      typeof question === "string"
        ? question
        : question.customQuestionText ||
          question.questionText ||
          question.text ||
          question.question ||
          `Custom Question ${index + 1}`;

    return {
      key: `CUSTOM_${index}`,
      label: questionText,
      raw: question,
      isCustom: true,
    };
  });

  return [...standardFields, ...customFields];
}

function autoMapFields(googleFields, crmFields) {
  const result = {};

  const synonyms = {
    FULL_NAME: ["name", "fullname", "full name"],
    FIRST_NAME: ["firstname", "first name"],
    LAST_NAME: ["lastname", "last name"],
    EMAIL: ["email", "emailaddress"],
    PHONE_NUMBER: ["phone", "mobile", "phonenumber"],
    CITY: ["city"],
    POSTAL_CODE: ["pincode", "postalcode", "zipcode"],
  };

  googleFields.forEach((googleField) => {
    const googleKey = googleField.key;
    const normalizedGoogle = normalize(googleKey);
    const normalizedLabel = normalize(googleField.label);

    const possibleMatches = [
      normalizedGoogle,
      normalizedLabel,
      ...(synonyms[googleKey] || []).map(normalize),
    ];

    const match = crmFields.find((crmField) => {
      const crmValue = normalize(crmField.value);
      const crmLabel = normalize(crmField.label);

      return (
        possibleMatches.includes(crmValue) ||
        possibleMatches.includes(crmLabel)
      );
    });

    if (match) {
      result[googleField.key] = match.value;
    }
  });

  return result;
}

/* ---------- Notion-style UI pieces ----------
   text #37352f · muted #787774 · faint #9b9a97
   border rgba(55,53,47,0.09) · hover rgba(55,53,47,0.06)
---------------------------------------------- */

const inputCls =
  "w-full rounded-[4px] border border-[rgba(55,53,47,0.16)] bg-[rgba(242,241,238,0.6)] px-2.5 py-1.5 text-sm text-[#37352f] shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] transition focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/25";

function Tag({ color = "gray", children }) {
  const colors = {
    gray: "bg-[#e3e2e0] text-[#32302c]",
    green: "bg-[#dbeddb] text-[#1c3829]",
    yellow: "bg-[#fdecc8] text-[#402c1b]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[13px] leading-[1.3] ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function GhostButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2383e2]"
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs text-[#787774]">{label}</label>
      {children}
    </div>
  );
}

function Callout({ tone, icon: Icon, children }) {
  const tones = {
    red: "bg-[#fdebec]",
    green: "bg-[#edf3ec]",
  };
  const iconCls = tone === "red" ? "text-[#e03e3e]" : "text-[#448361]";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-[4px] px-4 py-3 text-sm text-[#37352f] ${tones[tone]}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconCls}`} />
      {children}
    </div>
  );
}

/* ---------- main component ---------- */

export default function GoogleAdsFormMapping() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [forms, setForms] = useState([]);
  const [crmFields, setCrmFields] = useState([]);
  const [courses, setCourses] = useState([]);

  const [selectedFormId, setSelectedFormId] = useState("");
  const [mapping, setMapping] = useState({});
  const [defaults, setDefaults] = useState(DEFAULTS);

  const [savedMapping, setSavedMapping] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedForm = forms.find(
    (form) => form.resourceName === selectedFormId
  );

  const googleFields = useMemo(
    () => getGoogleFields(selectedForm),
    [selectedForm]
  );

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    try {
      const [formsRes, crmRes] = await Promise.all([
        fetch("/api/integrations/google-ads/forms"),
        fetch("/api/crm/fields"),
      ]);

      const formsData = await formsRes.json();
      const crmData = await crmRes.json();

      if (!formsRes.ok) {
        throw new Error(formsData.error || "Failed to load Google Ads forms");
      }

      if (!crmRes.ok) {
        throw new Error("Failed to load CRM fields");
      }

      const loadedForms = formsData.forms || [];

      setForms(loadedForms);
      setCrmFields(crmData);

      if (loadedForms.length > 0 && !selectedFormId) {
        setSelectedFormId(loadedForms[0].resourceName);
      }

      // Fetch courses using your existing helper
      fetchCourse(setCourses, () => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedForm) return;

    loadExistingMapping(selectedForm);
  }, [selectedFormId, forms, crmFields]);

  async function loadExistingMapping(form) {
    setMapping({});
    setDefaults(DEFAULTS);
    setSavedMapping(false);

    const fields = getGoogleFields(form);

    // Initial auto-mapping
    setMapping(autoMapFields(fields, crmFields));

    try {
      const res = await fetch(
        `/api/integrations/google-ads/mappings?formResourceName=${encodeURIComponent(
          form.resourceName
        )}`
      );

      if (!res.ok) return;

      const data = await res.json();

      if (data.mapping) {
        setMapping(data.mapping);
        setDefaults({
          ...DEFAULTS,
          ...(data.defaults || {}),
        });
        setSavedMapping(true);
      }
    } catch (err) {
      console.error("Load Google Ads mapping:", err);
    }
  }

  function updateMapping(key, value) {
    setMapping((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSavedMapping(false);
  }

  function updateDefault(key, value) {
    setDefaults((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSavedMapping(false);
  }

  function remapAutomatically() {
    setMapping(autoMapFields(googleFields, crmFields));
    setSavedMapping(false);
  }

  async function saveMapping() {
    if (!selectedForm) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/integrations/google-ads/mappings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formResourceName: selectedForm.resourceName,
          formId: selectedForm.id,
          formName:
            selectedForm.headline ||
            selectedForm.name ||
            selectedForm.businessName ||
            "Google Ads Lead Form",
          mapping,
          defaults,
          enabled: true,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to save mapping");
      }

      setSavedMapping(true);
      setMessage("Mapping saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-72 rounded-[4px] bg-[#f1f1ef]" />
          <div className="h-4 w-96 max-w-full rounded-[4px] bg-[#f1f1ef]" />
          <div className="h-64 rounded-[4px] bg-[#f7f6f3]" />
        </div>
      </div>
    );
  }

  return (
    <div className=" space-y-8 p-6 text-[#37352f] md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Google Ads Field Mapping
          </h1>
          <p className="mt-1 text-sm text-[#787774]">
            Map each Google Ads lead form to your internal CRM fields.
          </p>
        </div>

        <GhostButton onClick={initialize} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh data
        </GhostButton>
      </div>

      {/* Form selection */}
      <div className="border-y border-[rgba(55,53,47,0.09)] py-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="w-48 shrink-0 text-sm text-[#787774]">
            Google Ads lead form
          </label>

          <div className="flex-1">
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a form</option>

              {forms.map((form) => (
                <option key={form.resourceName} value={form.resourceName}>
                  {form.headline ||
                    form.name ||
                    form.businessName ||
                    form.resourceName}
                </option>
              ))}
            </select>

            {selectedForm && (
              <p className="mt-1 break-all text-xs text-[#9b9a97]">
                {selectedForm.resourceName}
              </p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <Callout tone="red" icon={AlertCircle}>
          {error}
        </Callout>
      )}

      {message && (
        <Callout tone="green" icon={CheckCircle2}>
          {message}
        </Callout>
      )}

      {selectedForm && (
        <>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
            {/* Mapping table */}
            <section className="lg:col-span-8">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    Google Ads fields → CRM
                  </h2>
                  <p className="text-sm text-[#787774]">
                    Match form questions with fields in your CRM.
                  </p>
                </div>

                <GhostButton onClick={remapAutomatically}>
                  <Wand2 className="h-4 w-4" />
                  Auto-map
                </GhostButton>
              </div>

              <div className="hidden grid-cols-12 gap-3 border-b border-[rgba(55,53,47,0.09)] px-2 py-1.5 text-xs text-[#9b9a97] md:grid">
                <div className="col-span-5">Google Ads field</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-4">CRM field</div>
              </div>

              <div className="max-h-[650px] divide-y divide-[rgba(55,53,47,0.09)] overflow-y-auto">
                {googleFields.map((field) => {
                  const mapped = mapping[field.key];

                  return (
                    <div
                      key={field.key}
                      className="grid grid-cols-1 items-center gap-2 px-2 py-2.5 transition-colors hover:bg-[rgba(55,53,47,0.03)] md:grid-cols-12 md:gap-3"
                    >
                      <div className="md:col-span-5">
                        <div className="text-sm font-medium">{field.label}</div>
                        <div className="mt-0.5 text-xs text-[#9b9a97]">
                          {field.isCustom ? "Custom question" : "Standard field"}
                        </div>
                      </div>

                      <div className="md:col-span-3">
                        {mapped ? (
                          <Tag color="green">
                            <CheckCircle2 className="h-3 w-3" />
                            Mapped
                          </Tag>
                        ) : (
                          <Tag color="yellow">
                            <AlertCircle className="h-3 w-3" />
                            Unmapped
                          </Tag>
                        )}
                      </div>

                      <div className="md:col-span-4">
                        <select
                          value={mapped || ""}
                          onChange={(e) =>
                            updateMapping(field.key, e.target.value)
                          }
                          className={inputCls}
                        >
                          <option value="">-- Ignore --</option>

                          {crmFields.map((crmField) => (
                            <option key={crmField.value} value={crmField.value}>
                              {crmField.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}

                {googleFields.length === 0 && (
                  <div className="py-8 text-center text-sm text-[#787774]">
                    No fields found for this form.
                  </div>
                )}
              </div>
            </section>

            {/* Defaults */}
            <section className="lg:col-span-4">
              <h2 className="text-base font-semibold">Default lead values</h2>
              <p className="mb-4 text-sm text-[#787774]">
                Automatically assigned to every lead from this form.
              </p>

              <div className="space-y-4">
                <Field label="Course">
                  <select
                    value={defaults.course}
                    onChange={(e) => updateDefault("course", e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select course</option>

                    {courses.map((course) => (
                      <option key={course._id} value={course.name}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Lead status">
                  <select
                    value={defaults.status}
                    onChange={(e) => updateDefault("status", e.target.value)}
                    className={inputCls}
                  >
                    {[
                      "New Lead",
                      "Contacted",
                      "Qualified",
                      "Follow Up",
                      "Won",
                      "Lost",
                    ].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Lead source">
                  <input
                    value={defaults.source}
                    onChange={(e) => updateDefault("source", e.target.value)}
                    className={inputCls}
                  />
                </Field>

                <Field label="Profile">
                  <select
                    value={defaults.profile}
                    onChange={(e) => updateDefault("profile", e.target.value)}
                    className={inputCls}
                  >
                    <option value="student">Student</option>
                    <option value="working professional">
                      Working Professional
                    </option>
                    <option value="business owner">Business Owner</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-[rgba(55,53,47,0.09)] pt-4 sm:flex-row">
            <div className="text-sm text-[#787774]">
              <span className="font-semibold text-[#37352f]">{mappedCount}</span>{" "}
              of {googleFields.length} fields mapped
              {savedMapping && (
                <span className="ml-3">
                  <Tag color="green">
                    <CheckCircle2 className="h-3 w-3" />
                    Saved
                  </Tag>
                </span>
              )}
            </div>

            <button
              onClick={saveMapping}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#2383e2] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#0b6ec5] disabled:opacity-60 sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2]"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save mapping"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}