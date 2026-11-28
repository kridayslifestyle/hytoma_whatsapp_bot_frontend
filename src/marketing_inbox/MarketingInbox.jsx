import { useEffect, useState } from "react";

import {
  Search,
  MessageCircle,
  Image,
  Phone,
  ExternalLink,
  CheckCheck,
  RefreshCw,
} from "lucide-react";

import { apiRequest } from "../api";

import CampaignMedia from "./CampaignMedia";

const base = "/admin/marketing-inbox";

const btn =
  "rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50";

// Render saved campaign template

function TemplateMessage({ message }) {
  const fill = (text, prefix) =>
    (text || "").replace(
      /\{\{\s*(\d+)\s*\}\}/g,
      (match, n) => message.template_values?.[prefix + ":" + n] || match,
    );

  const parts = message.template_snapshot?.components || [];

  return (
    <>
      

      {parts.map((part, i) => {
        if (part.type === "HEADER") {
          return part.format === "TEXT" ? (
            <p key={i} className="font-bold">
              {fill(part.text, "header")}
            </p>
          ) : (
            <CampaignMedia
              key={message.id + ":" + i}
              message={message}
              format={part.format}
            />
          );
        }

        if (part.type === "BODY") {
          return (
            <p
              key={i}
              className="whitespace-pre-wrap break-words text-sm leading-relaxed"
            >
              {fill(part.text, "body")}
            </p>
          );
        }

        if (part.type === "FOOTER") {
          return (
            <p key={i} className="mt-3 text-xs text-slate-500">
              {part.text}
            </p>
          );
        }

        if (part.type === "BUTTONS") {
          return (
            <div
              key={i}
              className="mt-3 divide-y divide-slate-200 border-t border-slate-200"
            >
              {part.buttons.map((b, j) => (
                <div
                  key={j}
                  className="flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-teal-700"
                >
                  {b.type === "URL" ? (
                    <ExternalLink size={14} />
                  ) : b.type === "PHONE_NUMBER" ? (
                    <Phone size={14} />
                  ) : (
                    <MessageCircle size={14} />
                  )}

                  {b.text}
                </div>
              ))}
            </div>
          );
        }

        return null;
      })}
    </>
  );
}

// Main Marketing Inbox

