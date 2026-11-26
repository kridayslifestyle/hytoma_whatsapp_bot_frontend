import { useState } from "react";
import {
  FileText,
  MessageSquare,
  Phone,
  ExternalLink,
  Reply,
  X,
  Send,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import {
  createMarketingTemplate,
  uploadMarketingMedia,
} from "./api";

import WhatsAppTemplatePreview from "./WhatsAppTemplatePreview";

export default function CreateMarketingTemplate({
  onCreated,
  onCancel,
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [body, setBody] = useState("");
  const [expiration, setExpiration] = useState(10);
  const [securityRecommendation, setSecurityRecommendation] =
    useState(true);

  const [headerType, setHeaderType] = useState("NONE");
  const [mediaFile, setMediaFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAuthentication = category === "AUTHENTICATION";
  const disabled = submitting || uploading;

  // Interactive buttons

  function addButton(type) {
    const counts = buttons.filter(
      (b) => b.type === type,
    ).length;

    if (buttons.length >= 5) return;
    if (type === "QUICK_REPLY" && counts >= 3) return;
    if (type !== "QUICK_REPLY" && counts >= 1) return;

    setButtons((previous) => [
      ...previous,
      {
        type,
        text: "",
        ...(type === "PHONE_NUMBER"
          ? { phone_number: "" }
          : {}),
        ...(type === "URL" ? { url: "" } : {}),
      },
    ]);
  }

  function updateButton(index, field, value) {
    setButtons((previous) =>
      previous.map((button, i) =>
        i === index
          ? { ...button, [field]: value }
          : button,
      ),
    );
  }

  function removeButton(index) {
    setButtons((previous) =>
      previous.filter((_, i) => i !== index),
    );
  }

  // Submit template to Meta

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedName = name.trim().toLowerCase();

    if (!/^[a-z0-9_]{1,512}$/.test(normalizedName)) {
      setError(
        "Template name must contain only lowercase letters, " +
          "numbers and underscores.",
      );
      return;
    }

    if (!isAuthentication && !body.trim()) {
      setError("Message body is required.");
      return;
    }

    if (
      !window.confirm(
        `Submit this ${category.toLowerCase()} template ` +
          "to Meta for review?",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: normalizedName,
        category,
        language,
        body: isAuthentication ? "" : body.trim(),
        footer: isAuthentication ? "" : footer.trim(),

        buttons: isAuthentication
          ? []
          : buttons.map((button) => ({
              ...button,
              text: button.text.trim(),

              ...(button.phone_number !== undefined
                ? {
                    phone_number:
                      button.phone_number.trim(),
                  }
                : {}),

              ...(button.url !== undefined
                ? { url: button.url.trim() }
                : {}),
            })),
      };

      if (isAuthentication) {
        payload.add_security_recommendation =
          securityRecommendation;

        payload.code_expiration_minutes =
          Number(expiration);
      }

      if (
        !isAuthentication &&
        headerType !== "NONE"
      ) {
        if (!mediaFile) {
          throw new Error(
            "Please select an image or video before submitting.",
          );
        }

        setUploading(true);

        const uploaded =
          await uploadMarketingMedia(mediaFile);

        setUploading(false);

        if (!uploaded.media_handle) {
          throw new Error(
            "Meta did not return a media handle.",
          );
        }

        payload.media_type = headerType;
        payload.media_handle = uploaded.media_handle;
      }

      const result =
        await createMarketingTemplate(payload);

      setSuccess(
        result.message || "Template submitted to Meta.",
      );

      onCreated?.();
    } catch (err) {
      setError(
        err.message || "Template submission failed.",
      );
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  // Reusable UI styles

  const inputClass =
    "mt-1.5 block w-full rounded-lg border " +
    "border-slate-300 bg-white px-3.5 py-2.5 " +
    "text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:border-emerald-500 focus:outline-none " +
    "focus:ring-2 focus:ring-emerald-100 " +
    "disabled:opacity-60";

  const sectionClass =
    "space-y-4 rounded-xl border border-slate-200 " +
    "bg-white p-4 sm:p-5";

  const fieldGroup = "min-w-0";

  const addButtonClass =
    "inline-flex items-center gap-2 rounded-lg " +
    "border border-emerald-200 bg-emerald-50 " +
    "px-3 py-2 text-sm font-semibold text-emerald-800 " +
    "transition hover:bg-emerald-100 " +
    "disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-5"
    >
      {/* Form Header */}

      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
            <FileText size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Create WhatsApp Template
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure your message and submit it to
              Meta for review.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          aria-label="Close template form"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Two-Column Layout */}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        {/* Left Column - Form Editor */}

        <fieldset
          disabled={disabled}
          className="min-w-0 space-y-4 [&_label]:text-sm [&_label]:font-medium [&_label]:text-slate-700"
        >
          {/* Section 1 - Template Details */}

          <section className={sectionClass}>
            <div>
              <h3 className="font-semibold text-slate-900">
                1. Template details
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Choose a category and language for your
                template.
              </p>
            </div>

            <div className={fieldGroup}>
              <label htmlFor="template-name">
                Template Name
              </label>

              <input
                id="template-name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                placeholder="hytoma_site_visit_update"
                maxLength={512}
                className={inputClass}
                required
              />

              <p className="mt-1.5 text-xs text-slate-500">
                Use lowercase letters, numbers and
                underscores.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className={fieldGroup}>
                <label htmlFor="template-category">
                  Template Category
                </label>

                <select
                  id="template-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className={inputClass}
                >
                  <option value="MARKETING">
                    Marketing — offers, promotions,
                    campaigns
                  </option>

                  <option value="UTILITY">
                    Utility — service updates,
                    appointments, notifications
                  </option>

                  <option value="AUTHENTICATION">
                    Authentication — verification codes
                  </option>
                </select>
              </div>

              <div className={fieldGroup}>
                <label htmlFor="template-language">
                  Language
                </label>

                <select
                  id="template-language"
                  value={language}
                  onChange={(e) =>
                    setLanguage(e.target.value)
                  }
                  className={inputClass}
                >
                  <option value="en_US">
                    English (US)
                  </option>

                  <option value="en">
                    English
                  </option>

                  <option value="te">
                    Telugu
                  </option>

                  <option value="hi">
                    Hindi
                  </option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2 - Message Content */}

          <section className={sectionClass}>
            <div>
              <h3 className="font-semibold text-slate-900">
                2. Message content
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                Set the header, body and footer of the
                message.
              </p>
            </div>

            {!isAuthentication && (
              <div className="space-y-3">
                <label htmlFor="header-type">
                  Template Header
                </label>

                <select
                  id="header-type"
                  value={headerType}
                  onChange={(e) => {
                    setHeaderType(e.target.value);
                    setMediaFile(null);
                    setError("");
                  }}
                  className={inputClass}
                >
                  <option value="NONE">
                    No Header
                  </option>

                  <option value="IMAGE">
                    Image Header
                  </option>

                  <option value="VIDEO">
                    Video Header
                  </option>
                </select>

                {headerType !== "NONE" && (
                  <>
                    <label htmlFor="header-media">
                      Upload{" "}
                      {headerType === "IMAGE"
                        ? "Image"
                        : "Video"}
                    </label>

                    <input
                      id="header-media"
                      type="file"
                      accept={
                        headerType === "IMAGE"
                          ? "image/jpeg,image/png"
                          : "video/mp4"
                      }
                      onChange={(e) => {
                        setMediaFile(
                          e.target.files?.[0] || null,
                        );
                        setError("");
                      }}
                      className={inputClass}
                      required
                    />

                    <p className="text-xs text-slate-500">
                      {headerType === "IMAGE"
                        ? "JPG or PNG, maximum 5 MB."
                        : "MP4, maximum 16 MB."}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Marketing and Utility Body */}

            {!isAuthentication ? (
              <>
                <label htmlFor="template-body">
                  Message Body
                </label>

                <textarea
                  id="template-body"
                  value={body}
                  onChange={(e) =>
                    setBody(e.target.value)
                  }
                  placeholder={
                    category === "UTILITY"
                      ? "Hello, your HYTOMA service request has been updated."
                      : "Enter your promotional message..."
                  }
                  maxLength={1024}
                  rows={7}
                  className={inputClass}
                  required
                />

                <p className="text-right text-xs tabular-nums text-slate-500">
                  {body.length}/1024 characters
                </p>
              </>
            ) : (
              /* Authentication Settings */

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800">
                  Authentication OTP Settings
                </h3>

                <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  Meta generates the verification-message
                  format. You cannot enter a custom
                  promotional message.
                </p>

                <label htmlFor="otp-expiration">
                  Code Expiration (minutes)
                </label>

                <input
                  id="otp-expiration"
                  type="number"
                  min={1}
                  max={90}
                  value={expiration}
                  onChange={(e) =>
                    setExpiration(e.target.value)
                  }
                  className={inputClass}
                  required
                />

                <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={securityRecommendation}
                    onChange={(e) =>
                      setSecurityRecommendation(
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-emerald-600"
                  />

                  Include security recommendation
                </label>

                <p className="text-xs text-slate-500">
                  Button type: Copy Code
                </p>
              </div>
            )}

            {/* Footer */}

            {!isAuthentication && (
              <div className="space-y-2">
                <label htmlFor="template-footer">
                  Optional Footer
                </label>

                <input
                  id="template-footer"
                  value={footer}
                  onChange={(e) =>
                    setFooter(e.target.value)
                  }
                  placeholder="HYTOMA Automation LLP"
                  maxLength={60}
                  className={inputClass}
                />

                <p className="text-right text-xs text-slate-500">
                  {footer.length}/60 characters
                </p>
              </div>
            )}
          </section>

          {/* Section 3 - Interactive Buttons */}

          {!isAuthentication && (
            <section className={sectionClass}>
              <h3 className="font-semibold text-slate-900">
                3. Interactive buttons

                <span className="ml-1 text-xs font-normal text-slate-500">
                  Optional
                </span>
              </h3>

              <p className="text-sm text-slate-500">
                Add a phone number, website or quick
                reply button.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={addButtonClass}
                  onClick={() =>
                    addButton("PHONE_NUMBER")
                  }
                  disabled={
                    submitting ||
                    buttons.length >= 5 ||
                    buttons.some(
                      (b) =>
                        b.type === "PHONE_NUMBER",
                    )
                  }
                >
                  <Phone size={15} />
                  Phone CTA
                </button>

                <button
                  type="button"
                  className={addButtonClass}
                  onClick={() => addButton("URL")}
                  disabled={
                    submitting ||
                    buttons.length >= 5 ||
                    buttons.some(
                      (b) => b.type === "URL",
                    )
                  }
                >
                  <ExternalLink size={15} />
                  Website CTA
                </button>

                <button
                  type="button"
                  className={addButtonClass}
                  onClick={() =>
                    addButton("QUICK_REPLY")
                  }
                  disabled={
                    submitting ||
                    buttons.length >= 5 ||
                    buttons.filter(
                      (b) =>
                        b.type === "QUICK_REPLY",
                    ).length >= 3
                  }
                >
                  <Reply size={15} />
                  Quick Reply
                </button>
              </div>

              {/* Added Button Settings */}

              {buttons.map((button, index) => (
                <div
                  key={index}
                  style={{
                    padding: 16,
                    marginBottom: 14,
                    border: "1px solid #d1d5db",
                    borderRadius: 10,
                    background: "#f9fafb",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <strong>
                      {button.type === "PHONE_NUMBER"
                        ? "Phone CTA"
                        : button.type === "URL"
                          ? "Website CTA"
                          : "Quick Reply"}
                    </strong>

                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                      onClick={() =>
                        removeButton(index)
                      }
                      disabled={submitting}
                    >
                      Remove
                    </button>
                  </div>

                  <label
                    htmlFor={`button-text-${index}`}
                  >
                    Button Label
                  </label>

                  <input
                    id={`button-text-${index}`}
                    value={button.text}
                    onChange={(e) =>
                      updateButton(
                        index,
                        "text",
                        e.target.value,
                      )
                    }
                    placeholder={
                      button.type === "PHONE_NUMBER"
                        ? "Get Offer Details"
                        : button.type === "URL"
                          ? "Visit Website"
                          : "I'm Interested"
                    }
                    maxLength={25}
                    className={inputClass}
                    required
                  />

                  {button.type === "PHONE_NUMBER" && (
                    <>
                      <label htmlFor={`phone-${index}`}>
                        Phone Number (with country code)
                      </label>

                      <input
                        id={`phone-${index}`}
                        type="tel"
                        value={button.phone_number}
                        onChange={(e) =>
                          updateButton(
                            index,
                            "phone_number",
                            e.target.value,
                          )
                        }
                        placeholder="+919876543210"
                        className={inputClass}
                        required
                      />
                    </>
                  )}

                  {button.type === "URL" && (
                    <>
                      <label htmlFor={`url-${index}`}>
                        Website URL
                      </label>

                      <input
                        id={`url-${index}`}
                        type="url"
                        value={button.url}
                        onChange={(e) =>
                          updateButton(
                            index,
                            "url",
                            e.target.value,
                          )
                        }
                        placeholder="https://example.com"
                        className={inputClass}
                        required
                      />
                    </>
                  )}
                </div>
              ))}
            </section>
          )}
        </fieldset>

        {/* Right Column - Live WhatsApp Preview */}

        <aside className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4 xl:sticky xl:top-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <MessageSquare
                size={18}
                className="text-emerald-700"
              />
              Live preview
            </div>

            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
              {category}
            </span>
          </div>

          <p className="mt-2 break-words text-xs text-slate-500">
            {name || "Untitled template"} · {language}
          </p>

          <div className="[&_section]:!mb-0 [&_section_h3]:hidden [&_section>p]:!mb-3">
            <WhatsAppTemplatePreview
              body={body}
              footer={footer}
              headerType={headerType}
              mediaFile={mediaFile}
              buttons={buttons}
              isAuthentication={isAuthentication}
              securityRecommendation={
                securityRecommendation
              }
              expiration={expiration}
            />
          </div>

          <p className="mt-4 text-center text-xs text-slate-500">
            Preview only · No message is sent.
          </p>
        </aside>
      </div>

      {/* Error Notification */}

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Success Notification */}

      {success && (
        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {success}
        </p>
      )}

      {/* Form Footer and Action Buttons */}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck size={16} />

          Templates require Meta approval before use.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Send size={16} />
            )}

            {uploading
              ? "Uploading Media..."
              : submitting
                ? "Submitting..."
                : "Submit to Meta"}
          </button>

          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}