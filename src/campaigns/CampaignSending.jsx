import { useEffect, useRef, useState } from "react";

import {
  Send,
  Pause,
  Play,
  Square,
  RefreshCw,
  ShieldCheck,
  CalendarClock,
} from "lucide-react";

import { apiRequest } from "../api";

const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50";

export default function CampaignSending({
  campaignId,
  ready,
  disabled,
  onStatusChange,
  onBusyChange,
}) {
  const path = "/admin/campaigns/" + campaignId;

  const [progress, setProgress] = useState(null);
  const [fresh, setFresh] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState("");
  const [revision, setRevision] = useState(0);

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    let timer;

    async function load() {
      try {
        const result = await apiRequest(
          path + "/progress",
          {
            cache: "no-store",
          }
        );

        if (!active || lock.current) return;

        setProgress(result);
        setLastUpdated(new Date());
        setFresh(true);
        setPollError("");

        onStatusChange(campaignId, result.status);

      } catch (err) {
        if (active) {
          setFresh(false);
          setPollError(err.message);
        }
      } finally {
        if (active) {
          setRefreshing(false);
          timer = setTimeout(load, 3000);
        }
      }
    }

    load();

    return () => {
      active = false;
      clearTimeout(timer);
    };

  }, [path, campaignId, revision, onStatusChange]);

  const status = progress?.status;

  const total = progress?.total || 0;

  const counts = progress?.counts || {};

  const pending = counts.pending || 0;
  const sending = counts.sending || 0;

  const processed = Math.max(
    0,
    total - pending - sending
  );

  const percent = total
    ? Math.round((processed * 100) / total)
    : 0;

  const blocked = disabled || busy || !fresh;

  const mode = progress?.mode || "pilot";

  const isProduction = mode === "production";

  const maxRecipients =
    progress?.max_recipients ?? 10;

  const sendingEnabled =
    progress?.sending_enabled ??
    progress?.pilot_enabled;

  const launchReady =
    ready &&
    total > 0 &&
    total <= maxRecipients &&
    confirmed &&
    sendingEnabled;

  useEffect(() => {
    setConfirmed(false);
  }, [campaignId, mode, total]);

  const scheduleAt =
    scheduleDate && scheduleTime
      ? new Date(
          scheduleDate +
            "T" +
            scheduleTime +
            ":00+05:30"
        )
      : null;

  const scheduleReady =
    launchReady &&
    scheduleAt &&
    Number.isFinite(scheduleAt.getTime()) &&
    scheduleAt.getTime() > Date.now() + 60000 &&
    scheduleAt.getTime() <=
      Date.now() + 7 * 86400000;

  async function action(name) {
    if (lock.current || blocked) return;

    if (
      name === "launch" &&
      (status !== "draft" || !launchReady)
    ) {
      return;
    }

    if (
      name === "schedule" &&
      (
        !["draft", "scheduled"].includes(status) ||
        !scheduleReady
      )
    ) {
      return;
    }

    if (
      name === "unschedule" &&
      status !== "scheduled"
    ) {
      return;
    }

    if (
      name === "pause" &&
      status !== "running"
    ) {
      return;
    }

    if (
      name === "resume" &&
      (status !== "paused" || !sendingEnabled)
    ) {
      return;
    }

    if (
      name === "cancel" &&
      ![
        "draft",
        "scheduled",
        "running",
        "paused",
      ].includes(status)
    ) {
      return;
    }

    const prompts = {
      launch:
        "Launch real WhatsApp messages to " +
        total +
        " opted-in recipients in " +
        mode +
        " mode?",

      schedule:
        "Schedule real WhatsApp messages to " +
        total +
        " opted-in recipients in " +
        mode +
        " mode at " +
        scheduleDate +
        " " +
        scheduleTime +
        " IST?",

      unschedule:
        "Remove the schedule and return this campaign to draft?",

      pause:
        "Pause this campaign? An in-flight message may still complete.",

      resume:
        "Resume sending remaining pending messages? Rejected or unknown attempts will not be retried.",

      cancel:
        "Cancel this campaign permanently? Messages already submitted cannot be recalled.",
    };

    if (!window.confirm(prompts[name])) return;

    lock.current = true;

    setBusy(true);
    onBusyChange(true);
    setError("");
    setFresh(false);
    setConfirmed(false);

    try {
      const options = {
        method: "POST",
      };

      if (name === "schedule") {
        options.body = JSON.stringify({
          confirmed: true,
          expected_recipients: total,
          scheduled_at: scheduleAt.toISOString(),
          mode,
        });

      } else if (name === "launch") {
        options.body = JSON.stringify({
          confirmed: true,
          expected_recipients: total,
          mode,
        });

      } else if (name !== "pause") {
        options.body = JSON.stringify({
          confirmed: true,
        });
      }

      const result = await apiRequest(
        path + "/" + name,
        options
      );

      onStatusChange(campaignId, result.status);

      setProgress((prev) => ({
        ...prev,
        status: result.status,
      }));

    } catch (err) {
      setError(
        err.message +
          " — check refreshed status before trying again."
      );

    } finally {
      lock.current = false;
      setBusy(false);
      onBusyChange(false);
      setRevision((n) => n + 1);
    }
  }

  const statusColors = {
    draft: "bg-slate-100 text-slate-700",
    scheduled: "bg-amber-100 text-amber-700",
    running: "bg-blue-100 text-blue-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">

      {/* Heading */}

      <div className="flex flex-wrap items-center justify-between gap-2">

        <h4 className="flex items-center gap-2 font-semibold">
          <Send size={18} />
          Campaign Sending
        </h4>

        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold capitalize " +
            (
              statusColors[status] ||
              "bg-slate-100 text-slate-700"
            )
          }
        >
          {status || "Loading"}
        </span>

      </div>

      {/* Mode Information */}

      <div className="flex flex-wrap items-center gap-2">

        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (
              isProduction
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-100 text-blue-700"
            )
          }
        >
          {isProduction ? "Production Mode" : "Pilot Mode"}
        </span>

        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold " +
            (
              sendingEnabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )
          }
        >
          {sendingEnabled
            ? "Sending Enabled"
            : "Sending Disabled"}
        </span>

      </div>

      <p className="text-xs text-slate-500">

        Maximum {maxRecipients} recipients per campaign.
        Only opted-in contacts can receive messages.

      </p>

      {/* Errors */}

      {pollError && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          Progress unavailable: {pollError}.
          Controls are disabled until refreshed.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {progress && (
        <>

          {/* Production Limits */}

          {isProduction && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">

              <h5 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <ShieldCheck size={17} />
                Production Sending Limits
              </h5>

              <p className="text-sm text-amber-800">
                Production mode sends real marketing messages.
              </p>

              <div className="flex items-center justify-between text-sm text-amber-800">

                <span>Remaining campaign attempts (24 hours)</span>

                <strong>
                  {progress.daily_remaining ?? "—"}
                </strong>

              </div>

              <p className="text-xs text-amber-700">
                When the rolling limit is exhausted,
                the queue waits until capacity returns.
                Recently targeted contacts are skipped.
              </p>

            </div>
          )}

          {/* Progress Cards */}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">

            {[
              ["Total", total],
              ["Accepted", counts.accepted || 0],
              ["Pending", pending],
              ["Sending", sending],
              ["Rejected", counts.rejected || 0],
              ["Skipped", counts.skipped || 0],
              ["Unknown", counts.unknown || 0],
              ["Cancelled", counts.cancelled || 0],
            ].map(([label, value]) => (

              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >

                <p className="text-xs text-slate-500">
                  {label}
                </p>

                <p
                  className={
                    "mt-1 text-xl font-bold " +
                    (
                      label === "Accepted"
                        ? "text-emerald-700"
                        : label === "Rejected" ||
                          label === "Unknown"
                        ? "text-red-700"
                        : "text-slate-900"
                    )
                  }
                >
                  {value}
                </p>

              </div>

            ))}

          </div>

          {/* Progress Bar */}

          <div className="space-y-2">

            <div className="flex justify-between text-sm font-medium">

              <span>
                Processed {processed} / {total}
              </span>

              <span>{percent}%</span>

            </div>

            <div
              role="progressbar"
              aria-label="Recipients processed"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2.5 overflow-hidden rounded-full bg-slate-200"
            >

              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{
                  width: percent + "%",
                }}
              />

            </div>

            <p className="text-xs text-slate-500">

              Accepted means Meta accepted the request,
              not confirmed delivery.
              Processed includes rejected, skipped,
              unknown and cancelled recipients.

            </p>

          </div>

          {/* Scheduled Time */}

          {progress.scheduled_at && (

            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">

              Scheduled start:{" "}

              {new Date(
                progress.scheduled_at
              ).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
              })}

              {" "}IST

            </p>

          )}

          {/* Draft and Scheduled Controls */}

          {["draft", "scheduled"].includes(status) && (
            <>

              {!sendingEnabled && (

                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">

                  Sending is disabled for this mode.
                  Check the Railway environment variables.

                </p>

              )}

              {!ready && (

                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">

                  Save the required media and
                  template variables first.

                </p>

              )}

              {total > maxRecipients && (

                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">

                  This draft exceeds the{" "}
                  {maxRecipients}-recipient limit.

                </p>

              )}

              {/* Consent Confirmation */}

              <label className="flex items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm">

                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={
                    blocked ||
                    !ready ||
                    !total ||
                    total > maxRecipients
                  }
                  onChange={(e) =>
                    setConfirmed(e.target.checked)
                  }
                  className="mt-1 accent-emerald-700"
                />

                {isProduction
                  ? "I confirm all selected contacts have given permission to receive HYTOMA marketing messages."
                  : "I have verified the saved audience and all recipients are authorized, opted-in test contacts."}

              </label>

              {/* Send Now */}

              {status === "draft" && (

                <div className="space-y-3 rounded-xl border border-slate-200 p-4">

                  <h5 className="flex items-center gap-2 font-semibold">

                    <Send
                      size={19}
                      className="text-emerald-700"
                    />

                    Send Now

                  </h5>

                  <p className="text-sm text-slate-500">

                    Start sending immediately
                    after final confirmation.

                  </p>

                  <button
                    type="button"
                    disabled={blocked || !launchReady}
                    onClick={() => action("launch")}
                    className={primaryButton}
                  >

                    <Send size={16} />

                    Send Now

                  </button>

                </div>

              )}

              {/* Schedule Campaign */}

              <div className="space-y-3 rounded-xl border border-slate-200 p-4">

                <h5 className="flex items-center gap-2 font-semibold">

                  <CalendarClock
                    size={19}
                    className="text-emerald-700"
                  />

                  Schedule Campaign

                </h5>

                <p className="text-sm text-slate-500">

                  Automatically start processing
                  at the selected date and time.

                </p>

                <div className="grid grid-cols-2 gap-3">

                  <label className="text-sm font-medium">

                    Date (IST)

                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) =>
                        setScheduleDate(e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                    />

                  </label>

                  <label className="text-sm font-medium">

                    Time (IST)

                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) =>
                        setScheduleTime(e.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 text-sm"
                    />

                  </label>

                </div>

                <p className="text-xs text-slate-500">

                  Timezone: Asia/Kolkata.
                  Choose a time between 1 minute
                  and 7 days ahead.
                  Missed schedules more than
                  15 minutes late return to draft.

                </p>

                <button
                  type="button"
                  className={primaryButton}
                  disabled={blocked || !scheduleReady}
                  onClick={() => action("schedule")}
                >

                  <CalendarClock size={16} />

                  {status === "scheduled"
                    ? "Reschedule Campaign"
                    : "Schedule Campaign"}

                </button>

              </div>

            </>
          )}

          {/* Unknown Warning */}

          {!!counts.unknown && (

            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">

              Some send outcomes are unknown.
              Verify separately; do not resend
              those messages.

            </p>

          )}

          {/* Campaign Controls */}

          <div className="flex flex-wrap gap-2">

            {status === "scheduled" && (

              <button
                type="button"
                disabled={blocked}
                onClick={() => action("unschedule")}
                className={button}
              >
                Remove Schedule
              </button>

            )}

            {status === "running" && (

              <button
                type="button"
                disabled={blocked}
                onClick={() => action("pause")}
                className={button}
              >

                <Pause size={16} />

                Pause

              </button>

            )}

            {status === "paused" && (

              <button
                type="button"
                disabled={
                  blocked || !sendingEnabled
                }
                onClick={() => action("resume")}
                className={button}
              >

                <Play size={16} />

                Resume

              </button>

            )}

            {[
              "draft",
              "scheduled",
              "running",
              "paused",
            ].includes(status) && (

              <button
                type="button"
                disabled={blocked}
                onClick={() => action("cancel")}
                className={button + " text-red-700"}
              >

                <Square size={16} />

                Cancel Campaign

              </button>

            )}

            {/* Refresh */}

            <button
              type="button"
              disabled={busy || refreshing}
              onClick={() => {
                setRefreshing(true);
                setFresh(false);
                setRevision((n) => n + 1);
              }}
              className={button}
            >

              <RefreshCw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              {refreshing ? "Refreshing..." : "Refresh"}

            </button>

          </div>

        </>
      )}

      {/* Last Updated */}

      {lastUpdated && (

        <p className="text-xs text-slate-500">

          Last updated:{" "}

          {lastUpdated.toLocaleTimeString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}

          {" "}IST

        </p>

      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">

        <ShieldCheck size={15} />

        {busy
          ? "Submitting action..."
          : "Progress refreshes every 3 seconds. Backend safety restrictions remain active."}

      </p>

    </section>
  );
}