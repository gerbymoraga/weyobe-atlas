import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  adminApi,
  type AdminApplication,
  type AdminEvent,
  type AdminKit,
  type AdminResource,
  type AdminStats,
} from "../api/endpoints";
import { PageHeader } from "../components/ui/PageHeader";
import { EmptyState, Skeleton } from "../components/ui/EmptyState";
import { formatCents } from "../lib/format";
import type { Member } from "../types";

type Tab = "overview" | "events" | "resources" | "kits" | "applications" | "members";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "events", label: "Events" },
  { id: "resources", label: "Library" },
  { id: "kits", label: "Kits" },
  { id: "applications", label: "Applications" },
  { id: "members", label: "Members" },
];

const KIT_STATUSES: AdminKit["status"][] = ["ordered", "packed", "shipped", "delivered"];

function emptyEventForm(): Omit<AdminEvent, "id" | "seats_taken" | "addons"> {
  const open = new Date();
  open.setDate(open.getDate() - 7);
  const pub = new Date();
  pub.setDate(pub.getDate() + 7);
  const start = new Date();
  start.setDate(start.getDate() + 45);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  const iso = (d: Date) => d.toISOString();
  const day = (d: Date) => d.toISOString().slice(0, 10);
  return {
    title: "",
    location: "",
    description: "",
    starts_on: day(start),
    ends_on: day(end),
    member_price: 45000,
    regular_price: 65000,
    expedition_only: false,
    family_friendly: false,
    capacity: 30,
    member_open_at: iso(open),
    public_open_at: iso(pub),
    image_url: null,
  };
}

