# StudioSpace — API Server

The StudioSpace server is an Express and MongoDB API for a peer-to-peer creative workspace marketplace. It provides authentication, studio discovery, listing management, image uploads, wishlists, reviews, bookings, and downloadable booking invoices.

## Live service

- **Base URL:** https://studiospace-server-6at5.onrender.com
- **Health check:** https://studiospace-server-6at5.onrender.com/api/health
- **Client application:** https://studiospace-client-gamma-pink.vercel.app
- **Client repository:** https://github.com/shadianoormou/studiospace-client

## Capabilities

- Better Auth email/password sessions with optional Google OAuth
- HTTP-only authentication cookies and short-lived mutation JWT protection
- Studio CRUD with owner authorization and validation
- Search, category, price, rating, pagination, and featured-result queries
- Wishlist and review endpoints
- ImgBB image upload integration for studio listings
- Booking requests with ownership checks and overlap protection
- Booking states: pending, confirmed, completed, and cancelled
- PDF booking invoice generation
- MongoDB indexes and repeatable demonstration seed data
- Helmet security headers, CORS, origin checks, rate limiting, and structured errors

## Technology

- Node.js 22+
- Express 5
- MongoDB 7 and the official MongoDB driver
- Better Auth and `@better-auth/mongo-adapter`
- Zod validation
- Multer for multipart uploads
- PDFKit for invoices
- `mongodb-memory-server` for the local replica-set helper and integration tests

## Local development

### Prerequisites

- Node.js 22 or newer
- npm
- MongoDB Atlas or another MongoDB replica set

### Install and configure

```bash
npm install
cp .env.example .env
```

Set the required values in `.env`:

```bash
PORT=4000
APP_URL=http://localhost:3000
MONGODB_URI=mongodb://127.0.0.1:27017/studiospace?replicaSet=rs0
MONGODB_DATABASE=studiospace
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
JWT_SECRET=replace-with-a-different-32-character-secret
```

Optional integrations:

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
IMGBB_API_KEY=
```

`APP_URL` must match the deployed client origin in production. Keep all secrets in Render or another secret manager; do not commit `.env` files.

### Start the local database helper

For a disposable local MongoDB replica set, run this in a separate terminal:

```bash
npm run db:local
```

Then start the API:

```bash
npm run dev
```

The API runs at `http://localhost:4000`.

### Seed demonstration data

Set the four `SEED_*` variables from `.env`, then run:

```bash
npm run seed
```

The seed script creates two evaluation users and eight repeatable demonstration studios.

## Available scripts

```bash
npm run dev       # Start with Node watch mode
npm run start     # Start the production server
npm test          # Run the validation and API unit tests
npm run db:local  # Start a local MongoDB replica set
npm run seed      # Seed evaluation accounts and studios
```

## API reference

All endpoints are prefixed with `/api`.

### System and configuration

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | MongoDB-backed health check |
| `GET` | `/api/config` | Reports whether Google OAuth and ImgBB are enabled |

### Studios

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/studios` | Search and paginate studios; supports `q`, `category`, `maxPrice`, `sort`, `page`, and `featured=true` |
| `GET` | `/api/studios/:id` | Studio details, reviews, and confirmed availability |
| `GET` | `/api/studios/mine` | Authenticated host listings |
| `POST` | `/api/studios` | Create a studio listing |
| `PATCH` | `/api/studios/:id` | Update an owned listing |
| `DELETE` | `/api/studios/:id` | Delete an owned listing when no confirmed booking blocks it |

### Bookings

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/bookings` | Authenticated creator bookings |
| `GET` | `/api/bookings/host` | Authenticated host bookings |
| `POST` | `/api/bookings` | Request a booking with overlap protection |
| `PATCH` | `/api/bookings/:id/status` | Update a booking status according to ownership rules |
| `GET` | `/api/bookings/:id/invoice` | Download a booking invoice PDF |

### Supporting endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/wishlist` | List the authenticated user's saved studios |
| `POST` | `/api/wishlist/:id` | Save a studio |
| `DELETE` | `/api/wishlist/:id` | Remove a saved studio |
| `POST` | `/api/upload` | Upload a listing image through ImgBB |
| `POST` | `/api/reviews/:id` | Add a review for a completed booking |
| `POST` | `/api/newsletter` | Submit a newsletter email |

Authentication routes are provided under `/api/auth/*` by Better Auth.

## Demo accounts

When seeded with the matching environment values:

| Role | Email | Password |
| --- | --- | --- |
| Host | `host@studiospace.example` | `HostDemo2026!` |
| Creator | `creator@studiospace.example` | `CreatorDemo2026!` |

These credentials are for local/evaluation use only. Rotate them before public use.

## Testing and deployment

Run the test suite before pushing changes:

```bash
npm test
```

Production deployment is configured on Render from the `main` branch. Required production secrets are stored in the Render environment, not in Git. The deployed service should respond successfully at `/api/health` and report enabled integrations through `/api/config`.

## Assignment context

Assignment variant: `B14-A8-Cat_Harry`  
Server repository for Programming Hero Assignment 8.

## Security notes

- Secrets are loaded from environment variables and must never be committed.
- CORS is restricted to the configured client origin.
- Mutation routes require an authenticated session and origin/JWT verification.
- Helmet headers, JSON body limits, rate limiting, and validation protect the public API.
