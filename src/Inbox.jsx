import { useCallback, useEffect, useRef, useState } from "react";

import {
  Search,
  ArrowLeft,
  RefreshCw,
  MessageCircle,
  UserRound,
  Clock3,
  Bot,
  Send,
  AlertCircle,
  PauseCircle,
  Check,
  Pencil,
  CheckCheck,
  PlayCircle,
  LockKeyhole,
} from "lucide-react";

import { apiRequest } from "./api";

const PENDING_SEND_PREFIX = "hytoma_pending_send_";

function pendingSendKey(phone) {
  return `${PENDING_SEND_PREFIX}${phone}`;
}

function getSavedPendingSend(phone) {
  if (!phone) return null;

  try {
    const raw = sessionStorage.getItem(pendingSendKey(phone));

    if (!raw) return null;

    const data = JSON.parse(raw);

    if (
      data.phone !== phone ||
      typeof data.requestId !== "string" ||
      typeof data.message !== "string"
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function savePendingSend(pending) {
  sessionStorage.setItem(
    pendingSendKey(pending.phone),
    JSON.stringify(pending),
  );
}

function clearPendingSend(phone) {
  sessionStorage.removeItem(pendingSendKey(phone));
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatLabel(value) {
  if (!value) return "Not provided";

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMessages(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.messages)) {
    return data.messages;
  }

  if (Array.isArray(data?.chat_messages)) {
    return data.chat_messages;
  }

  throw new Error("Unexpected message response format.");
}

function getLeads(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.leads)) return data.leads;

  throw new Error("Unexpected lead response format.");
}

function getConversations(data) {
  if (Array.isArray(data?.conversations)) {
    return data.conversations;
  }

  throw new Error("Unexpected conversations API response.");
}

function latestPreview(lead) {
  if (!lead.last_message_at) {
    return "No messages yet";
  }

  const content = lead.last_message_content?.trim();

  const message =
    content ||
    (lead.last_message_type !== "text"
      ? `[${lead.last_message_type || "Media"}]`
      : "Message unavailable");

  return lead.last_message_direction === "outgoing"
    ? `You: ${message}`
    : message;
}

function shortTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function MessageBubble({ message, deliveryStatus }) {
  const outgoing = message.direction === "outgoing";

  return (
    <div className={`flex w-full min-w-0 ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={`min-w-0 max-w-[88%] rounded-2xl px-3 py-3
          shadow-sm sm:max-w-[75%] sm:px-4 ${
            outgoing ? "rounded-br-md bg-[#d9fdd3]" : "rounded-bl-md bg-white"
          }`}
      >
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-relaxed text-slate-800">
          {message.content ||
            (message.message_type && message.message_type !== "text"
              ? `[${message.message_type}]`
              : "Message content unavailable")}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
          <span className="text-[10px] text-slate-500">
            {outgoing ? "HYTOMA" : "Customer"}
          </span>

          <span className="text-[10px] text-slate-500">
            {formatTime(message.created_at)}
          </span>

          {outgoing && <DeliveryIndicator status={deliveryStatus} />}
        </div>
      </div>
    </div>
  );
}

function DeliveryIndicator({ status }) {
  const value = status?.delivery_status;

  if (value === "read") {
    return (
      <span
        title="Read"
        className="inline-flex items-center gap-1 text-sky-600"
      >
        <CheckCheck size={15} />
        <span className="text-[10px]">Read</span>
      </span>
    );
  }

  if (value === "delivered") {
    return (
      <span
        title="Delivered"
        className="inline-flex items-center gap-1 text-slate-500"
      >
        <CheckCheck size={15} />
        <span className="text-[10px]">Delivered</span>
      </span>
    );
  }

  if (value === "sent") {
    return (
      <span
        title="Sent"
        className="inline-flex items-center gap-1 text-slate-500"
      >
        <Check size={15} />
        <span className="text-[10px]">Sent</span>
      </span>
    );
  }

  if (value === "failed") {
    return (
      <span
        title={status?.error_details || "Delivery failed"}
        className="inline-flex items-center gap-1 text-red-600"
      >
        <AlertCircle size={15} />
        <span className="text-[10px]">Failed</span>
      </span>
    );
  }

  return (
    <span className="text-[10px] text-slate-400">
      {value === "accepted" ? "Accepted" : "Status unavailable"}
    </span>
  );
}

export default function Inbox() {
  const [leads, setLeads] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState("");
  const [messages, setMessages] = useState([]);
  const [deliveryStatuses, setDeliveryStatuses] = useState({});
  const [search, setSearch] = useState("");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [leadsLoading, setLeadsLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [leadsError, setLeadsError] = useState("");
  const [messagesError, setMessagesError] = useState("");

  const [replyText, setReplyText] = useState("");
  const [replyWindow, setReplyWindow] = useState(null);
  const [replyWindowLoading, setReplyWindowLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendUncertain, setSendUncertain] = useState(false);
  const [checkingSend, setCheckingSend] = useState(false);
  const [botUpdating, setBotUpdating] = useState(false);

  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // Prevent accidental double-click submissions.
  const sendLock = useRef(false);
  const pendingRequestRef = useRef(null);

  const chatScrollRef = useRef(null);
  const shouldAutoScrollRef = useRef(true);

  function handleChatScroll(event) {
    const element = event.currentTarget;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    shouldAutoScrollRef.current = distanceFromBottom < 120;
  }

  // Automatically scroll to the latest message.
  useEffect(() => {
    const element = chatScrollRef.current;

    if (!element || !shouldAutoScrollRef.current) {
      return;
    }

    element.scrollTop = element.scrollHeight;
  }, [messages, selectedPhone]);

  const selectedPhoneRef = useRef("");

  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  const loadLeads = useCallback(async () => {
    const data = await apiRequest("/admin/conversations?limit=100&offset=0");

    const conversations = getConversations(data);

    setLeads(conversations);

    setSelectedPhone((current) => {
      if (current && conversations.some((lead) => lead.phone === current)) {
        return current;
      }

      return conversations[0]?.phone || "";
    });
  }, []);

  // Initial loading of HYTOMA conversations
  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLeadsLoading(true);
      setLeadsError("");

      try {
        await loadLeads();
      } catch (err) {
        if (!cancelled) {
          setLeadsError(err.message || "Unable to load conversations.");
        }
      } finally {
        if (!cancelled) {
          setLeadsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [loadLeads]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.hidden) return;

      loadLeads().catch((error) => {
        console.error("Could not refresh conversation list:", error);
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [loadLeads]);

  const loadMessages = useCallback(async (phone) => {
    if (!phone) return;

    const data = await apiRequest(
      `/admin/leads/${encodeURIComponent(phone)}/messages`,
    );

    const list = getMessages(data);

    const sorted = [...list].sort((a, b) => {
      const first = new Date(a.created_at || 0).getTime();
      const second = new Date(b.created_at || 0).getTime();

      return first - second || (a.id || 0) - (b.id || 0);
    });

    return sorted;
  }, []);

  const checkReplyWindow = useCallback(async (phone) => {
    if (!phone) return null;

    const data = await apiRequest(
      `/admin/leads/${encodeURIComponent(phone)}/reply-window`,
    );

    if (typeof data.is_open !== "boolean") {
      throw new Error("Unexpected reply-window response from backend.");
    }

    return data;
  }, []);

  // Load delivery statuses for outgoing messages.
  // This must be at the top level of Inbox().

  const loadDeliveryStatuses = useCallback(async (phone) => {
    if (!phone) return {};

    const data = await apiRequest(
      `/admin/leads/${encodeURIComponent(phone)}/delivery-statuses`,
    );

    const result = {};

    for (const item of data.statuses || []) {
      if (item.whatsapp_message_id) {
        result[item.whatsapp_message_id] = item;
      }
    }

    console.log("HYTOMA Delivery Status Map:", result);

    return result;
  }, []);

  // Load WhatsApp conversation history.
  useEffect(() => {
    if (!selectedPhone) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    setMessages([]);
    setMessagesLoading(true);
    setMessagesError("");

    async function fetchConversation() {
      try {
        const result = await loadMessages(selectedPhone);

        if (!cancelled) {
          setMessages(result);
          setMessagesError("");
        }
      } catch (err) {
        if (!cancelled) {
          setMessagesError(err.message || "Unable to load conversation.");
        }
      } finally {
        if (!cancelled) {
          setMessagesLoading(false);
        }
      }
    }

    fetchConversation();

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchConversation();
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedPhone, loadMessages]);

  // Load and periodically refresh delivery statuses.
  // This is a separate useEffect, not nested inside another.
  useEffect(() => {
    if (!selectedPhone) {
      setDeliveryStatuses({});
      return;
    }

    let cancelled = false;

    setDeliveryStatuses({});

    async function refreshStatuses() {
      try {
        const result = await loadDeliveryStatuses(selectedPhone);

        if (!cancelled) {
          setDeliveryStatuses(result);
        }
      } catch (error) {
        console.error("Delivery status refresh failed:", error);
      }
    }

    refreshStatuses();

    const interval = setInterval(() => {
      if (!document.hidden) {
        refreshStatuses();
      }
    }, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedPhone, loadDeliveryStatuses]);

  useEffect(() => {
    if (!selectedPhone) {
      setReplyWindow(null);
      return;
    }

    let cancelled = false;

    setReplyText("");
    setReplyWindow(null);
    setReplyWindowLoading(true);
    setActionError("");
    setActionMessage("");

    async function loadWindow() {
      try {
        const result = await checkReplyWindow(selectedPhone);

        if (!cancelled) {
          setReplyWindow(result);
        }
      } catch (err) {
        if (!cancelled) {
          setReplyWindow(null);
          setActionError(err.message || "Unable to check reply window.");
        }
      } finally {
        if (!cancelled) {
          setReplyWindowLoading(false);
        }
      }
    }

    loadWindow();

    return () => {
      cancelled = true;
    };
  }, [selectedPhone, checkReplyWindow]);

  // Restore any unresolved WhatsApp send for this customer.
  useEffect(() => {
    const pending = getSavedPendingSend(selectedPhone);

    pendingRequestRef.current = pending;
    setSendUncertain(Boolean(pending));

    if (pending) {
      setActionError(
        "An earlier WhatsApp send needs verification. " +
          "Check its original request status before sending again.",
      );
    }
  }, [selectedPhone]);

  async function refreshInbox() {
    setRefreshing(true);
    setLeadsError("");
    setMessagesError("");

    try {
      await loadLeads();

      if (selectedPhone) {
        const refreshed = await loadMessages(selectedPhone);

        // If the selected customer is still in the
        // loaded list, show their refreshed messages.
        if (refreshed) setMessages(refreshed);
      }
    } catch (err) {
      setMessagesError(err.message || "Unable to refresh the inbox.");
    } finally {
      setRefreshing(false);
    }
  }

  async function sendAdminReply(event) {
    event.preventDefault();

    const phone = selectedPhone;
    const message = replyText.trim();

    if (!phone || !message || sendLock.current || sendUncertain) {
      return;
    }

    sendLock.current = true;
    setSending(true);
    setSendUncertain(false);
    setActionError("");
    setActionMessage("");

    const previousRequest = pendingRequestRef.current;

    const requestId =
      previousRequest?.phone === phone && previousRequest?.message === message
        ? previousRequest.requestId
        : crypto.randomUUID();

    pendingRequestRef.current = {
      requestId,
      phone,
      message,
    };

    let accepted = false;

    try {
      // Recheck the server immediately before sending.
      const windowData = await checkReplyWindow(phone);
      setReplyWindow(windowData);

      if (!windowData.is_open) {
        setActionError(
          "The 24-hour reply window is closed. " +
            "A free-form message cannot be sent.",
        );
        return;
      }

      const pending = {
        requestId,
        phone,
        message,
      };

      // Step 2: Save the request ID
      pendingRequestRef.current = pending;
      savePendingSend(pending);

      const result = await apiRequest(
        `/admin/leads/${encodeURIComponent(phone)}/reply-safe`,
        {
          method: "POST",
          body: JSON.stringify({
            request_id: requestId,
            message,
          }),
        },
      );

      if (result.status !== "accepted") {
        throw new Error(
          "The send result is uncertain. Check WhatsApp " +
            "and chat history before attempting another send.",
        );
      }

      accepted = true;

      // Meta accepted the original request.
      // No duplicate retry is needed.
      clearPendingSend(phone);
      pendingRequestRef.current = null;
      setSendUncertain(false);
      setReplyText("");

      setActionMessage(
        "WhatsApp accepted the reply. " +
          "The qualification bot has been paused.",
      );
    } catch (err) {
      setSendUncertain(true);
      setActionError(
        "Could not confirm the send result: " +
          (err.message || "Unknown error") +
          " Check the conversation and the customer's WhatsApp " +
          "before retrying to avoid duplicates.",
      );
    } finally {
      sendLock.current = false;
      setSending(false);
    }

    // Only refresh after a confirmed accepted response.
    // A refresh failure must not be mistaken for a send failure.
    if (accepted) {
      try {
        const [updatedMessages] = await Promise.all([
          loadMessages(phone),
          loadLeads(),
        ]);

        if (selectedPhoneRef.current === phone) {
          setMessages(updatedMessages);
        }
      } catch {
        setActionMessage(
          "Message accepted, but the inbox could not refresh. " +
            "Use Refresh Inbox to reload the conversation.",
        );
      }

      try {
        const updatedWindow = await checkReplyWindow(phone);
        setReplyWindow(updatedWindow);
      } catch {
        setReplyWindow(null);
      }
    }
  }

  
async function checkPendingSendStatus() {
  const phone = selectedPhone;

  const pending =
    getSavedPendingSend(phone) ||
    pendingRequestRef.current;

  if (!pending || checkingSend) {
    setActionError(
      "No original request ID is available. " +
      "Check the saved messages before sending again."
    );
    return;
  }

  setCheckingSend(true);
  setActionError("");
  setActionMessage("");

  let acceptedResult = null;

  try {
    const result = await apiRequest(
      `/admin/outbound-requests/${encodeURIComponent(
        pending.requestId
      )}`
    );

    if (
      result.phone !== pending.phone ||
      result.request_id !== pending.requestId
    ) {
      throw new Error(
        "The saved request does not match this customer."
      );
    }

    if (result.status !== "accepted") {
      setSendUncertain(true);
      setActionError(
        `Original request status: ${result.status}. ` +
        "Do not send the same message again until " +
        "its outcome is resolved."
      );

      return;
    }

    // The server has confirmed acceptance.
    acceptedResult = result;

    clearPendingSend(pending.phone);

    if (selectedPhoneRef.current === pending.phone) {
      pendingRequestRef.current = null;
      setSendUncertain(false);

      setReplyText((current) =>
        current.trim() === pending.message
          ? ""
          : current
      );

      setActionMessage(
        "Original WhatsApp request confirmed. " +
        (result.delivery_status
          ? `Delivery status: ${result.delivery_status}.`
          : "Delivery status is not available yet.")
      );
    }
  } catch (error) {
    setSendUncertain(true);

    setActionError(
      "Could not verify the original send: " +
      (error.message || "Unknown error") +
      ". Do not resend automatically."
    );
  } finally {
    setCheckingSend(false);
  }

  // Chat refresh is separate from send confirmation.
  // A refresh error must never make an accepted
  // WhatsApp send uncertain again.
  if (acceptedResult) {
    try {
      const [updatedMessages, updatedStatuses] =
        await Promise.all([
          loadMessages(pending.phone),
          loadDeliveryStatuses(pending.phone),
        ]);

      if (selectedPhoneRef.current === pending.phone) {
        setMessages(updatedMessages);
        setDeliveryStatuses(updatedStatuses);
      }

      await loadLeads();
    } catch (error) {
      console.error(
        "Accepted send confirmed, but inbox refresh failed:",
        error
      );

      if (selectedPhoneRef.current === pending.phone) {
        setActionMessage(
          "Message accepted. Use Refresh Inbox " +
          "if the chat history has not updated."
        );
      }
    }
  }
}


  async function toggleBot() {
    const phone = selectedPhone;

    const lead = leads.find((item) => item.phone === phone);

    if (!lead || botUpdating) return;

    const shouldPause = !Boolean(lead.bot_paused);

    setBotUpdating(true);
    setActionError("");
    setActionMessage("");

    try {
      await apiRequest(`/admin/leads/${encodeURIComponent(phone)}/bot`, {
        method: "PATCH",
        body: JSON.stringify({
          paused: shouldPause,
        }),
      });

      await loadLeads();

      setActionMessage(
        shouldPause
          ? "Qualification bot paused for this customer."
          : "Qualification bot resumed for future messages.",
      );
    } catch (err) {
      setActionError(err.message || "Unable to update bot status.");
    } finally {
      setBotUpdating(false);
    }
  }

  const selectedLead = leads.find((lead) => lead.phone === selectedPhone);

  const filteredLeads = leads.filter((lead) => {
    const text = [
      lead.phone,
      lead.project_status,
      lead.project_location,
      lead.assigned_salesperson,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return text.includes(search.trim().toLowerCase());
  });

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">WhatsApp Conversations</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live incoming and outgoing messages from HYTOMA
          </p>
        </div>

        <button
          type="button"
          onClick={refreshInbox}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl
            border border-slate-200 bg-white px-4 py-2.5
            text-sm font-medium hover:bg-slate-50
            disabled:opacity-50"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh Inbox
        </button>
      </div>

      <div
        className="grid w-full min-w-0 max-w-full overflow-hidden
  rounded-2xl border border-slate-200 bg-white
  lg:min-h-[650px] lg:grid-cols-[340px_minmax(0,1fr)]"
      >
        {/* LEFT — CUSTOMER CONVERSATION LIST */}
        <aside className={`${mobileChatOpen ? "hidden" : "block"} min-w-0 overflow-hidden border-b border-slate-200 lg:block lg:border-b-0 lg:border-r`}>
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Conversations</h3>
              <span
                className="rounded-full bg-emerald-50
                px-2.5 py-1 text-xs font-semibold text-emerald-700"
              >
                {leads.length}
              </span>
            </div>

            <div className="relative mt-4">
              <Search
                size={16}
                className="absolute left-3 top-3 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="w-full rounded-xl border border-slate-200
                  py-2.5 pl-9 pr-3 text-sm outline-none
                  focus:border-emerald-500"
              />
            </div>
          </div>

          {leadsError && (
            <div
              className="m-3 rounded-lg bg-red-50
              p-3 text-xs text-red-700"
            >
              {leadsError}
            </div>
          )}

          <div className="max-h-[570px] overflow-y-auto  disabled:cursor-wait">
            {leadsLoading && leads.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                Loading conversations...
              </p>
            ) : filteredLeads.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                No matching customers.
              </p>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  key={lead.phone}
                  disabled={sending}
                  type="button"
                  onClick={() => {
                    shouldAutoScrollRef.current = true;
                    setSelectedPhone(lead.phone);
                    setMobileChatOpen(true);
                  }}
                  className={`w-full border-b border-slate-100
                    px-4 py-4 text-left hover:bg-slate-50 ${
                      selectedPhone === lead.phone ? "bg-emerald-50" : ""
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0
                      items-center justify-center rounded-full
                      bg-slate-100"
                    >
                      <UserRound size={21} className="text-slate-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          +{lead.phone}
                        </p>

                        {lead.needs_admin_followup && (
                          <span
                            title="Needs admin follow-up"
                            className="mt-1 h-2.5 w-2.5
                              shrink-0 rounded-full bg-orange-500"
                          />
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {latestPreview(lead)}
                      </p>

                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {shortTime(lead.last_message_at)}
                        </span>

                        {lead.needs_admin_followup && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Follow-up
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div
            className="border-t border-slate-100 p-3
            text-xs text-slate-400"
          >
            Showing up to 100 customers
          </div>
        </aside>

        {/* CENTER — MESSAGES */}
        <section className={`${mobileChatOpen ? "flex" : "hidden"} h-[min(78dvh,900px)] min-h-[440px] min-w-0 max-w-full flex-col overflow-hidden lg:flex lg:h-auto lg:min-h-[650px]`}>
          {selectedLead ? (
            <>
              <div
                className="flex min-w-0 flex-col gap-3
                border-b border-slate-200 px-3 py-3 sm:px-5 sm:py-4 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileChatOpen(false)}
                    aria-label="Back to conversations"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div
                    className="flex h-10 w-10 items-center
                    justify-center rounded-full bg-emerald-50"
                  >
                    <UserRound size={20} className="text-emerald-700" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold sm:text-base">+{selectedLead.phone}</h3>
                    <p className="text-xs text-slate-500">
                      HYTOMA customer conversation
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                  <span
                    className="hidden rounded-full bg-slate-100
      px-3 py-1 text-xs text-slate-600 sm:block"
                  >
                    {formatLabel(selectedLead.status)}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full
      px-3 py-1.5 text-xs font-medium ${
        selectedLead.bot_paused
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
                  >
                    <Bot size={14} />
                    {selectedLead.bot_paused ? "Bot Paused" : "Bot Active"}
                  </span>

                  <button
                    type="button"
                    onClick={toggleBot}
                    disabled={botUpdating || sending}
                    className="inline-flex items-center gap-2 rounded-lg
      border border-slate-200 bg-white px-3 py-2
      text-xs font-semibold text-slate-700
      hover:bg-slate-50 disabled:opacity-50"
                  >
                    {selectedLead.bot_paused ? (
                      <>
                        <PlayCircle size={16} />
                        {botUpdating ? "Updating..." : "Resume Bot"}
                      </>
                    ) : (
                      <>
                        <PauseCircle size={16} />
                        {botUpdating ? "Updating..." : "Pause Bot"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                ref={chatScrollRef}
                onScroll={handleChatScroll}
                className="flex min-h-0 min-w-0 w-full flex-1 flex-col gap-3
                  overflow-x-hidden overflow-y-auto bg-[#efeae2]
                  p-3 sm:p-5 lg:max-h-[550px] lg:min-h-[480px]"
              >
                {messagesLoading ? (
                  <div
                    className="m-auto text-center
                    text-sm text-slate-500"
                  >
                    Loading messages...
                  </div>
                ) : messagesError ? (
                  <div
                    className="m-auto rounded-xl bg-red-50
                    p-4 text-sm text-red-700"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} />
                      {messagesError}
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="m-auto max-w-sm text-center">
                    <MessageCircle
                      size={38}
                      className="mx-auto text-slate-400"
                    />
                    <p className="mt-3 font-medium text-slate-700">
                      No stored messages
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      This customer has no messages in the current chat history.
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <MessageBubble
                      key={message.id || message.whatsapp_message_id || index}
                      message={message}
                      deliveryStatus={
                        deliveryStatuses[message.whatsapp_message_id] || null
                      }
                    />
                  ))
                )}
              </div>

              <div className="min-w-0 border-t border-slate-200 bg-white p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {replyWindowLoading ? (
                    <span className="text-xs text-slate-500">
                      Checking WhatsApp reply window...
                    </span>
                  ) : replyWindow?.is_open === true ? (
                    <span
                      className="inline-flex items-center gap-2 rounded-full
          bg-emerald-50 px-3 py-1.5 text-xs
          font-medium text-emerald-700"
                    >
                      <Clock3 size={14} />
                      24-hour reply window open
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-2 rounded-full
          bg-amber-50 px-3 py-1.5 text-xs
          font-medium text-amber-800"
                    >
                      <LockKeyhole size={14} />
                      {replyWindow?.is_open === false
                        ? "24-hour reply window closed"
                        : "Reply window unavailable"}
                    </span>
                  )}

                  {selectedLead.bot_paused && (
                    <span
                      className="rounded-full bg-slate-100
        px-3 py-1.5 text-xs text-slate-600"
                    >
                      Admin takeover active
                    </span>
                  )}
                </div>

                {actionMessage && (
                  <div
                    role="status"
                    className="mb-3 rounded-lg border border-emerald-200
        bg-emerald-50 p-3 text-sm text-emerald-700"
                  >
                    {actionMessage}
                  </div>
                )}

                {actionError && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg border border-red-200
        bg-red-50 p-3 text-sm text-red-700"
                  >
                    {actionError}
                  </div>
                )}

                {sendUncertain && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-medium text-amber-800">
                      The WhatsApp send result could not be confirmed.
                    </p>

                    <p className="mt-1 text-xs text-amber-700">
                      Sending is disabled to prevent duplicates. Check the
                      original request before continuing.
                    </p>

                    <button
                      type="button"
                      onClick={checkPendingSendStatus}
                      disabled={checkingSend || !pendingRequestRef.current}
                      className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                    >
                      {checkingSend ? "Checking..." : "Check Send Status"}
                    </button>
                  </div>
                )}

                <form onSubmit={sendAdminReply} className="flex min-w-0 gap-2">
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                      ) {
                        event.preventDefault();

                        if (
                          !sending &&
                          !sendLock.current &&
                          replyWindow?.is_open === true &&
                          replyText.trim()
                        ) {
                          event.currentTarget.form?.requestSubmit();
                        }
                      }
                    }}
                    placeholder={
                      replyWindow?.is_open
                        ? "Type a WhatsApp message..."
                        : "Cannot send a free-form message"
                    }
                    disabled={
                      sending ||
                      sendUncertain ||
                      replyWindowLoading ||
                      replyWindow?.is_open !== true
                    }
                    maxLength={4096}
                    rows={2}
                    className="min-w-0 flex-1 resize-none rounded-xl
    border border-slate-200 bg-white px-4 py-3
    text-sm outline-none focus:border-emerald-500
    disabled:bg-slate-50 disabled:text-slate-400"
                  />

                  <button
                    type="submit"
                    aria-label="Send WhatsApp message"
                    disabled={
                      sending ||
                      sendUncertain ||
                      replyWindowLoading ||
                      replyWindow?.is_open !== true ||
                      !replyText.trim()
                    }
                    className="flex shrink-0 items-center justify-center
        rounded-xl bg-emerald-600 px-4 text-white sm:px-5
        hover:bg-emerald-700 disabled:cursor-not-allowed
        disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {sending ? (
                      <span className="text-xs">Sending...</span>
                    ) : (
                      <Send size={19} />
                    )}
                  </button>
                </form>

                <p className="mt-2 text-xs text-slate-400">
                  Admin replies are sent through HYTOMA's official WhatsApp
                  Cloud API.
                </p>
              </div>
            </>
          ) : (
            <div
              className="flex flex-1 flex-col items-center
              justify-center p-8 text-center"
            >
              <MessageCircle size={48} className="text-slate-300" />
              <h3 className="mt-4 font-semibold">Select a conversation</h3>
              <p className="mt-2 text-sm text-slate-500">
                Choose a customer from the left panel.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
