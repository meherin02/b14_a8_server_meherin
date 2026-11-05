import test from "node:test";
import assert from "node:assert/strict";
import { createHealthHandler } from "../src/routes/health.js";

function response() {
  return {
    code: null,
    body: null,
    headers: {},
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}
test("checks the database with a deadline before reporting healthy", async () => {
  let command, options;
  const res = response();
  await createHealthHandler({
    command: async (c, o) => {
      command = c;
      options = o;
      return { ok: 1 };
    },
  })({}, res);
  assert.deepEqual(command, { ping: 1 });
  assert.equal(options.timeoutMS, 3000);
  assert.equal(res.code, 200);
  assert.equal(res.headers["Cache-Control"], "no-store");
  assert.deepEqual(res.body, { status: "ok", database: "connected" });
});
test("returns 503 without exposing database failure details", async () => {
  const res = response();
  await createHealthHandler({
    command: async () => {
      throw new Error("private database details");
    },
  })({}, res);
  assert.equal(res.code, 503);
  assert.deepEqual(res.body, { status: "error", database: "unavailable" });
  assert.equal(res.headers["Cache-Control"], "no-store");
});
