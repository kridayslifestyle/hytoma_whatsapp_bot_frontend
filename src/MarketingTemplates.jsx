import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  Image as ImageIcon,
  Video,
  Phone,
  ExternalLink,
  Reply,
  Copy,
  FileText,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import { getMarketingTemplates } from "./api";
import CreateMarketingTemplate from "./CreateMarketingTemplate";

const CATEGORIES = [
  "ALL",
  "MARKETING",
  "UTILITY",
  "AUTHENTICATION",
];

const STATUSES = [
  "ALL",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "PAUSED",
  "DISABLED",
];

const buttonClass =
  "inline-flex items-center justify-center gap-2 " +
  "rounded-lg border border-gray-300 px-4 py-2 " +
  "text-sm font-medium transition hover:bg-gray-100 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

function StatusBadge({ status }) {
  const styles = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700",
    PAUSED: "bg-orange-100 text-orange-700",
    DISABLED: "bg-gray-200 text-gray-700",
  };

  const style =
    styles[status] || "bg-gray-100 text-gray-600";

  return (
    <span
      className={
        "inline-flex rounded-full px-3 py-1 " +
        "text-xs font-semibold " +
        style
      }
    >
      {status || "UNKNOWN"}
    </span>
  );
}

function TemplatePreview({ template }) {
  const components = template.components || [];
  const header = components.find((c) => c.type === "HEADER");
  const body = components.find((c) => c.type === "BODY");
  const footer = components.find((c) => c.type === "FOOTER");
  const buttons = components.filter((c) => c.type === "BUTTONS")
    .flatMap((c) => c.buttons || []);
  const isAuth = template.category === "AUTHENTICATION";
  const media = header?.format === "IMAGE" || header?.format === "VIDEO";
  const MediaIcon = header?.format === "VIDEO" ? Video : ImageIcon;

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-1 flex-col p-4" style={{
        backgroundColor: "#eeeae2",
        backgroundImage: "radial-gradient(#d7d2c9 0.7px, transparent 0.7px)",
        backgroundSize: "16px 16px",
      }}>
        <div className="space-y-3 rounded-xl bg-white p-3.5 shadow-sm">
          {media && (
            <div className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
              <div className="rounded-full bg-white p-4 text-emerald-700 shadow-sm">
                <MediaIcon size={28} aria-hidden="true" />
              </div>
              <span className="text-xs font-medium">{header.format === "VIDEO" ? "Video header" : "Image header"}</span>
            </div>
          )}
          {header?.format === "TEXT" && header.text && (
            <p className="whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{header.text}</p>
          )}
          {header?.format === "DOCUMENT" && (
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><FileText size={20} /> Document header</div>
          )}
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">
            {body?.text || (isAuth ? "Your verification code is {{1}}." : "No message text available.")}
          </p>
          {body?.add_security_recommendation && !body?.text && (
            <p className="text-sm text-slate-700">For your security, do not share this code.</p>
          )}
          {footer?.text && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-500">{footer.text}</p>}
          {!footer?.text && footer?.code_expiration_minutes != null && (
            <p className="text-xs text-slate-500">This code expires in {footer.code_expiration_minutes} minutes.</p>
          )}
        </div>
        {buttons.map((button, i) => {
          const Icon = button.type === "PHONE_NUMBER" ? Phone :
            button.type === "URL" ? ExternalLink :
            button.type === "OTP" || button.type === "COPY_CODE" ? Copy : Reply;
          return (
            <div key={i} className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2.5 text-center text-sm font-semibold text-emerald-700 shadow-sm">
              <Icon size={16} className="shrink-0" aria-hidden="true" />
              <span className="break-words min-w-0">{button.text || button.otp_type || button.type}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-200 p-4">
        <h3 className="break-words text-sm font-semibold text-slate-900">{template.name}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{template.category}</span>
          <StatusBadge status={template.status} />
          <span className="text-xs text-slate-500">{template.language}</span>
        </div>
      </div>
    </article>
  );
}

export default function MarketingTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  async function loadTemplates() {
    setLoading(true);
    setError("");

    try {
      const data = await getMarketingTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message || "Unable to load templates.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const counts = useMemo(() => {
    return {
      total: templates.length,
      approved: templates.filter(
        (t) => t.status === "APPROVED"
      ).length,
      pending: templates.filter(
        (t) => t.status === "PENDING"
      ).length,
      rejected: templates.filter(
        (t) => t.status === "REJECTED"
      ).length,
    };
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase();

    return templates.filter((template) => {
      const categoryMatches =
        categoryFilter === "ALL" ||
        template.category === categoryFilter;

      const statusMatches =
        statusFilter === "ALL" ||
        template.status === statusFilter;

      const searchMatches =
        !term ||
        (template.name || "").toLowerCase().includes(term) ||
        (template.language || "").toLowerCase().includes(term);

      return (
        categoryMatches &&
        statusMatches &&
        searchMatches
      );
    });
  }, [templates, categoryFilter, statusFilter, search]);

  function getTemplateKey(template) {
    return (
      template.id ||
      `${template.name}-${template.language}`
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            WhatsApp Template Manager
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create, manage and track Meta WhatsApp templates.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass}
            onClick={loadTemplates}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            {showCreateForm
              ? "Close Form"
              : "Create Template"}
          </button>
        </div>
      </div>

      {/* Create Template Form */}
      {showCreateForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <CreateMarketingTemplate
            onCreated={() => {
              loadTemplates();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Templates",
            value: counts.total,
            icon: FileText,
            color: "text-blue-600",
          },
          {
            label: "Approved",
            value: counts.approved,
            icon: CheckCircle2,
            color: "text-green-600",
          },
          {
            label: "Pending",
            value: counts.pending,
            icon: Clock3,
            color: "text-yellow-600",
          },
          {
            label: "Rejected",
            value: counts.rejected,
            icon: XCircle,
            color: "text-red-600",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Icon size={18} className={item.color} />
                <p className="text-xs font-medium text-gray-500">
                  {item.label}
                </p>
              </div>

              <p className="mt-3 text-2xl font-bold text-gray-900">
                {item.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={
                "rounded-lg px-3 py-2 text-xs font-semibold transition " +
                (categoryFilter === category
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200")
              }
            >
              {category === "ALL"
                ? "All Templates"
                : category.charAt(0) +
                  category.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search template name..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status === "ALL"
                  ? "All Statuses"
                  : status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}

          <button
            type="button"
            onClick={loadTemplates}
            className="ml-3 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="py-8 text-center text-sm text-gray-500">
          Loading templates...
        </p>
      )}

      {/* Template List */}
      {!loading && !error && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Showing {filteredTemplates.length} of{" "}
            {templates.length} templates
          </p>

          {filteredTemplates.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              No templates match your filters.
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((template) => (
              <TemplatePreview key={getTemplateKey(template)} template={template} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
