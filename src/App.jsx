import { useState, useEffect } from "react";
import Login from "./Login";
import { apiRequest, restoreSession, logout } from "./api";
import {
  LayoutDashboard,
  MessageCircle,
  Users,
  Bell,
  Search,
  Menu,
  X,
  CheckCircle2,
  Clock3,
  UserRound,
  Pencil,
  ArrowUpRight,
  Bot,
  ChevronRight,
  Copy,
  ContactRound,
  Megaphone,
} from "lucide-react";
import SalesTeam from "./SalesTeam";
import EditLeadModal from "./EditLeadModal";
import Inbox from "./Inbox";
import MarketingTemplates from "./MarketingTemplates";
import ContactsManager from "./contacts/ContactsManager";
import CampaignManager from "./campaigns/CampaignManager";

const sampleLeads = [
  {
    id: 1,
    name: "Demo Customer A",
    phone: "91XXXXXXXX01",
    project: "Interiors",
    timeline: "1–3 months",
    location: "Hyderabad",
    status: "Deferred",
    salesperson: "Unassigned",
    followup: true,
  },
  {
    id: 2,
    name: "Demo Customer B",
    phone: "91XXXXXXXX02",
    project: "Completed",
    timeline: "Ready",
    location: "Vijayawada",
    status: "Completed",
    salesperson: "Salesperson 1",
    followup: true,
  },
  {
    id: 3,
    name: "Demo Customer C",
    phone: "91XXXXXXXX03",
    project: "Under construction",
    timeline: "Within 1 month",
    location: "Hyderabad",
    status: "Completed",
    salesperson: "Unassigned",
    followup: false,
  },
];

const navigation = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "inbox",
    label: "WhatsApp Inbox",
    icon: MessageCircle,
  },
  {
    id: "leads",
    label: "Lead Manager",
    icon: Users,
  },
  {
    id: "sales",
    label: "Sales Team",
    icon: ContactRound,
  },

  {
    id: "marketing",
    label: "Marketing Templates",
    icon: Megaphone,
  },

  {
    id: "contacts",
    label: "Contacts Manager",
    icon: Users,
  },

  {
    id: "campaigns",
    label: "Campaign Manager",
    icon: Megaphone,
  },
];

