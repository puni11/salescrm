
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wand2,
  Search,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Webhook,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

import { fetchCourse } from "@/lib/helper/helper";

const DEFAULTS = {
  course: "",
  status: "New Lead",
  source: "Google Ads",
  profile: "student",
};

/* ---------------- HELPERS ---------------- */

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

  const rawFields = Array.isArray(form?.fields)
    ? form.fields
    : [];

  const standardFields = rawFields.map((field, index) => {
    const fieldType =
      typeof field === "string"
        ? field
        : field.inputType ||
          field.fieldType ||
          field.type ||
          field.name ||
          `UNKNOWN_${index}`;

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

  const rawCustomQuestions = Array.isArray(form?.customQuestions)
    ? form.customQuestions
    : [];

  const customFields = rawCustomQuestions.map((question, index) => {
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

/* ---------------- STYLES ---------------- */

const inputCls =
  "w-full rounded-[4px] border border-[rgba(55,53,47,0.16)] bg-[rgba(242,241,238,0.6)] px-2.5 py-2 text-sm text-[#37352f] shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] transition focus:border-[#2383e2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2383e2]/25";

function Tag({ color = "gray", children }) {
  const colors = {
    gray: "bg-[#e3e2e0] text-[#32302c]",
    green: "bg-[#dbeddb] text-[#1c3829]",
    yellow: "bg-[#fdecc8] text-[#402c1b]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[12px] leading-[1.5] ${colors[color]}`}
    >
      {children}
    </span>
  );
}

function GhostButton({ onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1.5 text-sm text-[#787774] transition-colors hover:bg-[rgba(55,53,47,0.06)] disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-xs text-[#787774]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Callout({ tone, icon: Icon, children }) {
  const tones = {
    red: "bg-[#fdebec]",
    green: "bg-[#edf3ec]",
  };

  const iconCls =
    tone === "red" ? "text-[#e03e3e]" : "text-[#448361]";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-[4px] px-4 py-3 text-sm text-[#37352f] ${tones[tone]}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconCls}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ---------------- SEARCHABLE FORM SELECT ---------------- */

function SearchableFormSelect({
  forms,
  value,
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = forms.find(
    (form) => form.resourceName === value
  );

  const getLabel = (form) =>
    form.headline ||
    form.name ||
    form.businessName ||
    form.resourceName;

  const filteredForms = forms.filter((form) => {
    const query = search.toLowerCase().trim();

    if (!query) return true;

    return [
      getLabel(form),
      form.businessName,
      form.resourceName,
      String(form.id || ""),
    ]
      .filter(Boolean)
      .some((item) =>
        String(item).toLowerCase().includes(query)
      );
  });

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`${inputCls} flex items-center justify-between gap-3 text-left`}
      >
        <span className="truncate">
          {selected
            ? getLabel(selected)
            : "Search and select a form"}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close form dropdown"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />

          <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-[rgba(55,53,47,0.16)] bg-white shadow-xl">
            <div className="border-b p-2">
              <div className="flex items-center gap-2 rounded border px-2">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />

                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search form name or ID..."
                  className="w-full py-2 text-sm text-gray-800 outline-none"
                />

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="text-xs text-gray-400 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredForms.map((form) => (
                <button
                  type="button"
                  key={form.resourceName}
                  onClick={() => {
                    onChange(form.resourceName);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`block w-full px-3 py-2.5 text-left transition hover:bg-gray-50 ${
                    value === form.resourceName
                      ? "bg-blue-50"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[#37352f]">
                      {getLabel(form)}
                    </span>

                    {value === form.resourceName && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600" />
                    )}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-400">
                    ID: {form.id}
                  </div>
                </button>
              ))}

              {filteredForms.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-500">
                  No matching forms found.
                </p>
              )}
            </div>

            <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-400">
              {filteredForms.length} of {forms.length} forms
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- WEBHOOK SETUP ---------------- */

function WebhookSetup({
  config,
  loading,
  error,
}) {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState("");

  async function copyValue(value, type) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);

      window.setTimeout(() => {
        setCopied((current) =>
          current === type ? "" : current
        );
      }, 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  return (
    <section className="mt-0 border p-8 border-gray-200 rounded-md">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md bg-blue-50 p-2 text-blue-600">
          <Webhook className="h-5 w-5" />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">
              Webhook Setup
            </h2>

            <Tag color="green">Integration</Tag>
          </div>

          <p className="mt-1 text-sm text-[#787774]">
            Connect your Google Ads lead forms to receive leads
            automatically in your CRM.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 rounded bg-gray-100" />
          <div className="h-16 rounded bg-gray-100" />
        </div>
      ) : error ? (
        <Callout tone="red" icon={AlertCircle}>
          {error}
        </Callout>
      ) : config ? (
        <div className="space-y-4">
          {/* URL */}
          <Field label="Webhook URL">
            <div className="flex min-w-0 gap-2">
              <input
                readOnly
                value={config.webhookUrl}
                className={inputCls}
              />

              <button
                type="button"
                onClick={() =>
                  copyValue(config.webhookUrl, "url")
                }
                className="shrink-0 rounded border border-gray-200 px-3 text-gray-600 transition hover:bg-gray-50"
                title="Copy webhook URL"
              >
                {copied === "url" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {copied === "url" && (
              <p className="mt-1 text-xs text-green-600">
                Webhook URL copied.
              </p>
            )}
          </Field>

          {/* SECRET */}
          <Field label="Webhook Secret Key">
            <div className="flex min-w-0 gap-2">
              <input
                readOnly
                type={showKey ? "text" : "password"}
                value={config.webhookKey}
                className={inputCls}
              />

              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="shrink-0 rounded border border-gray-200 px-3 text-gray-600 hover:bg-gray-50"
                title={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  copyValue(config.webhookKey, "key")
                }
                className="shrink-0 rounded border border-gray-200 px-3 text-gray-600 hover:bg-gray-50"
                title="Copy secret key"
              >
                {copied === "key" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>

            {copied === "key" && (
              <p className="mt-1 text-xs text-green-600">
                Secret key copied.
              </p>
            )}
          </Field>

          {/* Instructions */}
          <div className="rounded-md bg-[#f7f6f3] p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#448361]" />
              <h3 className="text-sm font-semibold">
                How to connect a Google Ads form
              </h3>
            </div>

            <ol className="list-decimal space-y-2 pl-5 text-xs leading-5 text-[#787774]">
              <li>
                Open your{" "}
                <strong className="text-[#37352f]">
                  Google Ads account
                </strong>.
              </li>

              <li>
                Go to <strong>Assets → Lead forms</strong>.
              </li>

              <li>
                Select the lead form you want to connect and
                click Edit.
              </li>

              <li>
                Find the{" "}
                <strong className="text-[#37352f]">
                  Webhook integration
                </strong>{" "}
                section.
              </li>

              <li>
                Copy the Webhook URL above and paste it into
                Google's Webhook URL field.
              </li>

              <li>
                Copy the Secret Key above and paste it into
                Google's Webhook key field.
              </li>

              <li>
                Click <strong>Send test data</strong> and verify
                that the test succeeds.
              </li>

              <li>
                Save the Google Ads lead form.
              </li>

              <li>
                Repeat these steps for every lead form you want
                to connect.
              </li>
            </ol>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

            <p>
              Use the same webhook URL and secret key for all
              your Google Ads lead forms. Each form must still
              be configured individually inside Google Ads.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#787774]">
            <ExternalLink className="h-3.5 w-3.5" />

            <span>
              Your CRM webhook endpoint:
              {" "}
              <span className="font-medium text-[#37352f]">
                /api/integrations/google-ads/webhook
              </span>
            </span>
          </div>
        </div>
      ) : (
        <Callout tone="red" icon={AlertCircle}>
          Webhook configuration is unavailable. Check your
          GOOGLE_ADS_WEBHOOK_KEY environment variable.
        </Callout>
      )}
    </section>
  );
}

/* ---------------- MAIN COMPONENT ---------------- */

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

  const [webhookConfig, setWebhookConfig] = useState(null);
  const [webhookLoading, setWebhookLoading] = useState(true);
  const [webhookError, setWebhookError] = useState("");

  const selectedForm = forms.find(
    (form) => form.resourceName === selectedFormId
  );

  const googleFields = useMemo(
    () => getGoogleFields(selectedForm),
    [selectedForm]
  );

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  /* LOAD WEBHOOK CONFIG */

  async function loadWebhookConfig() {
    setWebhookLoading(true);
    setWebhookError("");

    try {
      const res = await fetch(
        "/api/integrations/google-ads/webhook/config",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to load webhook configuration"
        );
      }

      setWebhookConfig(data);
    } catch (err) {
      console.error("Webhook config error:", err);
      setWebhookError(err.message);
    } finally {
      setWebhookLoading(false);
    }
  }

  /* INITIALIZE */

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [formsRes, crmRes] = await Promise.all([
        fetch("/api/integrations/google-ads/forms", {
          cache: "no-store",
        }),
        fetch("/api/crm/fields", {
          cache: "no-store",
        }),
      ]);

      const formsData = await formsRes.json();
      const crmData = await crmRes.json();

      if (!formsRes.ok) {
        throw new Error(
          formsData.error || "Failed to load Google Ads forms"
        );
      }

      if (!crmRes.ok) {
        throw new Error("Failed to load CRM fields");
      }

      const loadedForms = formsData.forms || [];

      setForms(loadedForms);
      setCrmFields(crmData);

      if (
        loadedForms.length > 0 &&
        !selectedFormId
      ) {
        setSelectedFormId(loadedForms[0].resourceName);
      }

      fetchCourse(setCourses, () => {});

      await loadWebhookConfig();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* LOAD SAVED MAPPING */

  useEffect(() => {
    if (!selectedForm || crmFields.length === 0) return;

    loadExistingMapping(selectedForm);
  }, [selectedFormId, forms, crmFields]);

  async function loadExistingMapping(form) {
    setMapping({});
    setDefaults(DEFAULTS);
    setSavedMapping(false);
    setMessage("");

    const fields = getGoogleFields(form);

    setMapping(autoMapFields(fields, crmFields));

    try {
      const res = await fetch(
        `/api/integrations/google-ads/mappings?formResourceName=${encodeURIComponent(
          form.resourceName
        )}`,
        {
          cache: "no-store",
        }
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

  /* UPDATE MAPPING */

  function updateMapping(key, value) {
    setMapping((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSavedMapping(false);
    setMessage("");
  }

  function updateDefault(key, value) {
    setDefaults((prev) => ({
      ...prev,
      [key]: value,
    }));

    setSavedMapping(false);
    setMessage("");
  }

  function remapAutomatically() {
    setMapping(autoMapFields(googleFields, crmFields));
    setSavedMapping(false);
    setMessage("");
  }

  /* SAVE MAPPING */

  async function saveMapping() {
    if (!selectedForm) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch(
        "/api/integrations/google-ads/mappings",
        {
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
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Failed to save mapping"
        );
      }

      setSavedMapping(true);
      setMessage("Mapping saved successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  /* LOADING */

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl p-6 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-9 w-72 rounded bg-[#f1f1ef]" />
          <div className="h-4 w-96 max-w-full rounded bg-[#f1f1ef]" />
          <div className="h-64 rounded bg-[#f7f6f3]" />
        </div>
      </div>
    );
  }

  /* MAIN UI */

  return (
    <div className="space-y-8 p-6 text-[#37352f] md:p-8">

      {/* HEADER */}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            Google Ads Field Mapping
          </h1>

          <p className="mt-1 text-sm text-[#787774]">
            Map Google Ads lead forms to your internal CRM fields.
          </p>
        </div>

        <GhostButton
          onClick={initialize}
          disabled={loading}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh data
        </GhostButton>
      </div>

      {/* FORM SELECTION */}

      <div className="border-y border-[rgba(55,53,47,0.09)] py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="w-48 shrink-0 text-sm text-[#787774]">
            Google Ads lead form
          </label>

          <div className="flex-1">
            <SearchableFormSelect
              forms={forms}
              value={selectedFormId}
              onChange={setSelectedFormId}
            />

            {selectedForm && (
              <p className="mt-1 break-all text-xs text-[#9b9a97]">
                {selectedForm.resourceName}
              </p>
            )}

            {forms.length === 0 && (
              <p className="mt-2 text-sm text-amber-600">
                No Google Ads lead forms found.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ERRORS */}

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

      {/* FORM CONTENT */}

      {selectedForm && (
        <>
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12">

            {/* MAPPING TABLE */}
            <div className="lg:col-span-7">
<div className="flex justify-between mb-8">
            <section className="lg:col-span-4">
              <div className="mb-3 flex items-center justify-between gap-3">
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

              <div className="hidden grid-cols-12 gap-3 border-b border-[rgba(55,53,47,0.09)] px-2 py-2 text-xs text-[#9b9a97] md:grid">
                <div className="col-span-5">
                  Google Ads field
                </div>

                <div className="col-span-3">
                  Status
                </div>

                <div className="col-span-4">
                  CRM field
                </div>
              </div>

              <div className="max-h-[650px] divide-y divide-[rgba(55,53,47,0.09)] overflow-y-auto">
                {googleFields.map((field) => {
                  const mapped = mapping[field.key];

                  return (
                    <div
                      key={field.key}
                      className="grid grid-cols-1 items-center gap-2 px-2 py-3 transition-colors hover:bg-[rgba(55,53,47,0.03)] md:grid-cols-12 md:gap-3"
                    >
                      <div className="md:col-span-5">
                        <div className="text-sm font-medium">
                          {field.label}
                        </div>

                        <div className="mt-0.5 text-xs text-[#9b9a97]">
                          {field.isCustom
                            ? "Custom question"
                            : "Standard field"}
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
                            updateMapping(
                              field.key,
                              e.target.value
                            )
                          }
                          className={inputCls}
                        >
                          <option value="">
                            -- Ignore --
                          </option>

                          {crmFields.map((crmField) => (
                            <option
                              key={crmField.value}
                              value={crmField.value}
                            >
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

            {/* DEFAULT VALUES + WEBHOOK */}

            <section className="lg:col-span-3">
              <h2 className="text-base font-semibold">
                Default lead values
              </h2>

              <p className="mb-4 text-sm text-[#787774]">
                Automatically assigned to every lead from this form.
              </p>

              <div className="space-y-4">

                {/* COURSE */}

                <Field label="Course">
                  <select
                    value={defaults.course}
                    onChange={(e) =>
                      updateDefault("course", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="">
                      Select course
                    </option>

                    {courses.map((course) => (
                      <option
                        key={course._id}
                        value={course.name}
                      >
                        {course.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* STATUS */}

                <Field label="Lead status">
                  <select
                    value={defaults.status}
                    onChange={(e) =>
                      updateDefault("status", e.target.value)
                    }
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
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* SOURCE */}

                <Field label="Lead source">
                  <input
                    value={defaults.source}
                    onChange={(e) =>
                      updateDefault("source", e.target.value)
                    }
                    className={inputCls}
                  />
                </Field>

                {/* PROFILE */}

                <Field label="Profile">
                  <select
                    value={defaults.profile}
                    onChange={(e) =>
                      updateDefault("profile", e.target.value)
                    }
                    className={inputCls}
                  >
                    <option value="student">
                      Student
                    </option>

                    <option value="working professional">
                      Working Professional
                    </option>

                    <option value="business owner">
                      Business Owner
                    </option>

                    <option value="other">
                      Other
                    </option>
                  </select>
                </Field>
              </div>


            

              {/* WEBHOOK SETUP */}

             
            </section>
            </div>
             <div className="flex flex-col items-center justify-between gap-3 border-t border-[rgba(55,53,47,0.09)] pt-4 sm:flex-row">
            <div className="text-sm text-[#787774]">
              <span className="font-semibold text-[#37352f]">
                {mappedCount}
              </span>{" "}
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
              type="button"
              onClick={saveMapping}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#2383e2] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0b6ec5] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2383e2] sm:w-auto"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {saving ? "Saving..." : "Save mapping"}
            </button>
          </div>
            </div>
            
            <section className="lg:col-span-5">
            <WebhookSetup
                config={webhookConfig}
                loading={webhookLoading}
                error={webhookError}
              />
              </section>
          </div>
 
          {/* SAVE FOOTER */}

         
        </>
      )}

      {/* NO FORMS */}

      {forms.length === 0 && (
        <div className="rounded-md border border-dashed border-gray-300 p-10 text-center">
          <Webhook className="mx-auto mb-3 h-8 w-8 text-gray-400" />

          <h3 className="font-semibold text-[#37352f]">
            No Google Ads forms found
          </h3>

          <p className="mt-1 text-sm text-[#787774]">
            Check your Google Ads account and refresh the data.
          </p>

          <button
            type="button"
            onClick={initialize}
            className="mt-4 rounded bg-[#2383e2] px-4 py-2 text-sm text-white hover:bg-[#0b6ec5]"
          >
            Refresh forms
          </button>
        </div>
      )}
    </div>
  );
}
