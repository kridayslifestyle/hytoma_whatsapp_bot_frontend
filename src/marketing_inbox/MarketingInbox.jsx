import ReplyComposer, {
  ManualMedia,
} from "./ReplyComposer";

import CampaignMedia from "./CampaignMedia";

import {
  useEffect,
  useState,
  useRef,
} from "react";

import {
  Search,
  MessageCircle,
  Phone,
  ExternalLink,
  CheckCheck,
  RefreshCw,
} from "lucide-react";

import { apiRequest } from "../api";

const base = "/admin/marketing-inbox";

const btn =
  "rounded-lg border border-slate-200 " +
  "px-3 py-2 text-xs font-semibold " +
  "disabled:opacity-50";


// =====================================================
// TEMPLATE MESSAGE
// =====================================================

function TemplateMessage({ message }) {
  const fill = (text, prefix) =>
    (text || "").replace(
      /\{\{\s*(\d+)\s*\}\}/g,
      (match, n) =>
        message.template_values?.[
          prefix + ":" + n
        ] || match
    );

  const parts =
    message.template_snapshot?.components || [];

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "HEADER") {
          return part.format === "TEXT" ? (
            <p key={i} className="font-bold">
              {fill(part.text, "header")}
            </p>
          ) : message.manual_id ? (
            <ManualMedia
              key={i}
              message={message}
            />
          ) : (
            <CampaignMedia
              key={i}
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
            <p
              key={i}
              className="mt-3 text-xs text-slate-500"
            >
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
                  className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-teal-700"
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


// =====================================================
// MARKETING INBOX
// =====================================================

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

  const [unreadTotal, setUnreadTotal] = useState(0);

  const [messageSearch, setMessageSearch] =
    useState("");

  const [salespeople, setSalespeople] =
    useState([]);

  const [salesperson, setSalesperson] =
    useState("");

  const [leadBusy, setLeadBusy] = useState(false);

  const [leadNotice, setLeadNotice] =
    useState("");

  const scrollRef = useRef(null);
  const previousLast = useRef("");


  // =====================================================
  // LOAD SALESPEOPLE
  // =====================================================

  useEffect(() => {
    apiRequest("/admin/salespeople")
      .then((r) => {
        setSalespeople(
          (r.salespeople || []).filter(
            (p) => p.is_active
          )
        );
      })
      .catch((e) => {
        setError(e.message);
      });
  }, []);


  // RESET CONVERSATION CONTROLS

  useEffect(() => {
    setSalesperson("");
    setMessageSearch("");
    setLeadNotice("");

    previousLast.current = "";
  }, [selected]);


  // =====================================================
  // AUTOMATIC CHAT SCROLL
  // =====================================================

  useEffect(() => {
    const last = chat?.messages?.at(-1)?.id;

    if (
      last &&
      last !== previousLast.current &&
      !messageSearch
    ) {
      previousLast.current = last;

      if (scrollRef.current) {
        scrollRef.current.scrollTop =
          scrollRef.current.scrollHeight;
      }
    }
  }, [chat, messageSearch]);


  // =====================================================
  // CREATE AND ASSIGN LEAD
  // =====================================================

  async function saveLead() {
    if (!chat || leadBusy) return;

    const id = chat.contact.id;

    setLeadBusy(true);
    setLeadNotice("");

    try {
      const r = await apiRequest(
        base + "/conversations/" + id + "/lead",
        {
          method: "POST",

          body: JSON.stringify({
            salesperson_id: salesperson
              ? Number(salesperson)
              : null,
          }),
        }
      );

      setLeadNotice(
        r.lead.assigned_salesperson
          ? "Assigned to " +
            r.lead.assigned_salesperson
          : "Lead saved"
      );

      setRevision((n) => n + 1);
    } catch (e) {
      setLeadNotice(e.message);
    } finally {
      setLeadBusy(false);
    }
  }


  // =====================================================
  // CONVERSATION LIST - AUTO REFRESH
  // =====================================================

  useEffect(() => {
    let active = true;
    let timer;

    async function load() {
      try {
        const result = await apiRequest(
          base +
            "/conversations?" +
            new URLSearchParams({
              search,
              status: filter,
              offset: page * 50,
              limit: 50,
            })
        );

        if (active) {
          setList(result.conversations);
          setMore(result.has_more);

          setUnreadTotal(
            result.unread_total || 0
          );

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


  // =====================================================
  // CHAT MESSAGES - AUTO REFRESH
  // =====================================================

  useEffect(() => {
    setChatError("");

    if (!selected) return;

    let active = true;
    let timer;

    async function load() {
      try {
        const result = await apiRequest(
          base +
            "/conversations/" +
            selected +
            "?" +
            new URLSearchParams({
              search: messageSearch,
            })
        );

        if (active) {
          setChat(result);
          setChatError("");

          // Automatically mark opened messages as read.

          if (
            !messageSearch &&
            document.visibilityState === "visible" &&
            result.messages.some(
              (m) =>
                m.direction === "incoming" &&
                !m.read_at
            )
          ) {
            await apiRequest(
              base +
                "/conversations/" +
                selected +
                "/read",
              {
                method: "POST",
              }
            );

            if (active) {
              setList((rows) =>
                rows.map((c) =>
                  c.id === selected
                    ? { ...c, unread: 0 }
                    : c
                )
              );
            }
          }
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
  }, [selected, revision, messageSearch]);


  // =====================================================
  // MARK READ
  // =====================================================

  async function markRead() {
    if (!selected || readBusy) return;

    setReadBusy(true);

    try {
      await apiRequest(
        base +
          "/conversations/" +
          selected +
          "/read",
        {
          method: "POST",
        }
      );

      setRevision((n) => n + 1);
    } catch (e) {
      setChatError(e.message);
    } finally {
      setReadBusy(false);
    }
  }


  // =====================================================
  // DASHBOARD UI
  // =====================================================

  return (
    <div className="space-y-4">

      <div>
        <h2 className="text-2xl font-bold">
          Marketing Inbox
        </h2>

        <p className="text-sm text-slate-500">
          Campaign conversations and customer replies.
        </p>
      </div>

      <div className="grid h-[75vh] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[310px_minmax(0,1fr)]">

        {/* LEFT SIDEBAR */}

        <aside className="flex min-h-0 flex-col border-r border-slate-200">

          {/* SEARCH */}

          <div className="space-y-3 border-b border-slate-200 bg-white p-3">

            <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2">

              <Search
                size={17}
                className="text-slate-400"
              />

              <input
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Search contacts or messages"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />

            </div>

            {/* FILTERS */}

            <div className="flex items-center gap-2">

              {[
                "all",
                "unread",
                "replied",
              ].map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setPage(0);
                  }}
                  className={
                    "rounded-full px-3 py-1 text-xs capitalize " +
                    (
                      filter === f
                        ? "bg-teal-100 text-teal-800 font-semibold"
                        : "bg-slate-100 text-slate-600"
                    )
                  }
                >
                  {f}

                  {f === "unread" &&
                    unreadTotal > 0 &&
                    " (" + unreadTotal + ")"}
                </button>
              ))}

              <button
                aria-label="Refresh"
                onClick={() =>
                  setRevision((n) => n + 1)
                }
                className="ml-auto text-slate-500"
              >
                <RefreshCw size={16} />
              </button>

            </div>
          </div>

          {error && (
            <p
              role="alert"
              className="p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          {/* CONVERSATIONS */}

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
                onClick={() => {
                  if (selected !== c.id) {
                    setChat(null);
                    setSelected(c.id);
                  }
                }}
                className={
                  "flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left " +
                  (
                    selected === c.id
                      ? "bg-teal-50 border-l-4 border-l-teal-600"
                      : "hover:bg-slate-50"
                  )
                }
              >

                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-700 font-semibold text-white">

                  {(c.name || c.phone || "?")
                    .slice(0, 1)
                    .toUpperCase()}

                </span>

                <div className="min-w-0 flex-1">

                  <p className="truncate text-sm font-semibold">
                    {c.name || "+" + c.phone}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    +{c.phone}
                  </p>

                  <p className="text-xs text-slate-400">
                    {c.replies
                      ? "Customer replied"
                      : "Campaign message"}
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

          {/* PAGINATION */}

          <div className="flex justify-between border-t p-2">

            <button
              className={btn}
              disabled={!page}
              onClick={() =>
                setPage((p) => p - 1)
              }
            >
              Previous
            </button>

            <button
              className={btn}
              disabled={!more}
              onClick={() =>
                setPage((p) => p + 1)
              }
            >
              Next
            </button>

          </div>
        </aside>


        {/* RIGHT CHAT AREA */}

        <section className="flex min-h-0 min-w-0 flex-col bg-[#f1eee7]">

          {chatError && (
            <p
              role="alert"
              className="bg-red-50 p-3 text-sm text-red-700"
            >
              {chatError}
            </p>
          )}

          {!chat ? (
            <div className="m-auto p-6 text-center text-slate-500">

              <MessageCircle
                className="mx-auto mb-3"
                size={40}
              />

              {selected
                ? "Loading conversation..."
                : "Choose a conversation"}

            </div>
          ) : (
            <>

              {/* CHAT HEADER */}

              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white p-4">

                <div>
                  <p className="font-semibold">
                    {chat.contact.name ||
                      "+" + chat.contact.phone}
                  </p>

                  <p className="text-xs text-slate-500">
                    +{chat.contact.phone}
                    {" · "}
                    {chat.contact.contact_type}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">

                  <button
                    type="button"
                    className={btn}
                    onClick={markRead}
                    disabled={readBusy}
                  >
                    Mark Read
                  </button>

                  <select
                    className={btn}
                    value={salesperson}
                    disabled={leadBusy}
                    onChange={(e) =>
                      setSalesperson(e.target.value)
                    }
                  >
                    <option value="">
                      Select salesperson
                    </option>

                    {salespeople.map((p) => (
                      <option
                        key={p.id}
                        value={p.id}
                      >
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    className={btn}
                    disabled={leadBusy}
                    onClick={saveLead}
                  >
                    {salesperson
                      ? "Assign lead"
                      : chat.lead_status
                        ? "Lead exists"
                        : "Create lead"}
                  </button>

                </div>

                {(chat.assigned_salesperson ||
                  leadNotice) && (
                  <p className="w-full text-xs text-teal-700">
                    {leadNotice ||
                      "Assigned to " +
                        chat.assigned_salesperson}
                  </p>
                )}

                <input
                  className="w-full rounded-lg border p-2 text-xs"
                  placeholder="Search conversation messages"
                  value={messageSearch}
                  onChange={(e) =>
                    setMessageSearch(e.target.value)
                  }
                />

              </header>


              {/* MESSAGE HISTORY */}

              <div
                ref={scrollRef}
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
                      (
                        m.direction === "outgoing"
                          ? "justify-end"
                          : "justify-start"
                      )
                    }
                  >
                    <article
                      className={
                        "max-w-[85%] rounded-xl p-3 shadow-sm " +
                        (
                          m.direction === "outgoing"
                            ? "w-full max-w-[360px] bg-[#e1f3ea]"
                            : "bg-white"
                        )
                      }
                    >

                      {m.template_snapshot ? (
                        <TemplateMessage
                          message={m}
                        />
                      ) : (
                        <>

                          {m.manual_id &&
                            m.media_filename && (
                              <ManualMedia
                                message={m}
                              />
                            )}

                          <p className="whitespace-pre-wrap break-words text-sm">
                            {m.text}
                          </p>

                        </>
                      )}

                      {/* MESSAGE STATUS */}

                      <div className="mt-2 flex flex-wrap justify-end gap-1 text-[10px] text-slate-500">

                        {new Date(m.at)
                          .toLocaleString()}

                        {m.direction === "outgoing" && (
                          <span
                            className={
                              "flex items-center gap-1 " +
                              (
                                m.status === "read"
                                  ? "text-blue-600"
                                  : m.status === "failed"
                                    ? "text-red-600"

                                    : ""
                              )
                            }
                          >

                            {[
                              "delivered",
                              "read",
                            ].includes(m.status) && (
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


              {/* MESSAGE COMPOSER */}

              <footer className="border-t border-slate-200 bg-white p-3">

                {messageSearch ? (
                  <button
                    className={btn}
                    onClick={() =>
                      setMessageSearch("")
                    }
                  >
                    Clear search to reply
                  </button>
                ) : (
                  <ReplyComposer
                    key={chat.contact.id}
                    chat={chat}
                    onSent={() =>
                      setRevision((n) => n + 1)
                    }
                  />
                )}

              </footer>

            </>
          )}

        </section>
      </div>
    </div>
  );
}