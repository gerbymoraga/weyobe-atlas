import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { libraryApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import type { Resource } from "../types";

export function LibraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null | undefined>(undefined);

  useEffect(() => {
    if (!id) {
      setResource(null);
      return;
    }
    void libraryApi
      .get(id)
      .then(setResource)
      .catch(() => setResource(null));
  }, [id]);

  if (resource === undefined) {
    return (
      <div>
        <PageHeader title="Resource" subtitle="Loading partner details…" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div>
        <PageHeader title="Resource" subtitle="Partner not found." />
        <EmptyState
          title="Not found"
          body="This library item is missing or you are not signed in."
        />
        <Link
          to="/library"
          className="mt-4 inline-block border border-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-brass"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/library")}
        className="mb-4 font-ui text-xs uppercase tracking-wider text-[var(--muted)]"
      >
        ← Library
      </button>

      <p className="font-ui text-xs uppercase tracking-wider text-brass">
        {resource.category}
        {resource.rating != null ? ` · ★ ${resource.rating}` : ""}
      </p>
      <h1 className="mt-2 font-display text-4xl text-bone">{resource.name}</h1>
      {resource.discount_label ? (
        <p className="mt-4 inline-block border border-brass/50 px-3 py-1 font-ui text-xs uppercase tracking-wider text-brass">
          {resource.discount_label}
        </p>
      ) : null}

      <div className="mt-8 max-w-2xl space-y-8 border border-[var(--line)] bg-panel/40 p-6">
        <section>
          <h2 className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
            About
          </h2>
          <p className="mt-3 text-[var(--muted)] leading-relaxed">
            {resource.description?.trim() ||
              "Member partner details coming soon. Re-run the library seed to load sample copy."}
          </p>
        </section>
        <section>
          <h2 className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
            How to redeem
          </h2>
          <p className="mt-3 text-[var(--muted)] leading-relaxed">
            {resource.how_to_redeem?.trim() ||
              "Use your ATLAS member email when claiming this offer."}
          </p>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {resource.discount_url ? (
          <a
            href={resource.discount_url}
            target="_blank"
            rel="noreferrer"
            className="bg-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-ink"
          >
            Claim offer
          </a>
        ) : null}
        <Link
          to="/library"
          className="border border-[var(--line)] px-4 py-2 font-ui text-xs uppercase tracking-wider"
        >
          Back to Library
        </Link>
      </div>
    </div>
  );
}
