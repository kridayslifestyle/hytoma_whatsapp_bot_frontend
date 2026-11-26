
import { useState } from "react";
import { createMarketingTemplate } from "./api";

export default function CreateMarketingTemplate({
  onCreated,
  onCancel,
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [language, setLanguage] = useState("en_US");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedName = name.trim().toLowerCase();

    if (!/^[a-z0-9_]+$/.test(normalizedName)) {
      setError(
        "Use lowercase letters, numbers and underscores only."
      );
      return;
    }

    if (!body.trim()) {
      setError("Message body is required.");
      return;
    }

    if (
      !window.confirm(
        "Submit this marketing template to Meta for review?"
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const result = await createMarketingTemplate({
        name: normalizedName,
        body: body.trim(),
        language,
      });

      setSuccess(
        result.message || "Template submitted to Meta."
      );

      onCreated?.();
    } catch (err) {
      setError(
        err.message || "Unable to submit template."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 720,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 12,
      }}
    >
      <h2>Create WhatsApp Marketing Template</h2>

      <p>
        Create a message and submit it to Meta for approval.
      </p>

      <label htmlFor="template-name">
        Template Name
      </label>

      <input
        id="template-name"
        type="text"
        value={name}
        maxLength={512}
        onChange={(e) => setName(e.target.value)}
        placeholder="example_smart_home_offer"
        required
        style={{
          display: "block",
          width: "100%",
          marginBottom: 16,
          padding: 12,
        }}
      />

      <label htmlFor="template-language">
        Language
      </label>

      <select
        id="template-language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{
          display: "block",
          width: "100%",
          marginBottom: 16,
          padding: 12,
        }}
      >
        <option value="en_US">English (US)</option>
        <option value="en">English</option>
        <option value="te">Telugu</option>
        <option value="hi">Hindi</option>
      </select>

      <label htmlFor="template-body">
        Message Body
      </label>

      <textarea
        id="template-body"
        value={body}
        maxLength={1024}
        onChange={(e) => setBody(e.target.value)}
        rows={8}
        placeholder="Enter your marketing message..."
        required
        style={{
          display: "block",
          width: "100%",
          padding: 12,
        }}
      />

      <p>{body.length}/1024 characters</p>

      <h3>WhatsApp Message Preview</h3>

      <div
        style={{
          background: "#e7f5ea",
          borderRadius: 12,
          padding: 20,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          marginBottom: 20,
        }}
      >
        {body || "Your message preview appears here."}
      </div>

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

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
        }}
      >
        <button type="submit" disabled={submitting}>
          {submitting
            ? "Submitting..."
            : "Submit to Meta"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
