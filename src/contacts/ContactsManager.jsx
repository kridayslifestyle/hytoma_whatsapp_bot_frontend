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
import ImportContacts from "./ImportContacts";

const PAGE_SIZE = 50;

const emptyForm = {
  phone: "",
  name: "",
  location: "",
  tags: "",
  contact_type: "unclassified",
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

const typeLabels = {
  unclassified: "Unclassified",
  customer: "Customer",
  interior_designer: "Interior Designer",
  builder: "Builder",
  architect: "Architect",
  other: "Other",
};

export default function ContactsManager() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [consent, setConsent] = useState("all");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [contactType, setContactType] = useState("all");
  const [tag, setTag] = useState("");
  const [bulkType, setBulkType] = useState("");
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
      contact_type: contactType,
      tag,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });

    const timer = setTimeout(async () => {
      if (!active) return;

      setLoading(true);
      setError("");

      try {
        const result = await apiRequest("/admin/contacts?" + params);

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
  }, [search, consent, contactType, tag, page, revision]);

  // =========================================================
  // OPEN ADD / EDIT FORM
  // =========================================================

  function openEditor(contact = null) {
    setError("");
    setNotice("");
    setEditor(contact ? { id: contact.id } : { id: null });

    setForm(
      contact
        ? {
            phone: contact.phone,
            name: contact.name || "",
            location: contact.location || "",
            contact_type: contact.contact_type || "unclassified",
            tags: (contact.tags || []).join(", "),
          }
        : { ...emptyForm },
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
              .filter(Boolean),
          ),
        ],
      };

      if (editor.id === null) {
        payload.phone = form.phone.trim();
      }

      await apiRequest(
        editor.id === null ? "/admin/contacts" : "/admin/contacts/" + editor.id,

        {
          method: editor.id === null ? "POST" : "PATCH",

          body: JSON.stringify(payload),
        },
      );

      setNotice(editor.id === null ? "Contact added." : "Contact updated.");

      setEditor(null);
      setSelectedIds([]);
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
          "No messages will be sent.",
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest("/admin/contacts/sync-crm", {
        method: "POST",
      });

      setNotice(
        "CRM sync completed: " +
          result.added +
          " added, " +
          result.existing +
          " existing, " +
          result.invalid +
          " invalid.",
      );

      setSelectedIds([]);
      setPage(0);
      setSelectedIds([]);
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

  const selectedContacts = contacts.filter((contact) =>
    selectedIds.includes(contact.id),
  );

  const eligibleOptIn = selectedContacts.filter(
    (contact) =>
      contact.consent_status === "pending" &&
      !/^120255501[0-9]{2}$/.test(contact.phone),
  );

  const eligibleOptOut = selectedContacts.filter(
    (contact) => contact.consent_status !== "opted_out",
  );

  const selectionDisabled = busy || loading || !!editor || showImport;

  async function changeConsent(action) {
    if (selectionDisabled || error) return;

    const ids = (action === "bulk-opt-in" ? eligibleOptIn : eligibleOptOut).map(
      (contact) => contact.id,
    );

    if (!ids.length) return;

    const confirmation =
      action === "bulk-opt-in"
        ? `Confirm that all ${ids.length} selected eligible contacts have already given HYTOMA marketing permission?`
        : `Mark ${ids.length} selected contacts as opted out? They will be blocked from future marketing.`;

    if (!window.confirm(confirmation)) {
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(
        "/admin/contacts/consent/" + action,

        {
          method: "POST",

          body: JSON.stringify({
            contact_ids: ids,
            confirmed: true,
          }),
        },
      );

      setNotice(
        `Consent updated: ${result.updated} updated, ` +
          `${result.skipped} skipped.`,
      );

      setSelectedIds([]);

      setRevision((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeType() {
    if (selectionDisabled || error || !bulkType || !selectedContacts.length)
      return;

    const confirmed = window.confirm(
      `Classify ${selectedContacts.length} selected contacts as ${typeLabels[bulkType]}?`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest("/admin/contacts/bulk-type", {
        method: "POST",
        body: JSON.stringify({
          contact_ids: selectedContacts.map((c) => c.id),
          contact_type: bulkType,
        }),
      });

      setNotice(
        `Classification: ${result.updated} updated, ${result.skipped} skipped.`,
      );

      setSelectedIds([]);
      setBulkType("");
      setPage(0);
      setRevision((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const stats = data?.stats || {};
  const total = data?.total || 0;

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cards = [
    ["Total Contacts", stats.total, Users, "text-blue-600"],

    ["Opted In", stats.opted_in, UserCheck, "text-emerald-600"],

    ["Pending Consent", stats.pending, Clock3, "text-amber-600"],

    ["Opted Out", stats.opted_out, UserX, "text-red-600"],
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
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            className={buttonClass}
            disabled={busy || !!editor || showImport}
            onClick={syncCRM}
          >
            <Users size={16} />
            Sync CRM Leads
          </button>

          <button
            className={buttonClass}
            disabled={busy || !!editor || showImport}
            onClick={() => {
              setNotice("");
              setError("");
              setShowImport(true);
            }}
          >
            Import CSV
          </button>

          <button
            className={primaryClass}
            disabled={busy || !!editor || showImport}
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
              <Icon size={18} className={color} />

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

      {showImport && (
        <ImportContacts
          onClose={() => setShowImport(false)}
          onImported={(result) => {
            setShowImport(false);

            setNotice(
              `Import completed: ${result.added} added, ` +
                `${result.duplicates} duplicates, ` +
                `${result.invalid} invalid.`,
              `${result.opted_in ?? 0} opted in.`,
            );

            setSelectedIds([]);
            setPage(0);

            setRevision((v) => v + 1);
          }}
        />
      )}

      {/* ADD / EDIT CONTACT FORM */}

      {editor && (
        <form
          onSubmit={saveContact}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              {editor.id === null ? "Add Contact" : "Edit Contact"}
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

          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
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
                onChange={(e) => updateField("phone", e.target.value)}
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
                onChange={(e) => updateField("name", e.target.value)}
              />
            </label>

            {/* LOCATION */}

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Location
              <input
                className={inputClass}
                maxLength={255}
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Contact Type
              <select
                className={inputClass}
                value={form.contact_type}
                onChange={(e) => updateField("contact_type", e.target.value)}
              >
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {/* TAGS */}

            <label className="space-y-1 text-sm font-medium text-slate-700">
              Tags (comma separated)
              <input
                className={inputClass}
                value={form.tags}
                onChange={(e) => updateField("tags", e.target.value)}
                placeholder="Villa, Full Home Automation"
              />
            </label>
          </fieldset>

          <p className="text-xs text-slate-500">
            New contacts have pending consent. Editing does not grant marketing
            permission.
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

            <button type="submit" className={primaryClass} disabled={busy}>
              {busy ? "Saving..." : "Save Contact"}
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
              setSelectedIds([]);
              setPage(0);
            }}
          />
        </div>

        <select
          aria-label="Filter contact type"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={contactType}
          onChange={(e) => {
            setContactType(e.target.value);
            setSelectedIds([]);
            setPage(0);
          }}
        >
          <option value="all">All Contact Types</option>

          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <input
          aria-label="Filter tags"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          placeholder="Exact tag..."
          value={tag}
          onChange={(e) => {
            setTag(e.target.value);
            setSelectedIds([]);
            setPage(0);
          }}
        />

        <select
          aria-label="Filter consent"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          value={consent}
          onChange={(e) => {
            setConsent(e.target.value);
            setSelectedIds([]);
            setPage(0);
          }}
        >
          <option value="all">All Consent Statuses</option>

          {Object.entries(consentLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-3">
        <span className="mr-auto text-sm font-medium text-slate-600">
          {selectedContacts.length} selected (current page)
        </span>

        <button
          type="button"
          className={primaryClass}
          disabled={selectionDisabled || !!error || !eligibleOptIn.length}
          onClick={() => changeConsent("bulk-opt-in")}
        >
          Mark Opted In ({eligibleOptIn.length})
        </button>

        <select
          className={buttonClass}
          value={bulkType}
          disabled={selectionDisabled || !selectedContacts.length}
          onChange={(e) => setBulkType(e.target.value)}
        >
          <option value="">Change Contact Type</option>

          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <button
          className={buttonClass}
          disabled={
            selectionDisabled ||
            !!error ||
            !bulkType ||
            !selectedContacts.length
          }
          onClick={changeType}
        >
          Apply Type
        </button>

        <button
          type="button"
          className={buttonClass}
          disabled={selectionDisabled || !!error || !eligibleOptOut.length}
          onClick={() => changeConsent("bulk-opt-out")}
        >
          Opt Out ({eligibleOptOut.length})
        </button>
      </div>

      {/* CONTACTS TABLE */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Select all visible contacts"
                    className="h-4 w-4 accent-emerald-600"
                    disabled={selectionDisabled || !contacts.length || !!error}
                    checked={
                      contacts.length > 0 &&
                      contacts.every((contact) =>
                        selectedIds.includes(contact.id),
                      )
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? contacts.map((contact) => contact.id)
                          : [],
                      )
                    }
                  />
                </th>
                {[
                  "Contact",
                  "Location",
                  "Source",
                  "Contact Type",
                  "Tags",
                  "Consent Status",
                  "Action",
                ].map((heading) => (
                  <th key={heading} className="px-4 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Loading contacts...
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select ${contact.name || contact.phone}`}
                        className="h-4 w-4 accent-emerald-600"
                        disabled={selectionDisabled || !!error}
                        checked={selectedIds.includes(contact.id)}
                        onChange={(e) =>
                          setSelectedIds((previous) =>
                            e.target.checked
                              ? [...new Set([...previous, contact.id])]
                              : previous.filter((id) => id !== contact.id),
                          )
                        }
                      />
                    </td>
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

                    <td className="px-4 py-4">{contact.location || "—"}</td>

                    {/* SOURCE */}

                    <td className="px-4 py-4">
                      {sourceLabels[contact.source] || contact.source}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          c.contact_type === "interior_designer"
                            ? "bg-purple-50 text-purple-700"
                            : c.contact_type === "builder"
                              ? "bg-amber-50 text-amber-700"
                              : c.contact_type === "customer"
                                ? "bg-blue-50 text-blue-700"
                                : c.contact_type === "architect"
                                  ? "bg-teal-50 text-teal-700"
                                  : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {typeLabels[c.contact_type] || "Unclassified"}
                      </span>
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
                          (consentColors[contact.consent_status] ||
                            "bg-slate-100")
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
                        disabled={busy || !!editor || showImport}
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
            {total ? page * PAGE_SIZE + 1 : 0}–
            {Math.min((page + 1) * PAGE_SIZE, total)} of {total} contacts
          </span>

          <div className="flex items-center gap-2">
            <button
              className={buttonClass}
              aria-label="Previous page"
              disabled={loading || page === 0}
              onClick={() => {
                setSelectedIds([]);
                setPage((p) => p - 1);
              }}
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
              onClick={() => {
                setSelectedIds([]);
                setPage((p) => p + 1);
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
