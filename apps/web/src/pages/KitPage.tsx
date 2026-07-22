import { useEffect, useState } from "react";
import { kitApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import type { KitShipment } from "../types";

const STEPS: KitShipment["status"][] = ["ordered", "packed", "shipped", "delivered"];

export function KitPage() {
  const [kit, setKit] = useState<KitShipment | null | undefined>(undefined);

  useEffect(() => {
    void kitApi
      .get()
      .then(setKit)
      .catch(() => setKit(null));
  }, []);

  return (
    <div>
      <PageHeader title="My Kit" subtitle="Welcome box fulfillment and tracking." />
      {kit === undefined ? (
        <Skeleton className="h-48" />
      ) : !kit ? (
        <EmptyState
          title="No shipment yet"
          body="Your kit is ordered when membership activates. Ops updates status manually for the pilot."
        />
      ) : (
        <div className="border border-[var(--line)] bg-panel/50 p-6">
          <ol className="grid gap-3 sm:grid-cols-4">
            {STEPS.map((step, i) => {
              const current = STEPS.indexOf(kit.status);
              const done = i <= current;
              return (
                <li
                  key={step}
                  className={`border px-3 py-4 text-center font-ui text-xs uppercase tracking-wider ${
                    done ? "border-brass text-brass" : "border-[var(--line)] text-[var(--muted)]"
                  }`}
                >
                  {step}
                </li>
              );
            })}
          </ol>
          {(kit.carrier || kit.tracking_number) && (
            <p className="mt-6 font-ui text-sm text-[var(--muted)]">
              {kit.carrier} · {kit.tracking_number}
              {kit.est_delivery ? ` · ETA ${kit.est_delivery}` : ""}
            </p>
          )}
          <h2 className="mt-8 font-display text-xl">Contents</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[var(--muted)]">
            {kit.contents.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
