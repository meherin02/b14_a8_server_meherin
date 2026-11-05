export function createHealthHandler(db) {
  return async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      // Bound the whole database operation, including waiting for a server.
      await db.command({ ping: 1 }, { timeoutMS: 3000 });
      return res.status(200).json({ status: "ok", database: "connected" });
    } catch {
      return res.status(503).json({ status: "error", database: "unavailable" });
    }
  };
}
