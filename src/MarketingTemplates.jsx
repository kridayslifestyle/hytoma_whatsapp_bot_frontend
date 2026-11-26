
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
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

  if (components.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No preview components available.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {components.map((component, index) => (
        <div
          key={index}
          className="rounded-lg bg-gray-50 p-4"
        >
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
            {component.type}
          </p>

          {component.text && (
            <p className="whitespace-pre-wrap break-words text-sm text-gray-800">
              {component.text}
            </p>
          )}

          {component.format && (
            <p className="text-sm text-gray-600">
              Media type: {component.format}
            </p>
          )}

          {component.example && (
            <p className="mt-2 text-xs text-gray-500">
              Template includes example values.
            </p>
          )}

          {component.add_security_recommendation && (
            <p className="text-sm text-gray-700">
              Security recommendation enabled
            </p>
          )}

          {component.code_expiration_minutes != null && (
            <p className="text-sm text-gray-700">
              OTP expires in{" "}
              {component.code_expiration_minutes} minutes
            </p>
          )}

          {component.buttons?.map((button, i) => (
            <div
              key={i}
              className="mt-2 rounded-lg border bg-white px-3 py-2 text-center text-sm font-medium"
            >
              {button.text || button.otp_type || button.type}
            </div>
          ))}
        </div>
      ))}
    </div>
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
  const [expandedId, setExpandedId] = useState(null);

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

          {filteredTemplates.map((template) => {
            const key = getTemplateKey(template);
            const expanded = expandedId === key;

            return (
              <div
                key={key}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expanded ? null : key)
                  }
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="break-all text-sm font-semibold text-gray-900">
                      {template.name}
                    </h3>

                    <p className="mt-2 text-xs text-gray-500">
                      {template.category} · {template.language}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={template.status} />

                    {expanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-gray-200 p-4">
                    <TemplatePreview template={template} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
