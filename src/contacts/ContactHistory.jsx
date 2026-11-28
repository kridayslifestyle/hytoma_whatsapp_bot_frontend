import { useEffect, useState } from "react";

import { X } from "lucide-react";

import { apiRequest } from "../api";

export default function ContactHistory({
  contact,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    let active = true;

    setData(null);
    setError("");

    apiRequest(
      "/admin/contacts/" +
        contact.id +
        "/campaign-history?offset=" +
        page * 50 +
        "&limit=50"
    )
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });

    return () => {
      active = false;
    };
  }, [contact.id, page]);

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <div>

          <h3 className="font-semibold text-slate-900">
            Campaign History
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {contact.name || "Unnamed Contact"}
            {" · "}
            +{contact.phone}
          </p>

        </div>

        <button
          aria-label="Close history"
          onClick={onClose}
          className="rounded-lg border p-2"
        >
          <X size={20} />
        </button>

      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      ) : !data ? (

        <p className="text-sm text-slate-500">
          Loading history...
        </p>

      ) : (

        <>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50">

                <tr>

                  {[
                    "Campaign",
                    "Template",
                    "Attempted",
                    "Status",
                    "Replies",
                    "Error",
                  ].map((h) => (
                    <th
                      key={h}
                      className="p-3"
                    >
                      {h}
                    </th>
                  ))}

                </tr>

              </thead>

              <tbody>

                {data.campaigns.map((r) => (

                  <tr
                    key={r.campaign_id}
                    className="border-t border-slate-100"
                  >

                    <td className="p-3 font-medium">
                      {r.name}
                    </td>

                    <td className="p-3">
                      {r.template_name}
                    </td>

                    <td className="p-3">
                      {r.attempted_at
                        ? new Date(r.attempted_at)
                            .toLocaleString()
                        : "—"}
                    </td>

                    <td className="p-3">

                      <span
                        className={
                          "rounded-full px-3 py-1 text-xs font-medium capitalize " +
                          (
                            r.status === "read"
                              ? "bg-blue-100 text-blue-700"

                              : r.status === "delivered"
                                ? "bg-emerald-100 text-emerald-700"

                                : ["failed", "rejected"].includes(r.status)
                                  ? "bg-red-100 text-red-700"

                                  : "bg-slate-100 text-slate-700"
                          )
                        }
                      >
                        {r.status}
                      </span>

                    </td>

                    <td className="p-3">
                      {r.replies}
                    </td>

                    <td className="p-3 text-xs">
                      {r.error_code || r.error || "—"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

            {!data.campaigns.length && (
              <p className="p-5 text-center text-sm text-slate-500">
                No campaign history.
              </p>
            )}

          </div>

          <div className="flex items-center justify-end gap-3">

            <button
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!page}
              onClick={() =>
                setPage((n) => n - 1)
              }
            >
              Previous
            </button>

            <span className="text-sm">
              Page {page + 1}
            </span>

            <button
              className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
              disabled={!data.has_more}
              onClick={() =>
                setPage((n) => n + 1)
              }
            >
              Next
            </button>

          </div>

        </>

      )}

    </section>
  );
}