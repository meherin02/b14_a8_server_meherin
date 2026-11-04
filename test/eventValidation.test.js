import test from "node:test";
import assert from "node:assert/strict";
import { validateEvent, eventId } from "../src/utils/eventValidation.js";
const now = new Date("2026-11-04T12:00:00Z");
const valid = {
  title: " Plant trees ",
  description: "Help plant trees.",
  type: "Plantation",
  image: "https://example.com/image.jpg",
  location: "Dhaka",
  date: "2026-12-01",
};
test("normalizes valid event fields and strips forged identity", () => {
  const event = validateEvent(
    {
      ...valid,
      creatorId: "someone-else",
      creatorEmail: "fake@example.com",
      _id: "forged",
    },
    now,
  );
  assert.equal(event.title, "Plant trees");
  assert.equal(event.date.toISOString(), "2026-12-01T00:00:00.000Z");
  assert.equal(event.creatorId, undefined);
  assert.equal(event.creatorEmail, undefined);
  assert.equal(event._id, undefined);
});
test("rejects past, same-day and impossible dates", () => {
  for (const date of ["2026-11-03", "2026-11-04", "2027-02-30", "garbage"])
    assert.throws(() => validateEvent({ ...valid, date }, now), {
      status: 400,
    });
});
test("rejects empty fields, unsupported types and unsafe image URLs", () => {
  for (const changes of [
    { title: " " },
    { description: null },
    { location: "" },
    { type: "Unknown" },
    { image: "javascript:alert(1)" },
    { title: "a".repeat(121) },
  ])
    assert.throws(() => validateEvent({ ...valid, ...changes }, now), {
      status: 400,
    });
});
test("accepts only full hexadecimal event IDs", () => {
  assert.equal(
    eventId("507f1f77bcf86cd799439011").toHexString(),
    "507f1f77bcf86cd799439011",
  );
  for (const id of [undefined, "wrong", { $ne: null }, "g".repeat(24)])
    assert.throws(() => eventId(id), { status: 400 });
});
