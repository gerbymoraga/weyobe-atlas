import { useEffect, useState, type FormEvent } from "react";
import { coreApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/EmptyState";

const axes = ["profession", "health", "relationships", "adventure"] as const;

export function CorePage() {
  const [values, setValues] = useState({
    profession: 50,
    health: 50,
    relationships: 50,
    adventure: 50,
  });
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void coreApi
      .latest()
      .then((latest) => {
        if (latest) {
          setValues({
            profession: latest.profession,
            health: latest.health,
            relationships: latest.relationships,
            adventure: latest.adventure,
          });
          setSavedAt(latest.checked_in_at);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const row = await coreApi.save(values);
      setSavedAt(row.checked_in_at);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div>
      <PageHeader
        title="CORE Check-In"
        subtitle="Four directions — profession, health, relationships, adventure."
      />
      <form onSubmit={(e) => void onSubmit(e)} className="max-w-xl space-y-6 border border-[var(--line)] bg-panel/50 p-6">
        {axes.map((axis) => (
          <label key={axis} className="block">
            <div className="mb-2 flex justify-between font-ui text-xs uppercase tracking-wider">
              <span>{axis}</span>
              <span className="text-brass">{values[axis]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={values[axis]}
              onChange={(e) =>
                setValues({ ...values, [axis]: Number(e.target.value) })
              }
              className="w-full accent-[var(--brass)]"
            />
          </label>
        ))}
        <button
          type="submit"
          disabled={busy}
          className="bg-brass px-5 py-3 font-ui text-xs uppercase tracking-[0.14em] text-ink disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save check-in"}
        </button>
        {savedAt ? (
          <p className="font-ui text-xs text-[var(--muted)]">Last saved {new Date(savedAt).toLocaleString()}</p>
        ) : null}
      </form>
    </div>
  );
}
