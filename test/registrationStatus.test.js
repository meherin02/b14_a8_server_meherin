import test from "node:test";
import assert from "node:assert/strict";
import { registrationRoutes } from "../src/routes/events.routes.js";

const id = "507f1f77bcf86cd799439011";
const auth = (_req, _res, next) => next();
function createHandler(findOne) {
  const router = registrationRoutes(
    { collection: () => ({ findOne }) },
    {},
    auth,
  );
  assert.equal(router.stack[0].handle, auth);
  return router.stack.find(
    (layer) => layer.route?.path === "/events/:id/status",
  ).route.stack[0].handle;
}
test("joined status uses the authenticated user and returns no registration data", async () => {
  let filter, options, output, cache;
  const handler = createHandler(async (f, o) => {
    filter = f;
    options = o;
    return { _id: "private-id" };
  });
  await handler(
    {
      params: { id },
      query: { userId: "another-user" },
      user: { id: "signed-in-user" },
    },
    {
      set(_key, value) {
        cache = value;
      },
      json(value) {
        output = value;
      },
    },
  );
  assert.equal(filter.userId, "signed-in-user");
  assert.equal(filter.eventId.toHexString(), id);
  assert.deepEqual(options.projection, { _id: 1 });
  assert.deepEqual(output, { joined: true });
  assert.equal(cache, "private, no-store");
});
test("returns false for an event the user has not joined", async () => {
  let output;
  await createHandler(async () => null)(
    { params: { id }, user: { id: "user" } },
    {
      set() {},
      json(value) {
        output = value;
      },
    },
  );
  assert.deepEqual(output, { joined: false });
});
test("rejects invalid event IDs before querying the database", async () => {
  let queried = false;
  await assert.rejects(
    createHandler(async () => {
      queried = true;
    })({ params: { id: "invalid" }, user: { id: "user" } }, {}),
    { status: 400 },
  );
  assert.equal(queried, false);
});
