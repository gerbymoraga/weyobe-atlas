-- ATLAS per-member sample data (kit, bookings, CORE, expedition applications).
-- Idempotent: only inserts rows a member does not already have.
-- Requires catalog seed first: apps/api/db/seed.sql (event IDs below).
--
-- Logins (scaffold auth accepts any password for known emails):
--   Atlas Superadmin: jpsison@weyobe.com  (is_admin = true)
--   Demo member:      rey@weyobe.com
--
-- Apply after seed.sql (Supabase SQL Editor, psql, or: python scripts/seed_db.py)

BEGIN;

-- ---------------------------------------------------------------------------
-- Atlas Superadmin — full access to /admin APIs and Admin Settings UI
-- ---------------------------------------------------------------------------

INSERT INTO members (
  id, email, first_name, last_name, tier, status, member_since, is_admin
) VALUES (
  'd0000000-0000-4000-8000-0000000000aa',
  'jpsison@weyobe.com',
  'Atlas',
  'Superadmin',
  'expedition',
  'active',
  CURRENT_DATE - 365,
  TRUE
)
ON CONFLICT (email) DO UPDATE SET
  first_name   = EXCLUDED.first_name,
  last_name    = EXCLUDED.last_name,
  is_admin     = TRUE,
  tier         = EXCLUDED.tier,
  status       = 'active',
  member_since = COALESCE(members.member_since, EXCLUDED.member_since),
  updated_at   = NOW();

-- ---------------------------------------------------------------------------
-- Demo member (so you can log in even on an empty members table)
-- ---------------------------------------------------------------------------

INSERT INTO members (
  id, email, first_name, last_name, tier, status, member_since, is_admin
) VALUES (
  'd0000000-0000-4000-8000-000000000001',
  'rey@weyobe.com',
  'Anthony',
  'Sison',
  'navigator',
  'active',
  CURRENT_DATE - 90,
  FALSE
)
ON CONFLICT (email) DO UPDATE SET
  first_name   = COALESCE(NULLIF(members.first_name, ''), EXCLUDED.first_name),
  last_name    = COALESCE(NULLIF(members.last_name, ''), EXCLUDED.last_name),
  member_since = COALESCE(members.member_since, EXCLUDED.member_since),
  status       = members.status,
  -- never strip admin from an existing admin via demo upsert
  is_admin     = members.is_admin,
  updated_at   = NOW();

-- Fill blank names on any existing members (signup often leaves them empty)
UPDATE members
SET
  first_name = CASE WHEN first_name IS NULL OR first_name = '' THEN 'Member' ELSE first_name END,
  last_name  = CASE WHEN last_name IS NULL OR last_name = '' THEN 'Pilot' ELSE last_name END,
  member_since = COALESCE(member_since, CURRENT_DATE - 30),
  updated_at = NOW()
WHERE first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '' OR member_since IS NULL;

-- ---------------------------------------------------------------------------
-- Kit shipments (member-read only; no create API — seed is how Kit looks live)
-- ---------------------------------------------------------------------------

INSERT INTO kit_shipments (member_id, status, carrier, tracking_number, est_delivery)
SELECT
  m.id,
  'shipped'::kit_shipment_status,
  'UPS',
  '1ZATLAS' || upper(substr(replace(m.id::text, '-', ''), 1, 10)),
  CURRENT_DATE + 5
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM kit_shipments k WHERE k.member_id = m.id
);

-- ---------------------------------------------------------------------------
-- CORE check-ins (append-only; members POST /core to add more)
-- ---------------------------------------------------------------------------

-- Older baseline
INSERT INTO core_checkins (
  member_id, profession, health, relationships, adventure, checked_in_at
)
SELECT
  m.id,
  68, 44, 58, 36,
  NOW() - INTERVAL '40 days'
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM core_checkins c WHERE c.member_id = m.id
);

-- Recent check-in (shows as "latest" on dashboard / CORE page)
INSERT INTO core_checkins (
  member_id, profession, health, relationships, adventure, checked_in_at
)
SELECT
  m.id,
  76, 51, 63, 42,
  NOW() - INTERVAL '2 days'
