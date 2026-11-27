import { useEffect, useRef, useState } from "react";
import {
  Send,
  Pause,
  Play,
  Square,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { apiRequest } from "../api";

const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50";

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

  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    let timer;

    async function load() {
      try {
        const result = await apiRequest(
          path + "/progress"
        );

        if (!active || lock.current) return;

        setProgress(result);
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

  const launchReady =
    ready &&
    total > 0 &&
    total <= 10 &&
    confirmed;

  async function action(name) {
    if (lock.current || blocked) return;

    if (
      name === "launch" &&
      (status !== "draft" || !launchReady)
    ) return;

    if (
      name === "pause" &&
      status !== "running"
    ) return;

    if (
      name === "resume" &&
      status !== "paused"
    ) return;

    if (
      name === "cancel" &&
      !["draft", "running", "paused"].includes(status)
    ) return;

    const prompts = {
      launch:
        "Launch real WhatsApp messages to " +
        total +
        " authorized pilot recipients?",

      pause:
        "Pause this campaign? An in-flight message may still complete.",

      resume:
        "Resume sending remaining pending messages to authorized recipients? Rejected or unknown attempts will not be retried.",

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
      const options = { method: "POST" };

      if (name !== "pause") {
        options.body = JSON.stringify(
          name === "launch"
            ? {
                confirmed: true,
                expected_recipients: total,
              }
            : {
                confirmed: true,
              }
        );
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

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">
      {/* Section heading */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold">
          <Send size={18} />
          Campaign Sending
        </h4>

        <span
          className={
            "rounded-full px-3 py-1 text-xs font-semibold capitalize " +
            (status === "completed"
              ? "bg-emerald-100 text-emerald-700"
              : status === "running"
              ? "bg-blue-100 text-blue-700"
              : status === "paused"
              ? "bg-amber-100 text-amber-700"
              : status === "cancelled"
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-700")
          }
        >
          {status || "Loading"}
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Pilot mode · Maximum 10 authorized test recipients.
        Only opted-in contacts can receive messages.
      </p>

      {/* Errors */}

      {pollError && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800"
        >
          Progress unavailable: {pollError}. Controls
          are disabled until refreshed.
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
          {/* Statistics */}

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
                    (label === "Accepted"
                      ? "text-emerald-700"
                      : label === "Rejected" ||
                        label === "Unknown"
                      ? "text-red-700"
                      : "text-slate-900")
                  }
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Progress bar */}

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
                style={{ width: percent + "%" }}
              />
            </div>

            <p className="text-xs text-slate-500">
              Accepted means Meta accepted the request,
              not confirmed delivery. Processed includes
              rejected, skipped, unknown and cancelled
              recipients.
            </p>
          </div>

          {/* Launch confirmation */}

          {status === "draft" && (
            <>
              {!ready && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Save the required media and template
                  variables first.
                </p>
              )}

              {total > 10 && (
                <p className="text-sm text-red-700">
                  This draft exceeds the 10-recipient
                  pilot limit.
                </p>
              )}

              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={
                    blocked ||
                    !ready ||
                    !total ||
                    total > 10
                  }
                  onChange={(e) =>
                    setConfirmed(e.target.checked)
                  }
                  className="mt-1 accent-emerald-700"
                />

                <span>
                  I have verified the saved audience
                  and all recipients are authorized,
                  opted-in test contacts.
                </span>
              </label>
            </>
          )}

          {!!counts.unknown && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              Some send outcomes are unknown.
              Verify separately; do not resend those messages.
            </p>
          )}

          {/* Campaign actions */}

          <div className="flex flex-wrap gap-2">
            {status === "draft" && (
              <button
                type="button"
                disabled={blocked || !launchReady}
                onClick={() => action("launch")}
                className={
                  button +
                  " border-emerald-700 bg-emerald-700 text-white"
                }
              >
                <Send size={16} />
                Launch Campaign
              </button>
            )}

            {status === "running" && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => action("pause")}
                className={
                  button +
                  " bg-amber-50 text-amber-700"
                }
              >
                <Pause size={16} />
                Pause
              </button>
            )}

            {status === "paused" && (
              <button
                type="button"
                disabled={blocked}
                onClick={() => action("resume")}
                className={
                  button +
                  " bg-emerald-700 text-white"
                }
              >
                <Play size={16} />
                Resume
              </button>
            )}

            {["draft", "running", "paused"].includes(
              status
            ) && (
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

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setFresh(false);
                setRevision((n) => n + 1);
              }}
              className={button}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </>
      )}

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={15} />

        {busy
          ? "Submitting action..."
          : "Progress refreshes every 3 seconds. Railway pilot restrictions remain active."}
      </p>
    </section>
  );
}