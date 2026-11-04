import test from "node:test";
import assert from "node:assert/strict";
import { eventRoutes } from "../src/routes/events.routes.js";

const id = "507f1f77bcf86cd799439011";
const authenticated = (_req, _res, next) => next();
const client = { startSession: () => ({ withTransaction: async (fn) => fn(), endSession: async () => {} }) };
const future = new Date(); future.setUTCFullYear(future.getUTCFullYear() + 1);
const body = { title: "Cleanup", description: "Clean the park", type: "Cleanup", image: "https://example.com/image.jpg", location: "Dhaka", date: future.toISOString().slice(0, 10), creatorId: "forged", creatorEmail: "forged@example.com" };
function handler(db, method, path) {
  const route = eventRoutes(db, client, authenticated).stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route;
  assert.equal(route.stack[0].handle, authenticated);
  return route.stack.at(-1).handle;
}
test("creation derives organizer identity from the authenticated user", async () => {
  let inserted;
  const db = { collection: () => ({ insertOne: async (value) => { inserted = value; return { insertedId: id }; } }) };
  const res = { status() { return this; }, json() {} };
  await handler(db, "post", "/")({ body, user: { id: "actual-user", email: "actual@example.com" } }, res);
  assert.equal(inserted.creatorId, "actual-user");
  assert.equal(inserted.creatorEmail, "actual@example.com");
});
test("updates constrain the write by owner and cannot change organizer identity", async () => {
  let filter, update;
  const db = { collection: () => ({ findOneAndUpdate: async (f, u) => { filter = f; update = u; return null; } }) };
  await assert.rejects(handler(db, "patch", "/:id")({ params: { id }, body, user: { id: "actual-user" } }, {}), { status: 404 });
  assert.equal(filter.creatorId, "actual-user");
  assert.equal(filter._id.toHexString(), id);
  assert.equal(update.$set.creatorId, undefined);
  assert.equal(update.$set.creatorEmail, undefined);
});
test("unauthorized deletion never deletes registrations", async () => {
  let filter, registrationsTouched = false;
  const db = { collection: (name) => name === "events" ? { deleteOne: async (f) => { filter = f; return { deletedCount: 0 }; } } : { deleteMany: async () => { registrationsTouched = true; } } };
  await assert.rejects(handler(db, "delete", "/:id")({ params: { id }, user: { id: "actual-user" } }, {}), { status: 404 });
  assert.equal(filter.creatorId, "actual-user");
  assert.equal(registrationsTouched, false);
});
