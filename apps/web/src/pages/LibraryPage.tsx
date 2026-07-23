import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { libraryApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import type { Resource } from "../types";

export function LibraryPage() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    void libraryApi
      .list()
      .then(setResources)
      .catch(() => setResources([]));
  }, []);

  const categories = useMemo(() => {
    const set = new Set((resources ?? []).map((r) => r.category));
    return ["all", ...Array.from(set)];
  }, [resources]);

  const filtered =
    resources?.filter((r) => category === "all" || r.category === category) ?? [];

  return (
    <div>
      <PageHeader
        title="Resource Library"
        subtitle="Member-gated vendor discounts and tools."
      />
      {resources === null ? (
        <Skeleton className="h-40" />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`font-ui text-xs uppercase tracking-wider px-3 py-1.5 border ${
                  category === c
                    ? "border-brass text-brass"
                    : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <EmptyState title="No resources" body="Library items will appear after seeding." />
          ) : (
            <ul className="space-y-3">
              {filtered.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 border border-[var(--line)] bg-panel/40 px-4 py-4"
                >
                  <div>
                    <p className="font-display text-xl">{r.name}</p>
                    <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                      {r.category}
                      {r.discount_label ? ` · ${r.discount_label}` : ""}
                    </p>
                  </div>
                  <Link
                    to={`/library/${r.id}`}
                    className="border border-brass px-3 py-2 font-ui text-xs uppercase tracking-wider text-brass"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
