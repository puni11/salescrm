"use client";

import { useEffect, useState } from "react";

export default function GoogleAdsFormsManager() {
  const [forms, setForms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadForms();
  }, []);

  async function loadForms() {
    try {
      setLoading(true);
      setError("");

      const [formsRes, selectedRes] = await Promise.all([
        fetch("/api/integrations/google-ads/forms"),
        fetch("/api/integrations/google-ads/selected-forms"),
      ]);

      const formsData = await formsRes.json();
      const selectedData = await selectedRes.json();

      if (!formsRes.ok) {
        throw new Error(formsData.message || "Failed to load forms");
      }

      const availableForms =
        formsData.forms ||
        formsData.assets ||
        formsData.results ||
        [];

      setForms(availableForms);

      setSelected(
        selectedData.selectedForms || []
      );
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function getResourceName(form) {
    return form.resourceName || form.resource_name || "";
  }

  function getFormName(form) {
    return (
      form.headline ||
      form.name ||
      form.businessName ||
      form.resourceName ||
      "Unnamed Lead Form"
    );
  }

  function isSelected(form) {
    const resourceName = getResourceName(form);

    return selected.some(
      (item) => item.resourceName === resourceName
    );
  }

  function toggleForm(form) {
    const resourceName = getResourceName(form);

    if (!resourceName) return;

    if (isSelected(form)) {
      setSelected((prev) =>
        prev.filter(
          (item) => item.resourceName !== resourceName
        )
      );
    } else {
      setSelected((prev) => [
        ...prev,
        {
          resourceName,
          assetId: form.id || "",
          name: getFormName(form),
          enabled: true,
        },
      ]);
    }
  }

  function selectAll() {
    setSelected(
      forms.map((form) => ({
        resourceName: getResourceName(form),
        assetId: form.id || "",
        name: getFormName(form),
        enabled: true,
      }))
    );
  }

  function deselectAll() {
    setSelected([]);
  }

  async function saveSelection() {
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const res = await fetch(
        "/api/integrations/google-ads/selected-forms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedForms: selected,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save");
      }

      setMessage(
        `Successfully saved ${selected.length} selected forms`
      );
    } catch (err) {
      setError(err.message || "Failed to save selection");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        Loading Google Ads lead forms...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Google Ads Lead Forms
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            Select which lead forms should be imported into your CRM.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={selectAll}
            className="px-4 py-2 border rounded-lg"
          >
            Select All
          </button>

          <button
            onClick={deselectAll}
            className="px-4 py-2 border rounded-lg"
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <strong>{selected.length}</strong> forms selected for CRM syncing
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700">
          {message}
        </div>
      )}

      <div className="space-y-3">
        {forms.map((form, index) => {
          const resourceName = getResourceName(form);
          const checked = isSelected(form);

          return (
            <label
              key={resourceName || index}
              className={`flex cursor-pointer gap-4 rounded-xl border p-4 transition ${
                checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleForm(form)}
                className="mt-1 h-5 w-5"
              />

              <div className="flex-1">
                <div className="font-semibold">
                  {getFormName(form)}
                </div>

                {form.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {form.description}
                  </p>
                )}

                {form.fields?.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    Fields:{" "}
                    {form.fields
                      .map((field) =>
                        typeof field === "string"
                          ? field
                          : field.fieldType || field.name || ""
                      )
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}

                <div className="mt-2 break-all text-xs text-gray-400">
                  {resourceName}
                </div>
              </div>

              {checked && (
                <span className="text-sm font-medium text-blue-600">
                  Selected
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={saveSelection}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Selected Forms"}
        </button>
      </div>
    </div>
  );
}