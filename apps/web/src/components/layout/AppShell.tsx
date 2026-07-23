import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const links = [
  {
    to: "/",
    label: "Dashboard",
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    to: "/expeditions",
    label: "Expeditions",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 2l3 6 6 .5-4.5 4 1.5 6-6-3.5L6 18.5 7.5 12.5 3 8.5 9 8z" />
      </svg>
    ),
  },
  {
    to: "/kit",
    label: "My Kit",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M21 8l-9-5-9 5 9 5 9-5z" />
        <path d="M3 8v8l9 5 9-5V8" />
        <path d="M12 13v8" />
      </svg>
    ),
  },
  {
    to: "/library",
    label: "Resource Library",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 4h12a2 2 0 012 2v14H6a2 2 0 01-2-2z" />
        <path d="M8 4v14" />
      </svg>
    ),
  },
  {
    to: "/core",
    label: "CORE Check-In",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 5l2 7-2 7-2-7z" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    to: "/membership",
    label: "Membership",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
  {
    to: "/admin",
    label: "Admin Settings",
    adminOnly: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.3.6.9 1 1.6 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
      </svg>
    ),
  },
];

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/expeditions": "Expeditions",
  "/kit": "My Kit",
  "/library": "Resource Library",
  "/core": "CORE Check-In",
  "/membership": "Membership",
  "/admin": "Admin Settings",
};

export function AppShell() {
  const { member, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const title = titles[location.pathname] ?? "ATLAS";
  const navLinks = useMemo(
    () => links.filter((link) => !("adminOnly" in link && link.adminOnly) || member?.is_admin),
    [member?.is_admin],
  );
  const initials = useMemo(() => {
    const f = member?.first_name?.[0] ?? "";
    const l = member?.last_name?.[0] ?? "";
    return `${f}${l}`.toUpperCase() || "AT";
  }, [member]);

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="side-brand">
          <span className="word">ATLAS</span>
        </div>
        <nav className="side-nav">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-member">
          <div className="avatar">{initials}</div>
          <div>
            <div className="mn">
              {member?.first_name} {member?.last_name}
            </div>
            <div className="mt">
              {member?.is_admin ? "superadmin" : member?.tier}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="btn ghost sm"
          style={{ margin: "0 16px 16px" }}
        >
          Log out
        </button>
      </aside>

      <div
        className={`scrim${open ? " show" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      <div className="main-pane">
        {member?.status === "past_due" && (
          <div
            style={{
              borderBottom: "1px solid rgba(177,146,90,.4)",
              background: "rgba(177,146,90,.15)",
              padding: "10px 34px",
              textAlign: "center",
              fontFamily: "var(--ui)",
              fontSize: 13,
            }}
          >
            Payment past due — update billing in Membership to keep your benefits.
          </div>
        )}
        <div className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              type="button"
              className="burger"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
            <h1>{title}</h1>
          </div>
          <div className="topbar-right">
            <span className="pill">
              {member?.is_admin ? "superadmin" : member?.tier}
            </span>
          </div>
        </div>
        <div className="view">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
