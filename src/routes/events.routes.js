import { Router } from "express";
import { eventId, validateEvent, httpError } from "../utils/eventValidation.js";

export async function prepareEventIndexes(db) {
  await db.collection("events").createIndex({ date: 1 });
  await db.collection("events").createIndex({ creatorId: 1, date: 1 });
  await db
    .collection("registrations")
    .createIndex({ userId: 1, eventId: 1 }, { unique: true });
}
export function eventRoutes(db, client, requireAuth) {
  const router = Router();
  const events = db.collection("events");
  router.get("/", async (req, res) => {
    const query = events
      .find({ date: { $gt: new Date() } })
      .sort({ date: 1, _id: 1 });
    if (req.query.limit !== undefined) {
      const limit = Number(req.query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100)
        throw httpError(400, "Limit must be between 1 and 100.");
      query.limit(limit);
    }
    res.json({ events: await query.toArray() });
  });
  router.get("/mine", requireAuth, async (req, res) => {
    res.json({
      events: await events
        .find({ creatorId: req.user.id })
        .sort({ date: 1 })
        .toArray(),
    });
  });
  router.get("/:id", async (req, res) => {
    const event = await events.findOne({ _id: eventId(req.params.id) });
    if (!event) throw httpError(404, "Event not found.");
    res.json({ event });
  });
  router.post("/", requireAuth, async (req, res) => {
    const event = {
      ...validateEvent(req.body),
      creatorId: req.user.id,
      creatorEmail: req.user.email,
      createdAt: new Date(),
    };
    const result = await events.insertOne(event);
    res.status(201).json({ event: { ...event, _id: result.insertedId } });
  });
  router.patch("/:id", requireAuth, async (req, res) => {
    const data = validateEvent(req.body);
    const event = await events.findOneAndUpdate(
      { _id: eventId(req.params.id), creatorId: req.user.id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!event) throw httpError(404, "Event not found or you do not own it.");
    res.json({ event });
  });
  router.delete("/:id", requireAuth, async (req, res) => {
    const id = eventId(req.params.id);
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        const result = await events.deleteOne(
          { _id: id, creatorId: req.user.id },
          { session },
        );
        if (!result.deletedCount)
          throw httpError(404, "Event not found or you do not own it.");
        await db
          .collection("registrations")
          .deleteMany({ eventId: id }, { session });
      });
    } finally {
      await session.endSession();
    }
    res.json({ message: "Event deleted." });
  });
  return router;
}
export function registrationRoutes(db, client, requireAuth) {
  const router = Router();
  router.use(requireAuth);
  router.get("/events/:id/status", async (req, res) => {
    const registration = await db
      .collection("registrations")
      .findOne(
        { eventId: eventId(req.params.id), userId: req.user.id },
        { projection: { _id: 1 } },
      );
    res.set("Cache-Control", "private, no-store");
    res.json({ joined: Boolean(registration) });
  });
  router.get("/me", async (req, res) => {
    const events = await db
      .collection("registrations")
      .aggregate([
        { $match: { userId: req.user.id } },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        { $unwind: "$event" },
        { $replaceRoot: { newRoot: "$event" } },
        { $sort: { date: 1, _id: 1 } },
      ])
      .toArray();
    res.json({ events });
  });
  router.post("/", async (req, res) => {
    const id = eventId(req.body?.eventId);
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        // Writing the event serializes joins with event deletion/date changes.
        const event = await db
          .collection("events")
          .findOneAndUpdate(
            { _id: id, date: { $gt: new Date() } },
            { $inc: { registrationVersion: 1 } },
            { session, returnDocument: "after" },
          );
        if (!event)
          throw httpError(
            404,
            "This event is unavailable or has already ended.",
          );
        await db.collection("registrations").insertOne(
          {
            eventId: id,
            userId: req.user.id,
            userEmail: req.user.email,
            joinedAt: new Date(),
          },
          { session },
        );
      });
    } catch (error) {
      if (error.code === 11000)
        throw httpError(409, "You have already joined this event.");
      throw error;
    } finally {
      await session.endSession();
    }
    res.status(201).json({ message: "You have joined this event." });
  });
  return router;
}
