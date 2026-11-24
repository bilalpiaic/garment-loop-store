# Neon + checkout QA (paused)

> **Current production default for garmentloop.com is cPanel MySQL** (2026-11-24). This note remains for historical Neon/Vercel checkout seeding work.

**Status:** Incomplete — paused to prioritize **production OTP email delivery** (GAR-14).

## DB project
- **GarmentLoop** — `weathered-river-12462418` (`aws-us-east-2`)
- Vercel `DATABASE_URL` comment confirms this project; Admin Settings showed Neon Postgres before pause.

## Seed (partial)
- Prior Neon seed had catalog (~12 products) + 3 default admins.
- QA seed script (`scripts/seed-qa-neon.ts`) was mid-flight: product `saveProduct` path worked; customer OTP verify blocked outside Next request cookies. Not fully verified/persisted in this pass.

## Checkout
- **Not completed** in this run (guest/logged-in COD on production deferred).

## Next
Resume GAR-13: finish 5+ QA SKUs + customer emails in Neon, then guest + logged-in COD checkout; record order numbers and Pass/Fail here.
