import { useEffect, useMemo, useState } from "react";
import { libraryApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import type { Resource } from "../types";

export function LibraryPage() {
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<Resource | null>(null);

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

  async function openDetails(resource: Resource) {
    setSelected(resource);
    try {
      const full = await libraryApi.get(resource.id);
      setSelected(full);
    } catch {
      /* keep list row data */
    }
  }

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
                  <button
                    type="button"
                    onClick={() => void openDetails(r)}
                    className="border border-brass px-3 py-2 font-ui text-xs uppercase tracking-wider text-brass"
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="resource-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-[var(--line)] bg-ink p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-ui text-xs uppercase tracking-wider text-brass">
              {selected.category}
              {selected.rating != null ? ` · ★ ${selected.rating}` : ""}
            </p>
            <h2
              id="resource-detail-title"
              className="mt-2 font-display text-3xl text-bone"
            >
              {selected.name}
            </h2>
            {selected.discount_label ? (
              <p className="mt-3 inline-block border border-brass/50 px-3 py-1 font-ui text-xs uppercase tracking-wider text-brass">
                {selected.discount_label}
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              <section>
                <h3 className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                  About
                </h3>
                <p className="mt-2 text-[var(--muted)] leading-relaxed">
                  {selected.description?.trim() ||
                    "Member partner details coming soon. Check back after the next library update."}
                </p>
              </section>
              <section>
                <h3 className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                  How to redeem
                </h3>
                <p className="mt-2 text-[var(--muted)] leading-relaxed">
                  {selected.how_to_redeem?.trim() ||
                    "Use your ATLAS member email when claiming this offer. Full redemption steps will appear here once the partner finalizes onboarding."}
                </p>
              </section>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {selected.discount_url ? (
                <a
                  href={libraryApi.redirectUrl(selected.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-ink"
                >
                  Claim offer
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="border border-[var(--line)] px-4 py-2 font-ui text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
