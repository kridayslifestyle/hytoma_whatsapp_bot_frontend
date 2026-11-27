import { useState } from "react";

import {
  Upload,
  Download,
  X,
  FileText,
} from "lucide-react";

import { apiRequest } from "../api";


const btn =
  "inline-flex items-center justify-center gap-2 " +
  "rounded-lg border border-slate-300 bg-white " +
  "px-4 py-2 text-sm font-semibold hover:bg-slate-50 " +
  "disabled:opacity-50";

const primary =
  "rounded-lg bg-emerald-700 px-4 py-2 " +
  "text-sm font-semibold text-white " +
  "hover:bg-emerald-800 disabled:opacity-50";


export default function ImportContacts({
  onClose,
  onImported,
}) {

  const [file, setFile] = useState(null);
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");


  // =========================================================
  // DOWNLOAD SAMPLE CSV
  // =========================================================

  function downloadSample() {

    const csv =
      'phone,name,location,tags\n' +
      '+91XXXXXXXXXX,Sample Contact,Hyderabad,"Villa,Full Home Automation"\n';

    const url = URL.createObjectURL(
      new Blob(
        [csv],
        {
          type: "text/csv;charset=utf-8"
        }
      )
    );

    const a = document.createElement("a");

    a.href = url;
    a.download = "contacts_sample.csv";

    a.click();

    URL.revokeObjectURL(url);
  }


  // =========================================================
  // PREVIEW CSV
  // =========================================================

  async function loadPreview() {

    if (!file || busy) return;

    setBusy(true);
    setError("");
    setPreview(null);

    try {

      if (file.size > 1000000) {

        throw new Error(
          "CSV must be below 1 MB."
        );
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

      setContent(text);
      setPreview(result);

    } catch (err) {

      setError(err.message);

    } finally {

      setBusy(false);
    }
  }


  // =========================================================
  // CONFIRM IMPORT
  // =========================================================

  async function confirmImport() {

    if (
      !preview ||
      busy ||
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


  // =========================================================
  // UI
  // =========================================================

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

            Upload a CSV and review contacts
            before importing.

          </p>

        </div>

        <button
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

            setFile(
              e.target.files?.[0] || null
            );

            setPreview(null);
            setContent("");
            setError("");
          }}
        />

        <span className="mt-2 block text-xs text-slate-500">

          Maximum 1 MB and 5,000 contacts.
          All new contacts start with pending consent.

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

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            {Object.entries(preview.counts).map(
              ([key, value]) => (

                <div
                  key={key}
                  className="rounded-lg border border-slate-200 p-3"
                >

                  <p className="text-xs capitalize text-slate-500">

                    {key}

                  </p>

                  <p className="text-xl font-bold">

                    {value}

                  </p>

                </div>

              )
            )}

          </div>


          {/* PREVIEW TABLE */}

          <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">

            <table className="w-full text-left text-sm">

              <thead className="sticky top-0 bg-slate-50">

                <tr>

                  {[
                    "Row",
                    "Phone",
                    "Name",
                    "Status",
                    "Reason",
                  ].map((heading) => (

                    <th
                      key={heading}
                      className="p-2"
                    >

                      {heading}

                    </th>

                  ))}

                </tr>

              </thead>

              <tbody>

                {preview.rows.map((row) => (

                  <tr
                    key={row.row}
                    className="border-t border-slate-100"
                  >

                    <td className="p-2">

                      {row.row}

                    </td>

                    <td className="p-2">

                      {row.phone || "—"}

                    </td>

                    <td className="p-2">

                      {row.name || "—"}

                    </td>

                    <td className="p-2 capitalize">

                      {row.status}

                    </td>

                    <td className="p-2 text-xs text-slate-500">

                      {row.error || "—"}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </>

      )}


      {/* ACTION BUTTONS */}

      <div className="flex flex-wrap justify-end gap-2">

        <button
          className={btn}
          disabled={busy}
          onClick={onClose}
        >

          Cancel

        </button>

        <button
          className={btn}
          disabled={!file || busy}
          onClick={loadPreview}
        >

          {busy
            ? "Processing..."
            : "Preview CSV"}

        </button>

        <button
          className={primary}
          disabled={
            busy ||
            !preview?.counts.valid
          }
          onClick={confirmImport}
        >

          Confirm Import

        </button>

      </div>

    </section>

  );
}