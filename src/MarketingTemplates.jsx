
import { useEffect, useState } from "react";
import { getMarketingTemplates } from "./api";

export default function MarketingTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTemplates() {
    setLoading(true);
    setError("");

    try {
      const data = await getMarketingTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message || "Unable to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <div className="marketing-templates">
      <div style={{ marginBottom: 24 }}>
        <h2>WhatsApp Marketing Templates</h2>
        <p>
          Approved templates available in your Meta
          WhatsApp Business Account.
        </p>

        <button
          type="button"
          onClick={loadTemplates}
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh Templates"}
        </button>
      </div>

      {loading && <p>Loading templates...</p>}

      {error && (
        <p role="alert" style={{ color: "crimson" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p>
            <strong>{templates.length}</strong> approved
            marketing templates
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
              marginTop: 20,
            }}
          >
            {templates.map((template) => (
              <div
                key={template.id || `${template.name}-${template.language}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 12,
                  padding: 20,
                }}
              >
                <h3
                  style={{
                    overflowWrap: "anywhere",
                    marginTop: 0,
                  }}
                >
                  {template.name}
                </h3>

                <p>Language: {template.language}</p>
                <p>Category: {template.category}</p>
                <p>Status: {template.status}</p>

                <hr />

                {(template.components || []).map(
                  (component, index) => (
                    <div key={index}>
                      <strong>{component.type}</strong>

                      {component.text && (
                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {component.text}
                        </p>
                      )}

                      {component.format && (
                        <p>
                          Media format: {component.format}
                        </p>
                      )}

                      {component.buttons?.map((button, i) => (
                        <p key={i}>
                          Button: {button.text || button.type}
                        </p>
                      ))}
                    </div>
                  )
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
