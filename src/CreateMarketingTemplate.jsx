import { useState } from "react";
import { createMarketingTemplate, uploadMarketingMedia } from "./api";
import WhatsAppTemplatePreview from "./WhatsAppTemplatePreview";

export default function CreateMarketingTemplate({ onCreated, onCancel }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("MARKETING");
  const [language, setLanguage] = useState("en_US");
  const [body, setBody] = useState("");
  const [expiration, setExpiration] = useState(10);
  const [securityRecommendation, setSecurityRecommendation] = useState(true);

  const [headerType, setHeaderType] = useState("NONE");

  const [mediaFile, setMediaFile] = useState(null);

  const [uploading, setUploading] = useState(false);

  // Footer and interactive template buttons
  const [footer, setFooter] = useState("");
  const [buttons, setButtons] = useState([]);

  function addButton(type) {
    const counts = buttons.filter((b) => b.type === type).length;

    if (buttons.length >= 5) return;
    if (type === "QUICK_REPLY" && counts >= 3) return;
    if (type !== "QUICK_REPLY" && counts >= 1) return;

    setButtons((previous) => [
      ...previous,
      {
        type,
        text: "",
        ...(type === "PHONE_NUMBER" ? { phone_number: "" } : {}),
        ...(type === "URL" ? { url: "" } : {}),
      },
    ]);
  }

  function updateButton(index, field, value) {
    setButtons((previous) =>
      previous.map((button, i) =>
        i === index ? { ...button, [field]: value } : button,
      ),
    );
  }

  function removeButton(index) {
    setButtons((previous) => previous.filter((_, i) => i !== index));
  }

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isAuthentication = category === "AUTHENTICATION";

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
                ? { phone_number: button.phone_number.trim() }
                : {}),
              ...(button.url !== undefined ? { url: button.url.trim() } : {}),
            })),
      };

      if (isAuthentication) {
        payload.add_security_recommendation = securityRecommendation;
        payload.code_expiration_minutes = Number(expiration);
      }

      if (!isAuthentication && headerType !== "NONE") {
        if (!mediaFile) {
          throw new Error("Please select an image or video before submitting.");
        }

        setUploading(true);

        const uploaded = await uploadMarketingMedia(mediaFile);

        setUploading(false);

        if (!uploaded.media_handle) {
          throw new Error("Meta did not return a media handle.");
        }

        payload.media_type = headerType;
        payload.media_handle = uploaded.media_handle;
      }

      const result = await createMarketingTemplate(payload);

      setSuccess(result.message || "Template submitted to Meta.");

      onCreated?.();
    } catch (err) {
      setError(err.message || "Template submission failed.");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: 12,
    marginTop: 6,
    marginBottom: 18,
    border: "1px solid #d1d5db",
    borderRadius: 8,
    background: "#ffffff",
    color: "#111827",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 760,
        padding: 24,
        border: "1px solid #d1d5db",
        borderRadius: 12,
      }}
    >
      <h2>Create WhatsApp Template</h2>
      <p>Create and submit a template directly to Meta.</p>

      <label htmlFor="template-name">Template Name</label>
      <input
        id="template-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="hytoma_site_visit_update"
        maxLength={512}
        style={inputStyle}
        required
      />

      <label htmlFor="template-category">Template Category</label>
      <select
        id="template-category"
        value={category}
        onChange={(e) => {
          setCategory(e.target.value);
          setError("");
          setSuccess("");
        }}
        style={inputStyle}
      >
        <option value="MARKETING">
          Marketing — offers, promotions, campaigns
        </option>
        <option value="UTILITY">
          Utility — service updates, appointments, notifications
        </option>
        <option value="AUTHENTICATION">
          Authentication — verification codes
        </option>
      </select>

      <label htmlFor="template-language">Language</label>
      <select
        id="template-language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={inputStyle}
      >
        <option value="en_US">English (US)</option>
        <option value="en">English</option>
        <option value="te">Telugu</option>
        <option value="hi">Hindi</option>
      </select>

      {!isAuthentication && (
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="header-type">Template Header</label>

          <select
            id="header-type"
            value={headerType}
            onChange={(e) => {
              setHeaderType(e.target.value);
              setMediaFile(null);
              setError("");
            }}
            style={inputStyle}
          >
            <option value="NONE">No Header</option>
            <option value="IMAGE">Image Header</option>
            <option value="VIDEO">Video Header</option>
          </select>

          {headerType !== "NONE" && (
            <>
              <label htmlFor="header-media">
                Upload {headerType === "IMAGE" ? "Image" : "Video"}
              </label>

              <input
                id="header-media"
                type="file"
                accept={
                  headerType === "IMAGE" ? "image/jpeg,image/png" : "video/mp4"
                }
                onChange={(e) => {
                  setMediaFile(e.target.files?.[0] || null);
                  setError("");
                }}
                style={inputStyle}
                required
              />

              <p style={{ fontSize: 12, color: "#6b7280" }}>
                {headerType === "IMAGE"
                  ? "JPG or PNG, maximum 5 MB."
                  : "MP4, maximum 16 MB."}
              </p>
            </>
          )}
        </div>
      )}

      {!isAuthentication ? (
        <>
          <label htmlFor="template-body">Message Body</label>
          <textarea
            id="template-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              category === "UTILITY"
                ? "Hello, your HYTOMA service request has been updated."
                : "Enter your promotional message..."
            }
            maxLength={1024}
            rows={7}
            style={inputStyle}
            required
          />

          <p>{body.length}/1024 characters</p>
        </>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <h3>Authentication OTP Settings</h3>

          <p>
            Meta generates the verification-message format. You cannot enter a
            custom promotional message.
          </p>

          <label htmlFor="otp-expiration">Code Expiration (minutes)</label>
          <input
            id="otp-expiration"
            type="number"
            min={1}
            max={90}
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            style={inputStyle}
            required
          />

          <label>
            <input
              type="checkbox"
              checked={securityRecommendation}
              onChange={(e) => setSecurityRecommendation(e.target.checked)}
              style={{ marginRight: 8 }}
            />
            Include security recommendation
          </label>

          <p>Button type: Copy Code</p>
        </div>
      )}

      <h3>WhatsApp Message Preview</h3>


      {!isAuthentication && (
        <section style={{ marginBottom: 24 }}>
          <h3>Footer</h3>

          <label htmlFor="template-footer">
            Optional Footer
          </label>

          <input
            id="template-footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="HYTOMA Automation LLP"
            maxLength={60}
            style={inputStyle}
          />

          <h3>Interactive Buttons</h3>
          <p style={{ color: "#6b7280" }}>
            Add a phone number, website or quick reply button.
          </p>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 20,
            }}
          >
            <button
              type="button"
              onClick={() => addButton("PHONE_NUMBER")}
              disabled={
                submitting ||
                buttons.length >= 5 ||
                buttons.some((b) => b.type === "PHONE_NUMBER")
              }
            >
              + Phone CTA
            </button>

            <button
              type="button"
              onClick={() => addButton("URL")}
              disabled={
                submitting ||
                buttons.length >= 5 ||
                buttons.some((b) => b.type === "URL")
              }
            >
              + Website CTA
            </button>

            <button
              type="button"
              onClick={() => addButton("QUICK_REPLY")}
              disabled={
                submitting ||
                buttons.length >= 5 ||
                buttons.filter((b) => b.type === "QUICK_REPLY")
                  .length >= 3
              }
            >
              + Quick Reply
            </button>
          </div>

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
                  onClick={() => removeButton(index)}
                  disabled={submitting}
                >
                  Remove
                </button>
              </div>

              <label htmlFor={`button-text-${index}`}>
                Button Label
              </label>

              <input
                id={`button-text-${index}`}
                value={button.text}
                onChange={(e) =>
                  updateButton(index, "text", e.target.value)
                }
                placeholder={
                  button.type === "PHONE_NUMBER"
                    ? "Get Offer Details"
                    : button.type === "URL"
                      ? "Visit Website"
                      : "I'm Interested"
                }
                maxLength={25}
                style={inputStyle}
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
                        e.target.value
                      )
                    }
                    placeholder="+919876543210"
                    style={inputStyle}
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
                      updateButton(index, "url", e.target.value)
                    }
                    placeholder="https://example.com"
                    style={inputStyle}
                    required
                  />
                </>
              )}
            </div>
          ))}
        </section>
      )}


      
      <WhatsAppTemplatePreview
        body={body}
        footer={footer}
        headerType={headerType}
        mediaFile={mediaFile}
        buttons={buttons}
        isAuthentication={isAuthentication}
        securityRecommendation={securityRecommendation}
        expiration={expiration}
      />


      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}

      {success && (
        <p role="status" style={{ color: "green" }}>
          {success}
        </p>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" disabled={submitting}>
          {uploading
            ? "Uploading Media..."
            : submitting
              ? "Submitting..."
              : "Submit to Meta"}
        </button>

        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
