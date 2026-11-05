# Deploy the API on Render

This repository is the server repository. Its root already contains `package.json` and `render.yaml`; do not set a nested `server` root directory on Render.

1. Push the deployment configuration to GitHub.
2. Sign in to Render, choose **New → Blueprint**, and connect this server repository.
3. Review the `community-events-api` web service on the Free plan. It installs with `npm ci`, starts with `npm start`, and checks `/api/health`.
4. Fill in the values marked `sync: false` when Render prompts. Enter values only, not the `KEY=` prefix:

| Variable               | Value                                                                                               |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`          | The working private Atlas connection string from local `.env`                                       |
| `CLIENT_URL`           | Initially `http://localhost:3000`; replace with the live client origin after deploying the frontend |
| `BETTER_AUTH_URL`      | Initially `http://localhost:5000`; replace with the live client origin after deploying the frontend |
| `GOOGLE_CLIENT_ID`     | The existing Google OAuth client ID                                                                 |
| `GOOGLE_CLIENT_SECRET` | The existing private Google OAuth client secret                                                     |

Render generates a separate `BETTER_AUTH_SECRET`. Do not upload `.env`. Render supplies `PORT`; leave that variable unset in the dashboard.

5. Create the Blueprint. On the created service page, open **Connect → Outbound**, then add each listed CIDR range to the Atlas project's IP Access List. Wait for the entries to become Active. Render's outgoing addresses differ from your laptop's current IP address.
6. If the first deployment failed while Atlas access was pending, retry **Manual Deploy → Deploy latest commit** after the entries become Active.
7. Open the returned Render URL followed by `/api/health`. Expect `{"status":"ok","database":"connected"}`.

The initial localhost origin values allow the backend to start for its health check. The live login setup is incomplete until the frontend is deployed and both origin values are updated.

## After deploying the client

On the client host, set `BACKEND_URL` to the Render service origin and rebuild/redeploy the client. Next.js proxies the client's `/api` requests to Render.

On Render, change `CLIENT_URL` and `BETTER_AUTH_URL` to the live client origin (HTTPS, no trailing slash or `/api`). Redeploy the API after changing them.

In Google Cloud, add the live client origin under Authorized JavaScript origins and `https://YOUR_CLIENT_DOMAIN/api/auth/callback/google` under Authorized redirect URIs. Keep the existing local entries if you still need local development.

Check registration/login, Google login, profile refresh, event creation, joining, and ownership restrictions on the live website before submission. The local checks do not verify the deployed integration.

References: https://render.com/docs/blueprint-spec and https://render.com/docs/outbound-ip-addresses
