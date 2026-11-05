export async function verifyAuthReadiness(auth) {
  try {
    // These are server-only BetterAuth APIs. No user account/session is created,
    // and the short-lived diagnostic token is never returned or logged.
    const { token } = await auth.api.signJWT({
      body: {
        payload: {
          sub: "auth-readiness-check",
          exp: Math.floor(Date.now() / 1000) + 60,
        },
      },
    });
    const { payload } = await auth.api.verifyJWT({ body: { token } });
    if (payload?.sub !== "auth-readiness-check")
      throw new Error("JWT verification failed");
  } catch (error) {
    if (error.message?.includes("Failed to decrypt private key")) {
      throw new Error(
        "Authentication startup check failed: stored JWT keys cannot be decrypted. Use the existing BETTER_AUTH_SECRET for servers sharing this auth database.",
      );
    }
    throw new Error(
      "Authentication startup check failed. Check database access, BETTER_AUTH_URL, and BETTER_AUTH_SECRET before deploying.",
    );
  }
}
