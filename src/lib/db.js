import { MongoClient } from "mongodb";

export async function connectDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "Add your Atlas connection string to MONGODB_URI in server/.env.",
    );
  }
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "community_events");
  await db.command({ ping: 1 });
  return { client, db };
}
