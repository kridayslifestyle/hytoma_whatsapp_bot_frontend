import { useEffect, useState } from "react";

import {
  X,
  Upload,
  ShieldCheck,
  Image,
  Video,
  CheckCircle2,
} from "lucide-react";

import { apiRequest } from "../api";

import CampaignTestSend from "./CampaignTestSend";
import CampaignSending from "./CampaignSending";
import CampaignReport from "./CampaignReport";


const types = {
  customer: "Customers",
  interior_designer: "Interior Designers",
  builder: "Builders",
  architect: "Architects",
  other: "Other",
  unclassified: "Unclassified",
};

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm";

const primary =
  "inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50";

export default function CampaignDetails({
  details,
  onClose,
  Preview,
  onStatusChange,
}) {
  const campaign = details.campaign;

  const path = "/admin/campaigns/" + campaign.id;

  const [content, setContent] = useState(null);

  const [values, setValues] = useState({});

  const [file, setFile] = useState(null);

  const [uploadedFile, setUploadedFile] = useState(null);

  const [localUrl, setLocalUrl] = useState("");

  const [busy, setBusy] = useState(false);

  const [testBusy, setTestBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  // --------------------------------------------------
  // Load Campaign Configuration
  // --------------------------------------------------

  useEffect(() => {
    let active = true;

    apiRequest(path + "/content")
      .then((result) => {
        if (active) {
          setContent(result);

          setValues(result.values || {});
        }
      })

      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })

      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [path]);

  // --------------------------------------------------
  // Local Image / Video Preview
  // --------------------------------------------------

  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);

    setLocalUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // --------------------------------------------------
  // Select and Validate Media
  // --------------------------------------------------

  function selectFile(event) {
    setError("");
    setNotice("");
    setLocalUrl("");

    const next = event.target.files?.[0] || null;

    setFile(null);

    if (!next) return;

    const isImage = content.media_required === "IMAGE";

    const allowed = isImage ? ["image/jpeg", "image/png"] : ["video/mp4"];

    const maxSize = (isImage ? 5 : 16) * 1024 * 1024;

    if (
      !allowed.includes(next.type) ||
      next.size > maxSize ||
      next.size === 0
    ) {
      setError(
        isImage
          ? "Select a JPG or PNG under 5 MB."
          : "Select an MP4 under 16 MB.",
      );

      event.target.value = "";

      return;
    }

    setFile(next);
  }

  // --------------------------------------------------
  // Save Campaign Configuration
  // --------------------------------------------------

  async function save(event) {
    event.preventDefault();

    if (!content || busy || testBusy || sendBusy || campaign.status !== "draft")
      return;

    setBusy(true);

    setError("");
    setNotice("");

    try {
      const payload = {
        values: Object.fromEntries(
          content.fields.map((key) => [key, (values[key] || "").trim()]),
        ),
      };

      // Validate required variables.

      if (Object.values(payload.values).some((value) => !value)) {
        throw new Error("Fill all template variables.");
      }

      // Validate required media.

      if (content.media_required && !file && !content.media_id) {
        throw new Error("Select the required media.");
      }

      // Upload new media to Meta.

      if (file && file !== uploadedFile) {
        const data = new FormData();

        data.append("file", file);

        const uploaded = await apiRequest(
          path + "/media",

          {
            method: "POST",

            body: data,
          },
        );

        setContent((prev) => ({
          ...prev,

          ...uploaded,
        }));

        setUploadedFile(file);
      }

      // Save template variables.

      const result = await apiRequest(
        path + "/content",

        {
          method: "PATCH",

          body: JSON.stringify(payload),
        },
      );

      setContent((prev) => ({
        ...prev,

        values: result.values,
      }));

      setNotice("Configuration saved. No messages sent.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // --------------------------------------------------
  // Replace Numbered Variables for Preview
  // --------------------------------------------------

  const fill = (text, prefix) =>
    (text || "").replace(
      /\{\{\s*([1-9][0-9]*)\s*\}\}/g,

      (match, number) => values[prefix + ":" + number] || match,
    );

  const template = {
    ...campaign.template_snapshot,

    components: (campaign.template_snapshot?.components || []).map((item) => ({
      ...item,

      text:
        item.type === "BODY"
          ? fill(item.text, "body")
          : item.type === "HEADER" && item.format === "TEXT"
            ? fill(item.text, "header")
            : item.text,
    })),
  };

  const MediaIcon = content?.media_required === "VIDEO" ? Video : Image;

  // --------------------------------------------------
  // Campaign Details UI
  // --------------------------------------------------

  const testReady =
    !!content &&
    (!content.media_required || !!content.media_id) &&
    (!file || file === uploadedFile) &&
    content.fields.every(
      (key) =>
        !!(content.values?.[key] || "").trim() &&
        (values[key] || "").trim() === content.values[key],
    );

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Campaign Header */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900">{campaign.name}</h3>

          <p className="mt-1 text-sm text-slate-500">Campaign #{campaign.id}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm capitalize">
            {campaign.status}
          </span>

          <button
            type="button"
            disabled={busy || testBusy || sendBusy}
            onClick={onClose}
            aria-label="Close details"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Two Column Layout */}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left Column */}

        <div className="min-w-0 space-y-4">
          <h4 className="font-semibold">Campaign Information</h4>

          {/* Existing Campaign Information */}

          <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-slate-50">
            {[
              [
                "Marketing Template",

                campaign.template_name +
                  " (" +
                  campaign.template_language +
                  ")",
              ],

              ["Total Recipients", details.recipients],

              [
                "Contact Types",

                (campaign.audience_filters?.contact_types || [])
                  .map((key) => types[key] || key)
                  .join(", ") || "All Contact Types",
              ],

              [
                "Location",

                campaign.audience_filters?.location || "All Locations",
              ],

              ["Tags", campaign.audience_filters?.tag || "All Tags"],

              ["Created At", new Date(campaign.created_at).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="p-3">
                <p className="text-xs text-slate-500">{label}</p>

                <p className="mt-1 break-words text-sm font-semibold">
                  {value}
                </p>
              </div>
            ))}

            <div className="flex items-center gap-2 p-3 text-sm text-emerald-700">
              <ShieldCheck size={16} />
              Opted in recipients at draft creation
            </div>
          </div>

          {/* Message Configuration Form */}

          <form
            onSubmit={save}
            className="space-y-4 rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-semibold">Message Configuration</h4>

              {campaign.status !== "draft" && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Read Only
                </span>
              )}
            </div>

            {campaign.status !== "draft" && (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                This campaign is no longer a draft. You can view its saved
                configuration, but editing is disabled.
              </p>
            )}

            {/* Loading */}

            {loading && (
              <p className="text-sm text-slate-500">Loading requirements...</p>
            )}

            {/* Error Message */}

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            {/* Success Message */}

            {notice && (
              <p
                role="status"
                className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
              >
                {notice}
              </p>
            )}

            {content && (
              <fieldset
                disabled={
                  busy || testBusy || sendBusy || campaign.status !== "draft"
                }
                className="space-y-4"
              >
                {/* Media Requirements */}

                {content.media_required ? (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <MediaIcon size={18} />
                      {content.media_required === "IMAGE"
                        ? "Image"
                        : "Video"}{" "}
                      header
                    </p>

                    {/* Existing Uploaded Media */}

                    {content.media_id && (
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                        <CheckCircle2 size={18} />

                        <span className="break-all">
                          {content.media_filename}

                          {" — uploaded"}
                        </span>
                      </div>
                    )}

                    {/* File Upload */}

                    <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 text-sm">
                      <span className="flex items-center gap-2 font-medium">
                        <Upload size={18} />

                        {content.media_id ? "Replace media" : "Select media"}
                      </span>

                      <input
                        type="file"
                        className="mt-3 block w-full"
                        accept={
                          content.media_required === "IMAGE"
                            ? "image/jpeg,image/png"
                            : "video/mp4"
                        }
                        onChange={selectFile}
                      />

                      <span className="mt-2 block text-xs text-slate-500">
                        {content.media_required === "IMAGE"
                          ? "JPG or PNG · Max 5 MB"
                          : "MP4 · Max 16 MB"}
                      </span>
                    </label>

                    {/* Upload Timestamp */}

                    {content.media_uploaded_at && (
                      <p className="text-xs text-slate-500">
                        Uploaded:{" "}
                        {new Date(content.media_uploaded_at).toLocaleString()}.
                        Media availability will be checked before sending.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No media required.</p>
                )}

                {/* Template Variables */}

                <div className="space-y-2">
                  <p className="text-sm font-semibold">Template Variables</p>

                  {!content.fields.length && (
                    <p className="text-sm text-slate-500">
                      No variables required.
                    </p>
                  )}

                  {content.fields.map((key) => (
                    <label key={key} className="block space-y-1 text-sm">
                      <span>{key}</span>

                      <input
                        className={input}
                        required
                        maxLength={500}
                        value={values[key] || ""}
                        onChange={(e) => {
                          setValues((prev) => ({
                            ...prev,

                            [key]: e.target.value,
                          }));

                          setNotice("");
                        }}
                      />
                    </label>
                  ))}
                </div>

                {/* Save Configuration Button */}

                <button type="submit" className={primary} disabled={busy}>
                  {busy ? "Saving..." : "Save Configuration"}
                </button>
              </fieldset>
            )}
          </form>

          <CampaignTestSend
            campaignId={campaign.id}
            ready={testReady}
            disabled={
              busy || loading || sendBusy || campaign.status !== "draft"
            }
            onBusyChange={setTestBusy}
          />

          <CampaignSending
            campaignId={campaign.id}
            ready={testReady}
            disabled={busy || loading || testBusy}
            onStatusChange={onStatusChange}
            onBusyChange={setSendBusy}
          />
        </div>

        {/* Right Column — Compact Message Preview */}

        <div className="min-w-0 space-y-3">
          <h4 className="text-center font-semibold">Message Preview</h4>

          <div className="max-h-[650px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Preview
              template={template}
              mediaUrl={localUrl}
              mediaFilename={content?.media_filename}
            />
          </div>

          <p className="text-center text-xs text-slate-500">
            Selected files preview locally. Uploaded media is identified by
            filename after reopening. No messages sent.
          </p>
        </div>
            </div>

      <CampaignReport
        campaignId={campaign.id}
      />

    </section>
  );
}
