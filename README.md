# StudioSpace — Server

Live API: pending deployment

Express and MongoDB API for StudioSpace, a peer-to-peer creative workspace booking platform.

- BetterAuth email/password sessions, optional Google OAuth, and disabled email verification per assignment instructions.
- HTTPOnly short-lived JWT cookies protect all server mutations with origin checks and 401 responses.
- Studio CRUD with owner checks, category/search/price/rating filters, wishlist, reviews, and ImgBB upload support.
- Transactional booking requests prevent overlap among confirmed sessions and preserve host/creator ownership.
- Pending, Confirmed, Completed, and Cancelled workflows plus downloadable PDF booking invoices.
- MongoDB indexes, validation, rate limiting, Helmet, CORS, repeatable seed data, and local replica-set setup.

## Local setup

```bash
npm install
cp .env.example .env
# Set MongoDB and auth secrets in .env
npm run dev
```

For a local replica set, run `npm run db:local` in another terminal before starting the API. Then run `npm run seed` with the `SEED_*` values from `.env`.

## Examiner credentials

- Host: `host@studiospace.example` / `HostDemo2026!`
- Creator: `creator@studiospace.example` / `CreatorDemo2026!`

## Assignment

Variant: `B14-A8-Cat_Harry`. Server repository for Programming Hero Assignment 8.
