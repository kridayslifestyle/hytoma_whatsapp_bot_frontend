import { useState } from "react";
import { Upload, Download, X, FileText } from "lucide-react";
import { apiRequest } from "../api";

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50";

const primary =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50";

export default function ImportContacts({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOptIn, setConfirmedOptIn] = useState(false);

  // DOWNLOAD SAMPLE CSV

  function downloadSample() {
    const csv = [
      "phone,name,location,contact_type,tags",
      '12025550101,Test Customer,Hyderabad,customer,"Villa,Full Home Automation"',
      '12025550102,Test Designer,Hyderabad,interior_designer,"Residential Interiors"',
      '12025550103,Test Builder,Vijayawada,builder,"Apartment Projects"',
      '12025550104,Test Architect,Hyderabad,architect,"Commercial"',
    ].join("\n");

    const url = URL.createObjectURL(
      new Blob([csv], {
        type: "text/csv;charset=utf-8",
      })
    );

    const a = document.createElement("a");

    a.href = url;
    a.download = "contacts_sample.csv";

    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  // PREVIEW CSV

  async function loadPreview() {
    if (!file || busy) return;

    setBusy(true);
    setError("");
    setPreview(null);
    setContent("");
    setConfirmedOptIn(false);

    try {
      if (file.size > 1000000) {
        throw new Error("CSV must be below 1 MB.");
      }

      const text = await file.text();

      const result = await apiRequest(
        "/admin/contacts/csv/preview",
        {
          method: "POST",
          body: JSON.stringify({
            content: text,
          }),
        }
      );

      if (
        !result ||
        !result.counts ||
        !Array.isArray(result.rows)
      ) {
        throw new Error("Invalid CSV preview response.");
      }

      setContent(text);
      setPreview(result);

    } catch (err) {
      setError(err.message);

    } finally {
      setBusy(false);
    }
  }

  // CONFIRM IMPORT

  async function confirmImport() {
    if (
      !preview?.counts?.valid ||
      !content ||
      busy
    ) {
      return;
    }

    if (
      !window.confirm(
        "Import valid contacts? No messages will be sent."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const result = await apiRequest(
        "/admin/contacts/csv/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            content,
            confirmed_opt_in: confirmedOptIn,
          }),
        }
      );

      onImported(result);

    } catch (err) {
      setError(err.message);

    } finally {
      setBusy(false);
    }
  }

  const contactTypeLabels = {
    customer: "Customer",
    interior_designer: "Interior Designer",
    builder: "Builder",
    architect: "Architect",
    other: "Other",
    unclassified: "Unclassified",
  };

  const statusColors = {
    valid: "bg-emerald-100 text-emerald-700",
    duplicate: "bg-amber-100 text-amber-700",
    invalid: "bg-red-100 text-red-700",
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900">
            <Upload
              size={19}
              className="text-emerald-700"
            />
            Import Contacts
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Upload a CSV and review contacts before importing.
          </p>
        </div>

        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={onClose}
          aria-label="Close import"
        >
          <X size={17} />
        </button>
      </div>

      {/* DOWNLOAD SAMPLE */}

      <button
        type="button"
        className={btn}
        onClick={downloadSample}
      >
        <Download size={16} />
        Download sample CSV
      </button>

      {/* FILE UPLOAD */}

      <label className="block rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-700">

        <span className="flex items-center gap-2 font-medium">
          <FileText size={18} />
          Select CSV file
        </span>

        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          className="mt-3 block w-full text-sm"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null);
            setPreview(null);
            setContent("");
            setError("");
            setConfirmedOptIn(false);
          }}
        />

        <span className="mt-2 block text-xs text-slate-500">
          Maximum 1 MB and 5,000 contacts.
          All new contacts start with pending consent
          unless existing permission is confirmed.
        </span>

      </label>

      {/* ERROR MESSAGE */}

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* CSV PREVIEW */}

      {preview && (
        <>

          {/* STATISTICS */}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

            {[
              ["Total", preview.counts?.total ?? 0],
              ["Valid", preview.counts?.valid ?? 0],
              ["Duplicate", preview.counts?.duplicate ?? 0],
              ["Invalid", preview.counts?.invalid ?? 0],
            ].map(([label, value]) => (

              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >

                <p className="text-xs text-slate-500">
                  {label}
                </p>

                <p
                  className={
                    "mt-1 text-2xl font-bold " +
                    (
                      label === "Valid"
                        ? "text-emerald-700"
                        : label === "Duplicate"
                        ? "text-amber-600"
                        : label === "Invalid"
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

          {/* PREVIEW TABLE */}

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">

            <table className="w-full min-w-[850px] text-left text-sm">

              <thead className="sticky top-0 bg-slate-100 text-slate-600">

                <tr>
                  {[
                    "Row",
                    "Phone",
                    "Name",
                    "Location",
                    "Contact Type",
                    "Tags",
                    "Status",
                    "Reason",
                  ].map((heading) => (

                    <th
                      key={heading}
                      className="whitespace-nowrap p-3 font-semibold"
                    >
                      {heading}
                    </th>

                  ))}
                </tr>

              </thead>

              <tbody>

                {!preview.rows.length && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-slate-500"
                    >
                      No contacts found.
                    </td>
                  </tr>
                )}

                {preview.rows.map((row) => (

                  <tr
                    key={row.row}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >

                    <td className="p-3 text-slate-500">
                      {row.row}
                    </td>

                    <td className="whitespace-nowrap p-3">
                      {row.phone ? "+" + row.phone : "—"}
                    </td>

                    <td className="p-3 font-medium text-slate-900">
                      {row.name || "—"}
                    </td>

                    <td className="p-3">
                      {row.location || "—"}
                    </td>

                    <td className="whitespace-nowrap p-3">

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">

                        {contactTypeLabels[row.contact_type] ||
                          "Unclassified"}

                      </span>

                    </td>

                    <td className="p-3">

                      <div className="flex flex-wrap gap-1">

                        {Array.isArray(row.tags) &&
                        row.tags.length > 0 ? (

                          row.tags.map((tag, index) => (

                            <span
                              key={index}
                              className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                            >
                              {tag}
                            </span>

                          ))

                        ) : (
                          <span className="text-slate-400">
                            —
                          </span>
                        )}

                      </div>

                    </td>

                    <td className="p-3">

                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold capitalize " +
                          (
                            statusColors[row.status] ||
                            "bg-slate-100 text-slate-700"
                          )
                        }
                      >
                        {row.status || "Unknown"}
                      </span>

                    </td>

                    <td className="p-3 text-xs text-slate-500">
                      {row.error || "—"}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <p className="text-xs text-slate-500">
            Showing {preview.rows.length} contacts.
            Duplicate and invalid contacts will not be imported.
          </p>

          {/* CONSENT CONFIRMATION */}

          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">

            <input
              type="checkbox"
              checked={confirmedOptIn}
              disabled={busy}
              onChange={(e) =>
                setConfirmedOptIn(e.target.checked)
              }
              className="mt-1 h-4 w-4 accent-emerald-600"
            />

            <span>
              I confirm that all new eligible contacts in this CSV
              have already given HYTOMA permission to receive
              WhatsApp marketing messages.
              Leave unchecked to import as pending.
            </span>

          </label>

        </>
      )}

      {/* ACTION BUTTONS */}

      <div className="flex flex-wrap justify-end gap-2">

        <button
          type="button"
          className={btn}
          disabled={busy}
          onClick={onClose}
        >
          Cancel
        </button>

        <button
          type="button"
          className={btn}
          disabled={!file || busy}
          onClick={loadPreview}
        >
          {busy ? "Processing..." : "Preview CSV"}
        </button>

        <button
          type="button"
          className={primary}
          disabled={
            busy ||
            !preview?.counts?.valid
          }
          onClick={confirmImport}
        >
          Confirm Import
        </button>

      </div>

    </section>
  );
}