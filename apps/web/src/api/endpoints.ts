import { api } from "./client";
import type {
  Booking,
  CoreCheckin,
  EventItem,
  KitShipment,
  Member,
  Membership,
  Resource,
} from "../types";

export const authApi = {
  signup: (body: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
  }) =>
    api<{ access_token: string; member: Member }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (body: { email: string; password: string }) =>
    api<{ access_token: string; member: Member }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  logout: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  me: () => api<Member>("/me"),
};

export const membershipApi = {
  get: () => api<Membership>("/membership"),
  portal: () => api<{ url: string }>("/billing/portal", { method: "POST" }),
  subscribe: () => api<{ url: string }>("/subscriptions", { method: "POST" }),
  applyExpedition: (body: {
    motivation: string;
    experience_level: string;
    interest: string;
  }) =>
    api("/expedition/apply", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export const eventsApi = {
  list: () => api<EventItem[]>("/events"),
  get: (id: string) => api<EventItem>(`/events/${id}`),
  book: (id: string, body: { attendee_count: number; addon_ids: string[] }) =>
    api<Booking>(`/events/${id}/book`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  bookings: () => api<Booking[]>("/bookings"),
};

export const kitApi = {
  get: () => api<KitShipment | null>("/kit"),
};

export const libraryApi = {
  list: () => api<Resource[]>("/resources"),
  redirectUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL ?? "/api"}/resources/${id}/redirect`,
};

export const coreApi = {
  latest: () => api<CoreCheckin | null>("/core/latest"),
  save: (body: {
    profession: number;
    health: number;
    relationships: number;
    adventure: number;
  }) =>
    api<CoreCheckin>("/core", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
