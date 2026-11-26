
import { useEffect, useState } from "react";

export default function WhatsAppTemplatePreview({
  body = "",
  footer = "",
  headerType = "NONE",
  mediaFile = null,
  buttons = [],
  isAuthentication = false,
  securityRecommendation = true,
  expiration = 10,
}) {
  const [mediaUrl, setMediaUrl] = useState(null);

  // Generate a temporary local preview URL.
  useEffect(() => {
    if (!mediaFile) {
      setMediaUrl(null);
      return;
    }

    const url = URL.createObjectURL(mediaFile);
    setMediaUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [mediaFile]);

  const containerStyle = {
    maxWidth: 390,
    margin: "0 auto",
    background: "#e7ddd0",
    borderRadius: 18,
    padding: 16,
    border: "1px solid #d6cdc1",
  };

  const messageStyle = {
    background: "#ffffff",
    borderRadius: 12,
    padding: 10,
    boxShadow: "0 2px 5px rgba(0,0,0,0.08)",
    color: "#202c33",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };

  const buttonStyle = {
    background: "#ffffff",
    borderRadius: 9,
    padding: "12px 10px",
    marginTop: 5,
    color: "#1680d5",
    fontWeight: 600,
    fontSize: 14,
    textAlign: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  };

  function getButtonIcon(type) {
    if (type === "PHONE_NUMBER") return "☎";
    if (type === "URL") return "↗";
    if (type === "QUICK_REPLY") return "↩";
    return "";
  }

  return (
    <section style={{ marginTop: 22, marginBottom: 22 }}>
      <h3>WhatsApp Message Preview</h3>

      <p style={{ color: "#6b7280", fontSize: 13 }}>
        Preview updates as you edit your template.
      </p>

      <div style={containerStyle}>
        <div style={messageStyle}>
          {!isAuthentication && headerType === "IMAGE" && (
            mediaUrl ? (
              <img
                src={mediaUrl}
                alt="Template header preview"
                style={{
                  width: "100%",
                  maxHeight: 240,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
            ) : (
              <div
                style={{
                  background: "#edf1f5",
                  padding: 45,
                  textAlign: "center",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                Select an image to preview
              </div>
            )
          )}

          {!isAuthentication && headerType === "VIDEO" && (
            mediaUrl ? (
              <video
                src={mediaUrl}
                controls
                preload="metadata"
                style={{
                  width: "100%",
                  maxHeight: 240,
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              />
            ) : (
              <div
                style={{
                  background: "#edf1f5",
                  padding: 45,
                  textAlign: "center",
                  borderRadius: 8,
                  marginBottom: 12,
                }}
              >
                Select a video to preview
              </div>
            )
          )}

          {isAuthentication ? (
            <>
              <div style={{ fontSize: 14 }}>
                Your verification code is [CODE].
              </div>

              {securityRecommendation && (
                <p style={{ fontSize: 13 }}>
                  For your security, do not share this code.
                </p>
              )}

              <p style={{ fontSize: 13 }}>
                This code expires in {expiration} minutes.
              </p>
            </>
          ) : (
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {body || "Your template message will appear here."}
            </div>
          )}

          {!isAuthentication && footer.trim() && (
            <div
              style={{
                fontSize: 12,
                color: "#7b858c",
                marginTop: 12,
              }}
            >
              {footer}
            </div>
          )}

          <div
            style={{
              textAlign: "right",
              fontSize: 10,
              color: "#98a2a9",
              marginTop: 8,
            }}
          >
            12:30 ✓✓
          </div>
        </div>

        {isAuthentication ? (
          <div style={buttonStyle}>
            <span>▣</span>
            Copy Code
          </div>
        ) : (
          buttons.map((button, index) => (
            <div key={index} style={buttonStyle}>
              <span>{getButtonIcon(button.type)}</span>
              <span>
                {button.text ||
                  (button.type === "PHONE_NUMBER"
                    ? "Call Now"
                    : button.type === "URL"
                      ? "Visit Website"
                      : "Quick Reply")}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
