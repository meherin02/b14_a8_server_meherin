# Community Events API — setup stage

Express, MongoDB, BetterAuth, JWT, event CRUD and event registrations.

`GET /api/registrations/events/:id/status` returns `{ "joined": true/false }` for the authenticated user. It requires the session and JWT, validates the event ID, and prevents caching the user-specific result. It does not expose another user's registration or personal data.

Event endpoints now match the sibling client's API-CONTRACT.md. Public event browsing only returns future events, supports `.limit(6)`, and sorts by date. Protected event changes filter by the authenticated creator ID. Joining records the event and user, rejects duplicates with a unique index, and uses Atlas transactions to coordinate with deletion. Deleting an event also removes its registrations. Joined event lists read current event details and sort by date.

Run `npm test` for authentication/validation tests. Live database integration still requires your Atlas settings. Transactions require Atlas or a MongoDB replica set; a standalone local MongoDB instance is insufficient.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the settings privately.
3. Run `npm run dev`.
4. Open `http://localhost:5000/api/health` to verify the database connection.

Use your Atlas Drivers connection string for `MONGODB_URI` and allow your current IP in Atlas. URL-encode special characters in the database password when putting it in the connection string.

On networks where Node's default Windows DNS resolver refuses Atlas SRV queries, configure `DNS_SERVERS=1.1.1.1,1.0.0.1` in `.env` (Cloudflare public DNS). This is already the fallback default in the server. The DNS servers handle lookups only; database credentials remain in the MongoDB URI.

The MongoDB client uses the P-256 TLS curve (`ecdhCurve: "prime256v1"`), which successfully negotiates TLS in this Windows/Node.js environment where the default negotiation fails. TLS encryption and certificate verification remain enabled.

Optional Google setup: create a Web application OAuth client and register `http://localhost:5000/api/auth/callback/google` as its authorized redirect URI. Fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` to enable the button.

Protected APIs require a BetterAuth-issued JWT plus the active session cookie. Never accept an email from the browser as proof of ownership. Production deployment must preserve auth cookies; plan a same-origin reverse proxy or compatible domains when choosing hosting.