export function AdminSettingsPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [resources, setResources] = useState<AdminResource[] | null>(null);
  const [kits, setKits] = useState<AdminKit[] | null>(null);
  const [apps, setApps] = useState<AdminApplication[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [resourceForm, setResourceForm] = useState<Omit<AdminResource, "id">>({
    name: "",
    category: "Gear & Apparel",
    rating: 4.5,
    discount_label: "",
    discount_url: "https://",
    description: "",
    how_to_redeem: "",
  });
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setNote(null);
    try {
      if (tab === "overview") setStats(await adminApi.stats());
      if (tab === "events") setEvents(await adminApi.events.list());
      if (tab === "resources") setResources(await adminApi.resources.list());
      if (tab === "kits") setKits(await adminApi.kit.list());
      if (tab === "applications") setApps(await adminApi.applications.list());
      if (tab === "members") setMembers(await adminApi.members());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Failed to load admin data");
    }
  }, [tab]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveEvent(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingEventId) {
        await adminApi.events.update(editingEventId, eventForm);
        setNote("Event updated.");
      } else {
        await adminApi.events.create(eventForm);
        setNote("Event created.");
      }
      setEditingEventId(null);
      setEventForm(emptyEventForm());
      setEvents(await adminApi.events.list());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Save failed");
    }
  }

  async function saveResource(e: FormEvent) {
    e.preventDefault();
    try {
      if (editingResourceId) {
        await adminApi.resources.update(editingResourceId, resourceForm);
        setNote("Resource updated.");
      } else {
        await adminApi.resources.create(resourceForm);
        setNote("Resource created.");
      }
      setEditingResourceId(null);
      setResourceForm({
        name: "",
        category: "Gear & Apparel",
        rating: 4.5,
        discount_label: "",
        discount_url: "https://",
        description: "",
        how_to_redeem: "",
      });
      setResources(await adminApi.resources.list());
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Save failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Admin Settings"
        subtitle="Master records — events, library, kits, applications. Atlas Superadmin only."
      />
      {note ? <p className="mb-4 font-ui text-sm text-brass">{note}</p> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`font-ui text-xs uppercase tracking-wider px-3 py-1.5 border ${
              tab === t.id
                ? "border-brass text-brass"
                : "border-[var(--line)] text-[var(--muted)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          {!stats ? (
            <Skeleton className="h-32" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["Members", stats.members],
                  ["Events", stats.events],
                  ["Library", stats.resources],
                  ["Kits", stats.kit_shipments],
                  ["Pending apps", stats.pending_applications],
                  ["Bookings", stats.bookings],
                ] as const
              ).map(([label, n]) => (
                <li
                  key={label}
                  className="border border-[var(--line)] bg-panel/40 px-4 py-5"
                >
                  <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                    {label}
                  </p>
                  <p className="mt-2 font-display text-3xl">{n}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "events" && (
        <div className="space-y-8">
          <form
            onSubmit={(e) => void saveEvent(e)}
            className="border border-[var(--line)] bg-panel/40 p-5 space-y-3"
          >
            <p className="font-display text-xl">
              {editingEventId ? "Edit event" : "Add event"}
            </p>
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Title"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              required
            />
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Location"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            />
            <textarea
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Description"
              rows={3}
              value={eventForm.description}
              onChange={(e) =>
                setEventForm({ ...eventForm, description: e.target.value })
              }
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="font-ui text-xs text-[var(--muted)]">
                Starts
                <input
                  type="date"
                  className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                  value={eventForm.starts_on}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, starts_on: e.target.value })
                  }
                  required
                />
              </label>
              <label className="font-ui text-xs text-[var(--muted)]">
                Ends
                <input
                  type="date"
                  className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                  value={eventForm.ends_on}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, ends_on: e.target.value })
                  }
                  required
                />
              </label>
              <label className="font-ui text-xs text-[var(--muted)]">
                Member price (cents)
                <input
                  type="number"
                  className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                  value={eventForm.member_price}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      member_price: Number(e.target.value),
                    })
                  }
                  required
                />
              </label>
              <label className="font-ui text-xs text-[var(--muted)]">
                Regular price (cents)
                <input
                  type="number"
                  className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                  value={eventForm.regular_price}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      regular_price: Number(e.target.value),
                    })
                  }
                  required
                />
              </label>
              <label className="font-ui text-xs text-[var(--muted)]">
                Capacity (0 = unlimited)
                <input
                  type="number"
                  className="mt-1 w-full border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                  value={eventForm.capacity}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, capacity: Number(e.target.value) })
                  }
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4 font-ui text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventForm.expedition_only}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      expedition_only: e.target.checked,
                    })
                  }
                />
                Expedition only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventForm.family_friendly}
                  onChange={(e) =>
                    setEventForm({
                      ...eventForm,
                      family_friendly: e.target.checked,
                    })
                  }
                />
                Family friendly
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-ink"
              >
                {editingEventId ? "Update" : "Create"}
              </button>
              {editingEventId ? (
                <button
                  type="button"
                  className="border border-[var(--line)] px-4 py-2 font-ui text-xs uppercase tracking-wider"
                  onClick={() => {
                    setEditingEventId(null);
                    setEventForm(emptyEventForm());
                  }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>

          {!events ? (
            <Skeleton className="h-40" />
          ) : events.length === 0 ? (
            <EmptyState title="No events" body="Create the first expedition above." />
          ) : (
            <ul className="space-y-3">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="border border-[var(--line)] bg-panel/40 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl">{ev.title}</p>
                      <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                        {ev.location} · {ev.starts_on} → {ev.ends_on} ·{" "}
                        {formatCents(ev.member_price)} · {ev.seats_taken}/{ev.capacity || "∞"}{" "}
                        seats
                        {ev.expedition_only ? " · Expedition only" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="border border-brass px-3 py-1.5 font-ui text-xs uppercase tracking-wider text-brass"
                        onClick={() => {
                          setEditingEventId(ev.id);
                          setEventForm({
                            title: ev.title,
                            location: ev.location,
                            description: ev.description,
                            starts_on: ev.starts_on,
                            ends_on: ev.ends_on,
                            member_price: ev.member_price,
                            regular_price: ev.regular_price,
                            expedition_only: ev.expedition_only,
                            family_friendly: ev.family_friendly,
                            capacity: ev.capacity,
                            member_open_at: ev.member_open_at,
                            public_open_at: ev.public_open_at,
                            image_url: ev.image_url ?? null,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="border border-[var(--line)] px-3 py-1.5 font-ui text-xs uppercase tracking-wider text-[var(--muted)]"
                        onClick={() => {
                          void (async () => {
                            try {
                              await adminApi.events.remove(ev.id);
                              setEvents(await adminApi.events.list());
                              setNote("Event deleted.");
                            } catch (err) {
                              setNote(
                                err instanceof Error ? err.message : "Delete failed",
                              );
                            }
                          })();
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {ev.addons.length > 0 ? (
                    <ul className="mt-3 space-y-1 font-ui text-xs text-[var(--muted)]">
                      {ev.addons.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-2">
                          <span>
                            {a.name} · {formatCents(a.price)}
                          </span>
                          <button
                            type="button"
                            className="text-brass"
                            onClick={() => {
                              void (async () => {
                                await adminApi.events.removeAddon(a.id);
                                setEvents(await adminApi.events.list());
                              })();
                            }}
                          >
                            Remove addon
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <button
                    type="button"
                    className="mt-3 font-ui text-xs uppercase tracking-wider text-brass"
                    onClick={() => {
                      const name = window.prompt("Addon name");
                      if (!name) return;
                      const priceRaw = window.prompt("Price in cents", "5000");
                      const price = Number(priceRaw ?? 0);
                      void (async () => {
                        await adminApi.events.addAddon(ev.id, { name, price });
                        setEvents(await adminApi.events.list());
                      })();
                    }}
                  >
                    + Addon
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "resources" && (
        <div className="space-y-8">
          <form
            onSubmit={(e) => void saveResource(e)}
            className="border border-[var(--line)] bg-panel/40 p-5 space-y-3"
          >
            <p className="font-display text-xl">
              {editingResourceId ? "Edit resource" : "Add resource"}
            </p>
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Name"
              value={resourceForm.name}
              onChange={(e) => setResourceForm({ ...resourceForm, name: e.target.value })}
              required
            />
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Category"
              value={resourceForm.category}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, category: e.target.value })
              }
              required
            />
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Discount label"
              value={resourceForm.discount_label ?? ""}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, discount_label: e.target.value })
              }
            />
            <input
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="Discount URL"
              value={resourceForm.discount_url ?? ""}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, discount_url: e.target.value })
              }
            />
            <textarea
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="About / description"
              rows={3}
              value={resourceForm.description ?? ""}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, description: e.target.value })
              }
            />
            <textarea
              className="w-full border border-[var(--line)] bg-transparent px-3 py-2 font-ui text-sm"
              placeholder="How to redeem"
              rows={3}
              value={resourceForm.how_to_redeem ?? ""}
              onChange={(e) =>
                setResourceForm({ ...resourceForm, how_to_redeem: e.target.value })
              }
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-brass px-4 py-2 font-ui text-xs uppercase tracking-wider text-ink"
              >
                {editingResourceId ? "Update" : "Create"}
              </button>
              {editingResourceId ? (
                <button
                  type="button"
                  className="border border-[var(--line)] px-4 py-2 font-ui text-xs uppercase tracking-wider"
                  onClick={() => setEditingResourceId(null)}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
          {!resources ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="space-y-3">
              {resources.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 border border-[var(--line)] bg-panel/40 px-4 py-4"
                >
                  <div>
                    <p className="font-display text-xl">{r.name}</p>
                    <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                      {r.category}
                      {r.discount_label ? ` · ${r.discount_label}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="border border-brass px-3 py-1.5 font-ui text-xs uppercase tracking-wider text-brass"
                      onClick={() => {
                        setEditingResourceId(r.id);
                        setResourceForm({
                          name: r.name,
                          category: r.category,
                          rating: r.rating,
                          discount_label: r.discount_label,
                          discount_url: r.discount_url,
                          description: r.description ?? "",
                          how_to_redeem: r.how_to_redeem ?? "",
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="border border-[var(--line)] px-3 py-1.5 font-ui text-xs uppercase tracking-wider text-[var(--muted)]"
                      onClick={() => {
                        void (async () => {
                          await adminApi.resources.remove(r.id);
                          setResources(await adminApi.resources.list());
                        })();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "kits" && (
        <div>
          {!kits ? (
            <Skeleton className="h-40" />
          ) : kits.length === 0 ? (
            <EmptyState title="No kits" body="Kit rows appear after member seed or signup fulfillment." />
          ) : (
            <ul className="space-y-3">
              {kits.map((k) => (
                <li
                  key={k.id}
                  className="border border-[var(--line)] bg-panel/40 px-4 py-4"
                >
                  <p className="font-display text-xl">
                    {k.member_name || k.member_email}
                  </p>
                  <p className="font-ui text-xs text-[var(--muted)]">{k.member_email}</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="font-ui text-xs text-[var(--muted)]">
                      Status
                      <select
                        className="mt-1 block border border-[var(--line)] bg-transparent px-3 py-2 text-sm text-bone"
                        value={k.status}
                        onChange={(e) => {
                          const status = e.target.value as AdminKit["status"];
                          void (async () => {
                            await adminApi.kit.update(k.id, {
                              status,
                              carrier: k.carrier ?? undefined,
                              tracking_number: k.tracking_number ?? undefined,
                              est_delivery: k.est_delivery ?? undefined,
                            });
                            setKits(await adminApi.kit.list());
                            setNote(`Kit updated → ${status}`);
                          })();
                        }}
                      >
                        {KIT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p className="font-ui text-xs text-[var(--muted)]">
                      {k.carrier || "—"} · {k.tracking_number || "no tracking"}
                      {k.est_delivery ? ` · ETA ${k.est_delivery}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "applications" && (
        <div>
          {!apps ? (
            <Skeleton className="h-40" />
          ) : apps.length === 0 ? (
            <EmptyState title="No applications" body="Expedition applications will show here." />
          ) : (
            <ul className="space-y-3">
              {apps.map((a) => (
                <li
                  key={a.id}
                  className="border border-[var(--line)] bg-panel/40 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-xl">
                        {a.member_name || a.member_email}
                      </p>
                      <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                        {a.status} · {a.member_email}
                      </p>
                      <p className="mt-2 text-sm text-[var(--muted)]">{a.motivation}</p>
                      <p className="mt-1 font-ui text-xs text-[var(--muted)]">
                        Experience: {a.experience_level} · Interest: {a.interest}
                      </p>
                    </div>
                    {a.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="bg-brass px-3 py-1.5 font-ui text-xs uppercase tracking-wider text-ink"
                          onClick={() => {
                            void (async () => {
                              await adminApi.applications.decide(a.id, "approved");
                              setApps(await adminApi.applications.list());
                              setNote("Application approved.");
                            })();
                          }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="border border-[var(--line)] px-3 py-1.5 font-ui text-xs uppercase tracking-wider"
                          onClick={() => {
                            void (async () => {
                              await adminApi.applications.decide(a.id, "declined");
                              setApps(await adminApi.applications.list());
                              setNote("Application declined.");
                            })();
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "members" && (
        <div>
          {!members ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 border border-[var(--line)] bg-panel/40 px-4 py-3"
                >
                  <div>
                    <p className="font-display text-lg">
                      {m.first_name} {m.last_name}
                      {m.is_admin ? (
                        <span className="ml-2 font-ui text-[10px] uppercase tracking-wider text-brass">
                          Superadmin
                        </span>
                      ) : null}
                    </p>
                    <p className="font-ui text-xs text-[var(--muted)]">{m.email}</p>
                  </div>
                  <p className="font-ui text-xs uppercase tracking-wider text-[var(--muted)]">
                    {m.tier} · {m.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
