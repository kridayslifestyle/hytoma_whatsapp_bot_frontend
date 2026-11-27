import { useEffect, useState } from "react";

import {
  BarChart3,
  RefreshCw,
  CheckCheck,
} from "lucide-react";

import { apiRequest } from "../api";

const PAGE_SIZE = 25;

const statuses = [
  "all",
  "pending",
  "sending",
  "accepted",
  "sent",
  "delivered",
  "read",
  "failed",
  "rejected",
  "skipped",
  "unknown",
  "cancelled",
];

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50";

const badgeColor = {
  read: "bg-blue-100 text-blue-700",
  delivered: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  unknown: "bg-amber-100 text-amber-800",
};

export default function CampaignReport({
  campaignId,
}) {
  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let timer;

    setReport(null);
    setError("");

    async function load() {
      try {
        const params = new URLSearchParams({
          status,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });

        const result = await apiRequest(
          "/admin/campaigns/" +
            campaignId +
            "/report?" +
            params
        );

        if (active) {
          setReport(result);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(err.message);
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
  }, [campaignId, status, page, revision]);

  const s = report?.summary;

  const pages = Math.max(
    1,
    Math.ceil(
      (report?.filtered_total || 0) / PAGE_SIZE
    )
  );

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 p-4">

      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-semibold">
          <BarChart3 size={20} />
          Campaign Performance
        </h4>

        <button
          type="button"
          className={btn}
          onClick={() => setRevision((n) => n + 1)}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Error and loading states */}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          Report refresh failed: {error}
        </p>
      )}

      {!s && !error && (
        <p className="text-sm text-slate-500">
          Loading report...
        </p>
      )}

      {s && (
        <>
          {/* Performance cards */}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Recipients", s.total],
              ["Accepted", s.accepted],
              ["Sent", s.sent],
              ["Delivered", s.delivered],
              ["Read", s.read],
              ["Failed", s.failed],
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
                    "mt-1 text-2xl font-bold " +
                    (label === "Failed"
                      ? "text-red-700"
                      : label === "Delivered"
                      ? "text-emerald-700"
                      : label === "Read"
                      ? "text-blue-700"
                      : "text-slate-900")
                  }
                >
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Delivery and read rate */}

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              [
                "Delivery rate",
                s.delivery_rate,
                "Delivered / Accepted",
                "bg-emerald-600",
                s.accepted,
              ],
              [
                "Read rate",
                s.read_rate,
                "Read / Delivered",
                "bg-blue-600",
                s.delivered,
              ],
            ].map(
              ([
                label,
                value,
                caption,
                color,
                denominator,
              ]) => (
                <div
                  key={label}
                  className="space-y-2 rounded-lg border border-slate-200 p-3"
                >
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{label}</span>

                    <span>
                      {denominator
                        ? value + "%"
                        : "—"}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={
                        "h-full rounded-full " +
                        color
                      }
                      style={{
                        width: value + "%",
                      }}
                    />
                  </div>

                  <p className="text-xs text-slate-500">
                    {caption}
                  </p>
                </div>
              )
            )}
          </div>

          <p className="text-xs text-slate-500">
            Sent includes delivered and read.
            Delivered includes read. Failed means
            Meta reported a delivery failure;
            rejected and skipped are separate
            queue outcomes.
          </p>
        </>
      )}

      {/* Contact report header and filter */}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="font-semibold">
          Individual Recipients
        </h5>

        <select
          aria-label="Filter recipient status"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(0);
          }}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value === "all"
                ? "All statuses"
                : value.charAt(0).toUpperCase() +
                  value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {report && (
        <>
          {/* Recipient table */}

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {[
                    "Contact",
                    "Status",
                    "Attempted At",
                    "Status Updated",
                    "Error",
                  ].map((header) => (
                    <th
                      key={header}
                      className="p-3"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {!report.recipients.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-5 text-center text-slate-500"
                    >
                      No matching recipients.
                    </td>
                  </tr>
                )}

                {report.recipients.map((row) => (
                  <tr
                    key={row.contact_id}
                    className="border-t border-slate-100"
                  >
                    <td className="p-3">
                      <p className="font-medium">
                        {row.name ||
                          "Unnamed contact"}
                      </p>

                      <p className="text-xs text-slate-500">
                        +{row.phone}
                      </p>
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize " +
                          (badgeColor[row.status] ||
                            "bg-slate-100 text-slate-700")
                        }
                      >
                        {[
                          "delivered",
                          "read",
                        ].includes(row.status) && (
                          <CheckCheck size={14} />
                        )}

                        {row.status}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {row.attempted_at
                        ? new Date(
                            row.attempted_at
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {row.status_timestamp
                        ? new Date(
                            row.status_timestamp
                          ).toLocaleString()
                        : "—"}
                    </td>

                    <td className="p-3 text-xs text-slate-600 break-words">
                      {[
                        row.error_code,
                        row.error,
                      ]
                        .filter(Boolean)
                        .join(": ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}

          <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <span className="mr-auto text-slate-500">
              {report.filtered_total} matching recipients
            </span>

            <button
              type="button"
              className={btn}
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>

            <span>
              {page + 1} / {pages}
            </span>

            <button
              type="button"
              className={btn}
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Auto refresh info */}

      <p className="text-xs text-slate-500">
        Updates every 5 seconds while open.
        Delivery and read confirmations depend
        on Meta webhook events.
      </p>
    </section>
  );
}