
import { useEffect, useState } from "react";
import { Plus, Users, RefreshCw } from "lucide-react";
import { apiRequest } from "./api";

export default function SalesTeam() {
  const [people, setPeople] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingNames, setEditingNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadPeople() {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest("/admin/salespeople");
      const list = data.salespeople || [];
      setPeople(list);

      setEditingNames(
        Object.fromEntries(
          list.map((person) => [person.id, person.name])
        )
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPeople();
  }, []);

  async function addPerson(event) {
    event.preventDefault();

    if (!newName.trim()) return;

    setCreating(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/admin/salespeople", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
        }),
      });

      setNewName("");
      await loadPeople();
      setNotice("Salesperson created successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function updatePerson(person, changes) {
    setBusyId(person.id);
    setError("");
    setNotice("");

    try {
      await apiRequest(`/admin/salespeople/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      });

      await loadPeople();
      setNotice("Salesperson updated successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = people.filter(
    (person) => person.is_active
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Users size={18} />
            Total Salespeople
          </div>
          <div className="mt-3 text-3xl font-semibold">
            {people.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">
            Active Salespeople
          </div>
          <div className="mt-3 text-3xl font-semibold text-emerald-700">
            {activeCount}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">
          Add Salesperson
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Add team members who can be assigned customer leads.
          They do not receive dashboard logins.
        </p>

        <form
          onSubmit={addPerson}
          className="mt-5 flex flex-wrap gap-3"
        >
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Enter salesperson name"
            maxLength={100}
            required
            className="min-w-[220px] flex-1 rounded-xl
              border border-slate-200 px-4 py-3 text-sm
              outline-none focus:border-emerald-500"
          />

          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="inline-flex items-center gap-2 rounded-xl
              bg-emerald-600 px-5 py-3 text-sm font-semibold
              text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <Plus size={17} />
            {creating ? "Adding..." : "Add Salesperson"}
          </button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div>
            <h2 className="font-semibold">Sales Team</h2>
            <p className="mt-1 text-xs text-slate-500">
              Manage active and inactive salespeople
            </p>
          </div>

          <button
            type="button"
            onClick={loadPeople}
            disabled={loading}
            className="rounded-lg border border-slate-200 p-2"
            aria-label="Refresh salespeople"
          >
            <RefreshCw size={17} />
          </button>
        </div>

        {error && (
          <p role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mx-5 mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        {loading ? (
          <p className="p-6 text-sm text-slate-500">
            Loading sales team...
          </p>
        ) : people.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No salespeople yet. Add your first team member above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {people.map((person) => (
              <div
                key={person.id}
                className="flex flex-wrap items-center gap-3 p-5"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-700">
                  {person.name.slice(0, 1).toUpperCase()}
                </div>

                <div className="min-w-[180px] flex-1">
                  <input
                    aria-label={`Name for ${person.name}`}
                    value={editingNames[person.id] ?? person.name}
                    onChange={(event) =>
                      setEditingNames((previous) => ({
                        ...previous,
                        [person.id]: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <span className={`mt-1 inline-block text-xs ${
                    person.is_active
                      ? "text-emerald-700"
                      : "text-slate-400"
                  }`}>
                    {person.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={
                    busyId !== null ||
                    !editingNames[person.id]?.trim() ||
                    editingNames[person.id].trim() === person.name
                  }
                  onClick={() => updatePerson(person, {
                    name: editingNames[person.id].trim(),
                  })}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium disabled:opacity-40"
                >
                  Save Name
                </button>

                <button
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => updatePerson(person, {
                    is_active: !person.is_active,
                  })}
                  className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40 ${
                    person.is_active
                      ? "bg-amber-50 text-amber-800"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {person.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
