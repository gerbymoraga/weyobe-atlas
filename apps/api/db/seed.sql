BEGIN;

INSERT INTO events (
  id, title, location, description,
  starts_on, ends_on,
  member_price, regular_price,
  expedition_only, family_friendly,
  capacity, seats_taken,
  member_open_at, public_open_at,
  image_url
) VALUES
(
  'a1111111-1111-4111-8111-111111111101',
  'Take Aim On Your Life',
  'Wilmington, NC',
  'Flagship weekend at a $10M range — rifle, handgun, AR & archery, plus speakers and a self-audit workshop. Family-friendly programming available.',
  DATE '2026-10-24',
  DATE '2026-10-26',
  45000,
  65000,
  FALSE,
  TRUE,
  40,
  0,
  NOW() - INTERVAL '21 days',
  NOW() + INTERVAL '7 days',
  NULL
),
(
  'a1111111-1111-4111-8111-111111111102',
  'Reach The Peak',
  'Jackson Hole, WY',
  'A guided western summit hike for those chasing the peak of life. Built for the committed — altitude, miles, and a clear finish line.',
  DATE '2026-09-14',
  DATE '2026-09-16',
  120000,
  145000,
  FALSE,
  FALSE,
  24,
  0,
  NOW() - INTERVAL '14 days',
  NOW() + INTERVAL '3 days',
  NULL
),
(
  'a1111111-1111-4111-8111-111111111103',
  'Beyond The Map — Blue Depths',
  'Cozumel, MX',
  'A scuba descent expedition into open water. Small group, high adventure, real depth. Expedition members only.',
  DATE '2026-11-09',
  DATE '2026-11-12',
  0,
  160000,
  TRUE,
  FALSE,
  12,
  0,
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '21 days',
  NULL
),
(
  'a1111111-1111-4111-8111-111111111104',
  'Winter Summit Basecamp',
  'Aspen, CO',
  'Cold-weather challenge weekend — ice, altitude, and the discomfort that grows you. Early member booking open.',
  DATE '2027-01-18',
  DATE '2027-01-20',
  52000,
  72000,
  FALSE,
  FALSE,
  30,
  0,
  NOW() - INTERVAL '30 days',
  NOW() + INTERVAL '14 days',
  NULL
),
(
  'a1111111-1111-4111-8111-111111111105',
  'Desert Compass Retreat',
  'Sedona, AZ',
  'Three days of trail time, CORE workshops, and practice-owner roundtables under open sky. Ideal first expedition for Navigators.',
  DATE '2026-08-21',
  DATE '2026-08-23',
  38000,
  55000,
  FALSE,
  TRUE,
  36,
  0,
  NOW() - INTERVAL '45 days',
  NOW() - INTERVAL '7 days',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  title           = EXCLUDED.title,
  location        = EXCLUDED.location,
  description     = EXCLUDED.description,
  starts_on       = EXCLUDED.starts_on,
  ends_on         = EXCLUDED.ends_on,
  member_price    = EXCLUDED.member_price,
  regular_price   = EXCLUDED.regular_price,
  expedition_only = EXCLUDED.expedition_only,
  family_friendly = EXCLUDED.family_friendly,
  capacity        = EXCLUDED.capacity,
  -- seats_taken intentionally NOT overwritten (preserve live bookings)
  member_open_at  = EXCLUDED.member_open_at,
  public_open_at  = EXCLUDED.public_open_at,
  image_url       = EXCLUDED.image_url,
  updated_at      = NOW();

-- ---------------------------------------------------------------------------
-- Event addons
-- ---------------------------------------------------------------------------

INSERT INTO event_addons (id, event_id, name, price) VALUES
  ('b2222222-2222-4222-8222-222222222201', 'a1111111-1111-4111-8111-111111111101', 'Guest pass (spouse / partner)', 15000),
  ('b2222222-2222-4222-8222-222222222202', 'a1111111-1111-4111-8111-111111111101', 'Gear rental package', 7500),
  ('b2222222-2222-4222-8222-222222222203', 'a1111111-1111-4111-8111-111111111101', 'Photo package', 5000),
  ('b2222222-2222-4222-8222-222222222204', 'a1111111-1111-4111-8111-111111111102', 'Private guide upgrade', 25000),
  ('b2222222-2222-4222-8222-222222222205', 'a1111111-1111-4111-8111-111111111102', 'Post-summit recovery massage', 12000),
  ('b2222222-2222-4222-8222-222222222206', 'a1111111-1111-4111-8111-111111111103', 'Full gear rental (BCD, reg, wetsuit)', 18000),
  ('b2222222-2222-4222-8222-222222222207', 'a1111111-1111-4111-8111-111111111103', 'Nitrox package', 8000),
  ('b2222222-2222-4222-8222-222222222208', 'a1111111-1111-4111-8111-111111111104', 'Cold-weather kit rental', 9500),
  ('b2222222-2222-4222-8222-222222222209', 'a1111111-1111-4111-8111-111111111105', 'Guest pass (spouse / partner)', 12000),
  ('b2222222-2222-4222-8222-222222222210', 'a1111111-1111-4111-8111-111111111105', 'Sunrise trail add-on', 4500)
ON CONFLICT (id) DO UPDATE SET
  event_id   = EXCLUDED.event_id,
  name       = EXCLUDED.name,
  price      = EXCLUDED.price,
  updated_at = NOW();

-- Ensure new columns exist before upsert (existing DBs)
ALTER TABLE resources ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE resources ADD COLUMN IF NOT EXISTS how_to_redeem TEXT NOT NULL DEFAULT '';

-- ---------------------------------------------------------------------------
-- Resource library (member discounts — shared catalog)
-- ---------------------------------------------------------------------------

INSERT INTO resources (
  id, name, category, rating, discount_label, discount_url, description, how_to_redeem
) VALUES
  (
    'c3333333-3333-4333-8333-333333333301',
    'Blackfoot Outfitters',
    'Gear & Apparel',
    4.80,
    '15% off',
    'https://example.com/atlas/blackfoot',
    'Field-tested apparel and pack systems built for long days outside the operatory. ATLAS members get curated kits for range weekends, summit hikes, and cold-weather basecamps — plus priority restock alerts on limited drops.',
    'Open the partner link, create or sign in to your Blackfoot account, and enter code ATLAS15 at checkout. Discount stacks with seasonal sales unless noted otherwise.'
  ),
  (
    'c3333333-3333-4333-8333-333333333302',
    'Peak Performance Health',
    'Health & Fitness',
    4.90,
    '1 month free',
    'https://example.com/atlas/peak-performance',
    'Coach-led strength, mobility, and recovery programming designed for clinicians who sit, stand, and travel hard. Includes virtual assessments and a member-only accountability channel.',
    'Claim your free month with your ATLAS member email. After the trial, keep the member rate by staying on the annual plan — cancel anytime before day 30.'
  ),
  (
    'c3333333-3333-4333-8333-333333333303',
    'Meridian Wealth',
    'Finance & Planning',
    4.60,
    'Free consult',
    'https://example.com/atlas/meridian',
    'Practice-owner focused planning: entity structure, debt strategy, and personal wealth that does not compete with your clinical calendar. Advisors understand DSO paths and private practice exits.',
    'Book a complimentary 45-minute consult via the partner link. Mention ATLAS when scheduling — no product pitch required to keep the session.'
  ),
  (
    'c3333333-3333-4333-8333-333333333304',
    'Compass Travel Co.',
    'Travel & Expeditions',
    4.70,
    '10% off trips',
    'https://example.com/atlas/compass-travel',
    'Small-group adventure travel with medical-friendly itineraries, flexible rebooking, and gear lists that match ATLAS expeditions. Ideal when you want logistics handled before you leave the practice.',
    'Browse member trips on the partner site and apply code ATLAS10. For private group builds, email the concierge from your ATLAS login email.'
  ),
  (
    'c3333333-3333-4333-8333-333333333305',
    'Northgate Insurance',
    'Practice & Business',
    4.50,
    'Member rates',
    'https://example.com/atlas/northgate',
    'Malpractice, cyber, and business packages negotiated for ATLAS clinics. Includes a yearly coverage review timed around renewal — not a cold sales call mid-quarter.',
    'Request a member quote online. Upload your current declarations; Northgate returns a side-by-side within five business days.'
  ),
  (
    'c3333333-3333-4333-8333-333333333306',
    'Trailhead Nutrition',
    'Health & Fitness',
    4.70,
    '20% off first order',
    'https://example.com/atlas/trailhead',
    'Clean fuel for early cases and long trail days — protein, electrolytes, and travel-friendly meals that do not wreck your gut between clinics.',
    'Use code ATLAS20 on your first order. Autoship stays at 10% off for active members.'
  ),
  (
    'c3333333-3333-4333-8333-333333333307',
    'Summit Practice Advisors',
    'Practice & Business',
    4.80,
    'Complimentary practice audit',
    'https://example.com/atlas/summit-advisors',
    'Operators who have scaled and exited practices walk your numbers, schedule, and associate model — then hand you a one-page action plan. No retainer required for the audit.',
    'Schedule the complimentary audit from the partner link. Bring last-year P&L and a current schedule template; you leave with prioritized next steps.'
  ),
  (
    'c3333333-3333-4333-8333-333333333308',
    'Horizon Family Concierge',
    'Travel & Expeditions',
    4.40,
    'Priority booking window',
    'https://example.com/atlas/horizon',
    'Family travel desk for members who bring partners or kids to ATLAS weekends. Handles lodging adjacency, kid activities, and airport logistics so you can stay in the experience.',
    'Open a concierge request with your event dates. Priority window opens 48 hours before public booking for the same itinerary.'
  )
ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  category       = EXCLUDED.category,
  rating         = EXCLUDED.rating,
  discount_label = EXCLUDED.discount_label,
  discount_url   = EXCLUDED.discount_url,
  description    = EXCLUDED.description,
  how_to_redeem  = EXCLUDED.how_to_redeem,
  updated_at     = NOW();

COMMIT;

-- Quick verify
SELECT 'events' AS kind, COUNT(*)::text AS n FROM events
UNION ALL
SELECT 'event_addons', COUNT(*)::text FROM event_addons
UNION ALL
SELECT 'resources', COUNT(*)::text FROM resources;