FROM members m
WHERE (
  SELECT COUNT(*) FROM core_checkins c WHERE c.member_id = m.id
) < 2;

-- ---------------------------------------------------------------------------
-- Bookings (members create more via POST /events/{id}/book)
-- ---------------------------------------------------------------------------

-- Upcoming: Desert Compass Retreat (seeded event …105)
INSERT INTO bookings (
  member_id, event_id, attendee_count, addon_ids, amount_paid, status
)
SELECT
  m.id,
  'a1111111-1111-4111-8111-111111111105',
  1,
  '{}'::uuid[],
  CASE WHEN m.tier = 'expedition' THEN 0 ELSE 38000 END,
  'confirmed'::booking_status
FROM members m
WHERE EXISTS (
  SELECT 1 FROM events e WHERE e.id = 'a1111111-1111-4111-8111-111111111105'
)
AND NOT EXISTS (
  SELECT 1
  FROM bookings b
  WHERE b.member_id = m.id
    AND b.event_id = 'a1111111-1111-4111-8111-111111111105'
);

-- Flagship: Take Aim On Your Life (…101) with guest-pass addon when present
INSERT INTO bookings (
  member_id, event_id, attendee_count, addon_ids, amount_paid, status
)
SELECT
  m.id,
  'a1111111-1111-4111-8111-111111111101',
  1,
  COALESCE(
    (
      SELECT ARRAY[a.id]::uuid[]
      FROM event_addons a
      WHERE a.id = 'b2222222-2222-4222-8222-222222222201'
    ),
    '{}'::uuid[]
  ),
  CASE WHEN m.tier = 'expedition' THEN 0 ELSE 60000 END,
  'confirmed'::booking_status
FROM members m
WHERE EXISTS (
  SELECT 1 FROM events e WHERE e.id = 'a1111111-1111-4111-8111-111111111101'
)
AND NOT EXISTS (
  SELECT 1
  FROM bookings b
  WHERE b.member_id = m.id
    AND b.event_id = 'a1111111-1111-4111-8111-111111111101'
);

-- Keep seats_taken aligned with confirmed bookings (idempotent)
UPDATE events e
SET
  seats_taken = sub.cnt,
  updated_at = NOW()
FROM (
  SELECT event_id, COUNT(*)::int AS cnt
  FROM bookings
  WHERE status = 'confirmed'
  GROUP BY event_id
) AS sub
WHERE e.id = sub.event_id;

-- ---------------------------------------------------------------------------
-- Expedition applications (members submit via POST /expedition/apply)
-- One pending sample for Navigators who have never applied
-- ---------------------------------------------------------------------------

INSERT INTO expedition_applications (
  member_id, motivation, experience_level, interest, status
)
SELECT
  m.id,
  'I want to push past the comfort of the practice and join a smaller, vetted cohort.',
  'Intermediate — multi-day hikes and one scuba cert',
  'Summit challenges and open-water expeditions',
  'pending'::expedition_application_status
FROM members m
WHERE m.tier = 'navigator'
AND NOT EXISTS (
  SELECT 1 FROM expedition_applications a WHERE a.member_id = m.id
);

-- Optional demo subscription row (UI reads tier from members today; kept for future)
INSERT INTO subscriptions (
  member_id, stripe_subscription_id, tier, interval, current_period_end, status
)
SELECT
  m.id,
  'sub_demo_' || replace(m.id::text, '-', ''),
  m.tier,
  CASE WHEN m.tier = 'expedition' THEN 'year'::subscription_interval
       ELSE 'month'::subscription_interval END,
  NOW() + INTERVAL '30 days',
  'active'
FROM members m
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s WHERE s.member_id = m.id
);

COMMIT;

-- Verify
SELECT 'members' AS kind, COUNT(*)::text AS n FROM members
UNION ALL
SELECT 'kit_shipments', COUNT(*)::text FROM kit_shipments
UNION ALL
SELECT 'bookings', COUNT(*)::text FROM bookings
UNION ALL
SELECT 'core_checkins', COUNT(*)::text FROM core_checkins
UNION ALL
SELECT 'expedition_applications', COUNT(*)::text FROM expedition_applications
UNION ALL
SELECT 'subscriptions', COUNT(*)::text FROM subscriptions;
