import { useEffect, useState } from "react";

import {
  RefreshCw,
  Users,
  ContactRound,
  Megaphone,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";

import { apiRequest } from "./api";

const panel =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

const control =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:opacity-50";

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN");

const pct = (n, d) =>
  d ? (100 * n / d).toFixed(1) + "%" : "—";


// =====================================================
// DATE HELPERS
// =====================================================

function todayIST() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );

  return (
    parts.year +
    "-" +
    parts.month +
    "-" +
    parts.day
  );
}

function daysAgo(day, n) {
  const d = new Date(day + "T00:00:00Z");

  d.setUTCDate(d.getUTCDate() - n);

  return d.toISOString().slice(0, 10);
}


// =====================================================
// STAT CARD
// =====================================================

function Metric({
  label,
  value,
  caption,
  icon: Icon,
}) {
  return (
    <div className={panel}>

      <div className="flex justify-between gap-2 text-sm text-slate-500">
        {label}

        {Icon && (
          <Icon
            size={18}
            className="text-emerald-700"
          />
        )}
      </div>

      <p className="mt-3 text-3xl font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {caption}
      </p>

    </div>
  );
}


// =====================================================
// PERFORMANCE CHART
// =====================================================

function Trend({
  rows,
  series,
  title,
  description,
}) {
  const width = 720;
  const height = 205;

  const x0 = 38;
  const y0 = 12;
  const bottom = 170;

  const max = Math.max(
    1,
    ...rows.flatMap((r) =>
      series.map((s) =>
        Number(r[s.key]) || 0
      )
    )
  );

  const x = (i) =>
    rows.length === 1
      ? width / 2
      : x0 +
        i *
          (width - x0 - 14) /
          (rows.length - 1);

  const y = (v) =>
    bottom -
    (Number(v) || 0) /
      max *
      (bottom - y0);

  const ticks = Array.from(
    new Set([
      0,
      Math.floor((rows.length - 1) / 4),
      Math.floor((rows.length - 1) / 2),
      Math.floor((rows.length - 1) * 3 / 4),
      rows.length - 1,
    ])
  ).filter((i) => i >= 0);

  return (
    <section className={panel}>

      <h3 className="font-semibold">
        {title}
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>

      {/* Chart legend */}

      <div className="my-3 flex flex-wrap gap-4 text-xs">
        {series.map((s) => (
          <span
            key={s.key}
            className="flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: s.color }}
            />

            {s.label}
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={title}
      >

        {[0, 0.5, 1].map((v) => (
          <g key={v}>

            <line
              x1={x0}
              x2={width - 14}
              y1={y(max * v)}
              y2={y(max * v)}
              stroke="#e2e8f0"
            />

            <text
              x={x0 - 5}
              y={y(max * v) + 4}
              textAnchor="end"
              fontSize="11"
              fill="#64748b"
            >
              {Math.round(max * v)}
            </text>

          </g>
        ))}

        {ticks.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={193}
            fontSize="10"
            fill="#64748b"
            textAnchor={
              i === 0
                ? "start"
                : i === rows.length - 1
                  ? "end"
                  : "middle"
            }
          >
            {rows[i]?.day.slice(5)}
          </text>
        ))}

        {series.map((s) => (
          <g key={s.key}>

            <polyline
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              points={rows
                .map(
                  (r, i) =>
                    x(i) + "," + y(r[s.key])
                )
                .join(" ")}
            />

            {rows.length <= 31 &&
              rows.map((r, i) => (
                <circle
                  key={r.day}
                  cx={x(i)}
                  cy={y(r[s.key])}
                  r="2.8"
                  fill={s.color}
                >
                  <title>
                    {r.day}: {s.label} {r[s.key]}
                  </title>
                </circle>
              ))}

          </g>
        ))}

      </svg>

      <details className="text-xs text-slate-500">

        <summary className="cursor-pointer">
          Daily values
        </summary>

        <div className="mt-2 max-h-48 overflow-auto">

          <table className="w-full text-left">

            <thead>
              <tr>
                <th>Date</th>

                {series.map((s) => (
                  <th key={s.key}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td>{r.day}</td>

                  {series.map((s) => (
                    <td key={s.key}>
                      {fmt(r[s.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

          </table>

        </div>
      </details>

    </section>
  );
}


// =====================================================
// OVERVIEW DASHBOARD COMPONENT
// =====================================================

export default function OverviewDashboard({
  navigate,
}) {
  const [range, setRange] = useState(() => {
    const today = todayIST();

    return {
      start: daysAgo(today, 29),
      end: today,
    };
  });

  const [draft, setDraft] = useState(range);

  const [revision, setRevision] = useState(0);

  const [data, setData] = useState(null);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);


  // LOAD REAL ANALYTICS

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setData(null);

    apiRequest(
      "/admin/overview?" +
        new URLSearchParams(range)
    )
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };

  }, [range, revision]);


  // DATE RANGE SHORTCUTS

  function preset(n) {
    const end = todayIST();

    const next = {
      start: daysAgo(end, n - 1),
      end,
    };

    setDraft(next);
    setRange(next);
  }


  const l = data?.leads;
  const c = data?.contacts;
  const m = data?.marketing;
  const k = data?.campaigns;
  const u = data?.unread;


  return (
    <div className="space-y-5">

      {/* HEADER */}

      <header className="flex flex-wrap items-center justify-between gap-3">

        <div>
          <h2 className="text-2xl font-bold">
            Business Overview
          </h2>

          <p className="text-sm text-slate-500">
            Live CRM and marketing analytics · India Standard Time
          </p>
        </div>

        <button
          className={control + " flex items-center gap-2"}
          disabled={loading}
          onClick={() =>
            setRevision((v) => v + 1)
          }
        >
          <RefreshCw size={16} />

          {loading
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </header>


      {/* DATE FILTERS */}

      <form
        className={panel + " flex flex-wrap items-end gap-3"}
        onSubmit={(e) => {
          e.preventDefault();

          setRange({ ...draft });
        }}
      >

        {[1, 7, 30, 90].map((n) => (
          <button
            type="button"
            key={n}
            className={control}
            onClick={() => preset(n)}
          >
            {n === 1
              ? "Today"
              : n + " days"}
          </button>
        ))}

        <label className="text-xs text-slate-500">
          From

          <input
            required
            type="date"
            className={control + " block"}
            max={draft.end}
            value={draft.start}
            onChange={(e) =>
              setDraft((v) => ({
                ...v,
                start: e.target.value,
              }))
            }
          />
        </label>

        <label className="text-xs text-slate-500">
          To

          <input
            required
            type="date"
            className={control + " block"}
            min={draft.start}
            max={todayIST()}
            value={draft.end}
            onChange={(e) =>
              setDraft((v) => ({
                ...v,
                end: e.target.value,
              }))
            }
          />
        </label>

        <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">
          Apply dates
        </button>

      </form>


      {/* ERROR AND LOADING */}

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-red-700"
        >
          {error}
        </p>
      )}

      {loading && (
        <p className="p-5 text-slate-500">
          Loading analytics...
        </p>
      )}


      {data && (
        <>

          {/* PRIMARY STATISTICS */}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">

            <Metric
              label="New Leads"
              value={fmt(l.total)}
              caption="Created in selected period"
              icon={Users}
            />

            <Metric
              label="Active Contacts"
              value={fmt(c.active)}
              caption={fmt(c.added) + " added in period"}
              icon={ContactRound}
            />

            <Metric
              label="Campaigns Created"
              value={fmt(k.campaigns_created)}
              caption={
                fmt(k.completed) +
                " currently completed"
              }
              icon={Megaphone}
            />

            <Metric
              label="Unread Marketing Replies"
              value={fmt(u.unread_messages)}
              caption={
                fmt(u.unread_conversations) +
                " conversations · current"
              }
              icon={MessageCircle}
            />

          </div>


          {/* LEAD PIPELINE */}

          <section className={panel}>

            <h3 className="font-semibold">
              Lead Pipeline
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Current statuses of leads created during the selected period
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">

              {[
                ["Screening Completed", l.completed],
                ["Deferred", l.deferred],
                ["Needs Follow-up", l.followups],
                ["Assigned", l.assigned],
                ["Visit Scheduled", l.visits],
                ["Marked Closed", l.closed],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-slate-50 p-3"
                >

                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {fmt(value)}
                  </p>

                </div>
              ))}

            </div>

            <p className="mt-3 text-xs text-slate-500">
              Screening completion:{" "}
              {pct(l.completed, l.total)}

              {" · "}

              Marked closed:{" "}
              {pct(l.closed, l.total)}

              {" (not verified sales revenue)."}
            </p>
          </section>


          {/* MARKETING PERFORMANCE */}

          <section className={panel}>

            <h3 className="font-semibold">
              Campaign Delivery Performance
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Recipient attempts in the selected date range and their latest delivery and reply outcomes.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">

              {[
                ["Attempted", m.attempted],
                ["Accepted", m.accepted],
                ["Sent", m.sent],
                ["Delivered", m.delivered],
                ["Read", m.read],
                ["Failed", m.failed],
                ["Rejected", m.rejected],
                ["Unknown", m.unknown],
                ["Replied Recipients", m.replied],
                ["Total Linked Replies", m.replies],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >

                  <p className="text-xs text-slate-500">
                    {label}
                  </p>

                  <p
                    className={
                      "mt-2 text-2xl font-semibold " +
                      (
                        label === "Failed" ||
                        label === "Rejected"
                          ? "text-red-700"

                          : label === "Delivered"
                            ? "text-emerald-700"

                            : label === "Read"
                              ? "text-blue-700"
                              : ""
                      )
                    }
                  >
                    {fmt(value)}
                  </p>

                </div>
              ))}

            </div>


            {/* PERFORMANCE RATES */}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">

              {[
                ["Delivery rate", m.delivered, m.accepted],
                ["Read rate", m.read, m.delivered],
                ["Reply rate", m.replied, m.accepted],
              ].map(([label, n, d]) => (
                <div
                  key={label}
                  className="rounded-lg border p-3"
                >

                  <div className="flex justify-between text-sm">
                    <span>{label}</span>
                    <b>{pct(n, d)}</b>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">

                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{
                        width:
                          (
                            d
                              ? Math.min(100, n / d * 100)
                              : 0
                          ) + "%",
                      }}
                    />

                  </div>

                </div>
              ))}

            </div>

          </section>


          {/* ANALYTICS CHARTS */}

          <div className="grid gap-4 xl:grid-cols-2">

            <Trend
              title="Lead and Contact Growth"
              description="New records by creation date"
              rows={data.trend}
              series={[
                {
                  key: "leads",
                  label: "Leads",
                  color: "#2563eb",
                },
                {
                  key: "contacts",
                  label: "Contacts",
                  color: "#059669",
                },
              ]}
            />

            <Trend
              title="Marketing Activity"
              description="Accepted and delivered by attempt date; replies by arrival date"
              rows={data.trend}
              series={[
                {
                  key: "accepted",
                  label: "Accepted",
                  color: "#64748b",
                },
                {
                  key: "delivered",
                  label: "Delivered",
                  color: "#059669",
                },
                {
                  key: "replies",
                  label: "Replies",
                  color: "#2563eb",
                },
              ]}
            />

          </div>


          {/* CAMPAIGN COMPARISON */}

          <section className={panel}>

            <div className="flex items-center justify-between gap-2">

              <h3 className="font-semibold">
                Campaign Comparison
              </h3>

              <button
                className="text-sm text-emerald-700"
                onClick={() =>
                  navigate("campaigns")
                }
              >
                Open Campaigns ↗
              </button>

            </div>

            <p className="mt-1 text-xs text-slate-500">
              Most recent 20 campaigns with attempts in the selected period
            </p>

            <div className="mt-4 overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50">
                  <tr>
                    {[
                      "Campaign",
                      "Accepted",
                      "Delivered",
                      "Read",
                      "Failed",
                      "Delivery Rate",
                      "Reply Rate",
                    ].map((heading) => (
                      <th
                        className="p-3"
                        key={heading}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>

                  {data.comparison.map((r) => (
                    <tr
                      key={r.campaign_id}
                      className="border-t"
                    >

                      <td className="p-3 font-medium">
                        {r.name}
                      </td>

                      <td className="p-3">
                        {fmt(r.accepted)}
                      </td>

                      <td className="p-3 text-emerald-700">
                        {fmt(r.delivered)}
                      </td>

                      <td className="p-3 text-blue-700">
                        {fmt(r.read)}
                      </td>

                      <td className="p-3 text-red-700">
                        {fmt(r.failed)}
                      </td>

                      <td className="p-3 font-medium">
                        {pct(r.delivered, r.accepted)}
                      </td>

                      <td className="p-3">
                        {pct(r.replied, r.accepted)}
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

              {!data.comparison.length && (
                <p className="p-4 text-sm text-slate-500">
                  No campaign attempts in this period.
                </p>
              )}

            </div>

          </section>


          {/* SALES TEAM PERFORMANCE */}

          <section className={panel}>

            <h3 className="font-semibold">
              Sales Team Pipeline
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Current assignments and statuses for leads created in the selected period
            </p>

            <div className="mt-4 overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-slate-50">

                  <tr>

                    {[
                      "Salesperson",
                      "Leads",
                      "Contacted",
                      "Visit Scheduled",
                      "Marked Closed",
                      "Follow-up",
                    ].map((heading) => (
                      <th
                        className="p-3"
                        key={heading}
                      >
                        {heading}
                      </th>
                    ))}

                  </tr>

                </thead>

                <tbody>

                  {data.sales.map((r) => (
                    <tr
                      key={r.name}
                      className="border-t"
                    >

                      <td className="p-3 font-medium">
                        {r.name}
                      </td>

                      {[
                        "leads",
                        "contacted",
                        "visits",
                        "closed",
                        "followups",
                      ].map((key) => (
                        <td
                          className="p-3"
                          key={key}
                        >
                          {fmt(r[key])}
                        </td>
                      ))}

                    </tr>
                  ))}

                </tbody>

              </table>

              {!data.sales.length && (
                <p className="p-4 text-sm text-slate-500">
                  No leads in this period.
                </p>
              )}

            </div>

          </section>


          <p className="text-xs text-slate-500">

            Updated{" "}

            {new Date(data.as_of).toLocaleString(
              "en-IN",
              { timeZone: "Asia/Kolkata" }
            )}

            {" IST · Current active contacts and unread counts are not date-filtered. Delivery updates depend on Meta webhooks."}

          </p>

        </>
      )}


      {/* QUICK ACTIONS */}

      <section className={panel}>

        <h3 className="font-semibold">
          Quick Actions
        </h3>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">

          {[
            ["inbox", "WhatsApp Inbox"],
            ["leads", "Lead Manager"],
            ["campaigns", "Campaign Manager"],
            ["marketing-inbox", "Marketing Inbox"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={
                control +
                " flex items-center justify-between hover:bg-slate-50"
              }
              onClick={() => navigate(id)}
            >
              {label}

              <ArrowUpRight size={16} />
            </button>
          ))}

        </div>

      </section>

    </div>
  );
}