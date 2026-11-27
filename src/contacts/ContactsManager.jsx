import { useEffect, useState } from "react";

import {
  Users,
  UserCheck,
  Clock3,
  UserX,
  Search,
  Plus,
  RefreshCw,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { apiRequest } from "../api";

const PAGE_SIZE = 50;

const emptyForm = {
  phone: "",
  name: "",
  location: "",
  tags: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white " +
  "px-3 py-2.5 text-sm focus:outline-none " +
  "focus:ring-2 focus:ring-emerald-200";

const buttonClass =
  "inline-flex items-center justify-center gap-2 " +
  "rounded-lg border border-slate-300 bg-white " +
  "px-4 py-2.5 text-sm font-medium hover:bg-slate-50 " +
  "disabled:opacity-50";

const primaryClass =
  "inline-flex items-center justify-center gap-2 " +
  "rounded-lg bg-emerald-700 px-4 py-2.5 " +
  "text-sm font-semibold text-white hover:bg-emerald-800 " +
  "disabled:opacity-50";

const consentLabels = {
  pending: "Pending",
  opted_in: "Opted In",
  opted_out: "Opted Out",
};

const consentColors = {
  pending: "bg-amber-50 text-amber-700",
  opted_in: "bg-emerald-50 text-emerald-700",
  opted_out: "bg-red-50 text-red-700",
};

const sourceLabels = {
  manual: "Manual",
  crm: "CRM Lead",
  csv: "CSV Import",
};


export default function ContactsManager() {

  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState("all");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editor, setEditor] = useState(null);
  const [form, setForm] = useState(emptyForm);


  // =========================================================
  // LOAD CONTACTS
  // =========================================================

  useEffect(() => {

    let active = true;

    const params = new URLSearchParams({
      search,
      consent_status: consent,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });

    const timer = setTimeout(async () => {

      if (!active) return;

      setLoading(true);
      setError("");

      try {

        const result = await apiRequest(
          "/admin/contacts?" + params
        );

        if (active) {
          setData(result);
        }

      } catch (err) {

        if (active) {
          setError(err.message);
        }

      } finally {

        if (active) {
          setLoading(false);
        }
      }

    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };

  }, [search, consent, page, revision]);


  // =========================================================
  // OPEN ADD / EDIT FORM
  // =========================================================

  function openEditor(contact = null) {

    setError("");
    setNotice("");

    setEditor(
      contact
        ? { id: contact.id }
        : { id: null }
    );

    setForm(
      contact
        ? {
            phone: contact.phone,
            name: contact.name || "",
            location: contact.location || "",
            tags: (contact.tags || []).join(", "),
          }
        : { ...emptyForm }
    );
  }


  function updateField(key, value) {

    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }


  // =========================================================
  // CREATE OR UPDATE CONTACT
  // =========================================================

  async function saveContact(event) {

    event.preventDefault();

    if (busy || !editor) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {

      const payload = {

        name: form.name.trim(),

        location: form.location.trim(),

        tags: [
          ...new Set(
            form.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          ),
        ],

      };

      if (editor.id === null) {
        payload.phone = form.phone.trim();
      }

      await apiRequest(

        editor.id === null
          ? "/admin/contacts"
          : "/admin/contacts/" + editor.id,

        {
          method:
            editor.id === null
              ? "POST"
              : "PATCH",

          body: JSON.stringify(payload),
        }

      );

      setNotice(
        editor.id === null
          ? "Contact added."
          : "Contact updated."
      );

      setEditor(null);
      setPage(0);
      setRevision((v) => v + 1);

    } catch (err) {

      setError(err.message);

    } finally {

      setBusy(false);
    }
  }


  // =========================================================
  // SYNC CRM LEADS
  // =========================================================

  async function syncCRM() {

    if (
      busy ||
      !window.confirm(
        "Import contacts from existing CRM leads? " +
        "No messages will be sent."
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {

      const result = await apiRequest(
        "/admin/contacts/sync-crm",
        {
          method: "POST",
        }
      );

      setNotice(
        "CRM sync completed: " +
        result.added +
        " added, " +
        result.existing +
        " existing, " +
        result.invalid +
        " invalid."
      );

      setPage(0);
      setRevision((v) => v + 1);

    } catch (err) {

      setError(err.message);

    } finally {

      setBusy(false);
    }
  }


  // =========================================================
  // CONTACT DATA AND STATISTICS
  // =========================================================

  const contacts = data?.contacts || [];
  const stats = data?.stats || {};
  const total = data?.total || 0;

  const pages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const cards = [

    [
      "Total Contacts",
      stats.total,
      Users,
      "text-blue-600",
    ],

    [
      "Opted In",
      stats.opted_in,
      UserCheck,
      "text-emerald-600",
    ],

    [
      "Pending Consent",
      stats.pending,
      Clock3,
      "text-amber-600",
    ],

    [
      "Opted Out",
      stats.opted_out,
      UserX,
      "text-red-600",
    ],

  ];


  // =========================================================
  // USER INTERFACE
  // =========================================================

  return (

    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <h2 className="text-2xl font-bold text-slate-900">
            Contacts Manager
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage customer contacts and marketing eligibility.
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            className={buttonClass}
            disabled={busy || loading}
            onClick={() =>
              setRevision((v) => v + 1)
            }
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            Refresh
          </button>

          <button
            className={buttonClass}
            disabled={busy || !!editor}
            onClick={syncCRM}
          >
            <Users size={16} />

            Sync CRM Leads
          </button>

          <button
            className={primaryClass}
            disabled={busy || !!editor}
            onClick={() => openEditor()}
          >
            <Plus size={18} />

            Add Contact
          </button>

        </div>
      </div>


      {/* STATISTICS CARDS */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        {cards.map(([label, value, Icon, color]) => (

          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">

              <Icon
                size={18}
                className={color}
              />

              {label}

            </div>

            <p className="mt-3 text-2xl font-bold text-slate-900">

              {value ?? "—"}

            </p>

          </div>

        ))}

      </div>


      {/* SUCCESS MESSAGE */}

      {notice && (

        <p
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
        </p>

      )}


      {/* ADD / EDIT CONTACT FORM */}

      {editor && (

        <form
          onSubmit={saveContact}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >

          <div className="flex items-center justify-between">

            <h3 className="font-semibold">

              {editor.id === null
                ? "Add Contact"
                : "Edit Contact"}

            </h3>

            <button
              type="button"
              aria-label="Close editor"
              disabled={busy}
              onClick={() => {
                setEditor(null);
                setError("");
              }}
            >
              <X size={20} />
            </button>

          </div>

          <fieldset
            disabled={busy}
            className="grid gap-4 sm:grid-cols-2"
          >

            {/* PHONE NUMBER */}

            <label className="space-y-1 text-sm font-medium text-slate-700">

              Phone number

              <input
                className={inputClass}
                type="tel"
                required
                maxLength={40}
                disabled={editor.id !== null || busy}
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", e.target.value)
                }
                placeholder="+91XXXXXXXXXX"
              />

            </label>


            {/* CUSTOMER NAME */}

            <label className="space-y-1 text-sm font-medium text-slate-700">

              Customer name

              <input
                className={inputClass}
                maxLength={150}
                value={form.name}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
              />

            </label>


            {/* LOCATION */}

            <label className="space-y-1 text-sm font-medium text-slate-700">

              Location

              <input
                className={inputClass}
                maxLength={255}
                value={form.location}
                onChange={(e) =>
                  updateField("location", e.target.value)
                }
              />

            </label>


            {/* TAGS */}

            <label className="space-y-1 text-sm font-medium text-slate-700">

              Tags (comma separated)

              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) =>
                  updateField("tags", e.target.value)
                }
                placeholder="Villa, Full Home Automation"
              />

            </label>

          </fieldset>

          <p className="text-xs text-slate-500">

            New contacts have pending consent.
            Editing does not grant marketing permission.

          </p>

          <div className="flex flex-wrap justify-end gap-2">

            <button
              type="button"
              className={buttonClass}
              disabled={busy}
              onClick={() => {
                setEditor(null);
                setError("");
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className={primaryClass}
              disabled={busy}
            >

              {busy
                ? "Saving..."
                : "Save Contact"}

            </button>

          </div>

        </form>

      )}


      {/* ERROR MESSAGE */}

      {error && (

        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>

      )}


      {/* SEARCH AND FILTERS */}

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">

        <div className="relative min-w-0 flex-1">

          <Search
            size={17}
            className="absolute left-3 top-3.5 text-slate-400"
          />

          <input
            aria-label="Search contacts"
            className={inputClass + " pl-10"}
            placeholder="Search name, phone or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />

        </div>

        <select
          aria-label="Filter consent"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={consent}
          onChange={(e) => {
            setConsent(e.target.value);
            setPage(0);
          }}
        >

          <option value="all">
            All Consent Statuses
          </option>

          {Object.entries(consentLabels).map(
            ([key, label]) => (

              <option
                key={key}
                value={key}
              >
                {label}
              </option>

            )
          )}

        </select>

      </div>


      {/* CONTACTS TABLE */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[760px] text-left text-sm">

            <thead className="bg-slate-50 text-xs text-slate-600">

              <tr>

                {[
                  "Contact",
                  "Location",
                  "Source",
                  "Tags",
                  "Consent Status",
                  "Action",
                ].map((heading) => (

                  <th
                    key={heading}
                    className="px-4 py-3 font-semibold"
                  >
                    {heading}
                  </th>

                ))}

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr>

                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    Loading contacts...
                  </td>

                </tr>

              ) : contacts.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="p-8 text-center text-slate-500"
                  >
                    No contacts found.
                  </td>

                </tr>

              ) : (

                contacts.map((contact) => (

                  <tr
                    key={contact.id}
                    className="hover:bg-slate-50"
                  >

                    {/* CONTACT */}

                    <td className="px-4 py-4">

                      <p className="font-semibold text-slate-900">

                        {contact.name || "Unnamed contact"}

                      </p>

                      <p className="mt-1 text-xs text-slate-500">

                        +{contact.phone}

                      </p>

                    </td>


                    {/* LOCATION */}

                    <td className="px-4 py-4">

                      {contact.location || "—"}

                    </td>


                    {/* SOURCE */}

                    <td className="px-4 py-4">

                      {sourceLabels[contact.source] ||
                        contact.source}

                    </td>


                    {/* TAGS */}

                    <td className="px-4 py-4">

                      <div className="flex max-w-xs flex-wrap gap-1">

                        {(contact.tags || []).map((tag) => (

                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
                          >
                            {tag}
                          </span>

                        ))}

                      </div>

                    </td>


                    {/* CONSENT STATUS */}

                    <td className="px-4 py-4">

                      <span
                        className={
                          "rounded-full px-2.5 py-1 text-xs font-semibold " +
                          (
                            consentColors[contact.consent_status] ||
                            "bg-slate-100"
                          )
                        }
                      >

                        {consentLabels[contact.consent_status] ||
                          contact.consent_status}

                      </span>

                    </td>


                    {/* EDIT ACTION */}

                    <td className="px-4 py-4">

                      <button
                        type="button"
                        disabled={busy || !!editor}
                        onClick={() => openEditor(contact)}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        <Pencil size={15} />

                        Edit
                      </button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>


        {/* PAGINATION */}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-4 text-sm text-slate-500">

          <span>

            {total ? page * PAGE_SIZE + 1 : 0}

            –

            {Math.min((page + 1) * PAGE_SIZE, total)}

            {" "}of {total} contacts

          </span>

          <div className="flex items-center gap-2">

            <button
              className={buttonClass}
              aria-label="Previous page"
              disabled={loading || page === 0}
              onClick={() =>
                setPage((p) => p - 1)
              }
            >
              <ChevronLeft size={16} />
            </button>

            <span>

              {page + 1} / {pages}

            </span>

            <button
              className={buttonClass}
              aria-label="Next page"
              disabled={loading || page + 1 >= pages}
              onClick={() =>
                setPage((p) => p + 1)
              }
            >
              <ChevronRight size={16} />
            </button>

          </div>

        </div>

      </div>

    </div>

  );
}