export default function MarketingInbox() {
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [page, setPage] = useState(0);

  const [list, setList] = useState([]);

  const [more, setMore] = useState(false);

  const [selected, setSelected] = useState(null);

  const [chat, setChat] = useState(null);

  const [error, setError] = useState("");

  const [chatError, setChatError] = useState("");

  const [revision, setRevision] = useState(0);

  const [readBusy, setReadBusy] = useState(false);

  // Load conversation list

  useEffect(() => {
    let active = true;
    let timer;

    async function load() {
      try {
        const params = new URLSearchParams({
          search,
          status: filter,
          offset: page * 50,
          limit: 50,
        });

        const result = await apiRequest(base + "/conversations?" + params);

        if (active) {
          setList(result.conversations);
          setMore(result.has_more);
          setError("");
        }
      } catch (e) {
        if (active) {
          setError(e.message);
        }
      } finally {
        if (active) {
          timer = setTimeout(load, 5000);
        }
      }
    }

    load();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, filter, page, revision]);

  // Load selected conversation

  useEffect(() => {
    setChat(null);
    setChatError("");

    if (!selected) return;

    let active = true;
    let timer;

    async function load() {
      try {
        const result = await apiRequest(base + "/conversations/" + selected);

        if (active) {
          setChat(result);
          setChatError("");
        }
      } catch (e) {
        if (active) {
          setChatError(e.message);
        }
      } finally {
        if (active) {
          timer = setTimeout(load, 5000);
        }
      }
    }

    load();

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selected, revision]);

  // Mark conversation as read

  async function markRead() {
    if (!selected || readBusy) return;

    setReadBusy(true);

    try {
      await apiRequest(
        base + "/conversations/" + selected + "/read",

        {
          method: "POST",
        },
      );

      setRevision((n) => n + 1);
    } catch (e) {
      setChatError(e.message);
    } finally {
      setReadBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Page title */}

      <div>
        <h2 className="text-2xl font-bold">Marketing Inbox</h2>

        <p className="mt-1 text-sm text-slate-500">
          Campaign conversations and directly linked customer replies.
        </p>
      </div>

      {/* Main chat layout */}

      <div className="grid h-[75vh] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[310px_minmax(0,1fr)]">
        {/* LEFT SIDE - CONVERSATIONS */}

        <aside className="flex min-h-0 flex-col border-r border-slate-200">
          {/* Search and filters */}

          <div className="space-y-3 border-b border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2.5">
              <Search size={17} className="text-slate-400" />

              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search name or number"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              {["all", "unread", "replied"].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(0);
                  }}
                  className={
                    "rounded-full px-3 py-1 text-xs capitalize " +
                    (filter === f
                      ? "bg-teal-100 text-teal-800 font-semibold"
                      : "bg-slate-100 text-slate-600")
                  }
                >
                  {f}
                </button>
              ))}

              <button
                type="button"
                aria-label="Refresh"
                onClick={() => setRevision((n) => n + 1)}
                className="ml-auto text-slate-500"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Conversation list */}

          {error && (
            <p role="alert" className="p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {!list.length && !error && (
              <p className="p-5 text-sm text-slate-500">
                No matching conversations.
              </p>
            )}

            {list.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={
                  "flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left " +
                  (selected === c.id
                    ? "bg-teal-50 border-l-4 border-l-teal-600"
                    : "hover:bg-slate-50")
                }
              >
                {/* Avatar */}

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-700 font-semibold text-white">
                  {(c.name || c.phone || "?").slice(0, 1).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.name || "+" + c.phone}
                  </p>

                  <p className="truncate text-xs text-slate-500">+{c.phone}</p>

                  <p className="text-xs text-slate-400">
                    {c.replies ? "Customer replied" : "Campaign message"}
                  </p>
                </div>

                {!!c.unread && (
                  <span className="rounded-full bg-teal-600 px-2 py-1 text-xs text-white">
                    {c.unread}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Conversation pagination */}

          <div className="flex justify-between border-t p-2">
            <button
              type="button"
              className={btn}
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>

            <button
              type="button"
              className={btn}
              disabled={!more}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </aside>

        {/* RIGHT SIDE - MESSAGES */}

        <section className="flex min-h-0 min-w-0 flex-col bg-[#f1eee7]">
          {chatError && (
            <p role="alert" className="bg-red-50 p-3 text-sm text-red-700">
              {chatError}
            </p>
          )}

          {!chat ? (
            <div className="m-auto p-6 text-center text-slate-500">
              <MessageCircle className="mx-auto mb-3" size={40} />

              {selected ? "Loading conversation..." : "Choose a conversation"}
            </div>
          ) : (
            <>
              {/* Conversation header */}

              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-700 font-semibold text-white">
                    {(chat.contact.name || chat.contact.phone)
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>

                  <div>
                    <p className="font-semibold">
                      {chat.contact.name || "+" + chat.contact.phone}
                    </p>

                    <p className="text-xs text-slate-500">
                      +{chat.contact.phone}
                      {" · "}
                      {chat.contact.contact_type}
                      {" · "}
                      {chat.contact.consent_status}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className={btn}
                  onClick={markRead}
                  disabled={readBusy}
                >
                  Mark Read
                </button>
              </header>

              {/* Chat message area */}

              <div
                className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4"
                style={{
                  backgroundImage:
                    "radial-gradient(#d9d4c9 0.8px, transparent 0.8px)",
                  backgroundSize: "22px 22px",
                }}
              >
                {chat.messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      "flex " +
                      (m.direction === "outgoing"
                        ? "justify-end"
                        : "justify-start")
                    }
                  >
                    <article
                      className={
                        "max-w-[85%] rounded-xl p-3 shadow-sm " +
                        (m.direction === "outgoing"
                          ? "w-full max-w-[360px] bg-[#e1f3ea]"
                          : "bg-white")
                      }
                    >
                      {m.direction === "outgoing" ? (
                        <TemplateMessage message={m} />
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {m.text}
                        </p>
                      )}

                      {/* Message time and status */}

                      <div className="mt-2 flex flex-wrap justify-end gap-1 text-[10px] text-slate-500">
                        {new Date(m.at).toLocaleString()}

                        {m.direction === "outgoing" && (
                          <span
                            className={
                              "flex items-center gap-1 " +
                              (m.status === "read"
                                ? "text-blue-600"
                                : m.status === "failed"
                                  ? "text-red-600"
                                  : "")
                            }
                          >
                            {["delivered", "read"].includes(m.status) && (
                              <CheckCheck size={13} />
                            )}

                            {m.status}
                          </span>
                        )}
                      </div>
                    </article>
                  </div>
                ))}
              </div>

              {/* Reply area - next phase */}

              <footer className="border-t border-slate-200 bg-white p-3">
                <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500">
                  Reply sending will be enabled in the next phase.
                </div>
              </footer>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
