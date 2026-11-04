import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { connectDatabase } from "./lib/db.js";
import { createAuth } from "./lib/auth.js";
import { createRequireAuth } from "./middleware/requireAuth.js";
import {
  eventRoutes,
  registrationRoutes,
  prepareEventIndexes,
} from "./routes/events.routes.js";

async function start() {
  const { client, db } = await connectDatabase();
  const auth = createAuth(db, client);
  await prepareEventIndexes(db);
  const requireAuth = createRequireAuth(auth);
  const app = express();
  app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
  // BetterAuth must receive the original request body before express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json());
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", database: "connected" }),
  );
  app.get("/api/config", (_req, res) =>
    res.json({
      googleEnabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
    }),
  );
  app.get("/api/me", requireAuth, (req, res) => res.json({ user: req.user }));
  app.use("/api/events", eventRoutes(db, client, requireAuth));
  app.use("/api/registrations", registrationRoutes(db, client, requireAuth));
  app.use((_req, res) =>
    res.status(404).json({ message: "API route not found." }),
  );
  app.use((error, _req, res, _next) => {
    const status =
      error.status || (error.type === "entity.parse.failed" ? 400 : 500);
    if (status >= 500) console.error("API request failed:", error.name);
    res
      .status(status)
      .json({
        message:
          status >= 500
            ? "Something went wrong. Please try again."
            : error.message,
      });
  });
  const server = app.listen(process.env.PORT || 5000, () =>
    console.log("API ready at " + process.env.BETTER_AUTH_URL),
  );
  async function close() {
    server.close();
    await client.close();
    process.exit(0);
  }
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
}

start().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
