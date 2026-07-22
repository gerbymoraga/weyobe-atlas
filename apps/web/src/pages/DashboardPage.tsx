import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  coreApi,
  eventsApi,
  kitApi,
  libraryApi,
  membershipApi,
} from "../api/endpoints";
import { useAuth } from "../contexts/AuthContext";
import { formatCents, formatDate } from "../lib/format";
import type {
  Booking,
  CoreCheckin,
  EventItem,
  KitShipment,
  Membership,
  Resource,
} from "../types";

const KIT_STEPS: KitShipment["status"][] = [
  "ordered",
  "packed",
  "shipped",
  "delivered",
];

const CORE_AXES = [
  { key: "profession", label: "Profession", compass: "N" },
  { key: "health", label: "Health", compass: "E" },
  { key: "relationships", label: "Relationships", compass: "S" },
  { key: "adventure", label: "Adventure", compass: "W" },
] as const;

export function DashboardPage() {
  const { member } = useAuth();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [kit, setKit] = useState<KitShipment | null | undefined>(undefined);
  const [core, setCore] = useState<CoreCheckin | null | undefined>(undefined);
  const [resource, setResource] = useState<Resource | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    void Promise.all([
      eventsApi.bookings().then(setBookings).catch(() => setBookings([])),
      eventsApi.list().then(setEvents).catch(() => setEvents([])),
      kitApi.get().then(setKit).catch(() => setKit(null)),
      coreApi.latest().then(setCore).catch(() => setCore(null)),
      libraryApi
        .list()
        .then((list) => setResource(list[0] ?? null))
        .catch(() => setResource(null)),
      membershipApi.get().then(setMembership).catch(() => setMembership(null)),
    ]);
  }, []);

  const nextEvent = useMemo(() => {
    const confirmed = (bookings ?? []).filter((b) => b.status === "confirmed");
    if (!confirmed.length) return null;
    const byId = new Map(events.map((e) => [e.id, e]));
    const withEvent = confirmed
      .map((b) => ({ booking: b, event: byId.get(b.event_id) }))
      .filter((x): x is { booking: Booking; event: EventItem } => Boolean(x.event))
      .sort(
        (a, b) =>
          new Date(a.event.starts_on).getTime() -
          new Date(b.event.starts_on).getTime(),
      );
    return withEvent[0] ?? null;
  }, [bookings, events]);

  const daysOut = useMemo(() => {
    if (!nextEvent) return null;
    const start = new Date(nextEvent.event.starts_on);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.max(
      0,
      Math.round((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
    );
  }, [nextEvent]);

  const openEvents = events.filter((e) => e.bookable).length;
  const bookedCount = (bookings ?? []).filter((b) => b.status === "confirmed").length;
  const kitIndex = kit ? KIT_STEPS.indexOf(kit.status) : -1;

  const coreDaysAgo = useMemo(() => {
    if (!core?.checked_in_at) return null;
    const ms = Date.now() - new Date(core.checked_in_at).getTime();
    return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
  }, [core]);

  const lowAxis = useMemo(() => {
    if (!core) return null;
    const scores = CORE_AXES.map((a) => ({
      label: a.label,
      value: core[a.key],
    })).sort((a, b) => a.value - b.value);
    return scores[0];
  }, [core]);

  const challengeDays = 8;
  const challengeTotal = 20;
  const challengePct = Math.round((challengeDays / challengeTotal) * 100);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
    new Date(),
  );

  return (
    <div>
      <div className="greet">
        <div className="hi">
          Welcome back, <em>{member?.first_name || "Member"}.</em>
        </div>
        <div className="sub">
          {nextEvent && daysOut !== null
            ? daysOut === 0
              ? `Your next expedition is today — ${nextEvent.event.title}.`
              : `You're ${daysOut} day${daysOut === 1 ? "" : "s"} out from your next expedition. Here's where you stand across the map.`
            : "Here's where you stand across the map. Book an expedition to set your next waypoint."}
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <FeatureCard next={nextEvent} />

          <div className="stat3">
            <div className="stat-card">
              <div className="n">{bookings === null ? "—" : bookedCount}</div>
              <div className="l label">Expedition Booked</div>
              <div className="s">
                {openEvents > 0
                  ? `${openEvents} more open to you`
                  : "Browse the calendar"}
              </div>
            </div>
            <div className="stat-card">
              <div className="n">
                {membership
                  ? formatCents(membership.savings_to_date_cents)
                  : "$0"}
              </div>
              <div className="l label">Member Savings</div>
              <div className="s">This year to date</div>
            </div>
            <div className="stat-card">
              <div className="n">{challengeDays}</div>
              <div className="l label">Day Challenge Streak</div>
              <div className="s">Keep it alive</div>
            </div>
          </div>

          <div className="card">
            <div className="card-h">
              <span className="t">This Month's Challenge</span>
              <span className="pill dim">{monthLabel}</span>
            </div>
            <div
              style={{
                fontFamily: "var(--disp)",
                fontSize: 26,
                textTransform: "uppercase",
                color: "var(--bone)",
                fontWeight: 700,
              }}
            >
              Cold Exposure · 20 Days
            </div>
            <div
              style={{
                color: "var(--bone-dim)",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              Two minutes of cold, every day. Log it to enter this month's gear
              giveaway.
            </div>
            <div className="prog">
              <i style={{ width: `${challengePct}%` }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="label">
                {challengeDays} of {challengeTotal} days
              </span>
              <span className="label" style={{ color: "var(--brass)" }}>
                Prize: Blackfoot Kit
              </span>
            </div>
          </div>
        </div>

        <div className="dash-col">
          <div className="card kit-mini">
            <div className="card-h">
              <span className="t">Kit Status</span>
              <Link to="/kit" className="pill">
                Track
              </Link>
            </div>
            {kit === undefined ? (
              <div className="label">Loading…</div>
            ) : !kit ? (
              <div style={{ color: "var(--bone-dim)", fontSize: 13 }}>
                Your kit ships after membership activates.
              </div>
            ) : (
              <>
                <div className="steps">
                  {KIT_STEPS.map((step, i) => {
                    const done = i < kitIndex;
                    const active = i === kitIndex;
                    return (
                      <div
                        key={step}
                        className={`step${done ? " done" : ""}${active ? " active" : ""}`}
                      >
                        <div className="bar" />
                        <div className="dot" />
                        <div className="sl">{step}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ color: "var(--bone-dim)", fontSize: 13 }}>
                  {kit.status === "delivered"
                    ? "Your Atlas Kit has arrived."
                    : kit.est_delivery
                      ? (
                          <>
                            Your Atlas Kit is on the way — arriving{" "}
                            <b style={{ color: "var(--bone)" }}>
                              {formatDate(kit.est_delivery)}
                            </b>
                            .
                          </>
                        )
                      : `Status: ${kit.status}.`}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-h">
              <span className="t">Your Compass</span>
              <Link to="/core" className="pill">
                Check-In
              </Link>
            </div>
            {core === undefined ? (
              <div className="label">Loading…</div>
            ) : !core ? (
              <div style={{ color: "var(--bone-dim)", fontSize: 13 }}>
                No check-in yet. Set your four directions.
              </div>
            ) : (
              <>
                <div className="core-quick">
                  {CORE_AXES.map((axis) => (
                    <div className="core-cell" key={axis.key}>
                      <div className="cd">
                        <span className="b">{axis.compass}</span>
                        <span className="cn">{axis.label}</span>
                      </div>
                      <div className="cbar">
                        <i style={{ width: `${core[axis.key]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="devnote">
                  {coreDaysAgo === 0
                    ? "Checked in today."
                    : `Last check-in: ${coreDaysAgo} day${coreDaysAgo === 1 ? "" : "s"} ago.`}
                  {lowAxis && lowAxis.value < 50
                    ? ` ${lowAxis.label} is trending low.`
                    : ""}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-h">
              <span className="t">From the Library</span>
            </div>
            {resource ? (
              <>
                <div
                  style={{
                    fontFamily: "var(--disp)",
                    fontSize: 20,
                    textTransform: "uppercase",
                    color: "var(--bone)",
                    fontWeight: 600,
                  }}
                >
                  {resource.name}
                </div>
                <div className="label" style={{ margin: "6px 0" }}>
                  {resource.category}
                  {resource.rating != null ? ` · ★ ${resource.rating}` : ""}
                </div>
                <div style={{ color: "var(--bone-dim)", fontSize: 13 }}>
                  Member-verified review
                  {resource.discount_label ? (
                    <>
                      {" "}
                      +{" "}
                      <b style={{ color: "var(--brass)" }}>
                        {resource.discount_label} ATLAS discount
                      </b>
                    </>
                  ) : (
                    "."
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: "var(--bone-dim)", fontSize: 13 }}>
                Library highlights will appear once resources are seeded.
              </div>
            )}
            <Link to="/library" className="btn sm ghost" style={{ marginTop: 14 }}>
              Open Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  next,
}: {
  next: { booking: Booking; event: EventItem } | null;
}) {
  if (!next) {
    return (
      <div className="feature">
        <div className="bg" />
        <Topo />
        <span className="pill solid stamp">Your Next Expedition</span>
        <div className="fc">
          <h2>
            No booking
            <br />
            yet
          </h2>
          <div className="meta">
            Browse expeditions and claim your seat for the pilot.
          </div>
          <div className="frow">
            <Link to="/expeditions" className="btn sm ghost">
              View Expeditions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { event } = next;
  const start = new Date(event.starts_on);
  const day = start.getDate();
  const monthYear = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
  })
    .format(start)
    .replace(" ", " · ");

  const titleParts = event.title.split(/\s+/);
  const mid = Math.ceil(titleParts.length / 2);
  const line1 = titleParts.slice(0, mid).join(" ");
  const line2 = titleParts.slice(mid).join(" ");

  return (
    <div className="feature">
      <div className="bg" />
      <Topo />
      <span className="pill solid stamp">Your Next Expedition</span>
      <div className="cd">
        <div className="big">{day}</div>
        <div className="label">{monthYear}</div>
      </div>
      <div className="fc">
        <h2>
          {line1}
          {line2 ? (
            <>
              <br />
              {line2}
            </>
          ) : null}
        </h2>
        <div className="meta">
          {event.location}
          {event.family_friendly ? " · Family Friendly" : ""}
          {event.expedition_only ? " · Expedition Only" : ""}
        </div>
        <div className="frow">
          <span className="pill ok">Booked</span>
          <Link to="/expeditions" className="btn sm ghost">
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function Topo() {
  return (
    <svg
      className="topo"
      viewBox="0 0 600 300"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <g fill="none" stroke="#b1925a" strokeWidth="1" opacity=".3">
        <path d="M-20,240 C120,210 240,260 380,225 C500,196 580,235 620,215" />
        <path d="M-20,195 C130,168 260,215 400,180 C520,152 590,190 620,172" />
        <path d="M-20,150 C140,126 270,170 410,138 C530,112 590,146 620,130" />
        <path d="M-20,108 C150,86 280,128 420,98 C540,74 590,104 620,90" />
      </g>
    </svg>
  );
}
