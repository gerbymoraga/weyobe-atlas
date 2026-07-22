import { useEffect, useMemo, useState } from "react";
import { eventsApi } from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import { formatCents, formatDate } from "../lib/format";
import type { EventItem } from "../types";

export function ExpeditionsPage() {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [selected, setSelected] = useState<EventItem | null>(null);
  const [attendees, setAttendees] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void eventsApi
      .list()
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const previewCents = useMemo(() => {
    if (!selected) return 0;
    const addons = selected.addons
      .filter((a) => addonIds.includes(a.id))
      .reduce((sum, a) => sum + a.price, 0);
    return selected.member_price * attendees + addons;
  }, [selected, attendees, addonIds]);

  async function book() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const booking = await eventsApi.book(selected.id, {
        attendee_count: attendees,
        addon_ids: addonIds,
      });
      setMessage(
        booking.amount_paid === 0
          ? "Comped booking confirmed."
          : `Booked — pay ${formatCents(booking.amount_paid)} (server total).`,
      );
      setSelected(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Expeditions"
        subtitle="Tier-aware pricing and early booking — totals are always computed on the server."
      />
      {message ? <p className="mb-4 font-ui text-sm text-brass">{message}</p> : null}
      {events === null ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : events.length === 0 ? (
        <EmptyState title="No expeditions yet" body="Events will appear here for the pilot." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="border border-[var(--line)] bg-panel/50 p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl">{event.title}</h2>
                {event.expedition_only ? (
                  <span className="font-ui text-[10px] uppercase tracking-wider text-brass">
                    Expedition
                  </span>
                ) : null}
              </div>
              <p className="mt-1 font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                {event.location} · {formatDate(event.starts_on)}
              </p>
              <p className="mt-3 text-[var(--muted)]">{event.description}</p>
              <p className="mt-4 font-ui text-sm">
                <span className="text-bone">{formatCents(event.member_price)}</span>
                <span className="ml-2 text-[var(--muted)] line-through">
                  {formatCents(event.regular_price)}
                </span>
              </p>
              {!event.bookable && event.bookable_reason === "upgrade_required" ? (
                <p className="mt-4 border border-brass/40 px-3 py-2 font-ui text-xs uppercase tracking-wider text-brass">
                  Upgrade to Attend
                </p>
              ) : (
                <button
                  type="button"
                  disabled={!event.bookable}
                  onClick={() => {
                    setSelected(event);
                    setAttendees(1);
                    setAddonIds([]);
                  }}
                  className="mt-4 border border-brass px-4 py-2 font-ui text-xs uppercase tracking-[0.14em] text-brass disabled:opacity-40"
                >
                  {event.bookable ? "Book" : event.bookable_reason.replaceAll("_", " ")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-4">
          <div className="w-full max-w-md border border-[var(--line)] bg-panel p-6">
            <h3 className="font-display text-2xl">{selected.title}</h3>
            <label className="mt-4 block font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
              Attendees
              <input
                type="number"
                min={1}
                value={attendees}
                onChange={(e) => setAttendees(Number(e.target.value) || 1)}
                className="mt-2 w-full border border-[var(--line)] bg-ink px-3 py-2"
              />
            </label>
            <div className="mt-4 space-y-2">
              {selected.addons.map((addon) => (
                <label key={addon.id} className="flex items-center gap-2 font-ui text-sm">
                  <input
                    type="checkbox"
                    checked={addonIds.includes(addon.id)}
                    onChange={(e) => {
                      setAddonIds((ids) =>
                        e.target.checked
                          ? [...ids, addon.id]
                          : ids.filter((id) => id !== addon.id),
                      );
                    }}
                  />
                  {addon.name} ({formatCents(addon.price)})
                </label>
              ))}
            </div>
            <p className="mt-4 font-ui text-sm text-[var(--muted)]">
              Preview: {formatCents(previewCents)} (server is authoritative)
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 border border-[var(--line)] px-3 py-2 font-ui text-xs uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void book()}
                className="flex-1 bg-brass px-3 py-2 font-ui text-xs uppercase tracking-wider text-ink disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
