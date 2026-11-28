import { useCallback, useEffect, useState } from "react";

import {
  Plus,
  RefreshCw,
  Users,
  FileText,
  ShieldCheck,
  Pencil,
  Copy,
  Trash2,
  Eye,
  X,
  Image,
  Video,
  Phone,
  ExternalLink,
  Reply,
} from "lucide-react";

import { apiRequest } from "../api";
import CampaignDetails from "./CampaignDetails";

const types = {
  customer: "Customers",
  interior_designer: "Interior Designers",
  builder: "Builders",
  architect: "Architects",
  other: "Other",
  unclassified: "Unclassified",
};

const panel = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50";

const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50";

const post = (path, body) =>
  apiRequest(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

// --------------------------------------------------
// WhatsApp Template Preview
// --------------------------------------------------

function TemplatePreview({ template, mediaUrl, mediaFilename }) {
  const components = template?.components || [];

  const header = components.find((item) => item.type === "HEADER");

  const body = components.find((item) => item.type === "BODY");

  const footer = components.find((item) => item.type === "FOOTER");

  const buttons = components

    .filter((item) => item.type === "BUTTONS")

    .flatMap((item) => item.buttons || []);

  const MediaIcon =
    header?.format === "VIDEO"
      ? Video
      : header?.format === "DOCUMENT"
        ? FileText
        : Image;

  return (
    <div
      className="mx-auto w-full max-w-[380px] rounded-xl bg-[#eeeae2] p-4"
      style={{
        backgroundImage: "radial-gradient(#d7d2c9 0.7px, transparent 0.7px)",

        backgroundSize: "16px 16px",
      }}
    >
      <div className="space-y-3 rounded-xl bg-white p-4 text-sm shadow-sm">
        {/* Responsive Media Header */}

        {["IMAGE", "VIDEO", "DOCUMENT"].includes(header?.format) && (
          <div className="w-full overflow-hidden rounded-lg">
            {mediaUrl && header.format === "IMAGE" ? (
              <img
                src={mediaUrl}
                alt="Campaign media"
                className="block h-auto w-full rounded-lg"
              />
            ) : mediaUrl && header.format === "VIDEO" ? (
              <video
                src={mediaUrl}
                controls
                preload="metadata"
                className="block h-auto w-full rounded-lg"
              />
            ) : (
              <div className="flex h-[190px] w-full flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-500">
                <div className="rounded-full bg-white p-4 shadow-sm">
                  <MediaIcon size={30} className="text-emerald-700" />
                </div>

                <span className="max-w-full break-all px-3 text-center text-xs font-medium">
                  {mediaFilename || header.format + " header"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Text Header */}

        {header?.format === "TEXT" && (
          <p className="font-semibold">{header.text}</p>
        )}

        {/* Message Body */}

        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {body?.text || "Select a template to preview."}
        </p>

        {/* Footer */}

        {footer?.text && (
          <p className="text-xs text-slate-500">{footer.text}</p>
        )}
      </div>

      {/* Message Buttons */}

      {buttons.map((button, index) => {
        const Icon =
          button.type === "PHONE_NUMBER"
            ? Phone
            : button.type === "URL"
              ? ExternalLink
              : Reply;

        return (
          <div
            key={index}
            className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-white p-3 text-sm font-semibold text-emerald-700 shadow-sm"
          >
            <Icon size={16} />

            {button.text}
          </div>
        );
      })}
    </div>
  );
}

// --------------------------------------------------
// Campaign Manager
// --------------------------------------------------

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [formOpen, setFormOpen] = useState(false);

  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState("");

  const [audience, setAudience] = useState({
    contact_types: [],
    location: "",
    tag: "",
  });

  const [editingId, setEditingId] = useState(null);

  const [preview, setPreview] = useState(null);
  const [details, setDetails] = useState(null);

  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // --------------------------------------------------
  // Load Campaigns
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest(
          "/admin/campaigns?limit=50&offset=" + page * 50,
        );

        if (active) {
          setCampaigns(result.campaigns || []);
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [page, revision]);

  // --------------------------------------------------
  // Open Create Campaign Form
  // --------------------------------------------------

  async function openForm(sourceId = null, duplicate = false) {
    setBusy(true);
    setError("");
    setNotice("");
    setDetails(null);

    try {
      const result = await apiRequest("/admin/campaigns/templates");

      setTemplates(result.templates || []);

      const source = sourceId
        ? (await apiRequest("/admin/campaigns/" + sourceId)).campaign
        : null;

      if (source && !duplicate && source.status !== "draft") {
        throw new Error("Only drafts can be edited.");
      }

      setEditingId(source && !duplicate ? source.id : null);

      setName(
        source
          ? duplicate
            ? (source.name + " (Copy)").slice(0, 150)
            : source.name
          : "",
      );

      setTemplateId(source ? String(source.template_id) : "");

      setAudience(
        source?.audience_filters || {
          contact_types: [],
          location: "",
          tag: "",
        },
      );

      setPreview(null);
      setFormOpen(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Update Audience Filters
  // --------------------------------------------------

  function changeAudience(key, value) {
    setAudience((prev) => ({
      ...prev,
      [key]: value,
    }));

    setPreview(null);
  }

  // --------------------------------------------------
  // Preview Eligible Audience
  // --------------------------------------------------

  async function previewAudience() {
    setBusy(true);
    setError("");
    setPreview(null);

    try {
      const result = await post("/admin/campaigns/audience/preview", audience);

      setPreview(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Save Campaign Draft
  // --------------------------------------------------

  async function saveDraft(event) {
    event.preventDefault();

    if (
      busy ||
      !name.trim() ||
      !templateId ||
      !preview?.eligible ||
      preview.over_limit
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const path = editingId
        ? "/admin/campaigns/" + editingId
        : "/admin/campaigns";

      const result = await apiRequest(path, {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          name: name.trim(),
          template_id: templateId,
          audience,
        }),
      });

      setNotice(
        `${editingId ? "Draft updated" : "Draft saved"}: ${
          result.recipients
        } recipients. No messages sent.` +
          (result.configuration_reset
            ? " Configure the new template's media and variables."
            : ""),
      );

      setFormOpen(false);
      setPage(0);
      setRevision((v) => v + 1);
      setEditingId(null);

      try {
        const savedDetails = await apiRequest(
          "/admin/campaigns/" + result.campaign.id,
        );

        setDetails(savedDetails);
      } catch (err) {
        setError("Draft saved. Open it from the campaign list: " + err.message);
      }
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  async function deleteDraft(id) {
    if (busy) return;

    const confirmed = window.confirm(
      "Permanently delete this unsent draft? " +
        "This action cannot be undone.",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/admin/campaigns/" + id, {
        method: "DELETE",
      });

      setDetails((prev) => (prev?.campaign.id === id ? null : prev));

      setNotice("Draft deleted successfully.");
      setRevision((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Campaign Details
  // --------------------------------------------------

  async function viewDetails(id) {
    setBusy(true);
    setError("");
    setDetails(null);

    try {
      const result = await apiRequest("/admin/campaigns/" + id);

      setDetails(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const onCampaignStatusChange = useCallback((id, status) => {
    setDetails((prev) => {
      if (!prev || prev.campaign.id !== id || prev.campaign.status === status) {
        return prev;
      }

      return {
        ...prev,
        campaign: {
          ...prev.campaign,
          status,
        },
      };
    });

    setCampaigns((prev) =>
      prev.map((item) =>
        item.id === id && item.status !== status ? { ...item, status } : item,
      ),
    );
  }, []);

  const template = templates.find((item) => String(item.id) === templateId);

  // --------------------------------------------------
  // Dashboard UI
  // --------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page Header */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Campaign Manager
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Create targeted WhatsApp marketing campaigns.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className={btn}
            disabled={busy || loading}
            onClick={() => {
              setRevision((v) => v + 1);
              setPreview(null);
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            className={primary}
            disabled={busy || formOpen}
            onClick={() => openForm()}
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Success and Error Notices */}

      {notice && (
        <p
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Draft Mode Notice */}

      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <ShieldCheck size={20} />
        Create a draft, configure the message, then choose Send Now or Schedule.
      </div>

      {/* Create Campaign Form */}

      {formOpen && (
        <form className={panel + " space-y-5"} onSubmit={saveDraft}>
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">
              {editingId ? "Edit Campaign" : "Create Campaign"}
            </h3>

            <button
              type="button"
              disabled={busy}
              onClick={() => setFormOpen(false)}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <fieldset disabled={busy} className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {/* Campaign Name */}

              <label className="block space-y-1 text-sm font-medium">
                Campaign Name
                <input
                  className={input}
                  required
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Interior Designer Partnership"
                />
              </label>

              {/* Approved Template Selection */}

              <label className="block space-y-1 text-sm font-medium">
                Approved Marketing Template
                <select
                  className={input}
                  required
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  <option value="">Select a template</option>

                  {templates.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name} ({item.language})
                    </option>
                  ))}
                </select>
              </label>

              {/* Target Audience */}

              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <h4 className="flex items-center gap-2 font-semibold">
                  <Users size={18} />
                  Target Audience
                </h4>

                <p className="text-xs text-slate-500">
                  No type selected = all eligible contact types.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(types).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="accent-emerald-700"
                        checked={audience.contact_types.includes(key)}
                        onChange={(e) =>
                          changeAudience(
                            "contact_types",
                            e.target.checked
                              ? [...audience.contact_types, key]
                              : audience.contact_types.filter(
                                  (value) => value !== key,
                                ),
                          )
                        }
                      />

                      {label}
                    </label>
                  ))}
                </div>

                {/* Location Filter */}

                <label className="block space-y-1 text-sm font-medium">
                  Location
                  <input
                    className={input}
                    maxLength={150}
                    value={audience.location}
                    onChange={(e) => changeAudience("location", e.target.value)}
                    placeholder="All locations"
                  />
                </label>

                {/* Tags Filter */}

                <label className="block space-y-1 text-sm font-medium">
                  Tag
                  <input
                    className={input}
                    maxLength={80}
                    value={audience.tag}
                    onChange={(e) => changeAudience("tag", e.target.value)}
                    placeholder="All tags"
                  />
                </label>

                <p className="text-xs text-emerald-700">
                  Only opted-in eligible contacts are included.
                </p>

                <button type="button" className={btn} onClick={previewAudience}>
                  <Eye size={16} />
                  Preview Audience
                </button>
              </div>
            </div>

            {/* WhatsApp Message Preview */}

            <div className="space-y-3">
              <h4 className="font-semibold">Message Preview</h4>

              <TemplatePreview template={template} />

              <p className="text-xs text-slate-500">
                Configure media and variables after saving the draft.
              </p>
            </div>
          </fieldset>

          {/* Audience Preview Results */}

          {preview && (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-lg font-bold text-emerald-700">
                {preview.over_limit ? "More than " : ""}
                {preview.eligible} eligible contacts
              </p>

              {preview.over_limit && (
                <p className="text-sm text-red-700">
                  Narrow your audience to {preview.max_recipients} contacts.
                </p>
              )}

              {!!preview.sample?.length && (
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Phone</th>
                        <th>Type</th>
                        <th>Location</th>
                      </tr>
                    </thead>

                    <tbody>
                      {preview.sample.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200">
                          <td className="py-2">{item.name || "Unnamed"}</td>

                          <td>+{item.phone}</td>

                          <td>
                            {types[item.contact_type] || item.contact_type}
                          </td>

                          <td>{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Showing up to 20 sample recipients. Eligibility is checked again
                when saving.
              </p>
            </div>
          )}

          {/* Form Actions */}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={btn}
              disabled={busy}
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={primary}
              disabled={
                busy ||
                !name.trim() ||
                !templateId ||
                !preview?.eligible ||
                preview.over_limit
              }
            >
              {busy ? "Processing..." : "Save & Continue"}
            </button>
          </div>
        </form>
      )}

      {/* Campaign Details Panel */}

      {details && (
        <CampaignDetails
          key={details.campaign.id}
          details={details}
          onClose={() => setDetails(null)}
          Preview={TemplatePreview}
          onStatusChange={onCampaignStatusChange}
        />
      )}

      {/* Campaigns Table */}

      <section className={panel}>
        <h3 className="mb-4 font-semibold">Campaigns</h3>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {[
                  "Campaign",
                  "Template",
                  "Recipients",
                  "Status",
                  "Created",
                  "Action",
                ].map((label) => (
                  <th key={label} className="p-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    Loading campaigns...
                  </td>
                </tr>
              ) : !campaigns.length ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No campaigns yet.
                  </td>
                </tr>
              ) : (
                campaigns.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-3 font-semibold">{item.name}</td>

                    <td className="p-3 break-all">{item.template_name}</td>

                    <td className="p-3">{item.recipients}</td>

                    <td className="p-3">
                      <span className="rounded-full bg-slate-100 px-3 py-1 capitalize">
                        {item.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={btn}
                          disabled={busy || formOpen}
                          onClick={() => viewDetails(item.id)}
                        >
                          <Eye size={16} />
                          View
                        </button>

                        {item.status === "draft" && (
                          <button
                            className={btn}
                            disabled={busy || formOpen}
                            onClick={() => openForm(item.id)}
                          >
                            <Pencil size={16} />
                            Edit
                          </button>
                        )}

                        <button
                          className={btn}
                          disabled={busy || formOpen}
                          onClick={() => openForm(item.id, true)}
                        >
                          <Copy size={16} />
                          Duplicate
                        </button>

                        {item.status === "draft" && (
                          <button
                            className={btn + " text-red-700"}
                            disabled={busy || formOpen}
                            onClick={() => deleteDraft(item.id)}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className={btn}
            disabled={loading || page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>

          <span className="text-sm">Page {page + 1}</span>

          <button
            className={btn}
            disabled={loading || campaigns.length < 50}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
