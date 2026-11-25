import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { apiRequest } from "./api";

const fields = [
  {
    name: "project_type",
    label: "Project Type",
    options: [
      { value: "", label: "Not provided" },
      { value: "2BHK", label: "2BHK" },
      { value: "3BHK", label: "3BHK" },
      { value: "Villa", label: "Villa" },
      { value: "Apartment", label: "Apartment" },
    ],
  },
  {
    name: "automation_type",
    label: "Automation Type",
    options: [
      { value: "", label: "Not provided" },
      {
        value: "Full Home Automation",
        label: "Full Home Automation",
      },
      {
        value: "Semi Automation",
        label: "Semi Automation",
      },
      {
        value: "Basic Automation",
        label: "Basic Automation",
      },
    ],
  },
  {
    name: "project_status",
    label: "Project Status",
    options: [
      { value: "", label: "Not provided" },
      { value: "planning", label: "Planning (Legacy)" },
      {
        value: "construction",
        label: "Under Construction",
      },
      {
        value: "interiors",
        label: "Interior Work Going On",
      },
      { value: "completed", label: "Completed" },
    ],
  },
  {
    name: "completion_timeline",
    label: "Completion Timeline",
    options: [
      { value: "", label: "Not applicable" },
      {
        value: "Within 1 Month",
        label: "Within 1 Month",
      },
      {
        value: "1-2 Months",
        label: "1–2 Months",
      },
      {
        value: "3 Months",
        label: "3 Months",
      },
      {
        value: "1-3 months",
        label: "1–3 Months (Legacy)",
      },
      {
        value: "3-6 months",
        label: "3–6 Months (Legacy)",
      },
      {
        value: "More than 6 months",
        label: "More Than 6 Months (Legacy)",
      },
    ],
  },
];

export default function EditLeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!lead) return;

    setForm({
      project_status: lead.project_status || "",
      automation_type: lead.automation_type || "",
      project_status: lead.project_status || "",
      completion_timeline: lead.completion_timeline || "",
      project_location: lead.project_location || "",
      preferred_site_visit: lead.preferred_site_visit || "",
    });

    setError("");
  }, [lead]);

  if (!lead) return null;

  function update(name, value) {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await apiRequest(
        `/admin/leads/${encodeURIComponent(lead.phone)}/details`,
        {
          method: "PATCH",
          body: JSON.stringify(form),
        },
      );

      await onSaved();
    } catch (err) {
      setError(err.message || "Unable to update lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center
        justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-lead-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
      >
        <div
          className="flex items-center justify-between
          border-b border-slate-200 p-5"
        >
          <div>
            <h2 id="edit-lead-title" className="text-lg font-semibold">
              Edit Lead Details
            </h2>
            <p className="mt-1 text-sm text-slate-500">+{lead.phone}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close lead editor"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="max-h-[75vh] space-y-4 overflow-y-auto p-5"
        >
          {fields.map((field) => (
            <div key={field.name}>
              <label className="mb-2 block text-sm font-medium">
                {field.label}
              </label>

              <select
                value={form[field.name] ?? ""}
                onChange={(event) => update(field.name, event.target.value)}
                className="w-full rounded-xl border
                  border-slate-200 bg-white px-4 py-3
                  text-sm outline-none focus:border-emerald-500"
              >
                {!field.options.some(
                  (option) => option.value === form[field.name],
                ) &&
                  form[field.name] && (
                    <option value={form[field.name]}>
                      {form[field.name]} (Current)
                    </option>
                  )}

                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Project Location
            </label>

            <input
              value={form.project_location ?? ""}
              onChange={(event) =>
                update("project_location", event.target.value)
              }
              maxLength={255}
              placeholder="Enter project location"
              className="w-full rounded-xl border
                border-slate-200 px-4 py-3 text-sm
                outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Preferred Site Visit
            </label>

            <input
              type="text"
              value={form.preferred_site_visit ?? ""}
              onChange={(event) =>
                update("preferred_site_visit", event.target.value)
              }
              maxLength={200}
              placeholder="e.g. Friday, Tomorrow, 28 Nov 2026"
              className="w-full rounded-xl border
      border-slate-200 px-4 py-3 text-sm
      outline-none focus:border-emerald-500"
            />

            <p className="mt-1 text-xs text-slate-500">
              Customer's preferred date or day. Site visit requires team
              confirmation.
            </p>
          </div>

          <div
            className="rounded-xl bg-amber-50 p-3
            text-xs text-amber-800"
          >
            Editing these details will not restart the WhatsApp qualification
            bot or change the lead's automated qualification status.
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <div
            className="flex justify-end gap-3 border-t
            border-slate-100 pt-4"
          >
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200
                px-5 py-2.5 text-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2
                rounded-xl bg-emerald-600 px-5 py-2.5
                text-sm font-semibold text-white
                disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
