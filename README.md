# Community Events API

The Express backend for Community Events stores events and registrations in MongoDB and handles authentication with BetterAuth. Visitors can browse upcoming events, while signed-in users can organize events and manage their volunteering plans.

**[Live website](https://communityevents-mauve.vercel.app/)** · **[API health](https://community-events-api-r0ne.onrender.com/api/health)** · **[Client repository](https://github.com/meherin02/b14_a8_client_meherin)**

## Features

- Email/password and Google authentication using BetterAuth's MongoDB adapter.
- Protected routes that check both a signed JWT and an active session.
- Future event listings sorted by date, with a limit option for the home page.
- Event creation, editing, and deletion with organizer ownership checks.
- Event registrations with duplicate-join protection and a personal joined-events list.
- Validation for event dates, required fields, profiles, and registration passwords.
- A database health check used by Render.

## Built with

Node.js, JavaScript, Express, MongoDB, BetterAuth, the BetterAuth MongoDB adapter, and JOSE for JWT verification. The API is hosted on Render.

## Run locally

You will need Node.js 24 and a MongoDB Atlas database. Joining and deleting events use transactions, so local MongoDB must run as a replica set; a standalone instance is insufficient.

1. Clone the repository and install dependencies:

   ```sh
   git clone https://github.com/meherin02/b14_a8_server_meherin.git
   cd b14_a8_server_meherin
   npm ci
   ```

2. Copy `.env.example` to `.env` and fill in your own settings:

   | Variable | Local value or purpose |
   | --- | --- |
   | `PORT` | `5000` |
   | `CLIENT_URL` | `http://localhost:3000` |
   | `BETTER_AUTH_URL` | `http://localhost:5000` |
   | `BETTER_AUTH_SECRET` | A private random secret of at least 32 characters |
   | `MONGODB_URI` | Your Atlas Drivers connection string |
   | `MONGODB_DB` | `community_events` |
   | `DNS_SERVERS` | `1.1.1.1,1.0.0.1` |
   | `GOOGLE_CLIENT_ID` | Google OAuth client ID, if enabling Google login |
   | `GOOGLE_CLIENT_SECRET` | Google OAuth client secret, if enabling Google login |

   Keep `.env` private. Allow your current IP in Atlas and URL-encode special characters in the database password when inserting it into the connection string. Servers sharing an authentication database must use the same auth secret.

3. Start the API:

   ```sh
   npm run dev
   ```

4. Open [localhost:5000/api/health](http://localhost:5000/api/health). A working connection returns:

   ```json
   { "status": "ok", "database": "connected" }
   ```

For local Google login, create a Web application OAuth client with `http://localhost:3000` as an authorized JavaScript origin and `http://localhost:5000/api/auth/callback/google` as an authorized redirect URI. Set both Google environment variables to enable it.

## API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Check the database connection |
| GET | `/api/config` | Public | Check whether Google login is enabled |
| GET | `/api/events` | Public | List future events in date order |
| GET | `/api/events?limit=6` | Public | Get up to six upcoming events |
| GET | `/api/events/:id` | Public | Read event details |
| GET | `/api/events/mine` | Signed in | List your own events |
| POST | `/api/events` | Signed in | Create an event |
| PATCH | `/api/events/:id` | Organizer | Update an event |
| DELETE | `/api/events/:id` | Organizer | Delete an event and its registrations |
| GET | `/api/registrations/me` | Signed in | List joined events in date order |
| GET | `/api/registrations/events/:id/status` | Signed in | Check whether you have joined |
| POST | `/api/registrations` | Signed in | Join using an `eventId` |

BetterAuth handles authentication endpoints under `/api/auth`. Protected application requests need the active session cookie and a BetterAuth-issued bearer token.

## Validation and data handling

Event dates must be in the future. The server gets the organizer's ID and email from the session rather than trusting identity fields submitted by the browser. Update and delete queries also check ownership.

Registration passwords must be 6–128 characters long and contain uppercase and lowercase letters. Email signup requires a name and photo URL. Names are limited to 100 characters; image URLs must use HTTP(S), contain no embedded credentials, and stay within 2048 characters.

A unique index prevents duplicate registrations. Transactions coordinate joins with event changes and deletion. Deleting an event removes its registrations too.

## Commands and checks

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with automatic restarts |
| `npm start` | Start the API for production |
| `npm run check` | Run the configured JavaScript syntax checks |
| `npm test` | Run the automated tests |

Tests cover authentication, validation, ownership constraints, joined status, and health responses. Complete flows still need to be checked with the client and your Atlas database.

## Deployment

The repository includes a [Render Blueprint](render.yaml) and a [deployment guide](DEPLOYMENT.md). Configure secrets in Render's environment settings and allow the service's outbound IP ranges in Atlas.

For the current deployment, both `CLIENT_URL` and `BETTER_AUTH_URL` are `https://communityevents-mauve.vercel.app`. The Vercel client proxies `/api` requests to this service. The production Google callback is `https://communityevents-mauve.vercel.app/api/auth/callback/google`.

At startup, the server checks that its JWT signing keys work with the configured secret. The health endpoint pings MongoDB with a three-second deadline and returns HTTP 503 if the database is unavailable.

The database client uses Cloudflare DNS as a fallback for Atlas SRV lookups and the P-256 TLS curve for connection compatibility. TLS encryption and certificate verification remain enabled.
