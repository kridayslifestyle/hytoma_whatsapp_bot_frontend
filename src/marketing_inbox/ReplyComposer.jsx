import { useEffect, useState, useRef } from "react";

import { Send, Paperclip, Clock, FileText } from "lucide-react";

import { apiRequest } from "../api";

const base = "/admin/marketing-inbox";

const button =
  "rounded-lg border border-slate-300 px-3 py-2 " +
  "text-sm disabled:opacity-50";

const quickReplies = [
  [
    "Thank you",
    "Thank you for your interest in HYTOMA Automation! How can we help you?",
  ],
  [
    "Project details",
    "Could you share your project location and requirements?",
  ],
  [
    "Demo",
    "We would be happy to arrange a product demo. Please share your preferred time.",
  ],
  [
    "Partnership",
    "Thank you for your interest in partnering with HYTOMA. Our team can share the partnership details.",
  ],
];

export function ManualMedia({ message }) {
  const src = "/api" + base + "/manual-media/" + message.manual_id;

  if (message.mime === "application/pdf") {
    return (
      <a
        className="flex items-center gap-2 rounded-lg bg-white/70 p-3 text-teal-800"
        href={src}
        download
      >
        <FileText size={18} />
        {message.media_filename}
      </a>
    );
  }

  if (message.mime === "video/mp4") {
    return (
      <video
        src={src}
        controls
        preload="metadata"
        className="w-full rounded-lg"
      />
    );
  }

  return (
    <img
      src={src}
      alt={message.media_filename}
      loading="lazy"
      className="w-full rounded-lg"
    />
  );
}

