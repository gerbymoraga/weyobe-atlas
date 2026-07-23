-- ATLAS member portal schema (Postgres / Supabase)
-- Apply once against an empty database.
-- Safe to re-run: uses IF NOT EXISTS where possible.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
  CREATE TYPE member_tier AS ENUM ('navigator', 'expedition');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active', 'past_due', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_interval AS ENUM ('month', 'year');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('confirmed', 'canceled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE kit_shipment_status AS ENUM ('ordered', 'packed', 'shipped', 'delivered');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expedition_application_status AS ENUM ('pending', 'approved', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- members
CREATE TABLE IF NOT EXISTS members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  tier                member_tier NOT NULL DEFAULT 'navigator',
  status              member_status NOT NULL DEFAULT 'active',
  stripe_customer_id  TEXT,
  member_since        DATE,
  is_admin            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id               UUID NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  stripe_subscription_id  TEXT,
  tier                    member_tier NOT NULL,
  interval                subscription_interval NOT NULL,
  current_period_end      TIMESTAMPTZ,
  status                  TEXT NOT NULL DEFAULT 'active',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON subscriptions (member_id);

-- events
CREATE TABLE IF NOT EXISTS events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title             TEXT NOT NULL,
  location          TEXT NOT NULL DEFAULT '',
  description       TEXT NOT NULL DEFAULT '',
  starts_on         DATE NOT NULL,
  ends_on           DATE NOT NULL,
  member_price      INTEGER NOT NULL,          -- cents
  regular_price     INTEGER NOT NULL,          -- cents
  expedition_only   BOOLEAN NOT NULL DEFAULT FALSE,
  family_friendly   BOOLEAN NOT NULL DEFAULT FALSE,
  capacity          INTEGER NOT NULL DEFAULT 0,
  seats_taken       INTEGER NOT NULL DEFAULT 0,
  member_open_at    TIMESTAMPTZ NOT NULL,
  public_open_at    TIMESTAMPTZ NOT NULL,
  image_url         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- event_addons
CREATE TABLE IF NOT EXISTS event_addons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  price       INTEGER NOT NULL DEFAULT 0,     -- cents; 0 = free
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_addons_event_id ON event_addons (event_id);

-- bookings
CREATE TABLE IF NOT EXISTS bookings (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id                 UUID NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  event_id                  UUID NOT NULL REFERENCES events (id) ON DELETE RESTRICT,
  attendee_count            INTEGER NOT NULL DEFAULT 1,
  addon_ids                 UUID[] NOT NULL DEFAULT '{}',
  amount_paid               INTEGER NOT NULL DEFAULT 0,  -- cents; 0 = Expedition comp
  status                    booking_status NOT NULL DEFAULT 'confirmed',
  stripe_payment_intent_id  TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON bookings (member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_event_id ON bookings (event_id);

-- kit_shipments
CREATE TABLE IF NOT EXISTS kit_shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  status            kit_shipment_status NOT NULL DEFAULT 'ordered',
  carrier           TEXT,
  tracking_number   TEXT,
  est_delivery      DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kit_shipments_member_id ON kit_shipments (member_id);

-- resources (library)
CREATE TABLE IF NOT EXISTS resources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL,
  rating          NUMERIC(3, 2),
  discount_label  TEXT,
  discount_url    TEXT,
  description     TEXT NOT NULL DEFAULT '',
  how_to_redeem   TEXT NOT NULL DEFAULT '',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Existing DBs created before description columns
ALTER TABLE resources ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS how_to_redeem TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_resources_category ON resources (category);

-- core_checkins
CREATE TABLE IF NOT EXISTS core_checkins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id       UUID NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  profession      INTEGER NOT NULL DEFAULT 50 CHECK (profession BETWEEN 0 AND 100),
  health          INTEGER NOT NULL DEFAULT 50 CHECK (health BETWEEN 0 AND 100),
  relationships   INTEGER NOT NULL DEFAULT 50 CHECK (relationships BETWEEN 0 AND 100),
  adventure       INTEGER NOT NULL DEFAULT 50 CHECK (adventure BETWEEN 0 AND 100),
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_checkins_member_id ON core_checkins (member_id);

-- expedition_applications
CREATE TABLE IF NOT EXISTS expedition_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members (id) ON DELETE CASCADE,
  motivation        TEXT NOT NULL DEFAULT '',
  experience_level  TEXT NOT NULL DEFAULT '',
  interest          TEXT NOT NULL DEFAULT '',
  status            expedition_application_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expedition_applications_member_id ON expedition_applications (member_id);
CREATE INDEX IF NOT EXISTS idx_expedition_applications_status ON expedition_applications (status);
