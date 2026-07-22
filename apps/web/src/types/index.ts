export type Tier = "navigator" | "expedition";
export type MemberStatus = "active" | "past_due" | "canceled";
export type BookableReason =
  | "open"
  | "opens_later"
  | "upgrade_required"
  | "sold_out"
  | "not_member";

export interface Member {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  tier: Tier;
  status: MemberStatus;
  member_since?: string | null;
  is_admin?: boolean;
}

export interface EventAddon {
  id: string;
  name: string;
  price: number;
}

export interface EventItem {
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
  bookable: boolean;
  bookable_reason: BookableReason;
  addons: EventAddon[];
}

export interface Booking {
  id: string;
  member_id: string;
  event_id: string;
  attendee_count: number;
  addon_ids: string[];
  amount_paid: number;
  status: "confirmed" | "canceled";
  stripe_payment_intent_id?: string | null;
  client_secret?: string | null;
}

export interface KitShipment {
  id: string;
  status: "ordered" | "packed" | "shipped" | "delivered";
  carrier?: string | null;
  tracking_number?: string | null;
  est_delivery?: string | null;
  contents: string[];
}

export interface Resource {
  id: string;
  name: string;
  category: string;
  rating?: number | null;
  discount_label?: string | null;
}

export interface CoreCheckin {
  id: string;
  profession: number;
  health: number;
  relationships: number;
  adventure: number;
  checked_in_at: string;
}

export interface Membership {
  tier: Tier;
  status: MemberStatus;
  benefits: string[];
  billing_summary: Record<string, unknown>;
  savings_to_date_cents: number;
}
