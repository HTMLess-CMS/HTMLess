# HTMLess — Monetization Strategy

_Last updated: 2026-04-02_

## Model: Open Core + SaaS Hosting + Marketplace

### Revenue Stream 1 — SaaS Hosting (Primary)

The Shopify-style play. Self-hosted is free, hosted is paid.

| Tier        | Price    | Target              | Limits                          |
|-------------|----------|---------------------|---------------------------------|
| Free        | $0       | Self-host only      | All core features, no hosting   |
| Starter     | $29/mo   | Small apps/blogs    | 1 space, 5K entries, 5GB media  |
| Growth      | $99/mo   | Growing SaaS        | 5 spaces, 50K entries, 25GB     |
| Scale       | $299/mo  | Agencies/teams      | 20 spaces, 500K entries, 100GB  |
| Enterprise  | $1K+/mo  | Large orgs          | Custom limits, SLA, support     |

### Revenue Stream 2 — Plugin Marketplace

Let developers build and sell extensions. We take 20-30% cut.

**Extension categories:**
- AI integrations (content generation, auto-tagging, image alt text)
- Payment modules (Stripe, PayPal, billing)
- Analytics (page views, content performance)
- SEO tools (sitemap, meta tags, structured data)
- Commerce (product fields, inventory sync)
- Notifications (email, Slack, push)

**Revenue math:** 1,000 extensions x $20 avg monthly revenue x 25% cut = $5K/mo growing to $500K/mo at scale

### Revenue Stream 3 — Enterprise Features

Lock behind paywall:
- SSO (SAML, OIDC) — $500/mo add-on
- Advanced RBAC (field-level permissions) — included in Scale+
- Audit log export — included in Scale+
- Multi-region hosting — $200/mo per region
- 99.99% SLA — Enterprise only
- Priority support (Slack/phone) — Enterprise only

### Revenue Stream 4 — Templates & Starters

Pre-built content structures + admin configs:
- SaaS boilerplate — $99
- Blog engine — $49
- AI dashboard — $149
- E-commerce content — $99
- Documentation site — $49
- Marketing site — $79

## Growth Flywheel

```
Open Source (GitHub stars)
  → Developer adoption
    → Self-hosted installs
      → "I need hosting" conversion (5-10%)
        → SaaS revenue
          → Fund more open source development
            → More stars, more adoption
              → Marketplace demand
                → Plugin developers join
                  → Compounding value
```

## Competitive Positioning

| CMS         | Weakness HTMLess exploits               |
|-------------|----------------------------------------|
| Strapi      | Bloated admin, slow, complex setup     |
| Contentful  | Expensive, vendor lock-in              |
| Sanity      | Steep learning curve, custom everything|
| WordPress   | Legacy architecture, not headless-first|
| Directus    | Database-first (not content-first UX)  |

**Our wedge:** Best admin UX + instant API + open source. Ship less, but make it feel magical.
