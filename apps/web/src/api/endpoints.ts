import { api, API_URL } from "./client";
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
  redirectUrl: (id: string) => `${API_URL}/resources/${id}/redirect`,
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

export type AdminStats = {
  members: number;
  events: number;
  resources: number;
  kit_shipments: number;
  pending_applications: number;
  bookings: number;
};

export type AdminEvent = {
  id: string;
  title: string;
  location: string;
  description: string;
  starts_on: string;
  ends_on: string;
  member_price: number;
  regular_price: number;
  expedition_only: boolean;
  family_friendly: boolean;
  capacity: number;
  seats_taken: number;
  member_open_at: string;
  public_open_at: string;
  image_url?: string | null;
  addons: { id: string; name: string; price: number }[];
};

export type AdminResource = {
  id: string;
  name: string;
  category: string;
  rating?: number | null;
  discount_label?: string | null;
  discount_url?: string | null;
};

export type AdminKit = {
  id: string;
  member_id: string;
  member_email: string;
  member_name: string;
  status: "ordered" | "packed" | "shipped" | "delivered";
  carrier?: string | null;
  tracking_number?: string | null;
  est_delivery?: string | null;
};

export type AdminApplication = {
  id: string;
  member_id: string;
  member_email: string;
  member_name: string;
  motivation: string;
  experience_level: string;
  interest: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export const adminApi = {
  stats: () => api<AdminStats>("/admin/stats"),
  members: () => api<Member[]>("/admin/members"),
  events: {
    list: () => api<AdminEvent[]>("/admin/events"),
    create: (body: Omit<AdminEvent, "id" | "seats_taken" | "addons">) =>
      api<AdminEvent>("/admin/events", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Omit<AdminEvent, "id" | "seats_taken" | "addons">) =>
      api<AdminEvent>(`/admin/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: string) => api<{ ok: boolean }>(`/admin/events/${id}`, { method: "DELETE" }),
    addAddon: (eventId: string, body: { name: string; price: number }) =>
      api(`/admin/events/${eventId}/addons`, { method: "POST", body: JSON.stringify(body) }),
    removeAddon: (addonId: string) =>
      api<{ ok: boolean }>(`/admin/addons/${addonId}`, { method: "DELETE" }),
  },
  resources: {
    list: () => api<AdminResource[]>("/admin/resources"),
    create: (body: Omit<AdminResource, "id">) =>
      api<AdminResource>("/admin/resources", { method: "POST", body: JSON.stringify(body) }),
    update: (id: string, body: Omit<AdminResource, "id">) =>
      api<AdminResource>(`/admin/resources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      api<{ ok: boolean }>(`/admin/resources/${id}`, { method: "DELETE" }),
  },
  kit: {
    list: () => api<AdminKit[]>("/admin/kit"),
    update: (
      id: string,
      body: {
        status: AdminKit["status"];
        carrier?: string;
        tracking_number?: string;
        est_delivery?: string;
      },
    ) => api<{ ok: boolean }>(`/admin/kit/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  },
  applications: {
    list: () => api<AdminApplication[]>("/admin/expedition-applications"),
    decide: (id: string, status: "approved" | "declined") =>
      api<{ ok: boolean; checkout_url?: string }>(
        `/admin/expedition-applications/${id}/decide`,
        { method: "POST", body: JSON.stringify({ status }) },
      ),
  },
};