function Status({ value }) {
  const classes = {
    Completed: "bg-emerald-50 text-emerald-700",
    Deferred: "bg-amber-50 text-amber-700",
    Assigned: "bg-blue-50 text-blue-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        classes[value] || "bg-slate-100 text-slate-600"
      }`}
    >
      {value}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, subtitle }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">{label}</span>
        <div className="rounded-xl bg-slate-100 p-2.5">
          <Icon size={19} className="text-slate-600" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-semibold">{value}</div>
      <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function Overview({ navigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStats() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/stats");
      setStats(data);
    } catch (err) {
      setError(err.message || "Unable to load statistics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Business Overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Live HYTOMA WhatsApp lead statistics
          </p>
        </div>

        <button
          onClick={loadStats}
          disabled={loading}
          className="rounded-xl border border-slate-200 bg-white
            px-4 py-2 text-sm font-medium text-slate-700
            hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Data"}
        </button>
      </div>

      {error && (
        <div
          className="rounded-xl border border-red-200
          bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
          <button onClick={loadStats} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Leads"
          value={loading ? "..." : (stats?.total_leads ?? "—")}
          icon={Users}
          subtitle="All WhatsApp leads"
        />

        <StatCard
          label="Completed Screening"
          value={loading ? "..." : (stats?.completed_leads ?? "—")}
          icon={CheckCircle2}
          subtitle="Qualification completed"
        />

        <StatCard
          label="Deferred Leads"
          value={loading ? "..." : (stats?.deferred_leads ?? "—")}
          icon={Clock3}
          subtitle="Future projects"
        />

        <StatCard
          label="Needs Follow-up"
          value={loading ? "..." : (stats?.pending_followups ?? "—")}
          icon={Bell}
          subtitle="Waiting for admin review"
        />

        <StatCard
          label="Assigned Leads"
          value={loading ? "..." : (stats?.assigned_leads ?? "—")}
          icon={UserRound}
          subtitle="Assigned to salespeople"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Quick Actions</h3>

          <p className="mt-1 text-sm text-slate-500">
            Manage enquiries and sales follow-ups.
          </p>

          <button
            onClick={() => navigate("inbox")}
            className="mt-5 flex w-full items-center
              justify-between rounded-xl border border-slate-200
              p-4 text-left hover:bg-slate-50"
          >
            <span className="flex items-center gap-3">
              <MessageCircle className="text-emerald-600" />
              WhatsApp Inbox
            </span>
            <ChevronRight size={18} />
          </button>

          <button
            onClick={() => navigate("leads")}
            className="mt-3 flex w-full items-center
              justify-between rounded-xl border border-slate-200
              p-4 text-left hover:bg-slate-50"
          >
            <span className="flex items-center gap-3">
              <Users className="text-blue-600" />
              Lead Manager
            </span>
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Lead Screening Flow</h3>

          <div className="mt-5 space-y-4">
            {[
              "Customer messages HYTOMA through WhatsApp",
              "Bot collects qualification details",
              "Responses are saved in PostgreSQL",
              "Admin reviews and assigns qualified leads",
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center
                  justify-center rounded-full bg-emerald-50
                  text-sm font-semibold text-emerald-700"
                >
                  {index + 1}
                </div>

                <span className="text-sm text-slate-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Leads() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftAssignments, setDraftAssignments] = useState({});
  const [busyPhone, setBusyPhone] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [salespeople, setSalespeople] = useState([]);
  const [editingLead, setEditingLead] = useState(null);

  async function loadLeads() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/leads?limit=100&offset=0");

      const loadedLeads = data.leads || [];

      setLeads(loadedLeads);
    } catch (err) {
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignment(lead) {
    const selectedId = Number(draftAssignments[lead.phone]);

    const selectedPerson = salespeople.find(
      (person) => person.id === selectedId && person.is_active,
    );

    if (!selectedPerson) {
      setActionError("Select an active salesperson.");
      setActionMessage("");
      return;
    }

    setBusyPhone(lead.phone);
    setActionError("");
    setActionMessage("");

    try {
      await apiRequest(
        `/admin/leads/${encodeURIComponent(lead.phone)}/salesperson`,
        {
          method: "PATCH",
          body: JSON.stringify({
            salesperson_id: selectedId,
          }),
        },
      );

      await loadLeads();

      setActionMessage(`Lead assigned to ${selectedPerson.name}.`);
    } catch (err) {
      setActionError(err.message || "Assignment failed.");
    } finally {
      setBusyPhone(null);
    }
  }

  async function loadSalespeople() {
    try {
      const data = await apiRequest("/admin/salespeople");
      setSalespeople(data.salespeople || []);
    } catch (err) {
      setActionError(err.message || "Unable to load salespeople.");
    }
  }

  async function markLeadReviewed(lead) {
    setBusyPhone(lead.phone);
    setActionError("");
    setActionMessage("");

    try {
      await apiRequest(
        `/admin/leads/${encodeURIComponent(lead.phone)}/mark-reviewed`,
        {
          method: "PATCH",
        },
      );

      await loadLeads();

      setActionMessage("Customer follow-up marked as reviewed.");
    } catch (err) {
      setActionError(err.message || "Unable to update follow-up.");
    } finally {
      setBusyPhone(null);
    }
  }

  useEffect(() => {
    if (!salespeople.length) return;

    setDraftAssignments(
      Object.fromEntries(
        leads.map((lead) => {
          const matched = salespeople.find(
            (person) => person.name === lead.assigned_salesperson,
          );

          return [lead.phone, matched ? String(matched.id) : ""];
        }),
      ),
    );
  }, [leads, salespeople]);

  useEffect(() => {
    loadLeads();
    loadSalespeople();
  }, []);

  const filteredLeads = leads.filter((lead) => {
    const searchText = [
      lead.phone,
      lead.project_type,
      lead.automation_type,
      lead.project_status,
      lead.project_location,
      lead.completion_timeline,
      lead.preferred_site_visit,
      lead.assigned_salesperson,
      lead.sales_status,
    ]

      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(search.toLowerCase());

    const matchesFilter = filter === "all" || lead.status === filter;

    return matchesSearch && matchesFilter;
  });

  function formatValue(value) {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    return String(value)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  async function copyLead(lead) {
    const message = [
      "*HYTOMA Automation — Lead Details*",
      "",

      `Customer Number: +${lead.phone}`,
      `Project Type: ${lead.project_type || "Not provided"}`,
      `Automation Type: ${lead.automation_type || "Not provided"}`,
      `Project Status: ${formatValue(lead.project_status)}`,
      `Completion Timeline: ${lead.completion_timeline || "Not applicable"}`,
      `Project Location: ${lead.project_location || "Not provided"}`,
      `Preferred Site Visit: ${lead.preferred_site_visit || "Not requested"}`,
      `Lead Status: ${formatValue(lead.status)}`,
      `Assigned Salesperson: ${lead.assigned_salesperson || "Not assigned"}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(message);
      alert("Lead details copied. Paste them into your sales WhatsApp group.");
    } catch {
      alert("Unable to copy. Check clipboard permissions.");
    }
  }

  return (
    <div
      className="overflow-hidden rounded-2xl
      border border-slate-200 bg-white"
    >
      <div
        className="flex flex-wrap items-center
        justify-between gap-4 border-b border-slate-200 p-5"
      >
        <div>
          <h2 className="text-lg font-semibold">Lead Manager</h2>

          <p className="mt-1 text-sm text-slate-500">
            Live WhatsApp leads from HYTOMA
          </p>
        </div>

        <button
          onClick={loadLeads}
          disabled={loading}
          className="rounded-xl border border-slate-200
            px-4 py-2 text-sm font-medium
            hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh Leads"}
        </button>
      </div>

      {actionMessage && (
        <div
          role="status"
          className="mx-5 mt-4 rounded-xl border border-emerald-200
      bg-emerald-50 p-4 text-sm text-emerald-700"
        >
          {actionMessage}
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mx-5 mt-4 rounded-xl border border-red-200
      bg-red-50 p-4 text-sm text-red-700"
        >
          {actionError}
        </div>
      )}

      <div className="flex flex-wrap gap-3 p-5">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />

          <input
            type="text"
            placeholder="Search phone, project, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200
              py-2.5 pl-9 pr-3 text-sm outline-none
              focus:border-emerald-500"
          />
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-slate-200
            bg-white px-4 py-2.5 text-sm outline-none"
        >
          <option value="all">All Leads</option>
          <option value="screening">Screening</option>
          <option value="completed">Completed</option>
          <option value="deferred">Deferred</option>
          <option value="human">Human Requested</option>
        </select>
      </div>

      {error && (
        <div
          className="mx-5 mb-4 rounded-xl bg-red-50
          p-4 text-sm text-red-700"
        >
          {error}
          <button onClick={loadLeads} className="ml-3 font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1350px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              {[
                "Customer",
                "Project Type",
                "Automation Type",
                "Project Status",
                "Timeline",
                "Location",
                "Visit",
                "Status",
                "Assigned To",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-5 py-4 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!loading &&
              filteredLeads.map((lead) => (
                <tr
                  key={lead.phone}
                  className="border-t border-slate-100
                  hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-800">
                      +{lead.phone}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {formatDate(lead.created_at)}
                    </div>

                    {lead.needs_admin_followup && (
                      <span
                        className="mt-2 inline-block rounded-full
                      bg-orange-50 px-2 py-1 text-xs text-orange-700"
                      >
                        Follow-up needed
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-medium text-slate-800">
                      {lead.project_type || "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="block min-w-[140px] text-slate-700">
                      {lead.automation_type || "—"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {formatValue(lead.project_status)}
                  </td>

                  <td className="px-5 py-4">
                    {lead.completion_timeline || "—"}
                  </td>

                  <td className="px-5 py-4">{lead.project_location || "—"}</td>

                  <td className="px-5 py-4">
                    {lead.preferred_site_visit || "—"}
                  </td>

                  <td className="px-5 py-4">
                    <Status value={formatValue(lead.status)} />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex min-w-[200px] flex-col gap-2">
                      <select
                        aria-label={`Assign salesperson to ${lead.phone}`}
                        value={draftAssignments[lead.phone] ?? ""}
                        onChange={(event) =>
                          setDraftAssignments((previous) => ({
                            ...previous,
                            [lead.phone]: event.target.value,
                          }))
                        }
                        disabled={busyPhone !== null}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      >
                        <option value="">Select Salesperson</option>

                        {salespeople
                          .filter(
                            (person) =>
                              person.is_active ||
                              person.name === lead.assigned_salesperson,
                          )
                          .map((person) => (
                            <option key={person.id} value={String(person.id)}>
                              {person.name}
                              {!person.is_active ? " (Inactive)" : ""}
                            </option>
                          ))}
                      </select>

                      <button
                        type="button"
                        disabled={
                          busyPhone !== null ||
                          !draftAssignments[lead.phone] ||
                          !salespeople.some(
                            (person) =>
                              person.id ===
                                Number(draftAssignments[lead.phone]) &&
                              person.is_active &&
                              person.name !== lead.assigned_salesperson,
                          )
                        }
                        onClick={() => saveAssignment(lead)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                      >
                        {busyPhone === lead.phone
                          ? "Saving..."
                          : "Save Assignment"}
                      </button>

                      <span className="text-xs text-slate-500">
                        Sales status: {formatValue(lead.sales_status)}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div
                      className="flex min-w-[140px] flex-col
    items-start gap-3"
                    >
                      {lead.needs_admin_followup && (
                        <button
                          type="button"
                          onClick={() => markLeadReviewed(lead)}
                          disabled={busyPhone !== null}
                          className="rounded-lg border border-amber-200
          bg-amber-50 px-3 py-2 text-xs font-semibold
          text-amber-800 hover:bg-amber-100
          disabled:opacity-40"
                        >
                          {busyPhone === lead.phone
                            ? "Updating..."
                            : "Mark Reviewed"}
                        </button>
                      )}

                      {!lead.needs_admin_followup && (
                        <span
                          className="inline-flex items-center gap-1
        text-xs text-emerald-700"
                        >
                          <CheckCircle2 size={14} />
                          No pending follow-up
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingLead(lead)}
                        className="inline-flex items-center gap-2
    text-sm font-medium text-blue-700
    hover:underline"
                      >
                        <Pencil size={15} />
                        Edit Lead
                      </button>

                      <button
                        type="button"
                        onClick={() => copyLead(lead)}
                        className="inline-flex items-center gap-2
        text-sm font-medium text-emerald-700
        hover:underline"
                      >
                        <Copy size={15} />
                        Copy Lead
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {loading && (
          <div className="p-10 text-center text-sm text-slate-500">
            Loading HYTOMA leads...
          </div>
        )}

        {!loading && !error && filteredLeads.length === 0 && (
          <div className="p-10 text-center text-sm text-slate-500">
            No leads found.
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="text-xs text-slate-500">
          Showing {filteredLeads.length} of {leads.length} loaded leads. This
          version loads the latest 100 records.
        </p>
      </div>

      <EditLeadModal
        lead={editingLead}
        onClose={() => setEditingLead(null)}
        onSaved={async () => {
          await loadLeads();
          setEditingLead(null);
          setActionMessage("Lead details updated successfully.");
        }}
      />
    </div>
  );
}

function Dashboard({ admin, onLogout }) {
  const [page, setPage] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const currentTitle = navigation.find((x) => x.id === page)?.label;

  const navigate = (id) => {
    setPage(id);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64
        border-r border-slate-200 bg-white transition-transform
        lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div
          className="flex h-20 items-center justify-between
          border-b border-slate-100 px-6"
        >
          <div>
            <div className="text-xl font-bold tracking-tight">
              HYTOMA<span className="text-emerald-600">.</span>
            </div>
            <div className="text-xs text-slate-500">Admin Workspace</div>
          </div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="space-y-1 p-4">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex w-full items-center gap-3 rounded-xl
                px-4 py-3 text-sm font-medium transition ${
                  page === id
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header
          className="flex h-20 items-center justify-between
          border-b border-slate-200 bg-white px-5 lg:px-8"
        >
          <div className="flex items-center gap-4">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{currentTitle}</h1>
              <p className="text-xs text-slate-500">
                HYTOMA Automation · Admin Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 sm:block">
              Live Data
            </span>

            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-slate-800">{admin}</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 font-semibold text-emerald-700">
              {admin?.charAt(0).toUpperCase() || "H"}
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 lg:p-8">
          {page === "overview" && <Overview navigate={navigate} />}
          {page === "inbox" && <Inbox />}
          {page === "leads" && <Leads />}
          {page === "sales" && <SalesTeam />}
          {page === "marketing" && <MarketingTemplates />}
          {page === "contacts" && <ContactsManager />}
          {page === "campaigns" && <CampaignManager />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((result) => {
        if (active) setAdmin(result.username);
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLogoutError("");

    try {
      await logout();
      setAdmin(null);
    } catch (error) {
      setLogoutError(error.message || "Logout failed");
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking admin session...
      </div>
    );
  }

  if (!admin) {
    return <Login onSuccess={setAdmin} />;
  }

  return (
    <>
      {/* <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-md">
        <span className="text-sm text-slate-600">{admin}</span>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200"
        >
          Logout
        </button>
      </div> */}

      {logoutError && (
        <div
          role="alert"
          className="fixed bottom-20 right-4 z-50 rounded-xl bg-red-50 p-3 text-sm text-red-700"
        >
          {logoutError}
        </div>
      )}

      <Dashboard admin={admin} onLogout={handleLogout} />
    </>
  );
}
