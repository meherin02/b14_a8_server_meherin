import { MongoClient } from "mongodb";
import dns from "node:dns";

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "Add your Atlas connection string to MONGODB_URI in server/.env.",
    );
  }
  // Some Windows networks refuse Node's system SRV lookup. Let the resolver be
  // configured per project; Cloudflare's public resolver works on this network.
  const dnsServers = (process.env.DNS_SERVERS || "1.1.1.1,1.0.0.1")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);
  dns.setServers(dnsServers);
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    // P-256 negotiates successfully with Atlas from this Node.js environment.
    // Keep TLS encryption and normal certificate verification enabled.
    ecdhCurve: "prime256v1",
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "community_events");
  await db.command({ ping: 1 });
  return { client, db };
}
