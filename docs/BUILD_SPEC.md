# ATLAS — Member Portal Build Spec

**Prepared for:** Development handoff
**Companion file:** `atlas-portal.html` (clickable prototype — the source of truth for UX, layout, states, and brand)
**Status:** v1 · scoped for a fall / October pilot launch

---

## 1. Overview

ATLAS is a membership community for dental professionals — "Adventure Beyond Dentistry." This spec covers the **member-facing web portal** (`app.youratlashq.com`), which sits behind the marketing site and serves logged-in members.

The prototype is a static, fully clickable mockup. Every screen, state, and flow in it is intentional and should be treated as the design spec. What it does **not** include (and what this doc defines) is the backend: auth, payments, persistence, and business logic.

**Scope of this build:**
- Member authentication + account
- Two-tier membership with Stripe billing
- Expeditions (events) browsing + booking with tier-aware pricing
- Kit (welcome box) fulfillment + shipment tracking
- Resource library
- CORE self-audit ("Check-In")
- Membership management + Expedition application flow

**Out of scope (separate workstreams):**
- The public marketing site (`atlas-landing.html`, already prototyped)
- The R2/Archie RPA integration (see §11)

---

## 2. Recommended stack

Web-first. Ship a responsive PWA; defer native mobile until there's a member base and a reason for push/offline.

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | React + TypeScript, Tailwind | Prototype styling maps directly; use CSS variables from the prototype for brand tokens |
| Backend | Python + FastAPI | Consistent with existing services |
| Database | Postgres (Supabase) | Supabase also gives auth + storage out of the box |
| Auth | Supabase Auth (email/password + magic link) | Or Auth0 if SSO is wanted later |
| Payments | Stripe Billing + Checkout | Subscriptions + one-off event charges |
| Email | Postmark or Resend | Transactional (welcome, booking confirmation, shipment) |
| Hosting | Vercel (front) + Fly/Render (API) | Or a single platform if preferred |

**Brand tokens** (pull from prototype `:root`): ink `#10150f`, panel `#161c16`, bone `#efe9db`, brass `#b1925a`. Fonts: Saira Condensed (display), Saira (UI labels), Spectral (body).

---

## 3. Membership tiers & business rules

Two tiers. **The rules in this section are the revenue logic and must be enforced server-side — never trusted from the client.**

### Tier: Atlas Navigators
- **Billing:** monthly recurring (confirm price with Mike — notes indicate ~$100/mo)
- Self-serve signup, cancel anytime
- Benefits: the Atlas Kit, event discounts + early booking, resource library + vendor discounts, monthly challenges & giveaways

### Tier: Atlas Expedition
- **Billing:** annual, **application-gated** — no card captured until the team approves
- Smaller, vetted cohort
- Benefits: everything in Navigators, plus **free access to main events** and **private expeditions**

### Backend rules
1. **Early-booking window.** `member_open_at` / `public_open_at` — API returns bookability from tier + time.
2. **Member discount at checkout.** Navigators pay `member_price`; never trust client-submitted prices.
3. **Expedition comping & gating.** `expedition_only` events: free for Expedition (`amount = 0`); locked for Navigators (`bookable: false`, `upgrade_required`).

---

## 4–13

See original handoff for full data model, API endpoints, screens, Stripe webhooks, kit fulfillment, notifications, auth roles, R2/Archie out-of-scope note, open decisions, and phasing.

This repo scaffolds Phase 1–2 structure to match those sections.
