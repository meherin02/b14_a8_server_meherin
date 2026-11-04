import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { createRequireAuth } from "../src/middleware/requireAuth.js";

test("protected API verifies signed JWTs and the active session", async (t) => {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const key = {
    ...(await exportJWK(publicKey)),
    kid: "test-key",
    alg: "EdDSA",
  };
  const server = createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ keys: [key] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const originalURL = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = `http://127.0.0.1:${server.address().port}`;
  t.after(() => {
    if (originalURL === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = originalURL;
  });
  let session = { user: { id: "user-one", email: "user@example.com" } };
  const middleware = createRequireAuth({
    api: { getSession: async () => session },
  });
  async function sign(
    subject = "user-one",
    expiration = "5m",
    issuer = process.env.BETTER_AUTH_URL,
  ) {
    return new SignJWT({})
      .setProtectedHeader({ alg: "EdDSA", kid: key.kid })
      .setSubject(subject)
      .setIssuer(issuer)
      .setAudience(process.env.BETTER_AUTH_URL)
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(privateKey);
  }
  async function invoke(token) {
    const req = { headers: token ? { authorization: `Bearer ${token}` } : {} };
    const result = { status: 200, proceeded: false };
    const res = {
      status(code) {
        result.status = code;
        return this;
      },
      json(body) {
        result.body = body;
        return this;
      },
    };
    await middleware(req, res, () => {
      result.proceeded = true;
    });
    return { ...result, user: req.user };
  }
  await t.test("rejects a missing JWT", async () =>
    assert.equal((await invoke()).status, 401),
  );
  await t.test("rejects a malformed JWT", async () =>
    assert.equal((await invoke("invalid")).status, 401),
  );
  await t.test("accepts a signed JWT for the active user", async () => {
    const result = await invoke(await sign());
    assert.equal(result.proceeded, true);
    assert.equal(result.user.email, "user@example.com");
  });
  await t.test("rejects expired JWTs", async () =>
    assert.equal((await invoke(await sign("user-one", "-1m"))).status, 401),
  );
  await t.test("rejects the wrong issuer", async () =>
    assert.equal(
      (await invoke(await sign("user-one", "5m", "https://other.example")))
        .status,
      401,
    ),
  );
  await t.test("rejects a JWT for another user", async () =>
    assert.equal((await invoke(await sign("other-user"))).status, 401),
  );
  await t.test("rejects a signed JWT after logout", async () => {
    session = null;
    assert.equal((await invoke(await sign())).status, 401);
  });
});
