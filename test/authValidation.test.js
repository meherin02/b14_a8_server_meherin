import test from "node:test";
import assert from "node:assert/strict";
import {
  validateProfileFields,
  validateSignupPassword,
} from "../src/utils/authValidation.js";

const profile = {
  name: "Community Volunteer",
  image: "https://example.com/photo.jpg",
};
test("signup requires both name and photo while partial profile updates are allowed", () => {
  assert.equal(validateProfileFields(profile, { required: true }), null);
  assert.equal(validateProfileFields({ name: "New Name" }), null);
  assert.equal(validateProfileFields({ image: profile.image }), null);
  assert.ok(validateProfileFields({ name: "New Name" }, { required: true }));
  assert.ok(
    validateProfileFields({ image: profile.image }, { required: true }),
  );
});
test("rejects invalid, blank and oversized names", () => {
  for (const name of [null, 42, "  ", "x".repeat(101)])
    assert.ok(validateProfileFields({ name }));
  assert.equal(validateProfileFields({ name: "  A valid name  " }), null);
});
test("rejects unsafe schemes and credential-bearing image URLs", () => {
  for (const image of [
    "javascript:alert(1)",
    "data:image/png;base64,abc",
    "file:///photo.jpg",
    "https://user:password@example.com/photo.jpg",
    "invalid",
    null,
    "",
    "https://example.com/" + "a".repeat(2048),
  ])
    assert.ok(validateProfileFields({ image }));
});
test("rejects malformed profile bodies", () => {
  for (const body of [undefined, null, [], "profile"])
    assert.ok(validateProfileFields(body));
});
test("enforces registration password length and letter cases", () => {
  for (const password of [
    null,
    "Abc12",
    "abcdef",
    "ABCDEF",
    "A".repeat(128) + "b",
  ])
    assert.ok(validateSignupPassword(password));
  assert.equal(validateSignupPassword("Abc123"), null);
});
