import test from "node:test";
import assert from "node:assert/strict";
import { verifyAuthReadiness } from "../src/lib/authReadiness.js";

test("allows startup when the signing key and verifier work together", async () => {
  await verifyAuthReadiness({
    api: {
      signJWT: async () => ({ token: "diagnostic-token" }),
      verifyJWT: async () => ({ payload: { sub: "auth-readiness-check" } }),
    },
  });
});
test("stops startup when a stored key cannot be decrypted", async () => {
  await assert.rejects(
    verifyAuthReadiness({
      api: {
        signJWT: async () => {
          throw new Error("Failed to decrypt private key");
        },
      },
    }),
    /Use the existing BETTER_AUTH_SECRET/,
  );
});
test("stops startup if signed tokens cannot be verified", async () => {
  await assert.rejects(
    verifyAuthReadiness({
      api: {
        signJWT: async () => ({ token: "diagnostic-token" }),
        verifyJWT: async () => ({ payload: null }),
      },
    }),
    /Authentication startup check failed/,
  );
});
test("never exposes underlying database or credential details", async () => {
  await assert.rejects(
    verifyAuthReadiness({
      api: {
        signJWT: async () => {
          throw new Error("private database details");
        },
      },
    }),
    (error) =>
      !error.message.includes("private database details") &&
      error.message.includes("Check database access"),
  );
});
