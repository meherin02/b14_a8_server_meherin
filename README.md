# Community Events API — setup stage

Express, MongoDB, BetterAuth, JWT, event CRUD and event registrations.

Event endpoints now match the sibling client's API-CONTRACT.md. Public event browsing only returns future events, supports `.limit(6)`, and sorts by date. Protected event changes filter by the authenticated creator ID. Joining records the event and user, rejects duplicates with a unique index, and uses Atlas transactions to coordinate with deletion. Deleting an event also removes its registrations. Joined event lists read current event details and sort by date.

Run `npm test` for authentication/validation tests. Live database integration still requires your Atlas settings. Transactions require Atlas or a MongoDB replica set; a standalone local MongoDB instance is insufficient.

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and fill in the settings privately.
3. Run `npm run dev`.
4. Open `http://localhost:5000/api/health` to verify the database connection.

Use your Atlas Drivers connection string for `MONGODB_URI` and allow your current IP in Atlas. URL-encode special characters in the database password when putting it in the connection string.

Optional Google setup: create a Web application OAuth client and register `http://localhost:5000/api/auth/callback/google` as its authorized redirect URI. Fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env` to enable the button.

Protected APIs require a BetterAuth-issued JWT plus the active session cookie. Never accept an email from the browser as proof of ownership. Production deployment must preserve auth cookies; plan a same-origin reverse proxy or compatible domains when choosing hosting.