export default function ReplyComposer({ chat, onSent }) {
  const [now, setNow] = useState(Date.now());
  const [mode, setMode] = useState("text");
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState("");
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);

  const busyRef = useRef(false);
  const inputRef = useRef(null);
  const pendingRequest = useRef(null);

  const expires = chat.window_expires_at
    ? new Date(chat.window_expires_at).getTime()
    : 0;

  const seconds = Math.max(0, Math.floor((expires - now) / 1000));

  const open = seconds > 60;

  const blocked =
    Boolean(chat.contact.archived_at) ||
    chat.contact.consent_status === "opted_out" ||
    chat.lead_status === "opted_out";

  const unresolved = chat.messages.some(
    (m) => m.manual_id && ["unknown", "sending"].includes(m.status),
  );

  const template = templates.find((t) => String(t.id) === templateId);

  // UPDATE WINDOW TIMER

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) setMode("template");
  }, [open]);

  // LOAD APPROVED TEMPLATES

  useEffect(() => {
    if (mode !== "template") return;

    let active = true;

    apiRequest(base + "/reply-templates")
      .then((r) => {
        if (active) {
          setTemplates(r.templates || []);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
        }
      });

    return () => {
      active = false;
    };
  }, [mode]);

  function resetFile() {
    setFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function clearComposer() {
    setBody("");
    resetFile();
    setValues({});
    setTemplateId("");
    setMode(open ? "text" : "template");
  }

  useEffect(() => {
    if (!uncertain || busy || !pendingRequest.current) return;

    const message = chat.messages.find(
      (m) => m.manual_id === pendingRequest.current,
    );

    if (
      !message ||
      !["accepted", "sent", "delivered", "read", "failed"].includes(
        message.status,
      )
    ) {
      return;
    }

    pendingRequest.current = null;

    clearComposer();
    setUncertain(false);

    setError(
      message.status === "failed"
        ? "Message failed. Check its delivery status."
        : "",
    );
  }, [chat.messages, uncertain, busy, open]);

  // SEND MESSAGE

  async function send() {
    if (busyRef.current || blocked || uncertain || unresolved) {
      return;
    }

    if (mode !== "template" && !open) {
      return;
    }

    if (mode === "text" && !body.trim() && !file) {
      return;
    }

    if (
      mode === "template" &&
      (!template ||
        template.fields.some((k) => !values[k]?.trim()) ||
        Boolean(template.media_required) !== Boolean(file))
    ) {
      return;
    }

    if (
      file &&
      !["image/jpeg", "image/png", "video/mp4", "application/pdf"].includes(
        file.type,
      )
    ) {
      setError("Choose JPG, PNG, MP4 or PDF.");
      return;
    }

    if (file && file.size > 4 * 1024 * 1024) {
      setError("Attachment must be 4 MB or smaller.");

      return;
    }

    if (
      mode === "template" &&
      !window.confirm(
        "Send this approved template to " + chat.contact.phone + "?",
      )
    ) {
      return;
    }

    busyRef.current = true;

    setBusy(true);
    setError("");

    const data = new FormData();

    const requestId = crypto.randomUUID();

    pendingRequest.current = requestId;

    data.append("request_id", requestId);

    const kinds = {
      "image/jpeg": "image",
      "image/png": "image",
      "video/mp4": "video",
      "application/pdf": "document",
    };

    data.append(
      "kind",
      mode === "template" ? "template" : file ? kinds[file.type] : "text",
    );

    data.append("body", mode === "template" ? "" : body);

    data.append("template_id", mode === "template" ? templateId : "");

    data.append("values", JSON.stringify(mode === "template" ? values : {}));

    if (file) {
      data.append("file", file);
    }

    try {
      const result = await apiRequest(
        base + "/conversations/" + chat.contact.id + "/send",
        {
          method: "POST",
          body: data,
        },
      );

      if (result.status === "failed") {
        throw new Error("Meta rejected the message.");
      }

      if (result.status !== "accepted") {
        setUncertain(true);

        throw new Error(
          "Send outcome uncertain. Check delivery before sending again.",
        );
      }

      pendingRequest.current = null;

      clearComposer();

      onSent();
    } catch (e) {
      setError(e.message);

      if (/uncertain|Failed to fetch|Request failed|network/i.test(e.message)) {
        setUncertain(true);
      }

      onSent();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* CUSTOMER SERVICE WINDOW */}

      <div
        className={
          "flex items-center gap-2 text-xs font-medium " +
          (open ? "text-emerald-700" : "text-amber-800")
        }
      >
        <Clock size={15} />

        {open
          ? "Reply window: " +
            Math.floor(seconds / 3600) +
            "h " +
            Math.floor((seconds % 3600) / 60) +
            "m remaining"
          : "Reply window closed · approved template required"}
      </div>

      {blocked ? (
        <p className="text-sm text-red-700">
          This contact is archived or has opted out.
        </p>
      ) : (
        <>
          {/* ACTION BUTTONS */}

          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={!open || busy}
              onClick={() => {
                setMode("text");
                resetFile();
              }}
            >
              Message
            </button>

            <button
              className={button}
              disabled={busy}
              onClick={() => {
                setMode("template");
                resetFile();
              }}
            >
              Approved template
            </button>

            {mode === "text" && (
              <select
                className={button}
                disabled={busy}
                value=""
                onChange={(e) => setBody(e.target.value)}
              >
                <option value="">Quick replies</option>

                {quickReplies.map(([label, text]) => (
                  <option key={label} value={text}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* TEMPLATE MODE */}

          {mode === "template" ? (
            <div className="max-h-40 space-y-2 overflow-y-auto">
              <select
                className={button + " w-full"}
                value={templateId}
                disabled={busy}
                onChange={(e) => {
                  setTemplateId(e.target.value);
                  setValues({});
                  resetFile();
                }}
              >
                <option value="">Select approved template</option>

                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.language})
                  </option>
                ))}
              </select>

              {template && (
                <>
                  <p className="whitespace-pre-wrap text-xs text-slate-600">
                    {template.components?.find((p) => p.type === "BODY")?.text}
                  </p>

                  {template.fields.map((k) => (
                    <label key={k} className="block text-xs">
                      {k}

                      <input
                        className={button + " w-full"}
                        value={values[k] || ""}
                        disabled={busy}
                        onChange={(e) =>
                          setValues((v) => ({
                            ...v,
                            [k]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </>
              )}
            </div>
          ) : (
            /* TEXT MESSAGE MODE */

            <textarea
              className="w-full resize-none rounded-xl border p-2 text-sm"
              rows={2}
              maxLength={file ? 1024 : 4096}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={busy || !open}
              placeholder="Type a message..."
            />
          )}

          {/* ATTACHMENT AND SEND */}

          <div className="flex flex-wrap items-center gap-2">
            {(mode === "text" || template?.media_required) && (
              <label
                className={button + " flex cursor-pointer items-center gap-2"}
              >
                <Paperclip size={16} />
                Attach
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  disabled={busy}
                  accept={
                    mode === "template"
                      ? template.media_required === "IMAGE"
                        ? "image/jpeg,image/png"
                        : "video/mp4"
                      : "image/jpeg,image/png,video/mp4,application/pdf"
                  }
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            )}

            {file && (
              <>
                <span className="max-w-40 truncate text-xs">{file.name}</span>

                <button className={button} disabled={busy} onClick={resetFile}>
                  Remove
                </button>
              </>
            )}

            <button
              className="ml-auto flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={
                busy ||
                uncertain ||
                unresolved ||
                (mode === "text" ? !open || (!body.trim() && !file) : !template)
              }
              onClick={send}
            >
              <Send size={16} />

              {busy ? "Sending..." : "Send"}
            </button>
          </div>
        </>
      )}

      {(uncertain || unresolved) && (
        <p role="alert" className="text-xs text-amber-800">
          Previous send is uncertain or pending. Check delivery before sending
          again.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
